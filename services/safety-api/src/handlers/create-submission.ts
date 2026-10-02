import { CreateSubmissionSchema, Role } from '@ras/shared';

import { ForbiddenError } from '../application/errors';
import { getCaller, parseBody, response, withErrorHandling } from './_base';
import { submissionUseCases } from './_container';

/** POST /submissions - a framer submits today's safety form. */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  if (caller.role !== Role.FRAMER) throw new ForbiddenError('Only framers submit safety forms');

  const input = CreateSubmissionSchema.parse(parseBody(event));
  const submission = await submissionUseCases.createSubmission(caller, input);
  return response(201, { success: true, data: submission });
});
