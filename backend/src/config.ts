import { z } from 'zod';

const ConfigSchema = z.object({
  ANTHROPIC_API_KEY: z.string().min(1, 'ANTHROPIC_API_KEY is required'),
  ANTHROPIC_MODEL: z.string().default('claude-haiku-4-5-20251001'),
  PORT: z.coerce.number().int().positive().default(3000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Config = {
  anthropicApiKey: string;
  anthropicModel: string;
  port: number;
  nodeEnv: 'development' | 'production' | 'test';
};

export function loadConfig(): Config {
  const parsed = ConfigSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    throw new Error(`Invalid config — ${issues}`);
  }
  return {
    anthropicApiKey: parsed.data.ANTHROPIC_API_KEY,
    anthropicModel: parsed.data.ANTHROPIC_MODEL,
    port: parsed.data.PORT,
    nodeEnv: parsed.data.NODE_ENV,
  };
}
