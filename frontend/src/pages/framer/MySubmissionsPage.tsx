import React from 'react';
import { Link } from 'react-router-dom';

import { EmptyState, ErrorMessage, Spinner } from '@/components/common/Feedback';
import { SubmissionList } from '@/components/submissions/SubmissionList';
import { useSubmissions } from '@/services/safety.service';

/** A framer's own submissions (last 30 days). The API only ever returns their own. */
export const MySubmissionsPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useSubmissions();

  return (
    <main className="page page--narrow">
      <div className="page-head">
        <div>
          <h1>My safety forms</h1>
          <p>Your submissions from the last 30 days.</p>
        </div>
        <Link className="btn btn--primary" to="/form">
          + New form
        </Link>
      </div>

      {isLoading && <Spinner />}
      {error && <ErrorMessage error={error} onRetry={() => refetch()} />}
      {data && data.length === 0 && (
        <EmptyState title="No forms yet">
          <Link to="/form">Fill in today's safety form</Link>
        </EmptyState>
      )}
      {data && data.length > 0 && (
        <SubmissionList items={data} basePath="/my-forms" showWorker={false} />
      )}
    </main>
  );
};
