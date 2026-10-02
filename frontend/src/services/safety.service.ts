import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  AdminSummaryDto,
  CreateSubmissionInput,
  SiteEntity,
  SubmissionDetailDto,
  SubmissionEntity,
  SubmissionStatus,
  UserEntity,
} from '@ras/shared';

import { api, toQuery } from '@/config/api-client';

/** React Query hooks = the only place the UI talks to the API. */

export interface SubmissionFilters {
  siteId?: string;
  userId?: string;
  from?: string;
  to?: string;
  status?: SubmissionStatus | '';
}

export const queryKeys = {
  sites: ['sites'] as const,
  workers: ['workers'] as const,
  submissions: (f: SubmissionFilters) => ['submissions', f] as const,
  submission: (id: string) => ['submission', id] as const,
  summary: (date?: string) => ['summary', date ?? 'today'] as const,
};

export function useSites() {
  return useQuery({
    queryKey: queryKeys.sites,
    queryFn: () => api.get<SiteEntity[]>('/sites'),
    staleTime: 10 * 60 * 1000, // sites rarely change
  });
}

export function useWorkers(enabled = true) {
  return useQuery({
    queryKey: queryKeys.workers,
    queryFn: () => api.get<UserEntity[]>('/admin/workers'),
    staleTime: 10 * 60 * 1000,
    enabled,
  });
}

export function useSubmissions(filters: SubmissionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.submissions(filters),
    queryFn: () => api.get<SubmissionEntity[]>(`/submissions${toQuery({ ...filters })}`),
  });
}

export function useSubmission(id: string) {
  return useQuery({
    queryKey: queryKeys.submission(id),
    queryFn: () => api.get<SubmissionDetailDto>(`/submissions/${encodeURIComponent(id)}`),
    enabled: !!id,
    staleTime: 5 * 60 * 1000, // photo URLs are valid for 15 min
  });
}

export function useAdminSummary(date?: string) {
  return useQuery({
    queryKey: queryKeys.summary(date),
    queryFn: () => api.get<AdminSummaryDto>(`/admin/summary${toQuery({ date })}`),
  });
}

export function useCreateSubmission() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateSubmissionInput) => api.post<SubmissionEntity>('/submissions', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['submissions'] });
      qc.invalidateQueries({ queryKey: ['summary'] });
    },
  });
}
