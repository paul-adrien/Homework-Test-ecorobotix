-- Rename `Parcel` model to `Site` to match the brief vocabulary
-- ("locations" / "sites") and the weather-monitoring granularity
-- (several adjacent parcels share the same weather → a single Site
-- covers them).

-- Rename the table
ALTER TABLE "Parcel" RENAME TO "Site";

-- Rename primary key and foreign key constraints to match the new table name
ALTER TABLE "Site" RENAME CONSTRAINT "Parcel_pkey" TO "Site_pkey";
ALTER TABLE "Site" RENAME CONSTRAINT "Parcel_userId_fkey" TO "Site_userId_fkey";

-- Rename indexes to follow the Site_* naming convention
ALTER INDEX "Parcel_userId_idx" RENAME TO "Site_userId_idx";
ALTER INDEX "Parcel_userId_label_key" RENAME TO "Site_userId_label_key";

-- Rename the FK column in UserPreferences that points at the (renamed) Site table
ALTER TABLE "UserPreferences" RENAME COLUMN "defaultParcelId" TO "defaultSiteId";
