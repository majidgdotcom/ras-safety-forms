import { SummaryQuerySchema } from '@ras/shared';

import { getCaller, response, withErrorHandling } from './_base';
import { adminUseCases } from './_container';

/** GET /admin/summary?date=YYYY-MM-DD - dashboard numbers (admins only). */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  const { date } = SummaryQuerySchema.parse(event.queryStringParameters ?? {});
  const summary = await adminUseCases.getSummary(caller, date);
  return response(200, { success: true, data: summary });
});
