import { SubmissionEntity, SubmissionStatus } from '@ras/shared';

import { groupBySite, toSubmissionRow } from '@/viewmodels/submission.viewmodel';
import { validatePhoto } from '@/utils/image';

const base: SubmissionEntity = {
  submissionId: 'sub-1',
  userId: 'u1',
  workerName: 'Liam Carter',
  siteId: 's1',
  siteName: 'Goldstream Heights',
  date: '2026-10-02',
  checklist: { ppeHardHat: 'YES', fallProtection: 'NO' },
  notes: 'Guardrail missing',
  status: SubmissionStatus.ATTENTION,
  photoCount: 2,
  createdAt: '2026-10-02T14:30:00.000Z',
};

describe('toSubmissionRow', () => {
  it('maps status and lists the items answered No', () => {
    const row = toSubmissionRow(base);
    expect(row.statusLabel).toBe('Needs attention');
    expect(row.statusClass).toBe('badge--attention');
    expect(row.issues).toEqual(['Fall protection in place']);
    expect(row.dateLabel).toContain('Oct');
    expect(row.dateLabel).toContain('2026');
  });

  it('shows "All clear" for PASS', () => {
    expect(toSubmissionRow({ ...base, status: SubmissionStatus.PASS }).statusLabel).toBe('All clear');
  });
});

describe('groupBySite', () => {
  it('groups workers per site with counts', () => {
    const groups = groupBySite([
      base,
      { ...base, submissionId: 'sub-2', date: '2026-10-01' },
      { ...base, submissionId: 'sub-3', workerName: 'Emma Wilson' },
      { ...base, submissionId: 'sub-4', siteId: 's2', siteName: 'Sooke Basin Cottages' },
    ]);
    expect(groups[0]).toMatchObject({ site: 'Goldstream Heights', count: 3 });
    expect(groups[0].workers).toEqual([
      { name: 'Emma Wilson', count: 1 },
      { name: 'Liam Carter', count: 2 },
    ]);
    expect(groups[1].site).toBe('Sooke Basin Cottages');
  });
});

describe('validatePhoto', () => {
  it('rejects wrong types and big files', () => {
    const pdf = new File(['x'], 'a.pdf', { type: 'application/pdf' });
    expect(validatePhoto(pdf)).toMatch(/not a JPG/);
    const big = new File([new Uint8Array(11 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect(validatePhoto(big)).toMatch(/larger than 10 MB/);
    const ok = new File(['x'], 'ok.jpg', { type: 'image/jpeg' });
    expect(validatePhoto(ok)).toBeNull();
  });
});
