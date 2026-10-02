import { UploadUrlDto } from '@ras/shared';

import { api, ApiError } from '@/config/api-client';

/**
 * Uploads one photo straight to S3:
 *  1. ask our API for a signed upload form (checks type/size, picks the S3 key)
 *  2. POST the file to S3 with that form
 * Returns the S3 key to send with the submission.
 */
export async function uploadPhoto(file: File): Promise<string> {
  const upload = await api.post<UploadUrlDto>('/photos/upload-url', {
    contentType: file.type,
    sizeBytes: file.size,
  });

  const form = new FormData();
  Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v));
  form.append('file', file); // must be the LAST field for S3

  let res: Response;
  try {
    res = await fetch(upload.url, { method: 'POST', body: form });
  } catch {
    throw new ApiError(0, 'Photo upload failed - check your connection and try again.');
  }
  if (!res.ok) throw new ApiError(res.status, `Photo upload was rejected (${res.status}).`);
  return upload.photoKey;
}
