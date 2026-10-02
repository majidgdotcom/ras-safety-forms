import { PhotoEntity, Role, SiteEntity, SubmissionEntity, UserEntity } from '@ras/shared';

/**
 * "Ports" = what the use-cases need from the outside world.
 * DynamoDB / S3 classes in ../infrastructure implement them;
 * unit tests use simple in-memory fakes instead.
 */

export interface DateRange {
  from: string; // YYYY-MM-DD inclusive
  to: string; // YYYY-MM-DD inclusive
}

export interface ISubmissionRepository {
  /** Saves the submission + its photo rows atomically. Throws ConflictError on duplicate day. */
  create(submission: SubmissionEntity, photos: PhotoEntity[]): Promise<void>;
  findById(
    submissionId: string,
  ): Promise<{ submission: SubmissionEntity; photos: PhotoEntity[] } | null>;
  existsForDay(userId: string, siteId: string, date: string): Promise<boolean>;
  listByUser(userId: string, range: DateRange): Promise<SubmissionEntity[]>;
  listBySite(siteId: string, range: DateRange): Promise<SubmissionEntity[]>;
  listAll(range: DateRange): Promise<SubmissionEntity[]>;
}

export interface ISiteRepository {
  list(): Promise<SiteEntity[]>;
  findById(siteId: string): Promise<SiteEntity | null>;
}

export interface IUserRepository {
  listByRole(role: Role): Promise<UserEntity[]>;
  upsert(user: Omit<UserEntity, 'createdAt'>): Promise<void>;
}

export interface StoredPhoto {
  s3Key: string;
  contentType: string;
  sizeBytes: number;
}

export interface IPhotoStorage {
  createUploadUrl(
    userId: string,
    contentType: string,
  ): Promise<{ url: string; fields: Record<string, string>; photoKey: string }>;
  /** Is this key one the given user uploaded? (pending/<userId>/...) */
  isOwnPendingKey(userId: string, key: string): boolean;
  /** Move an uploaded file from pending/ to submissions/<id>/ and return its stored info. */
  attachToSubmission(pendingKey: string, submissionId: string, photoId: string): Promise<StoredPhoto>;
  /** Short-lived URL the browser can use in an <img> tag. */
  getViewUrl(s3Key: string): Promise<string>;
}
