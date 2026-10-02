import { CreateSubmissionSchema } from '@ras/shared';

import { AdminUseCases } from '../../src/application/admin.use-cases';
import { ForbiddenError } from '../../src/application/errors';
import { SubmissionUseCases } from '../../src/application/submission.use-cases';
import { roleFromGroups } from '../../src/handlers/_base';
import {
  admin,
  allYes,
  asUser,
  FakePhotoStorage,
  FakeSiteRepo,
  FakeSubmissionRepo,
  FakeUserRepo,
  framerA,
  framerB,
  sites,
  TODAY,
} from './fakes';

describe('AdminUseCases.getSummary', () => {
  async function setup() {
    const submissions = new FakeSubmissionRepo();
    const siteRepo = new FakeSiteRepo(sites);
    const deps = { submissions, sites: siteRepo, today: () => TODAY };
    const subs = new SubmissionUseCases({ ...deps, photos: new FakePhotoStorage() });
    const adminUc = new AdminUseCases({
      ...deps,
      users: new FakeUserRepo([asUser(framerA), asUser(framerB), asUser(admin)]),
    });

    // Only framer A submits today, with one NO answer
    await subs.createSubmission(
      framerA,
      CreateSubmissionSchema.parse({
        siteId: 's1',
        date: TODAY,
        checklist: { ...allYes, fallProtection: 'NO' },
        notes: 'Guardrail missing on 2nd floor',
        photoKeys: [`pending/${framerA.userId}/p.jpg`],
      }),
    );
    return adminUc;
  }

  it('counts per site and lists who has NOT submitted today', async () => {
    const summary = await (await setup()).getSummary(admin);

    expect(summary.totalFramers).toBe(2);
    expect(summary.submittedToday).toBe(1);
    expect(summary.attentionToday).toBe(1);
    expect(summary.notSubmittedToday.map((u) => u.name)).toEqual(['Bea Framer']);

    const maple = summary.sitesToday.find((s) => s.siteId === 's1')!;
    expect(maple.workers).toEqual(['Alex Framer']);
    // inactive site with no submissions is hidden
    expect(summary.sitesToday.find((s) => s.siteId === 's3')).toBeUndefined();
    expect(summary.last14Days).toHaveLength(14);
    expect(summary.last14Days.at(-1)).toEqual({ date: TODAY, submissions: 1 });
  });

  it('is admin-only', async () => {
    await expect((await setup()).getSummary(framerA)).rejects.toBeInstanceOf(ForbiddenError);
  });
});

describe('roleFromGroups', () => {
  it('reads the different shapes of the cognito:groups claim', () => {
    expect(roleFromGroups('Framer')).toBe('FRAMER');
    expect(roleFromGroups('[Framer, Admin]')).toBe('ADMIN');
    expect(roleFromGroups(['Admin'])).toBe('ADMIN');
    expect(() => roleFromGroups(undefined)).toThrow(ForbiddenError);
  });
});
