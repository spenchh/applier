CREATE TABLE IF NOT EXISTS "UserAccount" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "displayName" TEXT,
    "passwordHash" TEXT NOT NULL,
    "passwordSalt" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserAccount_email_key" ON "UserAccount"("email");

CREATE TABLE IF NOT EXISTS "UserSession" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserSession_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserSession_tokenHash_key" ON "UserSession"("tokenHash");

CREATE TABLE IF NOT EXISTS "UserProfile" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT,
    "legalName" TEXT NOT NULL,
    "preferredName" TEXT,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "location" TEXT,
    "school" TEXT,
    "degree" TEXT,
    "major" TEXT,
    "minor" TEXT,
    "graduationDate" DATETIME,
    "gpa" TEXT,
    "workAuthorization" TEXT,
    "careerInterests" TEXT,
    "sponsorshipRequired" BOOLEAN NOT NULL DEFAULT false,
    "earliestStartDate" DATETIME,
    "preferredTerms" TEXT NOT NULL DEFAULT '[]',
    "preferredLocations" TEXT NOT NULL DEFAULT '[]',
    "remotePreference" TEXT,
    "portfolioUrl" TEXT,
    "githubUrl" TEXT,
    "linkedinUrl" TEXT,
    "websiteUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "UserProfile_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "UserProfile_userAccountId_key" ON "UserProfile"("userAccountId");

CREATE TABLE IF NOT EXISTS "ProfileFact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userProfileId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "organization" TEXT,
    "location" TEXT,
    "startDate" DATETIME,
    "endDate" DATETIME,
    "description" TEXT NOT NULL,
    "impact" TEXT,
    "skills" TEXT NOT NULL DEFAULT '[]',
    "evidenceNote" TEXT,
    "resumeAllowed" BOOLEAN NOT NULL DEFAULT true,
    "coverLetterAllowed" BOOLEAN NOT NULL DEFAULT true,
    "answersAllowed" BOOLEAN NOT NULL DEFAULT true,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ProfileFact_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Resume" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userProfileId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "baseType" TEXT NOT NULL,
    "rawText" TEXT NOT NULL,
    "structuredJson" TEXT,
    "isMaster" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Resume_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ResumeVersion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "resumeId" TEXT NOT NULL,
    "jobPostingId" TEXT,
    "applicationId" TEXT,
    "name" TEXT NOT NULL,
    "tailoredText" TEXT NOT NULL,
    "structuredJson" TEXT,
    "htmlPreview" TEXT,
    "pdfPath" TEXT,
    "docxPath" TEXT,
    "truthCheckJson" TEXT,
    "keywordCoverageJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ResumeVersion_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResumeVersion_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "ResumeVersion_resumeId_fkey" FOREIGN KEY ("resumeId") REFERENCES "Resume" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "Company" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "website" TEXT,
    "domain" TEXT,
    "industry" TEXT,
    "size" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE TABLE IF NOT EXISTS "JobPosting" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT,
    "companyId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT,
    "workplaceType" TEXT,
    "internshipTerm" TEXT,
    "sourceUrl" TEXT,
    "sourceName" TEXT,
    "atsProvider" TEXT,
    "rawDescription" TEXT NOT NULL,
    "parsedJson" TEXT,
    "requiredQualifications" TEXT NOT NULL DEFAULT '[]',
    "preferredQualifications" TEXT NOT NULL DEFAULT '[]',
    "responsibilities" TEXT NOT NULL DEFAULT '[]',
    "technologies" TEXT NOT NULL DEFAULT '[]',
    "keywords" TEXT NOT NULL DEFAULT '[]',
    "compensation" TEXT,
    "deadline" DATETIME,
    "riskFlagsJson" TEXT NOT NULL DEFAULT '[]',
    "dedupeHash" TEXT NOT NULL,
    "importedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobPosting_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "JobPosting_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JobQuestion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "jobPostingId" TEXT NOT NULL,
    "questionText" TEXT NOT NULL,
    "questionType" TEXT NOT NULL DEFAULT 'text',
    "required" BOOLEAN NOT NULL DEFAULT false,
    "optionsJson" TEXT,
    "sensitive" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "JobQuestion_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "JobSource" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "JobSource_provider_key" ON "JobSource"("provider");
CREATE INDEX IF NOT EXISTS "JobSource_enabled_provider_idx" ON "JobSource"("enabled", "provider");

CREATE TABLE IF NOT EXISTS "SourcedJob" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "SourcedJob_sourceId_externalId_key" ON "SourcedJob"("sourceId", "externalId");
CREATE INDEX IF NOT EXISTS "SourcedJob_provider_idx" ON "SourcedJob"("provider");
CREATE INDEX IF NOT EXISTS "SourcedJob_company_idx" ON "SourcedJob"("company");
CREATE INDEX IF NOT EXISTS "SourcedJob_title_idx" ON "SourcedJob"("title");
CREATE INDEX IF NOT EXISTS "SourcedJob_postedAt_idx" ON "SourcedJob"("postedAt");
CREATE INDEX IF NOT EXISTS "SourcedJob_deadline_idx" ON "SourcedJob"("deadline");

CREATE TABLE IF NOT EXISTS "SavedSearch" (
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

CREATE INDEX IF NOT EXISTS "SavedSearch_userAccountId_idx" ON "SavedSearch"("userAccountId");
CREATE INDEX IF NOT EXISTS "SavedSearch_alertCadence_idx" ON "SavedSearch"("alertCadence");

CREATE TABLE IF NOT EXISTS "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userProfileId" TEXT NOT NULL,
    "jobPostingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'drafted',
    "applicationMode" TEXT NOT NULL DEFAULT 'manual',
    "fitScore" INTEGER NOT NULL DEFAULT 0,
    "fitAnalysisJson" TEXT,
    "approvedAt" DATETIME,
    "submittedAt" DATETIME,
    "source" TEXT,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Application_jobPostingId_fkey" FOREIGN KEY ("jobPostingId") REFERENCES "JobPosting" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "Application_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "ApplicationAnswer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "jobQuestionId" TEXT,
    "answerText" TEXT NOT NULL,
    "supportingFactIdsJson" TEXT NOT NULL DEFAULT '[]',
    "truthCheckStatus" TEXT NOT NULL DEFAULT 'needs_user_input',
    "userApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ApplicationAnswer_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ApplicationAnswer_jobQuestionId_fkey" FOREIGN KEY ("jobQuestionId") REFERENCES "JobQuestion" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "CoverLetter" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "supportingFactIdsJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CoverLetter_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "FileAsset" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userProfileId" TEXT,
    "applicationId" TEXT,
    "type" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "mimeType" TEXT,
    "size" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "FileAsset_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "FileAsset_userProfileId_fkey" FOREIGN KEY ("userProfileId") REFERENCES "UserProfile" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "SubmissionAttempt" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "adapter" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "requestSummaryJson" TEXT,
    "responseSummaryJson" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SubmissionAttempt_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "AuditLog" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "metadataJson" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FollowUpTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "applicationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueDate" DATETIME,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "FollowUpTask_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "Application" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE IF NOT EXISTS "MomentumGoal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "category" TEXT NOT NULL DEFAULT 'school',
    "why" TEXT,
    "successMetric" TEXT,
    "targetDate" DATETIME,
    "cadence" TEXT NOT NULL DEFAULT 'weekly',
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MomentumGoal_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MomentumGoal_userAccountId_status_idx" ON "MomentumGoal"("userAccountId", "status");
CREATE INDEX IF NOT EXISTS "MomentumGoal_targetDate_idx" ON "MomentumGoal"("targetDate");

CREATE TABLE IF NOT EXISTS "MomentumTask" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "goalId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "externalId" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT NOT NULL DEFAULT 'school',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "estimatedMinutes" INTEGER NOT NULL DEFAULT 45,
    "dueAt" DATETIME,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "proofRequired" BOOLEAN NOT NULL DEFAULT true,
    "proofNote" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "completedAt" DATETIME,
    CONSTRAINT "MomentumTask_goalId_fkey" FOREIGN KEY ("goalId") REFERENCES "MomentumGoal" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MomentumTask_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MomentumTask_userAccountId_status_idx" ON "MomentumTask"("userAccountId", "status");
CREATE INDEX IF NOT EXISTS "MomentumTask_dueAt_idx" ON "MomentumTask"("dueAt");
CREATE INDEX IF NOT EXISTS "MomentumTask_source_externalId_idx" ON "MomentumTask"("source", "externalId");

CREATE TABLE IF NOT EXISTS "MomentumEvidence" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "taskId" TEXT,
    "source" TEXT NOT NULL DEFAULT 'manual',
    "title" TEXT NOT NULL,
    "url" TEXT,
    "summary" TEXT NOT NULL,
    "skillsJson" TEXT NOT NULL DEFAULT '[]',
    "capturedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentumEvidence_taskId_fkey" FOREIGN KEY ("taskId") REFERENCES "MomentumTask" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "MomentumEvidence_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MomentumEvidence_userAccountId_idx" ON "MomentumEvidence"("userAccountId");
CREATE INDEX IF NOT EXISTS "MomentumEvidence_source_idx" ON "MomentumEvidence"("source");

CREATE TABLE IF NOT EXISTS "MomentumIntegration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'not_connected',
    "configJson" TEXT NOT NULL DEFAULT '{}',
    "lastSyncedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "MomentumIntegration_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "MomentumIntegration_userAccountId_provider_key" ON "MomentumIntegration"("userAccountId", "provider");
CREATE INDEX IF NOT EXISTS "MomentumIntegration_userAccountId_status_idx" ON "MomentumIntegration"("userAccountId", "status");

CREATE TABLE IF NOT EXISTS "MomentumCheckIn" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userAccountId" TEXT NOT NULL,
    "mood" TEXT,
    "availableMinutes" INTEGER NOT NULL DEFAULT 120,
    "focus" TEXT,
    "blockers" TEXT,
    "planJson" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MomentumCheckIn_userAccountId_fkey" FOREIGN KEY ("userAccountId") REFERENCES "UserAccount" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "MomentumCheckIn_userAccountId_createdAt_idx" ON "MomentumCheckIn"("userAccountId", "createdAt");

CREATE TABLE IF NOT EXISTS "AppSettings" (
    "id" TEXT NOT NULL PRIMARY KEY DEFAULT 'singleton',
    "llmProvider" TEXT NOT NULL DEFAULT 'mock',
    "aiModel" TEXT,
    "aiInstructions" TEXT,
    "defaultResumeTemplate" TEXT NOT NULL DEFAULT 'software_engineering',
    "targetRoleTypes" TEXT NOT NULL DEFAULT '[]',
    "targetIndustries" TEXT NOT NULL DEFAULT '[]',
    "excludedKeywords" TEXT NOT NULL DEFAULT '[]',
    "disableSubmissionAdapters" BOOLEAN NOT NULL DEFAULT false,
    "requireReview" BOOLEAN NOT NULL DEFAULT true,
    "maxApplicationsPerDay" INTEGER NOT NULL DEFAULT 10,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
