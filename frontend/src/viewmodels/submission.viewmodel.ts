import { checklistLabel, SubmissionEntity, SubmissionStatus } from '@ras/shared';

import { formatDay, formatTime } from '@/utils/format';

/** Pure data -> display transformation (no React), so it is easy to unit test. */
export interface SubmissionRowVM {
  id: string;
  worker: string;
  site: string;
  date: string;
  dateLabel: string;
  submittedAt: string;
  statusLabel: string;
  statusClass: 'badge--pass' | 'badge--attention';
  issues: string[]; // labels of items answered "No"
  photoCount: number;
}

export function toSubmissionRow(s: SubmissionEntity): SubmissionRowVM {
  const isPass = s.status === SubmissionStatus.PASS;
  return {
    id: s.submissionId,
    worker: s.workerName,
    site: s.siteName,
    date: s.date,
    dateLabel: formatDay(s.date),
    submittedAt: formatTime(s.createdAt),
    statusLabel: isPass ? 'All clear' : 'Needs attention',
    statusClass: isPass ? 'badge--pass' : 'badge--attention',
    issues: Object.entries(s.checklist)
      .filter(([, answer]) => answer === 'NO')
      .map(([key]) => checklistLabel(key)),
    photoCount: s.photoCount,
  };
}

export interface SiteGroupVM {
  siteId: string;
  site: string;
  count: number;
  workers: { name: string; count: number }[];
}

/** "Which people submitted on each site" view for the admin list. */
export function groupBySite(items: SubmissionEntity[]): SiteGroupVM[] {
  const map = new Map<string, SiteGroupVM>();
  for (const s of items) {
    const g = map.get(s.siteId) ?? { siteId: s.siteId, site: s.siteName, count: 0, workers: [] };
    g.count++;
    const w = g.workers.find((x) => x.name === s.workerName);
    if (w) w.count++;
    else g.workers.push({ name: s.workerName, count: 1 });
    map.set(s.siteId, g);
  }
  return [...map.values()]
    .map((g) => ({ ...g, workers: g.workers.sort((a, b) => a.name.localeCompare(b.name)) }))
    .sort((a, b) => b.count - a.count || a.site.localeCompare(b.site));
}
