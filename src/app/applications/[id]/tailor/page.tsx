import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ShieldCheck,
  AlertTriangle,
  XCircle,
  CheckCircle2,
  KeyRound,
  FileText,
  ArrowRight,
  ExternalLink,
  Wand2,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { FitScoreBadge } from "@/components/status-badge";
import { FactChips, type FactMap } from "@/components/fact-chips";
import { GeneratePacketForm } from "@/components/forms/generate-packet-form";
import { AnswerEditor } from "@/components/forms/answer-editor";
import { CoverLetterEditor } from "@/components/forms/cover-letter-editor";
import { CopyButton } from "@/components/copy-button";
import { getApplicationFull } from "@/lib/services/application-service";
import { getMasterResume, getResumeStructure } from "@/lib/services/resume-service";
import { db } from "@/lib/db";
import { approvePacketAction } from "@/lib/actions/application-actions";
import { parseJson, parseStringList, cn } from "@/lib/utils";
import type { TruthCheckResult, KeywordCoverage, ResumeStructure, Claim } from "@/lib/llm/types";

export const dynamic = "force-dynamic";

export default async function TailorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getApplicationFull(id);
  if (!app) notFound();

  const facts = await db.profileFact.findMany({ where: { userProfileId: app.userProfileId } });
  const factMap: FactMap = new Map(facts.map((f) => [f.id, { title: f.title, type: f.type }]));

  const version = app.resumeVersions[0];
  const cover = app.coverLetters[0];
  const generated = Boolean(version);

  const truth = parseJson<TruthCheckResult | null>(version?.truthCheckJson ?? null, null);
  const coverage = parseJson<KeywordCoverage | null>(version?.keywordCoverageJson ?? null, null);
  const tailoredStructure = parseJson<ResumeStructure | null>(version?.structuredJson ?? null, null);

  const master = await getMasterResume();
  const masterStructure = getResumeStructure(master);

  const unsupportedCount = truth?.unsupported.length ?? 0;
  const needsInputCount = app.answers.filter((a) => a.needsUserInput || a.truthCheckStatus === "needs-input").length;

  return (
    <div>
      <PageHeader
        title="Tailoring Studio"
        description={`${app.jobPosting.company.name} · ${app.jobPosting.title}`}
      >
        <FitScoreBadge score={app.fitScore} />
        <Link href={`/jobs/${app.jobPostingId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Job detail
        </Link>
      </PageHeader>

      {!generated ? (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-4 p-6">
            <div className="flex items-start gap-3">
              <Wand2 className="mt-0.5 size-5 text-primary" />
              <div>
                <h3 className="font-medium">Generate your application packet</h3>
                <p className="text-sm text-muted-foreground">
                  InternPilot will tailor your resume, draft answers, and (optionally) a cover letter — using only
                  your Truth Vault facts. Every claim is cited and truth-checked. Nothing is fabricated.
                </p>
              </div>
            </div>
            <GeneratePacketForm applicationId={app.id} />
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {/* Truth check */}
            <Card className={cn(unsupportedCount > 0 && "border-destructive/40")}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-primary" /> Truth check
                </CardTitle>
                <CardDescription>Every claim mapped against your stored facts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <TruthStat label="Supported" count={truth?.supported.length ?? 0} variant="success" icon={CheckCircle2} />
                  <TruthStat label="Weak" count={truth?.weak.length ?? 0} variant="warning" icon={AlertTriangle} />
                  <TruthStat label="Unsupported" count={unsupportedCount} variant="destructive" icon={XCircle} />
                </div>

                {unsupportedCount > 0 ? (
                  <ClaimList title="Unsupported claims — remove or back with a fact" claims={truth!.unsupported} tone="destructive" />
                ) : null}
                {truth && truth.weak.length > 0 ? (
                  <ClaimList title="Weakly supported — tighten wording" claims={truth.weak} tone="warning" />
                ) : null}
                {truth && truth.missingFacts.length > 0 ? (
                  <div className="rounded-md bg-muted/50 p-3">
                    <p className="mb-1 text-sm font-medium">Facts you may want to add</p>
                    <ul className="list-disc space-y-0.5 pl-5 text-sm text-muted-foreground">
                      {truth.missingFacts.slice(0, 5).map((m, i) => (
                        <li key={i}>{m}</li>
                      ))}
                    </ul>
                    <Link href="/profile?tab=vault" className="mt-2 inline-block text-xs text-primary hover:underline">
                      Add facts to Truth Vault →
                    </Link>
                  </div>
                ) : null}
                {unsupportedCount === 0 && (truth?.weak.length ?? 0) === 0 ? (
                  <p className="flex items-center gap-2 text-sm text-success">
                    <CheckCircle2 className="size-4" /> All generated claims trace back to your stored facts.
                  </p>
                ) : null}
              </CardContent>
            </Card>

            {/* Tailored resume preview + diff */}
            <Card>
              <CardHeader className="flex-row items-center justify-between space-y-0">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="size-4 text-primary" /> Tailored resume
                  </CardTitle>
                  <CardDescription>ATS-friendly, one-page oriented. Grounded in your facts.</CardDescription>
                </div>
                <div className="flex gap-2">
                  <CopyButton value={version?.tailoredText ?? ""} label="Copy text" />
                  <a
                    href={`/api/resume/${app.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <ExternalLink className="size-4" /> Preview / Print PDF
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <iframe
                  title="Tailored resume preview"
                  srcDoc={version?.htmlPreview ?? ""}
                  className="h-[520px] w-full rounded-md border bg-white"
                  sandbox=""
                />
                {/* Master vs tailored diff */}
                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  <DiffColumn title="Master" summary={masterStructure?.summary} skills={masterStructure?.skills ?? []} muted />
                  <DiffColumn title="Tailored" summary={tailoredStructure?.summary} skills={tailoredStructure?.skills ?? []} />
                </div>
              </CardContent>
            </Card>

            {/* Cover letter */}
            {cover ? (
              <Card>
                <CardHeader>
                  <CardTitle>Cover letter</CardTitle>
                  <CardDescription>Editable. Grounded in your facts.</CardDescription>
                </CardHeader>
                <CardContent>
                  <CoverLetterEditor
                    applicationId={app.id}
                    text={cover.text}
                    factChips={<FactChips ids={parseStringList(cover.supportingFactIdsJson)} factMap={factMap} />}
                  />
                </CardContent>
              </Card>
            ) : null}

            {/* Answers */}
            <Card>
              <CardHeader>
                <CardTitle>Short-answer responses</CardTitle>
                <CardDescription>
                  Each answer cites the facts it used. Sensitive and &quot;needs your input&quot; answers are flagged.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {app.answers.map((a) => (
                  <AnswerEditor
                    key={a.id}
                    answerId={a.id}
                    applicationId={app.id}
                    questionLabel={a.questionLabel ?? "Question"}
                    answerText={a.answerText}
                    truthStatus={a.truthCheckStatus}
                    confidence={a.confidence}
                    sensitive={a.sensitive}
                    needsUserInput={a.needsUserInput}
                    approved={a.userApproved}
                    factChips={<FactChips ids={parseStringList(a.supportingFactIdsJson)} factMap={factMap} />}
                  />
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Keyword coverage */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <KeyRound className="size-4 text-primary" /> ATS keyword coverage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <KeywordRow label="Required present" items={coverage?.requiredPresent ?? []} variant="success" />
                <KeywordRow label="Preferred present" items={coverage?.preferredPresent ?? []} variant="secondary" />
                <KeywordRow label="Missing" items={coverage?.missing ?? []} variant="destructive" />
                {coverage?.intentionallyOmitted.length ? (
                  <div>
                    <p className="mb-1 text-xs font-medium text-muted-foreground">
                      Omitted (unsupported by your facts)
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {coverage.intentionallyOmitted.map((k) => (
                        <Badge key={k} variant="muted">
                          {k}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      We won&apos;t pad your resume with keywords you can&apos;t back up.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>

            {/* Approve */}
            <Card className="border-primary/30">
              <CardHeader>
                <CardTitle className="text-base">Approve packet</CardTitle>
                <CardDescription>Review everything, then approve to move to submission.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {unsupportedCount > 0 ? (
                  <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
                    <XCircle className="mt-0.5 size-3.5 shrink-0" />
                    {unsupportedCount} unsupported claim(s). Fix these before submitting for an honest application.
                  </p>
                ) : null}
                {needsInputCount > 0 ? (
                  <p className="flex items-start gap-1.5 rounded-md bg-warning/10 p-2 text-xs text-warning">
                    <AlertTriangle className="mt-0.5 size-3.5 shrink-0" />
                    {needsInputCount} answer(s) need your input.
                  </p>
                ) : null}
                <GeneratePacketForm applicationId={app.id} regenerate />
                <form action={approvePacketAction}>
                  <input type="hidden" name="applicationId" value={app.id} />
                  <Button type="submit" variant="success" className="w-full">
                    Approve packet <ArrowRight className="size-4" />
                  </Button>
                </form>
                <p className="text-center text-xs text-muted-foreground">
                  You&apos;ll still confirm accuracy on the submission screen. Nothing is submitted automatically.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

function TruthStat({
  label,
  count,
  variant,
  icon: Icon,
}: {
  label: string;
  count: number;
  variant: "success" | "warning" | "destructive";
  icon: typeof CheckCircle2;
}) {
  const color = variant === "success" ? "text-success" : variant === "warning" ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-md border p-3 text-center">
      <Icon className={cn("mx-auto mb-1 size-4", color)} />
      <div className={cn("text-xl font-semibold", color)}>{count}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}

function ClaimList({ title, claims, tone }: { title: string; claims: Claim[]; tone: "destructive" | "warning" }) {
  return (
    <div className={cn("rounded-md p-3", tone === "destructive" ? "bg-destructive/10" : "bg-warning/10")}>
      <p className={cn("mb-1 text-sm font-medium", tone === "destructive" ? "text-destructive" : "text-warning")}>
        {title}
      </p>
      <ul className="space-y-1 text-sm">
        {claims.map((c, i) => (
          <li key={i} className="text-muted-foreground">
            “{c.text}”{c.note ? <span className="block text-xs">{c.note}</span> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}

function KeywordRow({
  label,
  items,
  variant,
}: {
  label: string;
  items: string[];
  variant: "success" | "secondary" | "destructive";
}) {
  return (
    <div>
      <p className="mb-1 text-xs font-medium text-muted-foreground">{label}</p>
      {items.length ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((k) => (
            <Badge key={k} variant={variant}>
              {k}
            </Badge>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">None</p>
      )}
    </div>
  );
}

function DiffColumn({
  title,
  summary,
  skills,
  muted,
}: {
  title: string;
  summary?: string;
  skills: string[];
  muted?: boolean;
}) {
  return (
    <div className={cn("rounded-md border p-3", muted && "bg-muted/30")}>
      <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="text-sm">{summary || <span className="text-muted-foreground">No summary</span>}</p>
      <div className="mt-2 flex flex-wrap gap-1">
        {skills.slice(0, 12).map((s, i) => (
          <Badge key={`${s}-${i}`} variant={muted ? "muted" : "secondary"}>
            {s}
          </Badge>
        ))}
      </div>
    </div>
  );
}
