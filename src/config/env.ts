import 'dotenv/config'; import {z} from 'zod';
const schema=z.object({DATABASE_URL:z.string().min(1),REDIS_URL:z.string().default('redis://localhost:6379'),JWT_ACCESS_SECRET:z.string().min(16),JWT_REFRESH_SECRET:z.string().min(16),PORT:z.coerce.number().default(3000),NODE_ENV:z.string().default('development')});
export const env=schema.parse(process.env);
