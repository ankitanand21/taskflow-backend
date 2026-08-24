import { Router } from 'express';
import { emailQueue } from '../../queue/queue';
import { prisma } from '../../config/database';
import { auth } from '../../middleware/auth';

const r = Router();
r.use(auth);

r.get('/:id', async (req, res, next) => {
  try {
    const rec = await prisma.jobRecord.findFirst({
      where: { bullJobId: String(req.params.id), organizationId: req.auth!.organizationId }
    });
    if (!rec) return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND', details: {} });
    const job = await emailQueue.getJob(String(req.params.id));
    if (!job) return res.status(404).json({ error: 'Job not found', code: 'JOB_NOT_FOUND', details: {} });
    const state = await job.getState();
    const status = state === 'waiting' || state === 'delayed' ? 'pending' : state;
    res.json({
      id: job.id,
      status,
      type: rec.type,
      metadata: rec.metadata ?? job.data,
      attemptsMade: job.attemptsMade,
      createdAt: new Date(job.timestamp).toISOString(),
      processedAt: job.finishedOn ? new Date(job.finishedOn).toISOString() : null
    });
  } catch (e) { next(e); }
});

export default r;
