/**
 * Domain entities shared by the API and the React app.
 * These are the "logical" shapes; see docs/ERD.md for how they map to DynamoDB items.
 */

export enum Role {
  ADMIN = 'ADMIN',
  FRAMER = 'FRAMER',
}

/** Cognito group names. Kept separate from Role so the UI/API never depends on group spelling. */
export const COGNITO_GROUP: Record<Role, string> = {
  [Role.ADMIN]: 'Admin',
  [Role.FRAMER]: 'Framer',
};

export interface UserEntity {
  userId: string; // Cognito "sub"
  email: string;
  name: string;
  role: Role;
  createdAt: string;
}

export interface SiteEntity {
  siteId: string;
  name: string;
  address: string;
  active: boolean;
  createdAt: string;
}

/** Answer for one checklist question. NA = not applicable today (e.g. no work at height). */
export type ChecklistAnswer = 'YES' | 'NO' | 'NA';

export enum SubmissionStatus {
  /** Every item answered YES or NA. */
  PASS = 'PASS',
  /** At least one item answered NO - a supervisor should look at it. */
  ATTENTION = 'ATTENTION',
}

export interface SubmissionEntity {
  submissionId: string;
  userId: string;
  workerName: string; // copied from the user at submit time (keeps history correct)
  siteId: string;
  siteName: string; // copied from the site at submit time
  date: string; // YYYY-MM-DD - the work day the form is for
  checklist: Record<string, ChecklistAnswer>;
  notes: string;
  status: SubmissionStatus;
  photoCount: number;
  createdAt: string; // ISO timestamp
}

export interface PhotoEntity {
  photoId: string;
  submissionId: string;
  s3Key: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}

/** Photo as returned by the API: includes a short-lived signed URL to view it. */
export interface PhotoDto extends Omit<PhotoEntity, 's3Key'> {
  url: string;
}

export interface SubmissionDetailDto extends SubmissionEntity {
  photos: PhotoDto[];
}

export interface MeDto {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export interface UploadUrlDto {
  /** S3 presigned POST target */
  url: string;
  /** Form fields that must be sent with the file (policy, signature, key...) */
  fields: Record<string, string>;
  /** Key to send back when creating the submission */
  photoKey: string;
}

export interface SiteSummaryDto {
  siteId: string;
  siteName: string;
  submissions: number;
  attention: number;
  workers: string[];
}

export interface DailyCountDto {
  date: string;
  submissions: number;
}

export interface AdminSummaryDto {
  date: string;
  totalFramers: number;
  submittedToday: number;
  attentionToday: number;
  sitesToday: SiteSummaryDto[];
  notSubmittedToday: Pick<UserEntity, 'userId' | 'name' | 'email'>[];
  last14Days: DailyCountDto[];
}
