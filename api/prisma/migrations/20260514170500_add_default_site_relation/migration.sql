-- CreateIndex
CREATE INDEX "UserPreferences_defaultSiteId_idx" ON "UserPreferences"("defaultSiteId");

-- AddForeignKey
ALTER TABLE "UserPreferences" ADD CONSTRAINT "UserPreferences_defaultSiteId_fkey" FOREIGN KEY ("defaultSiteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;
