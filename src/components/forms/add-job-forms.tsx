"use client";

import { useActionState, useState } from "react";
import { AlertCircle, CheckCircle2, Link2, ClipboardPaste, PencilLine, Table } from "lucide-react";
import {
  importJobUrlAction,
  createJobTextAction,
  createJobManualAction,
  importCsvAction,
  type ActionState,
} from "@/lib/actions/job-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/submit-button";
import { cn } from "@/lib/utils";
import { WORKPLACE_TYPES } from "@/lib/constants";

const initial: ActionState = { ok: false };
const TABS = [
  { id: "url", label: "From URL", icon: Link2 },
  { id: "paste", label: "Paste description", icon: ClipboardPaste },
  { id: "manual", label: "Manual entry", icon: PencilLine },
  { id: "csv", label: "CSV import", icon: Table },
] as const;

function Msg({ state }: { state: ActionState }) {
  if (state.ok && state.message)
    return (
      <p className="flex items-center gap-1.5 text-sm text-success">
        <CheckCircle2 className="size-4" /> {state.message}
      </p>
    );
  if (state.message || state.error)
    return (
      <p className="flex items-start gap-1.5 text-sm text-warning">
        <AlertCircle className="mt-0.5 size-4 shrink-0" /> {state.message || state.error}
      </p>
    );
  return null;
}

export function AddJobForms({ defaultTab = "paste" }: { defaultTab?: string }) {
  const [tab, setTab] = useState<string>(defaultTab);
  const [urlState, urlAction] = useActionState(importJobUrlAction, initial);
  const [textState, textAction] = useActionState(createJobTextAction, initial);
  const [manualState, manualAction] = useActionState(createJobManualAction, initial);
  const [csvState, csvAction] = useActionState(importCsvAction, initial);

  // If a URL import was restricted / needs paste, prefill the paste tab.
  const prefillUrl = urlState.error === "NEEDS_PASTE" || urlState.error === "RESTRICTED";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <t.icon className="size-4" /> {t.label}
          </button>
        ))}
      </div>

      {tab === "url" && (
        <Card>
          <CardHeader>
            <CardTitle>Import from a URL</CardTitle>
            <CardDescription>
              We attempt official/public ATS APIs only (Greenhouse, Lever, …). Restricted platforms (LinkedIn,
              Indeed, Handshake, Simplify, …) are never scraped — we&apos;ll store the link and switch you to
              Manual Mode.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={urlAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="url">Job URL</Label>
                <Input id="url" name="url" placeholder="https://boards.greenhouse.io/acme/jobs/123" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sourceName">Source label (optional)</Label>
                <Input id="sourceName" name="sourceName" placeholder="greenhouse, company site, …" />
              </div>
              <div className="flex items-center gap-3">
                <SubmitButton pendingText="Importing…">Import job</SubmitButton>
                <Msg state={urlState} />
              </div>
              {prefillUrl ? (
                <p className="text-xs text-muted-foreground">
                  Switch to <button type="button" className="underline" onClick={() => setTab("paste")}>Paste description</button> to analyze this posting.
                </p>
              ) : null}
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "paste" && (
        <Card>
          <CardHeader>
            <CardTitle>Paste a job description</CardTitle>
            <CardDescription>Works for any posting. We parse it locally and flag risk indicators.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={textAction} className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="rawText">Job description</Label>
                <Textarea id="rawText" name="rawText" rows={12} placeholder="Paste the full posting here…" />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="sourceUrl">Source URL (optional)</Label>
                  <Input id="sourceUrl" name="sourceUrl" placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sourceNameP">Source label (optional)</Label>
                  <Input id="sourceNameP" name="sourceName" placeholder="company site, referral, …" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <SubmitButton pendingText="Parsing…">Parse &amp; save job</SubmitButton>
                <Msg state={textState} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "manual" && (
        <Card>
          <CardHeader>
            <CardTitle>Create a job manually</CardTitle>
            <CardDescription>For postings you want to track without a full description.</CardDescription>
          </CardHeader>
          <CardContent>
            <form action={manualAction} className="space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="company">Company</Label>
                  <Input id="company" name="company" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="title">Role title</Label>
                  <Input id="title" name="title" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" name="location" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="workplaceType">Workplace</Label>
                  <Select id="workplaceType" name="workplaceType" defaultValue="">
                    <option value="">—</option>
                    {WORKPLACE_TYPES.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="internshipTerm">Term</Label>
                  <Input id="internshipTerm" name="internshipTerm" placeholder="Summer 2026" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="deadline">Deadline</Label>
                  <Input id="deadline" name="deadline" type="date" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="sourceUrl2">Source URL</Label>
                  <Input id="sourceUrl2" name="sourceUrl" placeholder="https://…" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="compensation">Compensation</Label>
                  <Input id="compensation" name="compensation" placeholder="$30/hr" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description (optional)</Label>
                <Textarea id="description" name="description" rows={5} />
              </div>
              <div className="flex items-center gap-3">
                <SubmitButton pendingText="Saving…">Create job</SubmitButton>
                <Msg state={manualState} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {tab === "csv" && (
        <Card>
          <CardHeader>
            <CardTitle>Import from CSV</CardTitle>
            <CardDescription>
              Header row required. Columns: <code className="text-xs">company,title,location,url,deadline,description</code>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form action={csvAction} className="space-y-3">
              <Textarea
                name="csv"
                rows={8}
                placeholder={"company,title,location,url,deadline,description\nAcme,Software Intern,Remote,https://...,2026-08-01,..."}
              />
              <div className="flex items-center gap-3">
                <SubmitButton pendingText="Importing…">Import CSV</SubmitButton>
                <Msg state={csvState} />
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
