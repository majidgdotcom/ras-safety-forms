import { CreateUploadUrlSchema } from '@ras/shared';

import { getCaller, parseBody, response, withErrorHandling } from './_base';
import { submissionUseCases } from './_container';

/** POST /photos/upload-url - returns a signed S3 form so the browser uploads the photo directly. */
export const handler = withErrorHandling(async (event) => {
  const caller = getCaller(event);
  const input = CreateUploadUrlSchema.parse(parseBody(event));
  const upload = await submissionUseCases.createUploadUrl(caller, input);
  return response(201, { success: true, data: upload });
});
