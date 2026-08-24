import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { auth } from '../../middleware/auth';
import { AppError } from '../../utils/errors';
import { emailQueue } from '../../queue/queue';

const r = Router();
r.use(auth);

r.post('/tasks/:taskId/assign', async (req, res, next) => {
  let assignmentId: string | undefined;
  let queuedJobId: string | undefined;
  try {
    const b = z.object({ userId: z.string().uuid() }).parse(req.body);
    const task = await prisma.task.findFirst({
      where: {
        id: String(req.params.taskId),
        deletedAt: null,
        project: { organizationId: req.auth!.organizationId, deletedAt: null }
      }
    });
    if (!task) throw new AppError(403, 'TASK_FORBIDDEN', 'Forbidden');

    const member = await prisma.orgMember.findFirst({
      where: { userId: b.userId, organizationId: req.auth!.organizationId },
      include: { user: true }
    });
    if (!member) throw new AppError(403, 'USER_FORBIDDEN', 'Assigned user must belong to the same organization');

    const assignment = await prisma.taskAssignment.create({
      data: { taskId: task.id, userId: b.userId }
    });
    assignmentId = assignment.id;

    try {
      const job = await emailQueue.add(
        'task-assignment-email',
        { assignmentId, taskId: task.id, userId: b.userId, organizationId: req.auth!.organizationId, email: member.user.email, title: task.title },
        { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: false }
      );
      queuedJobId = String(job.id);
      await prisma.jobRecord.create({
        data: {
          bullJobId: queuedJobId,
          organizationId: req.auth!.organizationId,
          type: 'task-assignment-email',
          metadata: { assignmentId, taskId: task.id }
        }
      });
    } catch (queueError) {
      if (queuedJobId) await emailQueue.remove(queuedJobId).catch(() => undefined);
      await prisma.taskAssignment.delete({ where: { id: assignmentId } }).catch(() => undefined);
      throw new AppError(503, 'NOTIFICATION_ENQUEUE_FAILED', 'Assignment could not be completed because notification enqueueing failed');
    }

    res.status(201).json({ assignment, jobId: queuedJobId });
  } catch (e) {
    if ((e as any)?.code === 'P2002') return next(new AppError(409, 'ALREADY_ASSIGNED', 'User is already assigned'));
    next(e);
  }
});

r.delete('/tasks/:taskId/assign/:userId', async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: String(req.params.taskId), project: { organizationId: req.auth!.organizationId } }
    });
    if (!task) throw new AppError(403, 'TASK_FORBIDDEN', 'Forbidden');
    await prisma.taskAssignment.deleteMany({ where: { taskId: task.id, userId: String(req.params.userId) } });
    res.status(204).send();
  } catch (e) { next(e); }
});

export default r;
