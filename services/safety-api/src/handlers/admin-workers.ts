import { getCaller, response, withErrorHandling } from './_base';
import { adminUseCases } from './_container';

/** GET /admin/workers - all framers, for the "worker" filter (admins only). */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  const workers = await adminUseCases.listWorkers(caller);
  return response(200, { success: true, data: workers });
});
