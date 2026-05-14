import type { Site } from "../domain/site.ts";

export type SiteCreateInput = {
  userId: string;
  label: string;
  latitude: number;
  longitude: number;
  displayName?: string | undefined;
  countryCode?: string | undefined;
  timezone?: string | undefined;
  cropType?: string | undefined;
};

export type SiteUpdateInput = Partial<Omit<SiteCreateInput, "userId">>;

/**
 * Port: persistence operations the `sites` domain needs from the storage layer.
 * Every read/write is scoped by `userId` — callers must pass the authenticated
 * user's id so cross-tenant access is impossible from the use case layer.
 */
export type SiteRepository = {
  findByIdForUser(id: string, userId: string): Promise<Site | null>;
  findByUserAndLabel(userId: string, label: string): Promise<Site | null>;
  listByUser(userId: string): Promise<Site[]>;
  create(input: SiteCreateInput): Promise<Site>;
  update(id: string, userId: string, input: SiteUpdateInput): Promise<Site>;
  delete(id: string, userId: string): Promise<void>;
};
