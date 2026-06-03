"use client";

import { useActionState } from "react";
import { CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { createResumeAction, type ActionState } from "@/lib/actions/resume-actions";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { SubmitButton } from "@/components/submit-button";
import { RESUME_BASE_TYPES } from "@/lib/constants";
import { humanize } from "@/lib/utils";

const initial: ActionState = { ok: false };

export function ResumeForm({ hasMaster }: { hasMaster: boolean }) {
  const [state, action] = useActionState(createResumeAction, initial);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4 text-primary" /> Add a resume
        </CardTitle>
        <CardDescription>
          Paste your resume text to parse it into ATS-friendly sections. Mark one as your master — it&apos;s the base
          for every tailored version.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form action={action} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="name">Resume name</Label>
              <Input id="name" name="name" placeholder="Master Resume — SWE" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="baseType">Base template</Label>
              <Select id="baseType" name="baseType" defaultValue="software-engineering">
                {RESUME_BASE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {humanize(t)}
                  </option>
                ))}
              </Select>
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rawText">Resume text</Label>
            <Textarea id="rawText" name="rawText" rows={10} placeholder="Paste your resume here…" />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <Checkbox name="isMaster" defaultChecked={!hasMaster} /> Set as master resume
          </label>
          <div className="flex items-center gap-3">
            <SubmitButton pendingText="Parsing…">Save &amp; parse</SubmitButton>
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
