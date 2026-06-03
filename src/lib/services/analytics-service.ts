import { db } from "../db";
import { ACTIVE_STATUSES, type ApplicationStatus } from "../constants";
import { startOfWeek, format, subWeeks } from "date-fns";

export interface FunnelCounts {
  total: number;
  drafted: number;
  readyForReview: number;
  approved: number;
  submitted: number;
  interviewing: number;
  offers: number;
  rejected: number;
}

export interface Analytics {
  funnel: FunnelCounts;
  byStatus: Record<string, number>;
  byWeek: { week: string; count: number }[];
  responseRate: number;
  interviewRate: number;
  offerRate: number;
  draftToSubmitRate: number;
  topSources: { source: string; count: number }[];
  resumeVersionPerformance: { version: string; submitted: number; responses: number; rate: number }[];
  deadlineMisses: number;
  avgDaysToResponse: number | null;
}

const RESPONDED: ApplicationStatus[] = [
  "online-assessment",
  "interview-scheduled",
  "interview-completed",
  "offer",
  "rejected",
];
const INTERVIEWED: ApplicationStatus[] = ["interview-scheduled", "interview-completed", "offer"];

export async function getAnalytics(): Promise<Analytics> {
  const apps = await db.application.findMany({
    include: { jobPosting: true },
  });

  const byStatus: Record<string, number> = {};
  for (const a of apps) byStatus[a.status] = (byStatus[a.status] ?? 0) + 1;

  const count = (statuses: ApplicationStatus[]) =>
    apps.filter((a) => statuses.includes(a.status as ApplicationStatus)).length;

  const submitted = apps.filter((a) => a.submittedAt).length;
  const responded = count(RESPONDED);
  const interviewing = count(INTERVIEWED);
  const offers = count(["offer"]);

  // Applications submitted per ISO week (last 8 weeks).
  const weekMap = new Map<string, number>();
  for (let i = 7; i >= 0; i--) {
    const wk = format(startOfWeek(subWeeks(new Date(), i)), "MMM d");
    weekMap.set(wk, 0);
  }
  for (const a of apps) {
    if (!a.submittedAt) continue;
    const wk = format(startOfWeek(a.submittedAt), "MMM d");
    if (weekMap.has(wk)) weekMap.set(wk, (weekMap.get(wk) ?? 0) + 1);
  }

  // Top sources.
  const sourceMap = new Map<string, number>();
  for (const a of apps) {
    const src = a.source || a.jobPosting.sourceName || "unknown";
    sourceMap.set(src, (sourceMap.get(src) ?? 0) + 1);
  }

  // Resume version performance.
  const versionMap = new Map<string, { submitted: number; responses: number }>();
  for (const a of apps) {
    const v = a.resumeVersionLabel || "—";
    const entry = versionMap.get(v) ?? { submitted: 0, responses: 0 };
    if (a.submittedAt) entry.submitted += 1;
    if (RESPONDED.includes(a.status as ApplicationStatus)) entry.responses += 1;
    versionMap.set(v, entry);
  }

  // Deadline misses: deadline passed and never submitted.
  const now = new Date();
  const deadlineMisses = apps.filter(
    (a) => a.jobPosting.deadline && a.jobPosting.deadline < now && !a.submittedAt,
  ).length;

  // Avg days from submit to response (approx via updatedAt for responded apps).
  const responseDays: number[] = [];
  for (const a of apps) {
    if (a.submittedAt && RESPONDED.includes(a.status as ApplicationStatus)) {
      const days = (a.updatedAt.getTime() - a.submittedAt.getTime()) / (1000 * 60 * 60 * 24);
      if (days >= 0) responseDays.push(days);
    }
  }
  const avgDaysToResponse =
    responseDays.length > 0
      ? Math.round((responseDays.reduce((s, d) => s + d, 0) / responseDays.length) * 10) / 10
      : null;

  const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 100) : 0);

  return {
    funnel: {
      total: apps.length,
      drafted: count(["drafted"]),
      readyForReview: count(["ready-for-review"]),
      approved: count(["approved"]),
      submitted,
      interviewing,
      offers,
      rejected: count(["rejected"]),
    },
    byStatus,
    byWeek: Array.from(weekMap.entries()).map(([week, count]) => ({ week, count })),
    responseRate: pct(responded, submitted),
    interviewRate: pct(interviewing, submitted),
    offerRate: pct(offers, submitted),
    draftToSubmitRate: pct(submitted, apps.filter((a) => a.status !== "saved").length),
    topSources: Array.from(sourceMap.entries())
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6),
    resumeVersionPerformance: Array.from(versionMap.entries())
      .map(([version, v]) => ({ version, submitted: v.submitted, responses: v.responses, rate: pct(v.responses, v.submitted) }))
      .filter((v) => v.version !== "—")
      .sort((a, b) => b.submitted - a.submitted),
    deadlineMisses,
    avgDaysToResponse,
  };
}

export async function getDashboardData() {
  const [apps, upcomingDeadlines, recentJobs, followUps] = await Promise.all([
    db.application.findMany({ include: { jobPosting: { include: { company: true } } } }),
    db.application.findMany({
      where: { jobPosting: { deadline: { gte: new Date() } }, status: { notIn: ["submitted", "archived", "withdrawn", "rejected"] } },
      include: { jobPosting: { include: { company: true } } },
      orderBy: { jobPosting: { deadline: "asc" } },
      take: 6,
    }),
    db.jobPosting.findMany({
      include: { company: true, applications: true },
      orderBy: { importedAt: "desc" },
      take: 6,
    }),
    db.followUpTask.findMany({
      where: { completed: false },
      include: { application: { include: { jobPosting: { include: { company: true } } } } },
      orderBy: { dueDate: "asc" },
      take: 6,
    }),
  ]);

  const readyToReview = apps.filter((a) => a.status === "ready-for-review");
  const active = apps.filter((a) => ACTIVE_STATUSES.includes(a.status as ApplicationStatus));

  return {
    totalApplications: apps.length,
    readyToReview,
    activeCount: active.length,
    upcomingDeadlines,
    recentJobs,
    followUps,
  };
}
