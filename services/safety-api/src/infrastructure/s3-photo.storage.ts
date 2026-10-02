import {
  CopyObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createPresignedPost } from '@aws-sdk/s3-presigned-post';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'node:crypto';

import { extensionFor, PHOTO_RULES } from '@ras/shared';

import { BusinessRuleError } from '../application/errors';
import { IPhotoStorage, StoredPhoto } from '../application/ports';

const s3 = new S3Client({});

const UPLOAD_URL_TTL_SECONDS = 5 * 60; // 5 min to start the upload
const VIEW_URL_TTL_SECONDS = 15 * 60; // 15 min to view a photo

/**
 * Photo flow:
 *  1. Browser asks for an upload form -> file goes straight to S3 at pending/<userId>/<uuid>.<ext>
 *     (Lambda never handles the bytes; S3 policy enforces type + max size).
 *  2. When the form is submitted, the file is moved to submissions/<submissionId>/<photoId>.<ext>.
 *  3. A lifecycle rule deletes anything left in pending/ after 1 day (abandoned forms).
 */
export class S3PhotoStorage implements IPhotoStorage {
  private get bucket(): string {
    const b = process.env.PHOTO_BUCKET;
    if (!b) throw new Error('PHOTO_BUCKET env variable is not set');
    return b;
  }

  async createUploadUrl(userId: string, contentType: string) {
    const photoKey = `pending/${userId}/${randomUUID()}.${extensionFor(contentType)}`;
    const { url, fields } = await createPresignedPost(s3, {
      Bucket: this.bucket,
      Key: photoKey,
      Conditions: [
        ['content-length-range', 1, PHOTO_RULES.maxSizeBytes],
        ['eq', '$Content-Type', contentType],
      ],
      Fields: { 'Content-Type': contentType },
      Expires: UPLOAD_URL_TTL_SECONDS,
    });
    return { url, fields, photoKey };
  }

  isOwnPendingKey(userId: string, key: string): boolean {
    return key.startsWith(`pending/${userId}/`) && !key.includes('..');
  }

  async attachToSubmission(
    pendingKey: string,
    submissionId: string,
    photoId: string,
  ): Promise<StoredPhoto> {
    let head;
    try {
      head = await s3.send(new HeadObjectCommand({ Bucket: this.bucket, Key: pendingKey }));
    } catch {
      throw new BusinessRuleError('A photo upload was not found - please re-attach your photos', 'photoKeys');
    }

    const contentType = head.ContentType ?? 'image/jpeg';
    const ext = pendingKey.split('.').pop() ?? extensionFor(contentType);
    const s3Key = `submissions/${submissionId}/${photoId}.${ext}`;

    await s3.send(
      new CopyObjectCommand({
        Bucket: this.bucket,
        CopySource: `${this.bucket}/${pendingKey}`, // keys only contain [a-z0-9-/.]
        Key: s3Key,
      }),
    );
    await s3.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: pendingKey }));

    return { s3Key, contentType, sizeBytes: head.ContentLength ?? 0 };
  }

  getViewUrl(s3Key: string): Promise<string> {
    return getSignedUrl(s3, new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }), {
      expiresIn: VIEW_URL_TTL_SECONDS,
    });
  }
}
