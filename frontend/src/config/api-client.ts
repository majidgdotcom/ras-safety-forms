import { fetchAuthSession } from 'aws-amplify/auth';

import { env } from './env';

/** Error thrown for any non-2xx API response. `fieldErrors` comes from Zod on the server. */
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code?: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function authHeader(): Promise<Record<string, string>> {
  // Amplify refreshes the token if it is about to expire.
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  if (!token) throw new ApiError(401, 'Your session has expired. Please sign in again.');
  return { Authorization: `Bearer ${token}` };
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      ...init,
      headers: { 'Content-Type': 'application/json', ...(await authHeader()), ...init.headers },
    });
  } catch (err) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(0, 'No connection. Check your signal and try again.');
  }

  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(
      res.status,
      body.error ?? body.message ?? `Request failed (${res.status})`,
      body.code,
      body.details,
    );
  }
  return body.data as T;
}

/** Turns an object into ?a=1&b=2, skipping empty values. */
export function toQuery(params: Record<string, string | number | undefined>): string {
  const q = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') q.set(k, String(v));
  });
  const s = q.toString();
  return s ? `?${s}` : '';
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
};
