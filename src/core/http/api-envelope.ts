import { z } from 'zod';

const apiMetaSchema = z.object({
  message: z.string().optional(),
});

const paginationMetaSchema = apiMetaSchema.extend({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  limit: z.number().int().positive(),
});

const apiEnvelopeSchema = z.object({
  data: z.unknown(),
  meta: apiMetaSchema,
});

const paginatedEnvelopeSchema = z.object({
  data: z.array(z.unknown()),
  meta: paginationMetaSchema,
});

export type ApiMeta = z.infer<typeof apiMetaSchema>;
export type PaginationMeta = z.infer<typeof paginationMetaSchema>;

export interface ApiResponse<T> {
  data: T;
  meta: ApiMeta;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: PaginationMeta;
}

export const parseApiResponse = <T>(
  schema: z.ZodType<T>,
  body: unknown,
): ApiResponse<T> => {
  const { data, meta } = apiEnvelopeSchema.parse(body);

  return { data: schema.parse(data), meta };
};

export const parsePaginatedResponse = <T>(
  itemSchema: z.ZodType<T>,
  body: unknown,
): PaginatedResponse<T> => {
  const { data, meta } = paginatedEnvelopeSchema.parse(body);

  return { data: z.array(itemSchema).parse(data), meta };
};

export const parseApiData = <T>(schema: z.ZodType<T>, body: unknown): T =>
  parseApiResponse(schema, body).data;
