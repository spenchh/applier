"use client";

import { useActionState } from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { saveFactAction, type ActionState } from "@/lib/actions/profile-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { PROFILE_FACT_TYPES } from "@/lib/constants";
import { humanize, parseStringList } from "@/lib/utils";
import type { ProfileFact } from "@prisma/client";

const initial: ActionState = { ok: false };

export function FactForm({ fact }: { fact?: ProfileFact | null }) {
  const [state, action] = useActionState(saveFactAction, initial);
  const editing = Boolean(fact?.id);

  return (
    <Card id="fact-form">
      <CardHeader>
        <CardTitle>{editing ? "Edit fact" : "Add a fact to your Truth Vault"}</CardTitle>
        <CardDescription>
          The Truth Vault is the <strong>only</strong> source the AI may use. Every generated claim must map back
          to a fact here. Keep it accurate.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4" key={fact?.id ?? "new"}>
          {editing ? <input type="hidden" name="id" value={fact!.id} /> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="type">Type</Label>
              <Select id="type" name="type" defaultValue={fact?.type ?? "project"}>
                {PROFILE_FACT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" defaultValue={fact?.title ?? ""} placeholder="e.g. Software Engineering Intern" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="organization">Organization</Label>
              <Input id="organization" name="organization" defaultValue={fact?.organization ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" name="location" defaultValue={fact?.location ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="startDate">Start date</Label>
              <Input id="startDate" name="startDate" type="date" defaultValue={fact?.startDate?.toISOString().slice(0, 10) ?? ""} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate">End date</Label>
              <Input id="endDate" name="endDate" type="date" defaultValue={fact?.endDate?.toISOString().slice(0, 10) ?? ""} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={fact?.description ?? ""} placeholder="What you did, truthfully and specifically." />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="impact">Measurable impact</Label>
            <Input id="impact" name="impact" defaultValue={fact?.impact ?? ""} placeholder="e.g. Cut reporting time from 3h to 10min" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="skills">Skills used</Label>
              <Input id="skills" name="skills" defaultValue={fact ? parseStringList(fact.skills).join(", ") : ""} placeholder="react, typescript, sql" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="evidenceNote">Evidence / source note</Label>
              <Input id="evidenceNote" name="evidenceNote" defaultValue={fact?.evidenceNote ?? ""} placeholder="Link or where to verify this" />
            </div>
          </div>

          <div className="flex flex-wrap gap-4 rounded-md border bg-muted/40 p-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="resumeAllowed" defaultChecked={fact?.resumeAllowed ?? true} /> Allow on resume
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="coverLetterAllowed" defaultChecked={fact?.coverLetterAllowed ?? true} /> Allow in cover letters
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="answersAllowed" defaultChecked={fact?.answersAllowed ?? true} /> Allow in answers
            </label>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox name="verified" defaultChecked={fact?.verified ?? false} /> I verify this is accurate
            </label>
          </div>

          <div className="flex items-center gap-3">
            <SubmitButton pendingText="Saving…">{editing ? "Update fact" : "Add fact"}</SubmitButton>
            {state.error ? (
              <span className="flex items-center gap-1.5 text-sm text-destructive">
                <AlertCircle className="size-4" /> {state.error}
              </span>
            ) : null}
            {state.ok && state.message ? (
              <span className="flex items-center gap-1.5 text-sm text-success">
                <CheckCircle2 className="size-4" /> {state.message}
              </span>
            ) : null}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
