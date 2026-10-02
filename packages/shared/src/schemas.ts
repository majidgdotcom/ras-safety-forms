import { z } from 'zod';

import { CHECKLIST_KEYS, ChecklistKey } from './checklist';
import { DATE_REGEX } from './dates';
import { SubmissionStatus } from './entities';
import { PHOTO_RULES } from './photo-rules';

const dateString = z.string().regex(DATE_REGEX, 'Use format YYYY-MM-DD');

export const ChecklistAnswerSchema = z.enum(['YES', 'NO', 'NA'], {
  errorMap: () => ({ message: 'Choose Yes, No or N/A' }),
});

/** Every checklist key must be answered. Built from CHECKLIST_KEYS so it never drifts. */
export const ChecklistSchema = z.object(
  Object.fromEntries(CHECKLIST_KEYS.map((k) => [k, ChecklistAnswerSchema])) as Record<
    ChecklistKey,
    typeof ChecklistAnswerSchema
  >,
);

// ── Create submission (Framer) ──────────────────────────────────────────────
export const CreateSubmissionSchema = z
  .object({
    siteId: z.string().min(1, 'Select a job site'),
    date: dateString,
    checklist: ChecklistSchema,
    notes: z.string().trim().max(2000, 'Notes are too long (max 2000 characters)').default(''),
    photoKeys: z
      .array(z.string().min(1))
      .min(PHOTO_RULES.minPerSubmission, 'Attach at least one photo')
      .max(PHOTO_RULES.maxPerSubmission, `Attach at most ${PHOTO_RULES.maxPerSubmission} photos`),
  })
  .refine(
    // If something is NOT safe, the worker must explain it.
    (v) => !Object.values(v.checklist).includes('NO') || v.notes.trim().length >= 5,
    { path: ['notes'], message: 'Please explain any "No" answer in the notes' },
  );

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>;

// ── Photo upload URL ────────────────────────────────────────────────────────
export const CreateUploadUrlSchema = z.object({
  contentType: z.enum(PHOTO_RULES.allowedTypes, {
    errorMap: () => ({ message: 'Only JPG, PNG or WEBP photos are allowed' }),
  }),
  sizeBytes: z
    .number()
    .int()
    .positive()
    .max(PHOTO_RULES.maxSizeBytes, 'Photo is larger than 10 MB'),
});

export type CreateUploadUrlInput = z.infer<typeof CreateUploadUrlSchema>;

// ── List submissions (query string) ─────────────────────────────────────────
export const ListSubmissionsQuerySchema = z
  .object({
    siteId: z.string().min(1).optional(),
    userId: z.string().min(1).optional(),
    from: dateString.optional(),
    to: dateString.optional(),
    status: z.nativeEnum(SubmissionStatus).optional(),
    limit: z.coerce.number().int().min(1).max(500).default(200),
  })
  .refine((q) => !q.from || !q.to || q.from <= q.to, {
    path: ['from'],
    message: '"from" must be before "to"',
  });

export type ListSubmissionsQuery = z.infer<typeof ListSubmissionsQuerySchema>;

export const SummaryQuerySchema = z.object({
  date: dateString.optional(),
});
