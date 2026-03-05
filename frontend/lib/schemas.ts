import { z } from 'zod';

// ── Queue schemas ─────────────────────────────────────────────────────────────

export const JoinQueueSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Nama harus diisi').max(100),
    phone: z.string().min(5, 'No. HP harus diisi').max(20),
  }),
  serviceId: z.string().min(1, 'Layanan harus dipilih'),
  barberId: z.string().nullable().optional(),
});

export const CompleteQueueSchema = z.object({
  paymentStatus: z.literal('PAID'),
});

// ── Booking schemas ───────────────────────────────────────────────────────────

export const CreateBookingSchema = z.object({
  customer: z.object({
    name: z.string().min(1, 'Nama harus diisi').max(100),
    phone: z
      .string()
      .min(8, 'No. HP minimal 8 digit')
      .max(20)
      .regex(/^[0-9+\-\s()]+$/, 'Format No. HP tidak valid'),
  }),
  serviceId: z.string().min(1, 'Layanan harus dipilih'),
  barberId: z.string().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid (YYYY-MM-DD)'),
  startTime: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Format waktu tidak valid (HH:MM)'),
});

export const GetBookingsQuerySchema = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid, gunakan YYYY-MM-DD')
    .optional(),
  all: z.string().optional(), // ?all=1 untuk tampilkan semua tanggal
});

export const GetSlotsQuerySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Format tanggal tidak valid'),
  barberId: z.string().optional(),
  serviceId: z.string().optional(),
});

// ── Response error ────────────────────────────────────────────────────────────

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
  }),
});

// ── Type exports ──────────────────────────────────────────────────────────────

export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;
export type CompleteQueueInput = z.infer<typeof CompleteQueueSchema>;
export type CreateBookingInput = z.infer<typeof CreateBookingSchema>;
export type GetBookingsQuery = z.infer<typeof GetBookingsQuerySchema>;
export type GetSlotsQuery = z.infer<typeof GetSlotsQuerySchema>;
