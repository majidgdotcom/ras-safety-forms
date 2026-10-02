import {
  addDays,
  AdminSummaryDto,
  dateRange,
  localDate,
  Role,
  SiteSummaryDto,
  SubmissionStatus,
  UserEntity,
} from '@ras/shared';

import { Caller, isAdmin } from '../domain/caller';
import { ForbiddenError } from './errors';
import { ISiteRepository, ISubmissionRepository, IUserRepository } from './ports';

export interface AdminDeps {
  submissions: ISubmissionRepository;
  sites: ISiteRepository;
  users: IUserRepository;
  today?: () => string;
}

export class AdminUseCases {
  private readonly today: () => string;

  constructor(private readonly deps: AdminDeps) {
    this.today = deps.today ?? (() => localDate());
  }

  async listWorkers(caller: Caller): Promise<UserEntity[]> {
    this.assertAdmin(caller);
    const framers = await this.deps.users.listByRole(Role.FRAMER);
    return framers.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Dashboard summary for one day:
   *  - per-site counts and who submitted
   *  - framers who have NOT submitted that day
   *  - submissions per day for the last 14 days (for the chart)
   */
  async getSummary(caller: Caller, date?: string): Promise<AdminSummaryDto> {
    this.assertAdmin(caller);
    const day = date ?? this.today();
    const from = addDays(day, -13);

    const [framers, sites, recent] = await Promise.all([
      this.deps.users.listByRole(Role.FRAMER),
      this.deps.sites.list(),
      this.deps.submissions.listAll({ from, to: day }),
    ]);

    const todays = recent.filter((s) => s.date === day);
    const submittedIds = new Set(todays.map((s) => s.userId));

    const sitesToday: SiteSummaryDto[] = sites
      .filter((site) => site.active || todays.some((s) => s.siteId === site.siteId))
      .map((site) => {
        const forSite = todays.filter((s) => s.siteId === site.siteId);
        return {
          siteId: site.siteId,
          siteName: site.name,
          submissions: forSite.length,
          attention: forSite.filter((s) => s.status === SubmissionStatus.ATTENTION).length,
          workers: [...new Set(forSite.map((s) => s.workerName))].sort(),
        };
      })
      .sort((a, b) => b.submissions - a.submissions || a.siteName.localeCompare(b.siteName));

    const last14Days = dateRange(from, day).map((d) => ({
      date: d,
      submissions: recent.filter((s) => s.date === d).length,
    }));

    return {
      date: day,
      totalFramers: framers.length,
      submittedToday: framers.filter((f) => submittedIds.has(f.userId)).length,
      attentionToday: todays.filter((s) => s.status === SubmissionStatus.ATTENTION).length,
      sitesToday,
      notSubmittedToday: framers
        .filter((f) => !submittedIds.has(f.userId))
        .map(({ userId, name, email }) => ({ userId, name, email }))
        .sort((a, b) => a.name.localeCompare(b.name)),
      last14Days,
    };
  }

  private assertAdmin(caller: Caller) {
    if (!isAdmin(caller)) throw new ForbiddenError('Admins only');
  }
}
