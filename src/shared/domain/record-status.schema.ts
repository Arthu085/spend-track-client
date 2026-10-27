import { z } from 'zod';

export const recordStatusSchema = z.enum(['ACTIVE', 'INACTIVE']);

export type RecordStatus = z.infer<typeof recordStatusSchema>;
