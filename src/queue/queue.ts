import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { env } from '../config/env';

export const connection = new IORedis(env.REDIS_URL, { maxRetriesPerRequest: null });
export const emailQueue = new Queue('taskflow-email', { connection });
export const deadLetterQueue = new Queue('taskflow-email-dlq', { connection });
