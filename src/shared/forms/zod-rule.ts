import type { RuleObject } from 'antd/es/form';
import type { z } from 'zod';

export const zodRule = (schema: z.ZodType): RuleObject => ({
  validator: async (_rule, value: unknown) => {
    const result = await schema.safeParseAsync(value);

    if (!result.success) {
      throw new Error(result.error.issues[0]?.message);
    }
  },
});
