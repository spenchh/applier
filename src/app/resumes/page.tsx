import { FileText, Star, ExternalLink, Trash2, Info } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/empty-state";
import { ResumeForm } from "@/components/forms/resume-form";
import { listResumes, getResumeStructure } from "@/lib/services/resume-service";
import { deleteResumeAction } from "@/lib/actions/resume-actions";
import { humanize, formatDate, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ResumesPage() {
  const resumes = await listResumes();
  const hasMaster = resumes.some((r) => r.isMaster);

  return (
    <div>
      <PageHeader
        title="Resume Manager"
        description="Store base resumes per track. Tailored, ATS-friendly versions are generated per application in the Tailoring Studio."
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <ResumeForm hasMaster={hasMaster} />

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="flex items-start gap-3 p-4 text-sm text-muted-foreground">
              <Info className="mt-0.5 size-4 shrink-0 text-primary" />
              <div className="space-y-1">
                <p>
                  <strong className="text-foreground">ATS-friendly by design:</strong> single column, standard
                  headings, consistent dates, no tables. Export to PDF via the browser print dialog (Preview → Print
                  → Save as PDF).
                </p>
                <p>
                  DOCX export is abstracted for a future release — see the README roadmap. For now, HTML preview + PDF
                  print covers the MVP.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Your resumes</h2>
          {resumes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No resumes yet"
              description="Paste your master resume to parse it into editable, ATS-friendly sections."
            />
          ) : (
            resumes.map((r) => {
              const structure = getResumeStructure(r);
              const sectionCount = structure
                ? [
                    structure.education.length,
                    structure.experience.length,
                    structure.projects.length,
                    structure.skills.length,
                  ].filter(Boolean).length
                : 0;
              return (
                <Card key={r.id}>
                  <CardHeader className="flex-row items-start justify-between space-y-0">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-base">
                        {r.name}
                        {r.isMaster ? (
                          <Badge variant="success">
                            <Star className="size-3" /> Master
                          </Badge>
                        ) : null}
                      </CardTitle>
                      <CardDescription>
                        {humanize(r.baseType)} · updated {formatDate(r.updatedAt)}
                        {structure ? ` · ${sectionCount} parsed sections` : " · not parsed"}
                      </CardDescription>
                    </div>
                    <form action={deleteResumeAction}>
                      <input type="hidden" name="id" value={r.id} />
                      <Button variant="ghost" size="icon" type="submit" aria-label="Delete resume">
                        <Trash2 className="size-4 text-destructive" />
                      </Button>
                    </form>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2">
                    {structure ? (
                      <a
                        href={`/api/resumes/${r.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                      >
                        <ExternalLink className="size-4" /> Preview / Print PDF
                      </a>
                    ) : (
                      <Badge variant="muted">Paste resume text and re-save to parse</Badge>
                    )}
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
