import { getCaller, response, withErrorHandling } from './_base';
import { submissionUseCases } from './_container';

/** GET /submissions/{submissionId} - full detail incl. signed photo URLs. */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  const id = event.pathParameters?.submissionId ?? '';
  const detail = await submissionUseCases.getSubmission(caller, id);
  return response(200, { success: true, data: detail });
});
