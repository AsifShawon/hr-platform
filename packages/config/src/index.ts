import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env if present
dotenv.config();

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT_WEB: z.coerce.number().default(3000),
  PORT_API: z.coerce.number().default(3001),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:3001'),
  DATABASE_URL: z
    .string()
    .min(1)
    .default('postgresql://postgres:postgres@localhost:5432/hr_platform_dev?schema=public'),
  APP_SECRET: z.string().min(16).default('development_secret_do_not_use_in_production_min32chars'),
  STORAGE_DRIVER: z.enum(['local', 's3']).default('local'),
  STORAGE_LOCAL_PATH: z.string().default('./storage/uploads'),
  DEFAULT_LOCALE: z.string().default('en'),
  DEFAULT_CARD_WIDTH_MM: z.coerce.number().default(60),
  DEFAULT_CARD_HEIGHT_MM: z.coerce.number().default(90),
});

export type Env = z.infer<typeof envSchema>;

let parsedEnv: Env | null = null;

export function getEnv(): Env {
  if (!parsedEnv) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error('❌ Invalid environment configuration:', result.error.format());
      throw new Error('Invalid environment configuration');
    }
    parsedEnv = result.data;
  }
  return parsedEnv;
}

export const env = getEnv();
