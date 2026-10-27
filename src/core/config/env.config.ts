import { z } from 'zod';

const envSchema = z
  .object({
    VITE_API_URL: z.url(),
    VITE_APP_NAME: z.string().trim().min(1),
    VITE_APP_MARK: z.string().trim().min(1),
  })
  .transform((source) => ({
    apiUrl: source.VITE_API_URL.replace(/\/+$/, ''),
    appName: source.VITE_APP_NAME,
    appMark: source.VITE_APP_MARK,
  }));

export type Env = z.infer<typeof envSchema>;

export const parseEnv = (source: Record<string, unknown>): Env => {
  const result = envSchema.safeParse(source);

  if (!result.success) {
    throw new Error(
      `Invalid environment configuration:\n${z.prettifyError(result.error)}`,
    );
  }

  return result.data;
};

export const env: Readonly<Env> = Object.freeze(parseEnv(import.meta.env));
