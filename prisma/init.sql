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
