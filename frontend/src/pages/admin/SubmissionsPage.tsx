import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { addDays, localDate, SubmissionStatus } from '@ras/shared';

import { EmptyState, ErrorMessage, Spinner } from '@/components/common/Feedback';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { SubmissionFilters, useSites, useSubmissions, useWorkers } from '@/services/safety.service';
import { groupBySite } from '@/viewmodels/submission.viewmodel';

const FILTER_KEYS = ['siteId', 'userId', 'from', 'to', 'status'] as const;

/**
 * All submissions with filters. Filters live in the URL (?siteId=...&from=...),
 * so a filtered view can be bookmarked or shared, and the dashboard can link to it.
 */
export const SubmissionsPage: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<'list' | 'sites'>('list');
  const today = localDate();

  const filters: SubmissionFilters = {
    siteId: params.get('siteId') ?? '',
    userId: params.get('userId') ?? '',
    from: params.get('from') ?? addDays(today, -6),
    to: params.get('to') ?? today,
    status: (params.get('status') as SubmissionStatus) ?? '',
  };

  const sites = useSites();
  const workers = useWorkers();
  const { data, isLoading, error, refetch } = useSubmissions(filters);

  const setFilter = (key: (typeof FILTER_KEYS)[number], value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next, { replace: true });
  };

  const clear = () => setParams(new URLSearchParams(), { replace: true });
  const groups = data ? groupBySite(data) : [];

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Submissions</h1>
          <p>
            {data ? `${data.length} form${data.length === 1 ? '' : 's'}` : ' '} · filter by site, worker
            and date
          </p>
        </div>
        <div className="tabs" role="group" aria-label="View">
          <button type="button" aria-pressed={view === 'list'} onClick={() => setView('list')}>
            List
          </button>
          <button type="button" aria-pressed={view === 'sites'} onClick={() => setView('sites')}>
            By site
          </button>
        </div>
      </div>

      <section className="card" style={{ marginBottom: 16 }}>
        <div className="filters">
          <div className="field">
            <label htmlFor="f-site" className="small">
              Site
            </label>
            <select
              id="f-site"
              className="select"
              value={filters.siteId}
              onChange={(e) => setFilter('siteId', e.target.value)}
            >
              <option value="">All sites</option>
              {sites.data?.map((s) => (
                <option key={s.siteId} value={s.siteId}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-worker" className="small">
              Worker
            </label>
            <select
              id="f-worker"
              className="select"
              value={filters.userId}
              onChange={(e) => setFilter('userId', e.target.value)}
            >
              <option value="">All workers</option>
              {workers.data?.map((w) => (
                <option key={w.userId} value={w.userId}>
                  {w.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label htmlFor="f-from" className="small">
              From
            </label>
            <input
              id="f-from"
              type="date"
              className="input"
              value={filters.from}
              max={filters.to}
              onChange={(e) => setFilter('from', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-to" className="small">
              To
            </label>
            <input
              id="f-to"
              type="date"
              className="input"
              value={filters.to}
              min={filters.from}
              max={today}
              onChange={(e) => setFilter('to', e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="f-status" className="small">
              Status
            </label>
            <select
              id="f-status"
              className="select"
              value={filters.status}
              onChange={(e) => setFilter('status', e.target.value)}
            >
              <option value="">Any status</option>
              <option value={SubmissionStatus.PASS}>All clear</option>
              <option value={SubmissionStatus.ATTENTION}>Needs attention</option>
            </select>
          </div>
          <button type="button" className="btn btn--secondary" onClick={clear}>
            Reset
          </button>
        </div>
      </section>

      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="No submissions match these filters">
          <button type="button" className="link-btn" onClick={clear}>
            Reset filters
          </button>
        </EmptyState>
      )}

      {data && data.length > 0 && view === 'list' && (
        <section className="card">
          <SubmissionList items={data} basePath="/admin/submissions" />
        </section>
      )}

      {data && data.length > 0 && view === 'sites' && (
        <div className="grid grid--2">
          {groups.map((g) => (
            <section className="card" key={g.siteId} style={{ marginTop: 0 }}>
              <div className="card__title">
                <h2>{g.site}</h2>
                <button type="button" className="link-btn small" onClick={() => {
                  setFilter('siteId', g.siteId);
                  setView('list');
                }}>
                  {g.count} form{g.count === 1 ? '' : 's'} →
                </button>
              </div>
              <div className="chips">
                {g.workers.map((w) => (
                  <span className="chip" key={w.name}>
                    {w.name} · {w.count}
                  </span>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </main>
  );
};
