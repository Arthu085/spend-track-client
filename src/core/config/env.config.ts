import { parseEnv, type Env } from './env.schema';

export const env: Readonly<Env> = Object.freeze(parseEnv(import.meta.env));
