import { z } from 'zod';

// ── Request schemas ──────────────────────────────────────────────────────────

export const JoinQueueSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Name is required').max(100),
    phone: z.string().min(5, 'Phone is required').max(20),
  }),
  serviceId: z.string().min(1, 'Service is required'),
  barberId: z.string().nullable().optional(),
});

export const CompleteQueueSchema = z.object({
  paymentStatus: z.literal('PAID'),
});

export const GetBookingsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format, use YYYY-MM-DD')
    .optional(),
});

// ── Response error schema ────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ── Type exports ─────────────────────────────────────────────────────────────

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;
export type CompleteQueueInput = z.infer<typeof CompleteQueueSchema>;
export type GetBookingsQuery = z.infer<typeof GetBookingsQuerySchema>;
