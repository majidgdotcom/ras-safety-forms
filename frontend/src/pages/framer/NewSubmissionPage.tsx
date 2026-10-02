import { zodResolver } from '@hookform/resolvers/zod';
import React, { useRef, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { z } from 'zod';

import {
  addDays,
  CHECKLIST_SECTIONS,
  ChecklistSchema,
  localDate,
  PHOTO_RULES,
  SubmissionEntity,
} from '@ras/shared';

import { Alert, ErrorMessage } from '@/components/common/Feedback';
import { StatusBadge } from '@/components/common/StatusBadge';
import { ChecklistQuestion } from '@/components/form/ChecklistQuestion';
import { PhotoPicker } from '@/components/form/PhotoPicker';
import { ApiError } from '@/config/api-client';
import { useAuth } from '@/hooks/useAuth';
import { uploadPhoto } from '@/services/photo-upload';
import { useCreateSubmission, useSites } from '@/services/safety.service';
import { shrinkPhoto } from '@/utils/image';

const MAX_DAYS_BACK = 7;

/**
 * Client-side form schema. It REUSES the shared ChecklistSchema, and the server
 * validates again with CreateSubmissionSchema - the browser is never trusted alone.
 */
const FormSchema = z
  .object({
    siteId: z.string().min(1, 'Select your job site'),
    date: z.string().min(1, 'Select the date'),
    checklist: ChecklistSchema,
    notes: z.string().max(2000, 'Notes are too long (max 2000 characters)'),
  })
  .refine((v) => !Object.values(v.checklist).includes('NO') || v.notes.trim().length >= 5, {
    path: ['notes'],
    message: 'Please explain any "No" answer here',
  });

type FormValues = z.infer<typeof FormSchema>;
type Phase = { step: 'idle' } | { step: 'uploading'; done: number; total: number } | { step: 'saving' };

export const NewSubmissionPage: React.FC = () => {
  const { user } = useAuth();
  const sites = useSites();
  const createSubmission = useCreateSubmission();

  const today = localDate();
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoError, setPhotoError] = useState<string>();
  const [submitError, setSubmitError] = useState<string>();
  const [phase, setPhase] = useState<Phase>({ step: 'idle' });
  const [created, setCreated] = useState<SubmissionEntity | null>(null);

  // Remember which files were already uploaded, so a retry does not upload them twice.
  const uploadedKeys = useRef(new Map<File, string>());

  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: { siteId: '', date: today, notes: '' },
  });

  const hasNo = Object.values(watch('checklist') ?? {}).includes('NO');
  const busy = phase.step !== 'idle';

  const onSubmit = handleSubmit(
    async (values) => {
      setSubmitError(undefined);
      if (photos.length < PHOTO_RULES.minPerSubmission) {
        setPhotoError('Attach at least one photo');
        return;
      }

      try {
        // 1) Upload photos one by one (shows progress, kinder to a weak signal)
        const photoKeys: string[] = [];
        for (const [i, file] of photos.entries()) {
          setPhase({ step: 'uploading', done: i, total: photos.length });
          let key = uploadedKeys.current.get(file);
          if (!key) {
            key = await uploadPhoto(await shrinkPhoto(file));
            uploadedKeys.current.set(file, key);
          }
          photoKeys.push(key);
        }

        // 2) Save the form
        setPhase({ step: 'saving' });
        const result = await createSubmission.mutateAsync({ ...values, photoKeys });
        setCreated(result);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (err) {
        if (err instanceof ApiError && err.fieldErrors) {
          // Show server-side validation next to the right field
          Object.entries(err.fieldErrors).forEach(([field, msgs]) => {
            if (field === 'photoKeys') setPhotoError(msgs[0]);
            else setError(field as keyof FormValues, { message: msgs[0] });
          });
        }
        setSubmitError(err instanceof Error ? err.message : 'Could not submit the form.');
      } finally {
        setPhase({ step: 'idle' });
      }
    },
    () => {
      if (photos.length === 0) setPhotoError('Attach at least one photo');
      setSubmitError('Please fix the highlighted fields.');
    },
  );

  const startAnother = () => {
    reset({ siteId: '', date: today, notes: '' });
    setPhotos([]);
    uploadedKeys.current.clear();
    setCreated(null);
  };

  // ── Success screen ─────────────────────────────────────────────────────────
  if (created) {
    return (
      <main className="page page--narrow">
        <div className="card success-panel">
          <div className="tick" aria-hidden>
            ✓
          </div>
          <h1>Safety form submitted</h1>
          <p className="muted">
            {created.siteName} · {created.date}
          </p>
          <p>
            <StatusBadge status={created.status} />
          </p>
          <div className="stack" style={{ maxWidth: 320, margin: '20px auto 0' }}>
            <Link className="btn btn--primary btn--block" to={`/my-forms/${created.submissionId}`}>
              View submission
            </Link>
            <button type="button" className="btn btn--secondary btn--block" onClick={startAnother}>
              Fill another form
            </button>
          </div>
        </div>
      </main>
    );
  }

  // ── Form ───────────────────────────────────────────────────────────────────
  return (
    <main className="page page--narrow">
      <div className="page-head">
        <div>
          <h1>Daily safety form</h1>
          <p>Complete before starting work on site.</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
        <section className="card">
          <div className="form-row">
            <div className="field">
              <label htmlFor="worker">Worker</label>
              <input id="worker" className="input" value={user?.name ?? ''} readOnly />
            </div>
          </div>
          <div className="form-row form-row--2" style={{ marginTop: 14 }}>
            <div className={`field${errors.siteId ? ' has-error' : ''}`}>
              <label htmlFor="siteId">Job site</label>
              {sites.isLoading ? (
                <select className="select" disabled>
                  <option>Loading sites…</option>
                </select>
              ) : (
                <select id="siteId" className="select" {...register('siteId')} disabled={busy}>
                  <option value="">Select a site…</option>
                  {sites.data?.map((s) => (
                    <option key={s.siteId} value={s.siteId}>
                      {s.name} — {s.address}
                    </option>
                  ))}
                </select>
              )}
              {sites.error && <ErrorMessage error={sites.error} onRetry={() => sites.refetch()} />}
              {errors.siteId && <span className="field-error">{errors.siteId.message}</span>}
            </div>
            <div className={`field${errors.date ? ' has-error' : ''}`}>
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                className="input"
                min={addDays(today, -MAX_DAYS_BACK)}
                max={today}
                disabled={busy}
                {...register('date')}
              />
              {errors.date && <span className="field-error">{errors.date.message}</span>}
            </div>
          </div>
        </section>

        <section className="card">
          <div className="card__title">
            <h2>Safety checklist</h2>
          </div>
          {CHECKLIST_SECTIONS.map((section) => (
            <div className="checklist-section" key={section.title}>
              <h3>{section.title}</h3>
              {section.items.map((item) => (
                <Controller
                  key={item.key}
                  control={control}
                  name={`checklist.${item.key}`}
                  render={({ field, fieldState }) => (
                    <ChecklistQuestion
                      id={item.key}
                      label={item.label}
                      value={field.value}
                      error={fieldState.error?.message}
                      onChange={field.onChange}
                    />
                  )}
                />
              ))}
            </div>
          ))}

          <div className={`field${errors.notes ? ' has-error' : ''}`} style={{ marginTop: 18 }}>
            <label htmlFor="notes">Notes {hasNo ? '(required)' : '(optional)'}</label>
            <textarea
              id="notes"
              className="textarea"
              placeholder={
                hasNo
                  ? 'What is the problem, and what did you do about it?'
                  : 'Anything the supervisor should know'
              }
              disabled={busy}
              {...register('notes')}
            />
            {errors.notes && <span className="field-error">{errors.notes.message}</span>}
          </div>
        </section>

        <section className="card">
          <div className="card__title">
            <h2>Photos</h2>
            <span className="small muted">At least 1 required</span>
          </div>
          <PhotoPicker
            files={photos}
            disabled={busy}
            error={photoError}
            onChange={(f) => {
              setPhotos(f);
              if (f.length) setPhotoError(undefined);
            }}
            onReject={(msgs) => setPhotoError(msgs[0])}
          />
        </section>

        <div className="sticky-submit">
          {submitError && <Alert kind="error">{submitError}</Alert>}
          <button
            type="submit"
            className="btn btn--primary btn--block btn--lg"
            disabled={busy}
            style={{ marginTop: submitError ? 12 : 0 }}
          >
            {phase.step === 'uploading'
              ? `Uploading photo ${phase.done + 1} of ${phase.total}…`
              : phase.step === 'saving'
                ? 'Saving…'
                : 'Submit safety form'}
          </button>
        </div>
      </form>
    </main>
  );
};
