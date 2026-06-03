import { prisma } from "../db";
import { ensureDatabaseReady } from "../runtime-db";

export async function getAnalytics() {
  await ensureDatabaseReady();
  const applications = await prisma.application.findMany({
    include: {
      jobPosting: {
        include: { company: true },
      },
    },
  });
  const total = applications.length;
  const submitted = applications.filter((application) => application.status === "submitted").length;
  const interviews = applications.filter((application) => application.status.includes("interview")).length;
  const offers = applications.filter((application) => application.status === "offer").length;
  const byStatus = applications.reduce<Record<string, number>>((acc, application) => {
    acc[application.status] = (acc[application.status] ?? 0) + 1;
    return acc;
  }, {});
  const bySource = applications.reduce<Record<string, number>>((acc, application) => {
    const source = application.source || application.jobPosting.sourceName || "manual";
    acc[source] = (acc[source] ?? 0) + 1;
    return acc;
  }, {});

  return {
    total,
    submitted,
    responseRate: submitted ? Math.round((interviews / submitted) * 100) : 0,
    interviewRate: submitted ? Math.round((interviews / submitted) * 100) : 0,
    offerRate: submitted ? Math.round((offers / submitted) * 100) : 0,
    byStatus,
    bySource,
  };
}
