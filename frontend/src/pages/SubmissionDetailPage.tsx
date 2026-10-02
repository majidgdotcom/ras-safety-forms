import React from 'react';
import { Link, useParams } from 'react-router-dom';

import { CHECKLIST_SECTIONS, Role } from '@ras/shared';

import { ErrorMessage, Spinner } from '@/components/common/Feedback';
import { PhotoGallery } from '@/components/common/PhotoGallery';
import { StatusBadge } from '@/components/common/StatusBadge';
import { useAuth } from '@/hooks/useAuth';
import { useSubmission } from '@/services/safety.service';
import { formatDay, formatTime } from '@/utils/format';

const ANSWER_LABEL = { YES: 'Yes', NO: 'No', NA: 'N/A' } as const;

/** Detail of one submission (framer: own only, admin: any) incl. photos. */
export const SubmissionDetailPage: React.FC = () => {
  const { submissionId = '' } = useParams();
  const { user } = useAuth();
  const { data: s, isLoading, error, refetch } = useSubmission(submissionId);
  const backTo = user?.role === Role.ADMIN ? '/admin/submissions' : '/my-forms';

  return (
    <main className="page page--narrow">
      <p>
        <Link to={backTo}>← Back to list</Link>
      </p>

      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}

      {s && (
        <div className="stack">
          <div className="page-head" style={{ marginBottom: 0 }}>
            <div>
              <h1>{s.siteName}</h1>
              <p>Safety form · {formatDay(s.date)}</p>
            </div>
            <StatusBadge status={s.status} />
          </div>

          <section className="card">
            <dl className="meta" style={{ margin: 0 }}>
              <div>
                <dt>Worker</dt>
                <dd>{s.workerName}</dd>
              </div>
              <div>
                <dt>Site</dt>
                <dd>{s.siteName}</dd>
              </div>
              <div>
                <dt>Work date</dt>
                <dd>{formatDay(s.date)}</dd>
              </div>
              <div>
                <dt>Submitted</dt>
                <dd>{formatTime(s.createdAt)}</dd>
              </div>
            </dl>
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 8 }}>Checklist</h2>
            {CHECKLIST_SECTIONS.map((section) => (
              <div className="checklist-section" key={section.title}>
                <h3>{section.title}</h3>
                {section.items.map((item) => {
                  const answer = s.checklist[item.key] ?? 'NA';
                  return (
                    <div className="question" key={item.key}>
                      <span className="question__label">{item.label}</span>
                      <span className={`answer answer--${answer}`}>{ANSWER_LABEL[answer]}</span>
                    </div>
                  );
                })}
              </div>
            ))}
            <h3 style={{ marginTop: 16 }}>Notes</h3>
            <p style={{ whiteSpace: 'pre-wrap', margin: '4px 0 0' }}>
              {s.notes || <span className="muted">No notes.</span>}
            </p>
          </section>

          <section className="card">
            <h2 style={{ marginBottom: 4 }}>Photos ({s.photos.length})</h2>
            <PhotoGallery photos={s.photos} />
          </section>
        </div>
      )}
    </main>
  );
};
