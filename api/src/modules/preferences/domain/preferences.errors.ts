/**
 * Domain errors for the `preferences` bounded context. Thrown by use cases;
 * the HTTP interface adapter translates them into status codes.
 */
export class PreferencesError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "PreferencesError";
    this.code = code;
  }
}

/**
 * Raised by the update use case when the caller tries to set
 * `defaultSiteId` to a site that does not exist or does not belong to the
 * user. We catch it upstream of the FK constraint so the API responds with
 * a clean 400 instead of bubbling a Prisma error to the client.
 */
export class DefaultSiteNotFound extends PreferencesError {
  constructor(siteId: string) {
    super(
      "DEFAULT_SITE_NOT_FOUND",
      `Site "${siteId}" cannot be set as default — it does not exist or does not belong to you.`,
    );
    this.name = "DefaultSiteNotFound";
  }
}
