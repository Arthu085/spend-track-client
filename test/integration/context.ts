import { z } from 'zod';

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const backendFixtureSchema = z.object({
  type: z.literal('ready'),
  baseURL: z.url(),
  admin: credentialsSchema,
  user: credentialsSchema,
});

type BackendFixture = z.infer<typeof backendFixtureSchema>;

declare module 'vitest' {
  interface ProvidedContext {
    backend: BackendFixture;
  }
}
