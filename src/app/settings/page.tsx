import { Download, Database } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { SettingsForm, DangerZone } from "@/components/forms/settings-form";
import { getSettings } from "@/lib/services/settings-service";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const providerStatus = {
    anthropic: Boolean(env.anthropicApiKey),
    openai: Boolean(env.openaiApiKey),
  };

  return (
    <div>
      <PageHeader title="Settings" description="Provider, compliance guardrails, and your data controls." />

      <div className="space-y-6">
        <SettingsForm settings={settings} providerStatus={providerStatus} />

        <Card>
          <CardHeader>
            <CardTitle>Your data</CardTitle>
            <CardDescription>Export or back up everything. Your data stays local to this app.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <a href="/api/export" className={cn(buttonVariants({ variant: "outline" }))}>
              <Download className="size-4" /> Export all data (JSON)
            </a>
            <a href="/api/applications/export" className={cn(buttonVariants({ variant: "outline" }))}>
              <Download className="size-4" /> Export applications (CSV)
            </a>
            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Database className="size-4" /> Local SQLite database — back up via the JSON export above or copy{" "}
              <code className="rounded bg-muted px-1">prisma/dev.db</code>.
            </span>
          </CardContent>
        </Card>

        <DangerZone />
      </div>
    </div>
  );
}
