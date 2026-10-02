import { CreateSubmissionSchema, SubmissionStatus } from '@ras/shared';

import { BusinessRuleError, ConflictError, ForbiddenError, NotFoundError } from '../../src/application/errors';
import { SubmissionUseCases } from '../../src/application/submission.use-cases';
import {
  admin,
  allYes,
  FakePhotoStorage,
  FakeSiteRepo,
  FakeSubmissionRepo,
  framerA,
  framerB,
  sites,
  TODAY,
} from './fakes';

function setup() {
  const submissions = new FakeSubmissionRepo();
  const useCases = new SubmissionUseCases({
    submissions,
    sites: new FakeSiteRepo(sites),
    photos: new FakePhotoStorage(),
    today: () => TODAY,
  });
  return { submissions, useCases };
}

const validInput = (overrides: Record<string, unknown> = {}) =>
  CreateSubmissionSchema.parse({
    siteId: 's1',
    date: TODAY,
    checklist: allYes,
    notes: '',
    photoKeys: [`pending/${framerA.userId}/p1.jpg`],
    ...overrides,
  });

describe('SubmissionUseCases.createSubmission', () => {
  it('creates a PASS submission with photos and copies worker/site names', async () => {
    const { useCases, submissions } = setup();
    const s = await useCases.createSubmission(framerA, validInput());

    expect(s.status).toBe(SubmissionStatus.PASS);
    expect(s.workerName).toBe('Alex Framer');
    expect(s.siteName).toBe('Maple Grove Townhomes');
    expect(submissions.photos).toHaveLength(1);
    expect(submissions.photos[0].s3Key).toMatch(/^submissions\//);
  });

  it('marks the submission ATTENTION when any answer is NO', async () => {
    const { useCases } = setup();
    const s = await useCases.createSubmission(
      framerA,
      validInput({ checklist: { ...allYes, toolsCords: 'NO' }, notes: 'Saw cord is damaged' }),
    );
    expect(s.status).toBe(SubmissionStatus.ATTENTION);
  });

  it('rejects a second form for the same site and day', async () => {
    const { useCases } = setup();
    await useCases.createSubmission(framerA, validInput());
    await expect(useCases.createSubmission(framerA, validInput())).rejects.toBeInstanceOf(ConflictError);
  });

  it('rejects future dates and inactive sites', async () => {
    const { useCases } = setup();
    await expect(useCases.createSubmission(framerA, validInput({ date: '2026-10-03' }))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
    await expect(useCases.createSubmission(framerA, validInput({ siteId: 's3' }))).rejects.toBeInstanceOf(
      BusinessRuleError,
    );
  });

  it("rejects photos uploaded by someone else", async () => {
    const { useCases } = setup();
    await expect(
      useCases.createSubmission(framerA, validInput({ photoKeys: [`pending/${framerB.userId}/p.jpg`] })),
    ).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('SubmissionUseCases.listSubmissions / getSubmission (roles)', () => {
  async function seeded() {
    const ctx = setup();
    const a = await ctx.useCases.createSubmission(framerA, validInput());
    const b = await ctx.useCases.createSubmission(
      framerB,
      validInput({ siteId: 's2', photoKeys: [`pending/${framerB.userId}/p.jpg`] }),
    );
    return { ...ctx, a, b };
  }
  const q = (extra = {}) => ({ limit: 200, ...extra });

  it('a framer only sees their own submissions, even if they ask for another userId', async () => {
    const { useCases } = await seeded();
    const list = await useCases.listSubmissions(framerA, q({ userId: framerB.userId }));
    expect(list.map((s) => s.userId)).toEqual([framerA.userId]);
  });

  it('an admin sees everyone and can filter by site', async () => {
    const { useCases } = await seeded();
    expect(await useCases.listSubmissions(admin, q())).toHaveLength(2);
    const bySite = await useCases.listSubmissions(admin, q({ siteId: 's2' }));
    expect(bySite.map((s) => s.workerName)).toEqual(['Bea Framer']);
  });

  it("a framer cannot open someone else's submission (404)", async () => {
    const { useCases, b } = await seeded();
    await expect(useCases.getSubmission(framerA, b.submissionId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it('detail includes signed photo URLs and hides the S3 key', async () => {
    const { useCases, a } = await seeded();
    const detail = await useCases.getSubmission(admin, a.submissionId);
    expect(detail.photos[0].url).toMatch(/^https:\/\/signed\.example\//);
    expect(detail.photos[0]).not.toHaveProperty('s3Key');
  });
});

describe('CreateSubmissionSchema', () => {
  it('requires notes when any answer is NO', () => {
    const r = CreateSubmissionSchema.safeParse({
      siteId: 's1',
      date: TODAY,
      checklist: { ...allYes, ppeHardHat: 'NO' },
      notes: '',
      photoKeys: ['k'],
    });
    expect(r.success).toBe(false);
  });

  it('requires at least one photo and every checklist answer', () => {
    expect(
      CreateSubmissionSchema.safeParse({ siteId: 's1', date: TODAY, checklist: allYes, photoKeys: [] }).success,
    ).toBe(false);
    const { ppeVest: _omit, ...missing } = allYes;
    expect(
      CreateSubmissionSchema.safeParse({ siteId: 's1', date: TODAY, checklist: missing, photoKeys: ['k'] }).success,
    ).toBe(false);
  });
});
