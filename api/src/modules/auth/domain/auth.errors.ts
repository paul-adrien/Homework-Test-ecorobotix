/**
 * Domain errors for the `auth` bounded context.
 * Thrown by use cases; the HTTP interface adapter maps them to status codes.
 */

export class AuthError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "AuthError";
    this.code = code;
  }
}

export class EmailAlreadyTaken extends AuthError {
  constructor(email: string) {
    super("EMAIL_ALREADY_TAKEN", `An account with email "${email}" already exists.`);
    this.name = "EmailAlreadyTaken";
  }
}

export class InvalidCredentials extends AuthError {
  constructor() {
    super("INVALID_CREDENTIALS", "Invalid email or password.");
    this.name = "InvalidCredentials";
  }
}

export class Unauthorized extends AuthError {
  constructor() {
    super("UNAUTHORIZED", "Authentication required.");
    this.name = "Unauthorized";
  }
}
