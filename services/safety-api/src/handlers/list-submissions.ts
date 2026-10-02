import { ListSubmissionsQuerySchema } from '@ras/shared';

import { getCaller, response, withErrorHandling } from './_base';
import { submissionUseCases } from './_container';

/**
 * GET /submissions?siteId=&userId=&from=&to=&status=
 * Framers always get only their own; admins get everyone (with filters).
 */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  const query = ListSubmissionsQuerySchema.parse(event.queryStringParameters ?? {});
  const items = await submissionUseCases.listSubmissions(caller, query);
  return response(200, { success: true, data: items });
});
