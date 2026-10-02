/** Errors the use-cases throw. handlers/_base.ts turns each one into an HTTP status. */

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NotFoundError';
  }
}

export class ForbiddenError extends Error {
  constructor(message = 'You do not have access to this resource') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConflictError';
  }
}

/** Business-rule validation (things Zod cannot know, e.g. "date is in the future"). */
export class BusinessRuleError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
  ) {
    super(message);
    this.name = 'BusinessRuleError';
  }
}
