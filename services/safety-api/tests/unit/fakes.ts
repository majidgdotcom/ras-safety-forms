import { PhotoEntity, Role, SiteEntity, SubmissionEntity, UserEntity } from '@ras/shared';

import { ConflictError } from '../../src/application/errors';
import {
  DateRange,
  IPhotoStorage,
  ISiteRepository,
  ISubmissionRepository,
  IUserRepository,
} from '../../src/application/ports';
import { Caller } from '../../src/domain/caller';

/** In-memory versions of the ports - no AWS needed in unit tests. */

const inRange = (d: string, r: DateRange) => d >= r.from && d <= r.to;

export class FakeSubmissionRepo implements ISubmissionRepository {
  items: SubmissionEntity[] = [];
  photos: PhotoEntity[] = [];

  async create(s: SubmissionEntity, photos: PhotoEntity[]) {
    if (await this.existsForDay(s.userId, s.siteId, s.date)) throw new ConflictError('dup');
    this.items.push(s);
    this.photos.push(...photos);
  }
  async findById(id: string) {
    const submission = this.items.find((s) => s.submissionId === id);
    return submission
      ? { submission, photos: this.photos.filter((p) => p.submissionId === id) }
      : null;
  }
  async existsForDay(userId: string, siteId: string, date: string) {
    return this.items.some((s) => s.userId === userId && s.siteId === siteId && s.date === date);
  }
  async listByUser(userId: string, r: DateRange) {
    return this.items.filter((s) => s.userId === userId && inRange(s.date, r));
  }
  async listBySite(siteId: string, r: DateRange) {
    return this.items.filter((s) => s.siteId === siteId && inRange(s.date, r));
  }
  async listAll(r: DateRange) {
    return this.items.filter((s) => inRange(s.date, r));
  }
}

export class FakeSiteRepo implements ISiteRepository {
  constructor(public sites: SiteEntity[]) {}
  async list() {
    return this.sites;
  }
  async findById(id: string) {
    return this.sites.find((s) => s.siteId === id) ?? null;
  }
}

export class FakeUserRepo implements IUserRepository {
  constructor(public users: UserEntity[]) {}
  async listByRole(role: Role) {
    return this.users.filter((u) => u.role === role);
  }
  async upsert() {}
}

export class FakePhotoStorage implements IPhotoStorage {
  async createUploadUrl(userId: string) {
    return { url: 'https://s3.example', fields: {}, photoKey: `pending/${userId}/x.jpg` };
  }
  isOwnPendingKey(userId: string, key: string) {
    return key.startsWith(`pending/${userId}/`);
  }
  async attachToSubmission(_key: string, submissionId: string, photoId: string) {
    return { s3Key: `submissions/${submissionId}/${photoId}.jpg`, contentType: 'image/jpeg', sizeBytes: 1000 };
  }
  async getViewUrl(key: string) {
    return `https://signed.example/${key}`;
  }
}

// ── Test data ────────────────────────────────────────────────────────────────
export const TODAY = '2026-10-02';

export const framerA: Caller = { userId: 'u-a', email: 'a@ras.test', name: 'Alex Framer', role: Role.FRAMER };
export const framerB: Caller = { userId: 'u-b', email: 'b@ras.test', name: 'Bea Framer', role: Role.FRAMER };
export const admin: Caller = { userId: 'u-admin', email: 'boss@ras.test', name: 'Sam Super', role: Role.ADMIN };

export const sites: SiteEntity[] = [
  { siteId: 's1', name: 'Maple Grove Townhomes', address: 'Langford, BC', active: true, createdAt: '' },
  { siteId: 's2', name: 'Harbourview Rentals', address: 'Victoria, BC', active: true, createdAt: '' },
  { siteId: 's3', name: 'Old Closed Site', address: 'Sooke, BC', active: false, createdAt: '' },
];

export const allYes = {
  ppeHardHat: 'YES',
  ppeVest: 'YES',
  ppeBoots: 'YES',
  ppeEyeProtection: 'YES',
  fallProtection: 'YES',
  laddersScaffolding: 'NA',
  toolsCords: 'YES',
  hazardsIdentified: 'YES',
} as const;

export const asUser = (c: Caller): UserEntity => ({ ...c, createdAt: '' });
