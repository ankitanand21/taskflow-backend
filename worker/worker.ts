import { Worker } from 'bullmq';
import { connection, deadLetterQueue } from '../src/queue/queue';
import { prisma } from '../src/config/database';

const worker = new Worker(
  'taskflow-email',
  async job => {
    console.log(`[mock-email] Sending assignment email to ${job.data.email} for task ${job.data.title}`);
    await new Promise(resolve => setTimeout(resolve, 200));
    return { sent: true };
  },
  { connection }
);

worker.on('completed', async job => {
  await prisma.jobRecord.updateMany({ where: { bullJobId: String(job.id) }, data: { status: 'completed' } });
});

worker.on('failed', async job => {
  if (!job) return;
  const finalFailure = job.attemptsMade >= 3;
  await prisma.jobRecord.updateMany({
    where: { bullJobId: String(job.id) },
    data: { status: finalFailure ? 'failed' : 'pending' }
  });
  if (finalFailure) {
    await deadLetterQueue.add('dead-letter-task-assignment-email', {
      originalJobId: job.id,
      originalName: job.name,
      data: job.data,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade
    }, { removeOnComplete: false });
  }
  console.error('Job failed', job.id, job.failedReason);
});

worker.on('error', err => console.error('Worker error', err));
console.log('TaskFlow worker started');
