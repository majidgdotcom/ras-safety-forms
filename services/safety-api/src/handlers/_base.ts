import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { ZodError } from 'zod';

import { COGNITO_GROUP, Role } from '@ras/shared';

import {
  BusinessRuleError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from '../application/errors';
import { Caller } from '../domain/caller';

type HandlerFn = (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;

/** Wraps every handler: one place that maps errors to HTTP status codes. */
export function withErrorHandling(fn: HandlerFn): HandlerFn {
  return async (event) => {
    try {
      return await fn(event);
    } catch (err) {
      if (err instanceof ZodError) {
        return response(400, {
          success: false,
          code: 'VALIDATION_ERROR',
          error: err.issues[0]?.message ?? 'Invalid request',
          details: err.flatten().fieldErrors,
        });
      }
      if (err instanceof BusinessRuleError) {
        return response(400, {
          success: false,
          code: 'VALIDATION_ERROR',
          error: err.message,
          details: err.field ? { [err.field]: [err.message] } : undefined,
        });
      }
      if (err instanceof SyntaxError) {
        return response(400, { success: false, code: 'BAD_JSON', error: 'Request body is not valid JSON' });
      }
      if (err instanceof NotFoundError) {
        return response(404, { success: false, code: 'NOT_FOUND', error: err.message });
      }
      if (err instanceof ForbiddenError) {
        return response(403, { success: false, code: 'FORBIDDEN', error: err.message });
      }
      if (err instanceof ConflictError) {
        return response(409, { success: false, code: 'CONFLICT', error: err.message });
      }
      console.error('Unhandled error', err);
      return response(500, { success: false, code: 'INTERNAL', error: 'Something went wrong. Please try again.' });
    }
  };
}

export function response(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN ?? '*',
    },
    body: JSON.stringify(body),
  };
}

export function parseBody(event: APIGatewayProxyEvent): unknown {
  return JSON.parse(event.body ?? '{}');
}

/**
 * Builds the Caller from the Cognito ID token claims.
 * API Gateway's Cognito authorizer has ALREADY verified the token signature,
 * so these claims can be trusted.
 */
export function getCaller(event: APIGatewayProxyEvent): Caller {
  const claims = event.requestContext.authorizer?.claims ?? {};
  const userId = claims.sub as string | undefined;
  if (!userId) throw new ForbiddenError('Missing user identity');

  return {
    userId,
    email: (claims.email as string) ?? '',
    name: (claims.name as string) || (claims.email as string) || 'Unknown',
    role: roleFromGroups(claims['cognito:groups']),
  };
}

/**
 * "cognito:groups" arrives as a string, e.g. "Admin" or "[Admin, Framer]" depending on
 * the API Gateway version, so normalise it. Admin wins if a user is in both groups.
 */
export function roleFromGroups(raw: unknown): Role {
  const groups = Array.isArray(raw)
    ? raw.map(String)
    : String(raw ?? '')
        .replace(/[[\]]/g, '')
        .split(/[\s,]+/)
        .filter(Boolean);
  if (groups.includes(COGNITO_GROUP[Role.ADMIN])) return Role.ADMIN;
  if (groups.includes(COGNITO_GROUP[Role.FRAMER])) return Role.FRAMER;
  throw new ForbiddenError('Your account has no role yet. Ask an admin to add you to a group.');
}
