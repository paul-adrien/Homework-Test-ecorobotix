/**
 * Domain errors for the `sites` bounded context. Thrown by use cases; the HTTP
 * interface adapter translates them into status codes.
 */

export class SiteError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "SiteError";
    this.code = code;
  }
}

export class SiteNotFound extends SiteError {
  constructor(id: string) {
    super("SITE_NOT_FOUND", `Site "${id}" does not exist or does not belong to you.`);
    this.name = "SiteNotFound";
  }
}

export class SiteLabelAlreadyTaken extends SiteError {
  constructor(label: string) {
    super(
      "SITE_LABEL_ALREADY_TAKEN",
      `You already have a site named "${label}". Use a different label.`,
    );
    this.name = "SiteLabelAlreadyTaken";
  }
}
