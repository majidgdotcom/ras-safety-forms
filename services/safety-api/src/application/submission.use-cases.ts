import { randomUUID } from 'node:crypto';

import {
  addDays,
  CreateSubmissionInput,
  CreateUploadUrlInput,
  ListSubmissionsQuery,
  localDate,
  PhotoEntity,
  SiteEntity,
  SubmissionDetailDto,
  SubmissionEntity,
  UploadUrlDto,
} from '@ras/shared';

import { Caller, isAdmin } from '../domain/caller';
import { SubmissionDomain } from '../domain/submission.domain';
import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from './errors';
import { DateRange, IPhotoStorage, ISiteRepository, ISubmissionRepository } from './ports';

/** Default list window when the client does not send from/to. */
export const DEFAULT_RANGE_DAYS = 30;

export interface SubmissionDeps {
  submissions: ISubmissionRepository;
  sites: ISiteRepository;
  photos: IPhotoStorage;
  /** Injected so tests can freeze "today". */
  today?: () => string;
}

export class SubmissionUseCases {
  private readonly today: () => string;

  constructor(private readonly deps: SubmissionDeps) {
    this.today = deps.today ?? (() => localDate());
  }

  async listActiveSites(): Promise<SiteEntity[]> {
    const sites = await this.deps.sites.list();
    return sites.filter((s) => s.active).sort((a, b) => a.name.localeCompare(b.name));
  }

  /** Step 1 of a photo upload: give the browser a signed S3 form to upload directly to. */
  async createUploadUrl(caller: Caller, input: CreateUploadUrlInput): Promise<UploadUrlDto> {
    return this.deps.photos.createUploadUrl(caller.userId, input.contentType);
  }

  /** Step 2: create the submission, referencing the photos uploaded in step 1. */
  async createSubmission(caller: Caller, input: CreateSubmissionInput): Promise<SubmissionEntity> {
    SubmissionDomain.assertDateAllowed(input.date, this.today());

    const site = await this.deps.sites.findById(input.siteId);
    if (!site || !site.active) throw new BusinessRuleError('Selected job site does not exist', 'siteId');

    // A framer can only attach photos they uploaded themselves.
    const foreignKey = input.photoKeys.find((k) => !this.deps.photos.isOwnPendingKey(caller.userId, k));
    if (foreignKey) throw new ForbiddenError('One of the photos does not belong to you');

    // Friendly early check (the DB transaction also enforces this, to handle races).
    if (await this.deps.submissions.existsForDay(caller.userId, site.siteId, input.date)) {
      throw new ConflictError(
        `You already submitted a safety form for ${site.name} on ${input.date}`,
      );
    }

    const submission = SubmissionDomain.create({
      caller,
      site,
      input,
      photoCount: input.photoKeys.length,
    });

    const photos: PhotoEntity[] = [];
    for (const key of input.photoKeys) {
      const photoId = randomUUID();
      const stored = await this.deps.photos.attachToSubmission(key, submission.submissionId, photoId);
      photos.push({
        photoId,
        submissionId: submission.submissionId,
        s3Key: stored.s3Key,
        contentType: stored.contentType,
        sizeBytes: stored.sizeBytes,
        uploadedAt: submission.createdAt,
      });
    }

    await this.deps.submissions.create(submission, photos);
    return submission;
  }

  /**
   * Role-aware list:
   *  - Framer: ALWAYS only their own submissions (userId filter is forced).
   *  - Admin: everything, optionally filtered by site / worker / status / date range.
   */
  async listSubmissions(caller: Caller, query: ListSubmissionsQuery): Promise<SubmissionEntity[]> {
    const range = this.resolveRange(query);
    const userId = isAdmin(caller) ? query.userId : caller.userId;

    // Pick the most selective index, then apply the remaining filters in memory.
    let items: SubmissionEntity[];
    if (userId) items = await this.deps.submissions.listByUser(userId, range);
    else if (query.siteId) items = await this.deps.submissions.listBySite(query.siteId, range);
    else items = await this.deps.submissions.listAll(range);

    return items
      .filter((s) => !query.siteId || s.siteId === query.siteId)
      .filter((s) => !query.status || s.status === query.status)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
      .slice(0, query.limit);
  }

  async getSubmission(caller: Caller, submissionId: string): Promise<SubmissionDetailDto> {
    const found = await this.deps.submissions.findById(submissionId);
    if (!found) throw new NotFoundError('Submission not found');

    // Framers may only open their own forms. Return 404 (not 403) so IDs cannot be probed.
    if (!isAdmin(caller) && found.submission.userId !== caller.userId) {
      throw new NotFoundError('Submission not found');
    }

    const photos = await Promise.all(
      found.photos.map(async ({ s3Key, ...photo }) => ({
        ...photo,
        url: await this.deps.photos.getViewUrl(s3Key),
      })),
    );
    return { ...found.submission, photos };
  }

  private resolveRange(query: ListSubmissionsQuery): DateRange {
    const to = query.to ?? this.today();
    const from = query.from ?? addDays(to, -(DEFAULT_RANGE_DAYS - 1));
    return { from, to };
  }
}
