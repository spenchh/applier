import { prisma } from "@/lib/db";
import { readJson, writeJson } from "@/lib/json";
import { ensureDatabaseReady } from "@/lib/runtime-db";
import { clamp, parseDate } from "@/lib/services/shared";

type PlanItem = {
  id: string;
  title: string;
  reason: string;
  minutes: number;
  proof: string;
  source: string;
};

type ImportTaskInput = {
  title: string;
  description?: string;
  category?: string;
  priority?: string;
  estimatedMinutes?: number;
  dueAt?: Date | null;
  source?: string;
  externalId?: string;
  proofNote?: string;
};

const providerLabels: Record<string, string> = {
  canvas: "Canvas",
  github: "GitHub",
  google_calendar: "Google Calendar",
  outlook: "Outlook / Microsoft 365",
  simplify: "Simplify",
  handshake: "Handshake",
  syllabus: "Syllabus and notes",
};

export async function getMomentumDashboard(userAccountId: string) {
  await ensureMomentumStarter(userAccountId);
  const today = startOfDay(new Date());
  const tomorrow = addDays(today, 1);
  const weekEnd = addDays(today, 7);
  const [goals, tasks, evidence, integrations, latestCheckIn] = await Promise.all([
    prisma.momentumGoal.findMany({
      where: { userAccountId },
      orderBy: [{ status: "asc" }, { targetDate: "asc" }, { createdAt: "desc" }],
      include: { tasks: true },
    }),
    prisma.momentumTask.findMany({
      where: { userAccountId },
      orderBy: [{ dueAt: "asc" }, { createdAt: "desc" }],
      include: { evidence: true, goal: true },
      take: 80,
    }),
    prisma.momentumEvidence.findMany({
      where: { userAccountId },
      orderBy: { capturedAt: "desc" },
      take: 12,
    }),
    prisma.momentumIntegration.findMany({
      where: { userAccountId },
      orderBy: { provider: "asc" },
    }),
    prisma.momentumCheckIn.findFirst({
      where: { userAccountId },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  const openTasks = tasks.filter((task) => task.status !== "done" && task.status !== "skipped");
  const dueToday = openTasks.filter((task) => task.dueAt && task.dueAt >= today && task.dueAt < tomorrow);
  const overdue = openTasks.filter((task) => task.dueAt && task.dueAt < today);
  const upcoming = openTasks.filter((task) => task.dueAt && task.dueAt >= tomorrow && task.dueAt <= weekEnd);
  const plan = buildDailyPlan(openTasks, goals, latestCheckIn?.availableMinutes ?? 150);
  const doneThisWeek = tasks.filter((task) => task.completedAt && task.completedAt >= addDays(today, -6)).length;
  const proofThisWeek = evidence.filter((item) => item.capturedAt >= addDays(today, -6)).length;
  const completionRate = tasks.length ? Math.round((tasks.filter((task) => task.status === "done").length / tasks.length) * 100) : 0;
  const accountabilityScore = clamp(completionRate + Math.min(doneThisWeek * 4, 24) + Math.min(proofThisWeek * 5, 20), 0, 100);

  return {
    goals,
    tasks,
    openTasks,
    dueToday,
    overdue,
    upcoming,
    evidence,
    integrations,
    latestCheckIn,
    plan,
    metrics: {
      accountabilityScore,
      doneThisWeek,
      proofThisWeek,
      openCount: openTasks.length,
      connectedCount: integrations.filter((integration) => integration.status === "connected").length,
    },
  };
}

export async function createMomentumGoal(userAccountId: string, input: { title: string; category: string; why?: string; successMetric?: string; targetDate?: string; cadence: string }) {
  await ensureDatabaseReady();
  return prisma.momentumGoal.create({
    data: {
      userAccountId,
      title: input.title,
      category: input.category,
      why: input.why || null,
      successMetric: input.successMetric || null,
      targetDate: parseDate(input.targetDate),
      cadence: input.cadence,
      updatedAt: new Date(),
    },
  });
}

export async function createMomentumTask(userAccountId: string, input: ImportTaskInput & { goalId?: string; proofRequired?: boolean }) {
  await ensureDatabaseReady();
  return upsertTask(userAccountId, {
    ...input,
    source: input.source ?? "manual",
    proofRequired: input.proofRequired ?? true,
  });
}

export async function createMomentumEvidence(userAccountId: string, input: { taskId?: string; source: string; title: string; url?: string; summary: string; skills: string[] }) {
  await ensureDatabaseReady();
  return prisma.momentumEvidence.create({
    data: {
      userAccountId,
      taskId: input.taskId || null,
      source: input.source,
      title: input.title,
      url: input.url || null,
      summary: input.summary,
      skillsJson: writeJson(input.skills),
    },
  });
}

export async function completeMomentumTask(userAccountId: string, taskId: string, proofNote?: string) {
  await ensureDatabaseReady();
  const existing = await prisma.momentumTask.findFirst({ where: { id: taskId, userAccountId } });
  if (!existing) throw new Error("Task not found.");
  const task = await prisma.momentumTask.update({
    where: { id: taskId },
    data: {
      status: "done",
      completedAt: new Date(),
      proofNote: proofNote || undefined,
    },
  });
  if (proofNote) {
    await prisma.momentumEvidence.create({
      data: {
        userAccountId,
        taskId,
        source: "completion",
        title: `Completed: ${task.title}`,
        summary: proofNote,
      },
    });
  }
  return task;
}

export async function createMomentumCheckIn(userAccountId: string, input: { mood?: string; availableMinutes: number; focus?: string; blockers?: string }) {
  const dashboard = await getMomentumDashboard(userAccountId);
  const plan = buildDailyPlan(dashboard.openTasks, dashboard.goals, input.availableMinutes, input.focus);
  return prisma.momentumCheckIn.create({
    data: {
      userAccountId,
      mood: input.mood || null,
      availableMinutes: input.availableMinutes,
      focus: input.focus || null,
      blockers: input.blockers || null,
      planJson: writeJson(plan),
    },
  });
}

export async function saveMomentumIntegration(userAccountId: string, input: { provider: string; label?: string; config?: Record<string, string>; status?: string; lastError?: string | null }) {
  await ensureDatabaseReady();
  return prisma.momentumIntegration.upsert({
    where: { userAccountId_provider: { userAccountId, provider: input.provider } },
    create: {
      userAccountId,
      provider: input.provider,
      label: input.label || providerLabels[input.provider] || input.provider,
      status: input.status ?? "connected",
      configJson: writeJson(input.config ?? {}),
      lastError: input.lastError ?? null,
    },
    update: {
      label: input.label || providerLabels[input.provider] || input.provider,
      status: input.status ?? "connected",
      configJson: writeJson(input.config ?? {}),
      lastError: input.lastError ?? null,
      lastSyncedAt: input.status === "connected" ? new Date() : undefined,
    },
  });
}

export async function syncCanvasAssignments(userAccountId: string, input: { canvasUrl: string; accessToken: string }) {
  await ensureDatabaseReady();
  const canvasUrl = normalizeCanvasUrl(input.canvasUrl);
  const start = new Date().toISOString();
  const end = addDays(new Date(), 21).toISOString();
  try {
    const url = new URL("/api/v1/users/self/calendar_events", canvasUrl);
    url.searchParams.set("type", "assignment");
    url.searchParams.set("start_date", start);
    url.searchParams.set("end_date", end);
    url.searchParams.set("per_page", "50");
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${input.accessToken}`,
      },
    });
    if (!response.ok) throw new Error(`Canvas returned ${response.status}`);
    const assignments = (await response.json()) as CanvasAssignment[];
    let created = 0;
    for (const assignment of assignments) {
      const title = assignment.title || assignment.assignment?.name;
      if (!title) continue;
      await upsertTask(userAccountId, {
        source: "canvas",
        externalId: String(assignment.id ?? assignment.assignment?.id ?? title),
        title,
        description: [assignment.context_name, assignment.description].filter(Boolean).join(" - "),
        category: "school",
        priority: "high",
        estimatedMinutes: 60,
        dueAt: parseDate(assignment.assignment?.due_at ?? assignment.start_at ?? assignment.end_at),
        proofNote: "Submit in Canvas or attach a screenshot/file after completion.",
      });
      created += 1;
    }
    await saveMomentumIntegration(userAccountId, { provider: "canvas", config: { canvasUrl }, status: "connected", lastError: null });
    return { created };
  } catch (error) {
    await saveMomentumIntegration(userAccountId, { provider: "canvas", config: { canvasUrl }, status: "error", lastError: error instanceof Error ? error.message : "Canvas sync failed" });
    throw error;
  }
}

export async function syncGitHubActivity(userAccountId: string, input: { username?: string; accessToken?: string }) {
  await ensureDatabaseReady();
  const headers: HeadersInit = { "Accept": "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28" };
  if (input.accessToken) headers.Authorization = `Bearer ${input.accessToken}`;
  const reposUrl = input.accessToken ? "https://api.github.com/user/repos?sort=pushed&per_page=20" : `https://api.github.com/users/${encodeURIComponent(input.username ?? "")}/repos?sort=pushed&per_page=20`;
  try {
    const response = await fetch(reposUrl, { headers });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const repos = (await response.json()) as GitHubRepo[];
    let evidenceCount = 0;
    let taskCount = 0;
    for (const repo of repos.slice(0, 12)) {
      if (repo.fork) continue;
      await prisma.momentumEvidence.create({
        data: {
          userAccountId,
          source: "github",
          title: repo.full_name,
          url: repo.html_url,
          summary: repo.description || `Repository updated ${formatRelativeDate(repo.pushed_at)}. Use this as proof of project activity if it has a clear README, screenshots, and impact statement.`,
          skillsJson: writeJson([repo.language].filter(Boolean)),
          capturedAt: parseDate(repo.pushed_at) ?? new Date(),
        },
      });
      evidenceCount += 1;
      const pushedAt = parseDate(repo.pushed_at);
      if (!pushedAt || pushedAt < addDays(new Date(), -7)) {
        await upsertTask(userAccountId, {
          source: "github",
          externalId: `maintain:${repo.id}`,
          title: `Refresh proof for ${repo.name}`,
          description: "Add one meaningful commit, improve the README, or capture a demo screenshot so this project is recruiter-ready.",
          category: "career",
          priority: "medium",
          estimatedMinutes: 45,
          dueAt: addDays(new Date(), 3),
          proofNote: "Link a commit, README update, or screenshot.",
        });
        taskCount += 1;
      }
    }
    await saveMomentumIntegration(userAccountId, { provider: "github", config: { username: input.username ?? "" }, status: "connected", lastError: null });
    return { evidenceCount, taskCount };
  } catch (error) {
    await saveMomentumIntegration(userAccountId, { provider: "github", config: { username: input.username ?? "" }, status: "error", lastError: error instanceof Error ? error.message : "GitHub sync failed" });
    throw error;
  }
}

export async function importMomentumText(userAccountId: string, input: { source: string; text: string }) {
  await ensureDatabaseReady();
  const tasks = extractTasksFromText(input.text, input.source);
  for (const task of tasks) {
    await upsertTask(userAccountId, task);
  }
  await saveMomentumIntegration(userAccountId, {
    provider: input.source,
    config: { importMode: "paste" },
    status: "connected",
    lastError: null,
  });
  return { created: tasks.length };
}

export function skillList(value: string) {
  return readJson<string[]>(value, []);
}

async function ensureMomentumStarter(userAccountId: string) {
  await ensureDatabaseReady();
  const count = await prisma.momentumGoal.count({ where: { userAccountId } });
  if (count > 0) return;
  const now = new Date();
  const goal = await prisma.momentumGoal.create({
    data: {
      userAccountId,
      title: "Build a consistent student execution system",
      category: "personal",
      why: "Stay on top of coursework, build proof, and make career progress without panic cycles.",
      successMetric: "At least 5 completed commitments and 2 proof cards each week.",
      targetDate: addDays(now, 30),
      cadence: "weekly",
      updatedAt: now,
    },
  });
  await prisma.momentumTask.createMany({
    data: [
      {
        userAccountId,
        goalId: goal.id,
        title: "Connect Canvas or import this week's deadlines",
        description: "Bring assignments into Momentum so the daily plan has real academic context.",
        category: "school",
        priority: "high",
        estimatedMinutes: 20,
        dueAt: addDays(now, 1),
        proofNote: "Canvas sync or pasted syllabus/deadline list.",
      },
      {
        userAccountId,
        goalId: goal.id,
        title: "Create one proof card from a class or project",
        description: "Capture what you built, debugged, wrote, or learned so it can become resume/interview evidence later.",
        category: "career",
        priority: "medium",
        estimatedMinutes: 30,
        dueAt: addDays(now, 2),
        proofNote: "A GitHub link, screenshot, lab report, or short reflection.",
      },
      {
        userAccountId,
        goalId: goal.id,
        title: "Do one focused application or outreach block",
        description: "Use Simplify, Handshake, LinkedIn, or a company page for the submission. Momentum just tracks the commitment.",
        category: "career",
        priority: "medium",
        estimatedMinutes: 45,
        dueAt: addDays(now, 3),
        proofNote: "Application confirmation, tracker note, or email draft.",
      },
    ],
  });
}

async function upsertTask(userAccountId: string, input: ImportTaskInput & { goalId?: string; proofRequired?: boolean }) {
  const dueAt = input.dueAt ?? null;
  if (input.externalId) {
    const existing = await prisma.momentumTask.findFirst({
      where: { userAccountId, source: input.source ?? "manual", externalId: input.externalId },
    });
    if (existing) {
      return prisma.momentumTask.update({
        where: { id: existing.id },
        data: {
          title: input.title,
          description: input.description || null,
          category: input.category ?? existing.category,
          priority: input.priority ?? existing.priority,
          estimatedMinutes: input.estimatedMinutes ?? existing.estimatedMinutes,
          dueAt,
          proofNote: input.proofNote || existing.proofNote,
        },
      });
    }
  }
  return prisma.momentumTask.create({
    data: {
      userAccountId,
      goalId: input.goalId || null,
      source: input.source ?? "manual",
      externalId: input.externalId || null,
      title: input.title,
      description: input.description || null,
      category: input.category ?? "school",
      priority: input.priority ?? "medium",
      estimatedMinutes: input.estimatedMinutes ?? 45,
      dueAt,
      proofRequired: input.proofRequired ?? true,
      proofNote: input.proofNote || null,
    },
  });
}

function buildDailyPlan(tasks: Array<{ id: string; title: string; source: string; dueAt: Date | null; priority: string; estimatedMinutes: number; proofNote: string | null; category: string; status: string }>, goals: Array<{ title: string; category: string; status: string }>, availableMinutes: number, focus?: string | null): PlanItem[] {
  const activeGoals = goals.filter((goal) => goal.status === "active");
  const sorted = [...tasks]
    .filter((task) => task.status !== "done")
    .sort((a, b) => scoreTask(b, focus) - scoreTask(a, focus));
  const plan: PlanItem[] = [];
  let remaining = availableMinutes;
  for (const task of sorted) {
    if (remaining < 15 || plan.length >= 5) break;
    const minutes = Math.min(task.estimatedMinutes || 45, remaining);
    plan.push({
      id: task.id,
      title: task.title,
      reason: reasonForTask(task, activeGoals),
      minutes,
      proof: task.proofNote || defaultProofFor(task.category),
      source: task.source,
    });
    remaining -= minutes;
  }
  return plan;
}

function scoreTask(task: { dueAt: Date | null; priority: string; source: string; title: string; category: string }, focus?: string | null) {
  let score = 0;
  if (task.priority === "high") score += 40;
  if (task.priority === "medium") score += 20;
  if (task.dueAt) {
    const hours = (task.dueAt.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hours < 0) score += 60;
    else if (hours < 24) score += 45;
    else if (hours < 72) score += 25;
  }
  if (task.source === "canvas") score += 12;
  if (task.source === "github") score += 8;
  if (focus && `${task.title} ${task.category}`.toLowerCase().includes(focus.toLowerCase())) score += 30;
  return score;
}

function reasonForTask(task: { dueAt: Date | null; priority: string; source: string; category: string }, goals: Array<{ title: string; category: string }>) {
  if (task.dueAt && task.dueAt < new Date()) return "Overdue, so it gets first attention.";
  if (task.dueAt && task.dueAt < addDays(new Date(), 1)) return "Due soon and likely to create stress if it slips.";
  const goal = goals.find((item) => item.category === task.category);
  if (goal) return `Supports your goal: ${goal.title}.`;
  if (task.source === "github") return "Keeps project proof fresh instead of letting it go stale.";
  return "Moves one important commitment from intention to evidence.";
}

function extractTasksFromText(text: string, source: string): ImportTaskInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 5)
    .slice(0, 80);
  const tasks: ImportTaskInput[] = [];
  for (const [index, line] of lines.entries()) {
    const looksActionable = /\b(due|apply|submit|interview|quiz|exam|project|problem set|pset|homework|email|follow up|deadline|assignment|lab|resume|cover letter)\b/i.test(line);
    if (!looksActionable) continue;
    const dueAt = parseLooseDate(line);
    tasks.push({
      source,
      externalId: `${source}:${index}:${line.slice(0, 24)}`,
      title: cleanTaskTitle(line),
      description: line,
      category: /apply|interview|resume|cover letter|simplify|handshake|linkedin/i.test(line) ? "career" : "school",
      priority: dueAt && dueAt < addDays(new Date(), 3) ? "high" : "medium",
      estimatedMinutes: /exam|project|lab/i.test(line) ? 90 : 45,
      dueAt,
      proofNote: source === "syllabus" ? "Submission screenshot, file, or short completion note." : "Confirmation screenshot, link, or note.",
    });
  }
  return tasks.length ? tasks : [{
    source,
    title: `Review imported ${providerLabels[source] ?? source} notes`,
    description: text.slice(0, 500),
    category: source === "syllabus" ? "school" : "career",
    priority: "medium",
    estimatedMinutes: 30,
    dueAt: addDays(new Date(), 1),
    proofNote: "Turn this import into concrete tasks.",
  }];
}

function cleanTaskTitle(line: string) {
  return line.replace(/^[-*•\d.)\s]+/, "").slice(0, 110);
}

function parseLooseDate(line: string) {
  const iso = line.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
  if (iso) return parseDate(`${iso[1]}-${iso[2].padStart(2, "0")}-${iso[3].padStart(2, "0")}`);
  const us = line.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}))?\b/);
  if (us) {
    const year = us[3] ?? String(new Date().getFullYear());
    return parseDate(`${year}-${us[1].padStart(2, "0")}-${us[2].padStart(2, "0")}`);
  }
  return null;
}

function defaultProofFor(category: string) {
  if (category === "school") return "Submission confirmation, screenshot, or short reflection.";
  if (category === "career") return "Application confirmation, GitHub commit, outreach email, or recruiter note.";
  return "A screenshot, link, or short note showing it happened.";
}

function normalizeCanvasUrl(canvasUrl: string) {
  const trimmed = canvasUrl.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return `https://${trimmed}`;
  return trimmed;
}

function startOfDay(date: Date) {
  const copy = new Date(date);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function addDays(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function formatRelativeDate(value: string | null) {
  const date = parseDate(value);
  if (!date) return "recently";
  const days = Math.round((Date.now() - date.getTime()) / (1000 * 60 * 60 * 24));
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  return `${days} days ago`;
}

type CanvasAssignment = {
  id?: number | string;
  title?: string;
  description?: string;
  start_at?: string;
  end_at?: string;
  context_name?: string;
  assignment?: {
    id?: number | string;
    name?: string;
    due_at?: string | null;
  };
};

type GitHubRepo = {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  pushed_at: string | null;
  language: string | null;
  fork: boolean;
};
