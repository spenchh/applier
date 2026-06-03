import type { JobPosting, ProfileFact, SourcedJob } from "@prisma/client";
import { getConnectorStatuses, getJobConnectors, type DiscoveryQuery, type NormalizedSourcedJob } from "../connectors";
import { prisma } from "../db";
import { toList, writeJson } from "../json";
import { parseJobPostingMock } from "../llm";
import { ensureDatabaseReady } from "../runtime-db";
import { discoveryQuerySchema } from "../schemas";
import { detectRiskFlags } from "../text";
import { calculateFit } from "./fit";
import { createJobFromInput } from "./job";
import { getPrimaryProfile } from "./profile";

const DEFAULT_TTL_MINUTES = 30;

export type DiscoveryResult = SourcedJob & {
  source: { label: string; provider: string };
  fitScore: number;
  fitSummary: string;
  missingKeywords: string[];
};

export function normalizeDiscoveryQuery(searchParams: Record<string, string | string[] | undefined>): DiscoveryQuery {
  const value = (key: string) => {
    const raw = searchParams[key];
    return Array.isArray(raw) ? raw[0] : raw;
  };
  return discoveryQuerySchema.parse({
    keyword: clean(value("keyword")),
    location: clean(value("location")),
    workplaceType: clean(value("workplaceType")),
    internshipTerm: clean(value("internshipTerm")),
    postedWithinDays: positiveNumber(value("postedWithinDays")),
    company: clean(value("company")),
    minCompensation: positiveNumber(value("minCompensation")),
    maxCompensation: positiveNumber(value("maxCompensation")),
    visaSponsorshipFriendly: value("visaSponsorshipFriendly") === "on" || value("visaSponsorshipFriendly") === "true",
    workAuthNotRequired: value("workAuthNotRequired") === "on" || value("workAuthNotRequired") === "true",
    deadlineWithinDays: positiveNumber(value("deadlineWithinDays")),
    source: clean(value("source")),
  });
}

export async function getDiscoveryPageData(userAccountId: string, query: DiscoveryQuery) {
  await ensureDiscoveryPool(query);
  const [profile, sources, savedSearches, jobs] = await Promise.all([
    getPrimaryProfile(userAccountId),
    listDiscoverySources(),
    prisma.savedSearch.findMany({ where: { userAccountId }, orderBy: { updatedAt: "desc" }, take: 6 }),
    prisma.sourcedJob.findMany({
      include: { source: { select: { label: true, provider: true } } },
      orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
      take: 120,
    }),
  ]);

  const facts = profile?.facts ?? [];
  const filtered = jobs
    .filter((job) => matchesDiscoveryQuery(job, query))
    .map((job) => withFit(job, facts))
    .sort((a, b) => b.fitScore - a.fitScore || dateValue(b.postedAt) - dateValue(a.postedAt));

  return {
    jobs: filtered,
    sources,
    savedSearches,
    profileReady: Boolean(profile),
  };
}

export async function getRecommendedDiscoveryJobs(userAccountId: string, limit = 4) {
  const profile = await getPrimaryProfile(userAccountId);
  const query: DiscoveryQuery = {
    keyword: profile?.careerInterests || profile?.major || "internship",
    location: toList(profile?.preferredLocations).join(" ") || profile?.location || undefined,
  };
  await ensureDiscoveryPool(query);
  const jobs = await prisma.sourcedJob.findMany({
    include: { source: { select: { label: true, provider: true } } },
    orderBy: [{ postedAt: "desc" }, { createdAt: "desc" }],
    take: 80,
  });
  const facts = profile?.facts ?? [];
  return jobs
    .filter((job) => matchesDiscoveryQuery(job, query))
    .map((job) => withFit(job, facts))
    .sort((a, b) => b.fitScore - a.fitScore)
    .slice(0, limit);
}

export async function saveSourcedJobToInbox(sourcedJobId: string, userAccountId: string) {
  await ensureDatabaseReady();
  const sourcedJob = await prisma.sourcedJob.findUnique({ where: { id: sourcedJobId }, include: { source: true } });
  if (!sourcedJob) throw new Error("Discovery job not found.");
  const job = await createJobFromInput({ ...sourcedJobToJobInput(sourcedJob), userAccountId });
  await prisma.auditLog.create({
    data: {
      entityType: "SourcedJob",
      entityId: sourcedJob.id,
      action: "discovery.save_to_inbox",
      metadataJson: writeJson({ jobPostingId: job.id, provider: sourcedJob.provider }),
    },
  });
  return job;
}

export async function saveDiscoverySearch(userAccountId: string, name: string, query: DiscoveryQuery, alertCadence = "none") {
  await ensureDatabaseReady();
  const saved = await prisma.savedSearch.create({
    data: {
      userAccountId,
      name: name || readableSearchName(query),
      queryJson: writeJson(query),
      alertCadence,
    },
  });
  await prisma.auditLog.create({
    data: {
      entityType: "SavedSearch",
      entityId: saved.id,
      action: "saved_search.create",
      metadataJson: writeJson({ alertCadence }),
    },
  });
  return saved;
}

export function sourcedJobToJobInput(job: Pick<SourcedJob, "company" | "title" | "location" | "internshipTerm" | "workplaceType" | "sourceUrl" | "provider" | "rawDescription">) {
  return {
    company: job.company,
    title: job.title,
    location: job.location,
    roleCategory: undefined,
    sourceUrl: job.sourceUrl,
    sourceName: job.provider,
    rawDescription: job.rawDescription,
  };
}

export function matchesDiscoveryQuery(job: Pick<SourcedJob, "title" | "company" | "location" | "workplaceType" | "internshipTerm" | "provider" | "rawDescription" | "keywords" | "compensationMin" | "compensationMax" | "visaSponsorshipFriendly" | "workAuthNotRequired" | "deadline" | "postedAt">, query: DiscoveryQuery) {
  const keyword = query.keyword?.toLowerCase();
  const text = `${job.title} ${job.company} ${job.location ?? ""} ${job.rawDescription} ${toList(job.keywords).join(" ")}`.toLowerCase();
  if (keyword && !text.includes(keyword)) return false;
  if (query.location && !`${job.location ?? ""} ${job.rawDescription}`.toLowerCase().includes(query.location.toLowerCase())) return false;
  if (query.company && !job.company.toLowerCase().includes(query.company.toLowerCase())) return false;
  if (query.workplaceType && query.workplaceType !== "any" && job.workplaceType !== query.workplaceType) return false;
  if (query.internshipTerm && query.internshipTerm !== "any" && job.internshipTerm !== query.internshipTerm) return false;
  if (query.source && query.source !== "any" && job.provider !== query.source) return false;
  if (query.visaSponsorshipFriendly && !job.visaSponsorshipFriendly) return false;
  if (query.workAuthNotRequired && !job.workAuthNotRequired) return false;
  if (query.minCompensation && (job.compensationMax ?? job.compensationMin ?? 0) < query.minCompensation) return false;
  if (query.maxCompensation && (job.compensationMin ?? job.compensationMax ?? Number.POSITIVE_INFINITY) > query.maxCompensation) return false;
  if (query.postedWithinDays && (!job.postedAt || daysFromNow(job.postedAt) > query.postedWithinDays)) return false;
  if (query.deadlineWithinDays && (!job.deadline || daysUntil(job.deadline) > query.deadlineWithinDays)) return false;
  return true;
}

export async function ensureDiscoveryPool(query: DiscoveryQuery = {}) {
  await ensureDatabaseReady();
  const connectors = getJobConnectors();
  for (const connector of connectors) {
    const status = connector.status();
    const source = await prisma.jobSource.upsert({
      where: { provider: status.provider },
      update: {
        label: status.label,
        enabled: status.enabled,
        configJson: writeJson({ configured: status.configured, reason: status.reason ?? null }),
      },
      create: {
        provider: status.provider,
        label: status.label,
        enabled: status.enabled,
        configJson: writeJson({ configured: status.configured, reason: status.reason ?? null }),
      },
    });

    if (!status.enabled || !shouldSync(source.lastSyncedAt, status.provider)) continue;

    try {
      const jobs = await connector.search(query);
      await upsertSourcedJobs(source.id, status.provider, jobs);
      await prisma.jobSource.update({
        where: { id: source.id },
        data: { lastSyncedAt: new Date(), lastError: null },
      });
    } catch (error) {
      await prisma.jobSource.update({
        where: { id: source.id },
        data: { lastError: error instanceof Error ? error.message : "Connector failed." },
      });
    }
  }
}

export async function listDiscoverySources() {
  await ensureDatabaseReady();
  await ensureDiscoverySourceRows();
  const dbSources = await prisma.jobSource.findMany({ orderBy: { provider: "asc" } });
  const statusByProvider = new Map(getConnectorStatuses().map((status) => [status.provider, status]));
  return dbSources.map((source) => ({
    ...source,
    status: statusByProvider.get(source.provider),
  }));
}

async function ensureDiscoverySourceRows() {
  for (const status of getConnectorStatuses()) {
    await prisma.jobSource.upsert({
      where: { provider: status.provider },
      update: {
        label: status.label,
        enabled: status.enabled,
        configJson: writeJson({ configured: status.configured, reason: status.reason ?? null }),
      },
      create: {
        provider: status.provider,
        label: status.label,
        enabled: status.enabled,
        configJson: writeJson({ configured: status.configured, reason: status.reason ?? null }),
      },
    });
  }
}

async function upsertSourcedJobs(sourceId: string, provider: string, jobs: NormalizedSourcedJob[]) {
  for (const job of jobs) {
    const parsed = parseJobPostingMock({
      company: job.company,
      title: job.title,
      location: job.location,
      rawDescription: job.rawDescription,
      sourceUrl: job.sourceUrl,
    });
    await prisma.sourcedJob.upsert({
      where: {
        sourceId_externalId: {
          sourceId,
          externalId: job.externalId,
        },
      },
      update: {
        company: parsed.company,
        title: parsed.title,
        location: parsed.location ?? job.location ?? null,
        workplaceType: parsed.workplaceType ?? job.workplaceType ?? null,
        internshipTerm: parsed.internshipTerm ?? job.internshipTerm ?? null,
        sourceUrl: job.sourceUrl ?? null,
        rawDescription: job.rawDescription,
        parsedJson: writeJson(parsed),
        requiredQualifications: writeJson(parsed.requiredQualifications),
        preferredQualifications: writeJson(parsed.preferredQualifications),
        responsibilities: writeJson(parsed.responsibilities),
        technologies: writeJson(parsed.technologies),
        keywords: writeJson(parsed.keywords),
        compensationMin: job.compensationMin ?? null,
        compensationMax: job.compensationMax ?? null,
        compensationText: job.compensationText ?? null,
        visaSponsorshipFriendly: Boolean(job.visaSponsorshipFriendly),
        workAuthNotRequired: Boolean(job.workAuthNotRequired),
        deadline: validDate(job.deadline),
        postedAt: validDate(job.postedAt),
        expiresAt: validDate(job.expiresAt),
        riskFlagsJson: writeJson(detectRiskFlags(job.rawDescription, job.sourceUrl)),
        fetchedAt: new Date(),
      },
      create: {
        sourceId,
        provider,
        externalId: job.externalId,
        company: parsed.company,
        title: parsed.title,
        location: parsed.location ?? job.location ?? null,
        workplaceType: parsed.workplaceType ?? job.workplaceType ?? null,
        internshipTerm: parsed.internshipTerm ?? job.internshipTerm ?? null,
        sourceUrl: job.sourceUrl ?? null,
        rawDescription: job.rawDescription,
        parsedJson: writeJson(parsed),
        requiredQualifications: writeJson(parsed.requiredQualifications),
        preferredQualifications: writeJson(parsed.preferredQualifications),
        responsibilities: writeJson(parsed.responsibilities),
        technologies: writeJson(parsed.technologies),
        keywords: writeJson(parsed.keywords),
        compensationMin: job.compensationMin ?? null,
        compensationMax: job.compensationMax ?? null,
        compensationText: job.compensationText ?? null,
        visaSponsorshipFriendly: Boolean(job.visaSponsorshipFriendly),
        workAuthNotRequired: Boolean(job.workAuthNotRequired),
        deadline: validDate(job.deadline),
        postedAt: validDate(job.postedAt),
        expiresAt: validDate(job.expiresAt),
        riskFlagsJson: writeJson(detectRiskFlags(job.rawDescription, job.sourceUrl)),
      },
    });
  }
}

function withFit<T extends SourcedJob & { source: { label: string; provider: string } }>(job: T, facts: ProfileFact[]): DiscoveryResult {
  const fit = calculateFit(sourcedJobAsPosting(job), facts);
  return {
    ...job,
    fitScore: fit.fitScore,
    fitSummary: fit.suggestedPositioning,
    missingKeywords: fit.missingRequirements.slice(0, 5),
  };
}

function sourcedJobAsPosting(job: SourcedJob): JobPosting {
  return {
    id: job.id,
    userAccountId: null,
    companyId: job.sourceId,
    title: job.title,
    location: job.location,
    workplaceType: job.workplaceType,
    internshipTerm: job.internshipTerm,
    sourceUrl: job.sourceUrl,
    sourceName: job.provider,
    atsProvider: null,
    rawDescription: job.rawDescription,
    parsedJson: job.parsedJson,
    requiredQualifications: job.requiredQualifications,
    preferredQualifications: job.preferredQualifications,
    responsibilities: job.responsibilities,
    technologies: job.technologies,
    keywords: job.keywords,
    compensation: job.compensationText,
    deadline: job.deadline,
    riskFlagsJson: job.riskFlagsJson,
    dedupeHash: `${job.provider}:${job.externalId}`,
    importedAt: job.fetchedAt,
    createdAt: job.createdAt,
    updatedAt: job.updatedAt,
  };
}

function shouldSync(lastSyncedAt: Date | null, provider: string) {
  if (!lastSyncedAt) return true;
  const ttl = provider === "mock" ? 12 * 60 : Number(process.env.DISCOVERY_CACHE_TTL_MINUTES || DEFAULT_TTL_MINUTES);
  return Date.now() - lastSyncedAt.getTime() > ttl * 60 * 1000;
}

function readableSearchName(query: DiscoveryQuery) {
  return [query.keyword || "Internships", query.location].filter(Boolean).join(" in ");
}

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

function positiveNumber(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
}

function daysFromNow(value: Date) {
  return Math.floor((Date.now() - value.getTime()) / (24 * 60 * 60 * 1000));
}

function daysUntil(value: Date) {
  return Math.ceil((value.getTime() - Date.now()) / (24 * 60 * 60 * 1000));
}

function dateValue(value: Date | null) {
  return value?.getTime() ?? 0;
}

function validDate(value: Date | null | undefined) {
  return value && Number.isFinite(value.getTime()) ? value : null;
}
