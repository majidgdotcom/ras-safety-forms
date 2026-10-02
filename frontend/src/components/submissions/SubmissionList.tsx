import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { SubmissionEntity } from '@ras/shared';

import { toSubmissionRow } from '@/viewmodels/submission.viewmodel';

interface Props {
  items: SubmissionEntity[];
  /** e.g. "/admin/submissions" or "/my-forms" */
  basePath: string;
  showWorker?: boolean;
}

/** Table on desktop, cards on phones. Same data, two layouts. */
export const SubmissionList: React.FC<Props> = ({ items, basePath, showWorker = true }) => {
  const navigate = useNavigate();
  const rows = items.map(toSubmissionRow);

  return (
    <>
      <div className="only-desktop table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              {showWorker && <th>Worker</th>}
              <th>Site</th>
              <th>Status</th>
              <th>Photos</th>
              <th>Submitted</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} onClick={() => navigate(`${basePath}/${r.id}`)}>
                <td>
                  <Link to={`${basePath}/${r.id}`} onClick={(e) => e.stopPropagation()}>
                    {r.dateLabel}
                  </Link>
                </td>
                {showWorker && <td>{r.worker}</td>}
                <td>{r.site}</td>
                <td>
                  <span className={`badge ${r.statusClass}`}>{r.statusLabel}</span>
                  {r.issues.length > 0 && (
                    <div className="small muted">{r.issues.join(', ')}</div>
                  )}
                </td>
                <td>{r.photoCount}</td>
                <td className="muted">{r.submittedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ul className="only-mobile list-cards">
        {rows.map((r) => (
          <li key={r.id}>
            <Link className="list-card" to={`${basePath}/${r.id}`}>
              <div className="list-card__row">
                <strong>{showWorker ? r.worker : r.site}</strong>
                <span className={`badge ${r.statusClass}`}>{r.statusLabel}</span>
              </div>
              <div className="small muted">
                {showWorker && <>{r.site} · </>}
                {r.dateLabel} · {r.submittedAt} · {r.photoCount} photo{r.photoCount === 1 ? '' : 's'}
              </div>
              {r.issues.length > 0 && <div className="small">⚠ {r.issues.join(', ')}</div>}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
};
