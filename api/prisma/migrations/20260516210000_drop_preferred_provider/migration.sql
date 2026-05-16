-- The preferredProvider column was removed: the in-section provider switcher
-- is the only entry point for picking a source, so the backend no longer
-- needs a per-user persistent default. The server-side fallback when no
-- ?provider= is passed is the hard-coded `open-meteo`.
ALTER TABLE "UserPreferences" DROP COLUMN "preferredProvider";
