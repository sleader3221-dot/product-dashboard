import { z } from 'zod';

// Server-side validation for product writes. Mirrors utils/validation.js so a
// voice agent or any API client gets the same rules as the form.
const base = {
  title: z.string().trim().min(3).max(200),
  category: z.string().trim().min(1).max(80).refine((c) => c !== 'all'),
  price: z.coerce.number().positive().max(10_000_000),
  stock: z.coerce.number().int().min(0).max(10_000_000),
  thumbnail: z.string().trim().url().refine((u) => /^https?:\/\//i.test(u)),
  costPrice: z.coerce.number().min(0).max(10_000_000).optional(),
};

export const ProductCreate = z
  .object({ ...base, restoreId: z.coerce.number().int().positive().optional() })
  .passthrough();

export const ProductUpdate = z
  .object(Object.fromEntries(Object.entries(base).map(([k, v]) => [k, v.optional()])))
  .passthrough();

export function validationError(result) {
  return {
    error: 'Invalid product data',
    fields: Object.fromEntries(result.error.issues.map((i) => [i.path.join('.') || 'body', i.message])),
  };
}
