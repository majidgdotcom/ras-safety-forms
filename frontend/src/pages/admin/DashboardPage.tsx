import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { localDate } from '@ras/shared';

import { DailyChart } from '@/components/admin/DailyChart';
import { EmptyState, ErrorMessage, Spinner } from '@/components/common/Feedback';
import { toQuery } from '@/config/api-client';
import { useAdminSummary } from '@/services/safety.service';
import { formatDay } from '@/utils/format';

/** Admin home: today's numbers, who hasn't submitted, per-site breakdown, 14-day chart. */
export const DashboardPage: React.FC = () => {
  const today = localDate();
  const [date, setDate] = useState(today);
  const { data, isLoading, error, refetch, isFetching } = useAdminSummary(date);

  const listLink = (extra: Record<string, string> = {}) =>
    `/admin/submissions${toQuery({ from: date, to: date, ...extra })}`;

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1>Safety dashboard</h1>
          <p>{formatDay(date)}{date === today ? ' (today)' : ''}</p>
        </div>
        <div className="field" style={{ minWidth: 180 }}>
          <label htmlFor="dash-date" className="small">
            Show day
          </label>
          <input
            id="dash-date"
            type="date"
            className="input"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value || today)}
          />
        </div>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}

      {data && (
        <div style={{ opacity: isFetching ? 0.6 : 1, transition: 'opacity .2s' }}>
          <div className="kpis">
            <div className="kpi">
              <div className="kpi__value">
                {data.submittedToday}
                <span className="muted" style={{ fontSize: '1.1rem' }}>
                  {' '}
                  / {data.totalFramers}
                </span>
              </div>
              <div className="kpi__label">Framers submitted</div>
            </div>
            <div className={`kpi${data.notSubmittedToday.length ? ' kpi--warn' : ''}`}>
              <div className="kpi__value">{data.notSubmittedToday.length}</div>
              <div className="kpi__label">Not submitted yet</div>
            </div>
            <Link
              to={listLink({ status: 'ATTENTION' })}
              className={`kpi${data.attentionToday ? ' kpi--warn' : ''}`}
              style={{ textDecoration: 'none', color: 'inherit' }}
            >
              <div className="kpi__value">{data.attentionToday}</div>
              <div className="kpi__label">Forms needing attention →</div>
            </Link>
            <div className="kpi">
              <div className="kpi__value">
                {data.sitesToday.filter((s) => s.submissions > 0).length}
              </div>
              <div className="kpi__label">Sites with forms</div>
            </div>
          </div>

          <div className="grid grid--dash">
            <section className="card">
              <div className="card__title">
                <h2>Forms by site</h2>
                <Link className="small" to={listLink()}>
                  Open list →
                </Link>
              </div>
              {data.sitesToday.length === 0 ? (
                <EmptyState title="No sites yet" />
              ) : (
                <div className="table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>Site</th>
                        <th>Forms</th>
                        <th>Who submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.sitesToday.map((s) => (
                        <tr key={s.siteId}>
                          <td>
                            <Link to={listLink({ siteId: s.siteId })}>{s.siteName}</Link>
                            {s.attention > 0 && (
                              <div>
                                <span className="badge badge--attention">{s.attention} need attention</span>
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{s.submissions}</strong>
                          </td>
                          <td>
                            {s.workers.length ? (
                              <div className="chips">
                                {s.workers.map((w) => (
                                  <span className="chip" key={w}>
                                    {w}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="muted small">No forms</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="card">
              <div className="card__title">
                <h2>Not submitted</h2>
                <span className="small muted">{data.notSubmittedToday.length} framers</span>
              </div>
              {data.notSubmittedToday.length === 0 ? (
                <p className="alert alert--success" style={{ margin: 0 }}>
                  ✓ Every framer has submitted.
                </p>
              ) : (
                <ul className="list-cards">
                  {data.notSubmittedToday.map((u) => (
                    <li key={u.userId} className="list-card" style={{ padding: '10px 12px' }}>
                      <strong>{u.name}</strong>
                      <div className="small muted">{u.email}</div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>

          <section className="card" style={{ marginTop: 16 }}>
            <div className="card__title">
              <h2>Forms submitted per day</h2>
              <span className="small muted">Last 14 days</span>
            </div>
            <DailyChart data={data.last14Days} />
          </section>
        </div>
      )}
    </main>
  );
};
