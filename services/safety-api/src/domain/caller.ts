import { Role } from '@ras/shared';

/** The logged-in user making the request (built from the verified Cognito JWT). */
export interface Caller {
  userId: string;
  email: string;
  name: string;
  role: Role;
}

export const isAdmin = (c: Caller) => c.role === Role.ADMIN;
