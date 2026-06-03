import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MapPin,
  ExternalLink,
  Wand2,
  Trash2,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FitRing } from "@/components/status-badge";
import { RiskFlagList } from "@/components/risk-flags";
import { db } from "@/lib/db";
import { getParsedJob } from "@/lib/services/job-service";
import { previewFit } from "@/lib/services/fit-service";
import { getOrCreateApplication } from "@/lib/services/application-service";
import { startTailoringAction, deleteApplicationAction } from "@/lib/actions/application-actions";
import { deleteJobAction } from "@/lib/actions/job-actions";
import { parseJson, parseStringList, humanize, formatRelativeDeadline, formatDate, cn } from "@/lib/utils";
import { isRestrictedPlatform } from "@/lib/url";
import type { RiskFlag } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

function ListBlock({ title, items, empty }: { title: string; items: string[]; empty?: string }) {
  return (
    <div>
      <h4 className="mb-1.5 text-sm font-semibold">{title}</h4>
      {items.length ? (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {items.map((it, i) => (
            <li key={i}>{it}</li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-muted-foreground">{empty ?? "Not specified in the posting."}</p>
      )}
    </div>
  );
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await db.jobPosting.findUnique({
    where: { id },
    include: { company: true, questions: true, applications: true },
  });
  if (!job) notFound();

  const parsed = getParsedJob(job);
  const flags = parseJson<RiskFlag[]>(job.riskFlagsJson, []);
  const fit = await previewFit(id);
  const existingApp = job.applications[0];
  const restricted = job.sourceUrl ? isRestrictedPlatform(job.sourceUrl) : false;

  const required = parseStringList(job.requiredQualifications);
  const preferred = parseStringList(job.preferredQualifications);
  const responsibilities = parseStringList(job.responsibilities);
  const technologies = parseStringList(job.technologies);

  return (
    <div>
      <PageHeader title={job.title} description={`${job.company.name}${job.location ? ` · ${job.location}` : ""}`}>
        {existingApp ? (
          <Link href={`/applications/${existingApp.id}/tailor`} className={buttonVariants()}>
            <Wand2 className="size-4" /> Open Tailoring Studio
          </Link>
        ) : (
          <form action={startTailoringAction}>
            <input type="hidden" name="jobId" value={job.id} />
            <Button type="submit">
              <Wand2 className="size-4" /> Analyze &amp; tailor
            </Button>
          </form>
        )}
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Fit */}
          <Card>
            <CardHeader>
              <CardTitle>Fit analysis</CardTitle>
              <CardDescription>{fit?.summary ?? "Add Truth Vault facts to compute fit."}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <FitRing score={fit?.fitScore ?? null} />
                  <div className="text-sm">
                    <div className="font-medium">Recommended template</div>
                    <Badge variant="secondary" className="mt-1">
                      {humanize(fit?.recommendedTemplate ?? "general")}
                    </Badge>
                  </div>
                </div>
                <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-success">
                      <CheckCircle2 className="size-4" /> Matched ({fit?.matched.length ?? 0})
                    </div>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {(fit?.matched ?? []).slice(0, 5).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                      {!fit?.matched.length ? <li>None yet</li> : null}
                    </ul>
                  </div>
                  <div>
                    <div className="mb-1 flex items-center gap-1.5 text-sm font-medium text-destructive">
                      <XCircle className="size-4" /> Missing ({fit?.missing.length ?? 0})
                    </div>
                    <ul className="space-y-0.5 text-xs text-muted-foreground">
                      {(fit?.missing ?? []).slice(0, 5).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                      {!fit?.missing.length ? <li>None</li> : null}
                    </ul>
                  </div>
                </div>
              </div>
              {fit?.suggestedPositioning ? (
                <p className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
                  <strong>Positioning:</strong> {fit.suggestedPositioning}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* Parsed posting */}
          <Card>
            <CardHeader>
              <CardTitle>Parsed posting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ListBlock title="Responsibilities" items={responsibilities} />
              <ListBlock title="Required qualifications" items={required} />
              <ListBlock title="Preferred qualifications" items={preferred} />
              {technologies.length ? (
                <div>
                  <h4 className="mb-1.5 text-sm font-semibold">Keywords to include (if supported)</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {technologies.map((t) => (
                      <Badge key={t} variant="secondary">
                        {t}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Application questions */}
          <Card>
            <CardHeader>
              <CardTitle>Application questions</CardTitle>
              <CardDescription>
                Sensitive (demographic / eligibility) questions are flagged and never auto-answered.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {job.questions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No structured questions detected in the posting.</p>
              ) : (
                <ul className="space-y-2">
                  {job.questions.map((q) => (
                    <li key={q.id} className="flex items-start justify-between gap-3 rounded-md border p-3">
                      <span className="text-sm">{q.questionText}</span>
                      <div className="flex shrink-0 gap-1.5">
                        {q.required ? <Badge variant="outline">Required</Badge> : null}
                        {q.sensitive ? <Badge variant="warning">Sensitive</Badge> : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {/* Raw description (escaped by React) */}
          {job.rawDescription ? (
            <Card>
              <CardHeader>
                <CardTitle>Original description</CardTitle>
              </CardHeader>
              <CardContent>
                <pre className="max-h-96 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 font-sans text-sm text-muted-foreground">
                  {job.rawDescription}
                </pre>
              </CardContent>
            </Card>
          ) : null}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 text-sm">
              <Row label="Deadline" value={formatRelativeDeadline(job.deadline)} />
              <Row label="Workplace" value={job.workplaceType ? humanize(job.workplaceType) : "—"} />
              <Row label="Term" value={job.internshipTerm || "—"} />
              <Row label="Compensation" value={job.compensation || "Not listed"} />
              {job.location ? (
                <Row label="Location" value={job.location} icon={<MapPin className="size-3.5" />} />
              ) : null}
              <Row label="ATS" value={job.atsProvider && job.atsProvider !== "unknown" ? humanize(job.atsProvider) : "—"} />
              <Row label="Source" value={job.sourceName || "—"} />
              <Row label="Imported" value={formatDate(job.importedAt)} />
              {parsed?.applicationEmail ? <Row label="Apply email" value={parsed.applicationEmail} /> : null}
            </CardContent>
          </Card>

          {job.sourceUrl ? (
            <Card>
              <CardContent className="space-y-2 p-4">
                <a
                  href={job.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "w-full")}
                >
                  <ExternalLink className="size-4" /> Open original posting
                </a>
                {restricted ? (
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-warning" />
                    This is a restricted platform. InternPilot won&apos;t scrape or auto-apply — open and apply
                    yourself, then track it here.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Risk indicators</CardTitle>
              <CardDescription className="text-xs">Indicators only — never a safety guarantee.</CardDescription>
            </CardHeader>
            <CardContent>
              <RiskFlagList flags={flags} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required materials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-sm text-muted-foreground">
              <p className="flex items-center gap-2">
                <FileText className="size-4" /> Tailored resume
              </p>
              <p className="flex items-center gap-2">
                <FileText className="size-4" /> Cover letter (optional)
              </p>
              {job.questions.length ? (
                <p className="flex items-center gap-2">
                  <FileText className="size-4" /> {job.questions.length} short answer(s)
                </p>
              ) : null}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            {existingApp ? (
              <form action={deleteApplicationAction} className="flex-1">
                <input type="hidden" name="id" value={existingApp.id} />
                <Button variant="outline" type="submit" className="w-full">
                  Remove application
                </Button>
              </form>
            ) : null}
            <form action={deleteJobAction}>
              <input type="hidden" name="id" value={job.id} />
              <Button variant="ghost" size="icon" type="submit" aria-label="Delete job">
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="flex items-center gap-1 text-right font-medium">{icon}{value}</span>
    </div>
  );
}
