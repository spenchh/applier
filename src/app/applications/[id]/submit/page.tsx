import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Paperclip, Lock, ExternalLink, Copy, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { StatusBadge } from "@/components/status-badge";
import { ComplianceChecklist } from "@/components/compliance-checklist";
import { SubmitForm, ModeSelector } from "@/components/forms/submit-form";
import { CopyButton } from "@/components/copy-button";
import { getApplicationFull } from "@/lib/services/application-service";
import { getParsedJob } from "@/lib/services/job-service";
import { EmailAdapter } from "@/lib/adapters/email";
import { parseStringList, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SubmitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const app = await getApplicationFull(id);
  if (!app) notFound();

  const approved = Boolean(app.approvedAt);
  const version = app.resumeVersions[0];
  const cover = app.coverLetters[0];
  const parsed = getParsedJob(app.jobPosting);
  const applicationEmail = parsed?.applicationEmail || null;
  const emailAvailable = Boolean(applicationEmail);

  // Separate sensitive/consent answers from the rest for the "fields to submit" view.
  const consentAnswers = app.answers.filter((a) => a.sensitive);
  const regularAnswers = app.answers.filter((a) => !a.sensitive && a.answerText.trim());

  return (
    <div>
      <PageHeader title="Submission review" description={`${app.jobPosting.company.name} · ${app.jobPosting.title}`}>
        <StatusBadge status={app.status} />
        <Link
          href={`/applications/${app.id}/tailor`}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
        >
          <ArrowLeft className="size-4" /> Back to studio
        </Link>
      </PageHeader>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Exact fields */}
          <Card>
            <CardHeader>
              <CardTitle>Fields that will be submitted or copied</CardTitle>
              <CardDescription>This is exactly what leaves InternPilot — nothing more.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {regularAnswers.length === 0 ? (
                <p className="text-sm text-muted-foreground">No non-sensitive answers generated.</p>
              ) : (
                regularAnswers.map((a) => (
                  <div key={a.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.questionLabel}</p>
                      <CopyButton value={a.answerText} />
                    </div>
                    <p className="whitespace-pre-wrap text-sm text-muted-foreground">{a.answerText}</p>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Consent / sensitive fields, separated */}
          {consentAnswers.length > 0 ? (
            <Card className="border-warning/40">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="size-4 text-warning" /> Consent &amp; sensitive fields
                </CardTitle>
                <CardDescription>
                  Shown separately. These are never auto-submitted — confirm each one yourself.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {consentAnswers.map((a) => (
                  <div key={a.id} className="rounded-md border p-3">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{a.questionLabel}</p>
                      <Badge variant="warning">Sensitive</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {a.answerText.trim() ? a.answerText : <em>Left blank — provide yourself if you choose to.</em>}
                    </p>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          {/* Files */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Paperclip className="size-4" /> Files that will be attached
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between rounded-md border p-3">
                <span className="flex items-center gap-2 text-sm">
                  <FileText className="size-4 text-primary" /> Tailored resume
                </span>
                {version ? (
                  <a
                    href={`/api/resume/${app.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                  >
                    <ExternalLink className="size-4" /> Preview / Print PDF
                  </a>
                ) : (
                  <Badge variant="muted">Not generated</Badge>
                )}
              </div>
              {cover ? (
                <div className="flex items-center justify-between rounded-md border p-3">
                  <span className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-primary" /> Cover letter
                  </span>
                  <CopyButton value={cover.text} label="Copy" />
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Manual mode checklist */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Copy className="size-4" /> Manual Mode checklist
              </CardTitle>
              <CardDescription>The universal path that works for every site.</CardDescription>
            </CardHeader>
            <CardContent>
              <ol className="list-decimal space-y-1.5 pl-5 text-sm text-muted-foreground">
                <li>Open the employer&apos;s application page.</li>
                <li>Attach your tailored resume (and cover letter if requested).</li>
                <li>Use the copy buttons above to paste each answer.</li>
                <li>Answer sensitive/eligibility questions yourself.</li>
                <li>Submit on the employer&apos;s site, then confirm below to mark it submitted.</li>
              </ol>
              {app.jobPosting.sourceUrl ? (
                <a
                  href={app.jobPosting.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants({ variant: "outline" }), "mt-3")}
                >
                  <ExternalLink className="size-4" /> Open application page
                </a>
              ) : null}
            </CardContent>
          </Card>
        </div>

        {/* Sidebar: compliance + final action */}
        <div className="space-y-6">
          <ComplianceChecklist />

          <Card className="border-primary/30">
            <CardHeader>
              <CardTitle className="text-base">Final step</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <ModeSelector applicationId={app.id} mode={app.applicationMode} emailAvailable={emailAvailable} />
              {emailAvailable ? (
                <p className="text-xs text-muted-foreground">
                  Application email detected: <span className="font-medium">{applicationEmail}</span>. Email Mode
                  drafts a message (and sends only if a provider is configured and you confirm).
                </p>
              ) : null}
              <SubmitForm applicationId={app.id} approved={approved} mode={app.applicationMode} />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
