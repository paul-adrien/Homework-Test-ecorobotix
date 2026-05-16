/**
 * Read port: lets the preferences module verify that a site referenced by
 * `defaultSiteId` actually belongs to the user — without coupling to the
 * sites module's internals. The composition root injects a Prisma adapter
 * that reads the same `Site` table the sites module owns.
 *
 * Mirrors the pattern used by the weather module's `UserPreferencesReader`:
 * each bounded context declares its read needs as a tiny port rather than
 * importing another module's repository.
 */
export interface SiteOwnershipReader {
  isOwnedByUser(siteId: string, userId: string): Promise<boolean>;
}
