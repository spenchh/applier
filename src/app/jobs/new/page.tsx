import { PageHeader } from "@/components/page-header";
import { AddJobForms } from "@/components/forms/add-job-forms";

export const dynamic = "force-dynamic";

export default async function NewJobPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  return (
    <div>
      <PageHeader
        title="Add a job"
        description="Import a posting to analyze and tailor. InternPilot never scrapes restricted platforms or auto-applies."
      />
      <AddJobForms defaultTab={tab ?? "paste"} />
    </div>
  );
}
