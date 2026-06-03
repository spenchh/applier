CREATE TABLE "JobSource" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" DATETIME,
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "JobSource_provider_key" ON "JobSource"("provider");
CREATE INDEX "JobSource_enabled_provider_idx" ON "JobSource"("enabled", "provider");

CREATE TABLE "SourcedJob" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "sourceId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "externalId" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "workplaceType" TEXT,
    "internshipTerm" TEXT,
    "sourceUrl" TEXT,
    "rawDescription" TEXT NOT NULL,
    "parsedJson" TEXT,
    "requiredQualifications" TEXT NOT NULL DEFAULT '[]',
    "preferredQualifications" TEXT NOT NULL DEFAULT '[]',
    "responsibilities" TEXT NOT NULL DEFAULT '[]',
    "technologies" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "compensationMin" INTEGER,
    "compensationMax" INTEGER,
    "compensationText" TEXT,
    "visaSponsorshipFriendly" BOOLEAN NOT NULL DEFAULT false,
    "workAuthNotRequired" BOOLEAN NOT NULL DEFAULT false,
    "deadline" DATETIME,
    "postedAt" DATETIME,
    "expiresAt" DATETIME,
    "riskFlagsJson" TEXT NOT NULL DEFAULT '[]',
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SourcedJob_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "JobSource" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "SourcedJob_sourceId_externalId_key" ON "SourcedJob"("sourceId", "externalId");
CREATE INDEX "SourcedJob_provider_idx" ON "SourcedJob"("provider");
CREATE INDEX "SourcedJob_company_idx" ON "SourcedJob"("company");
CREATE INDEX "SourcedJob_title_idx" ON "SourcedJob"("title");
CREATE INDEX "SourcedJob_postedAt_idx" ON "SourcedJob"("postedAt");
CREATE INDEX "SourcedJob_deadline_idx" ON "SourcedJob"("deadline");

CREATE TABLE "SavedSearch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "queryJson" TEXT NOT NULL,
    "alertCadence" TEXT NOT NULL DEFAULT 'none',
    "lastRunAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "SavedSearch_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "SavedSearch_userAccountId_idx" ON "SavedSearch"("userAccountId");
CREATE INDEX "SavedSearch_alertCadence_idx" ON "SavedSearch"("alertCadence");
