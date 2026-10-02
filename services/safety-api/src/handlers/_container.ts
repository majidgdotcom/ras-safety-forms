/**
 * Wires the real AWS adapters into the use-cases (simple manual dependency injection).
 * Created once per Lambda container, reused across invocations.
 */
import { AdminUseCases } from '../application/admin.use-cases';
import { SubmissionUseCases } from '../application/submission.use-cases';
import {
  DynamoSiteRepository,
  DynamoUserRepository,
} from '../infrastructure/dynamo-site-user.repositories';
import { DynamoSubmissionRepository } from '../infrastructure/dynamo-submission.repository';
import { S3PhotoStorage } from '../infrastructure/s3-photo.storage';

const submissions = new DynamoSubmissionRepository();
const sites = new DynamoSiteRepository();
export const users = new DynamoUserRepository();
const photos = new S3PhotoStorage();

export const submissionUseCases = new SubmissionUseCases({ submissions, sites, photos });
export const adminUseCases = new AdminUseCases({ submissions, sites, users });
