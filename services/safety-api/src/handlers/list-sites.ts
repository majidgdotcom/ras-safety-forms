import { response, withErrorHandling } from './_base';
import { submissionUseCases } from './_container';

/** GET /sites - active job sites for the form dropdown and admin filters. */
export const handler = withErrorHandling(async () => {
  const sites = await submissionUseCases.listActiveSites();
  return response(200, { success: true, data: sites });
});
