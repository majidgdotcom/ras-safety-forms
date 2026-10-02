import { randomUUID } from 'node:crypto';

import {
  addDays,
  ChecklistAnswer,
  CreateSubmissionInput,
  SiteEntity,
  SubmissionEntity,
  SubmissionStatus,
} from '@ras/shared';

import { BusinessRuleError } from '../application/errors';
import { Caller } from './caller';

/** How many days back a framer may file a late form. */
export const MAX_DAYS_BACK = 7;

/**
 * Pure business rules for a safety submission.
 * No AWS, no HTTP - easy to unit test and easy to explain.
 */
export const SubmissionDomain = {
  /** ATTENTION if any answer is "NO", otherwise PASS. */
  computeStatus(checklist: Record<string, ChecklistAnswer>): SubmissionStatus {
    return Object.values(checklist).includes('NO')
      ? SubmissionStatus.ATTENTION
      : SubmissionStatus.PASS;
  },

  /** A form can be for today or up to MAX_DAYS_BACK days ago - never the future. */
  assertDateAllowed(date: string, today: string): void {
    if (date > today) {
      throw new BusinessRuleError('Date cannot be in the future', 'date');
    }
    if (date < addDays(today, -MAX_DAYS_BACK)) {
      throw new BusinessRuleError(`Date cannot be more than ${MAX_DAYS_BACK} days ago`, 'date');
    }
  },

  /** Build a new submission. Worker and site names are copied so history stays correct. */
  create(params: {
    caller: Caller;
    site: SiteEntity;
    input: CreateSubmissionInput;
    photoCount: number;
    now?: Date;
  }): SubmissionEntity {
    const { caller, site, input, photoCount } = params;
    return {
      submissionId: randomUUID(),
      userId: caller.userId,
      workerName: caller.name,
      siteId: site.siteId,
      siteName: site.name,
      date: input.date,
      checklist: input.checklist,
      notes: input.notes.trim(),
      status: SubmissionDomain.computeStatus(input.checklist),
      photoCount,
      createdAt: (params.now ?? new Date()).toISOString(),
    };
  },
};
