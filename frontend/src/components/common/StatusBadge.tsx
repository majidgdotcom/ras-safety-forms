import React from 'react';

import { SubmissionStatus } from '@ras/shared';

export const StatusBadge: React.FC<{ status: SubmissionStatus }> = ({ status }) =>
  status === SubmissionStatus.PASS ? (
    <span className="badge badge--pass">All clear</span>
  ) : (
    <span className="badge badge--attention">Needs attention</span>
  );
