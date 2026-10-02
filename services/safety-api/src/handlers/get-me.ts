import { MeDto } from '@ras/shared';

import { getCaller, response, withErrorHandling } from './_base';
import { users } from './_container';

/** GET /me - who am I? Also keeps the user's profile row in DynamoDB up to date. */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  await users.upsert(caller);
  const me: MeDto = caller;
  return response(200, { success: true, data: me });
});
