import { z } from 'zod';

const envSchema = z
  .object({
    VITE_API_URL: z.url({ protocol: /^https?$/ }).pipe(
      z
        .string()
        .refine(
          (value) => /^https?:\/\/[^/?#\\@\s]+\/*$/i.test(value),
          'API URL must be an origin without a path, credentials, a query, or a fragment',
        )
        .refine((value) => {
          const url = new URL(value);

          return (
            url.protocol === 'https:' ||
            ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)
          );
        }, 'API URL must use HTTPS except on localhost or a loopback address')
        .transform((value) => new URL(value).origin),
    ),
    VITE_APP_NAME: z.string().trim().min(1),
    VITE_APP_MARK: z.string().trim().min(1),
  })
  .transform((source) => ({
    apiUrl: source.VITE_API_URL,
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
