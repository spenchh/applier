import { describe, it, expect, beforeAll } from "vitest";
import { db } from "@/lib/db";
import { getSettings } from "@/lib/services/settings-service";
import { approvePacket, submitApplication } from "@/lib/services/application-service";

/**
 * The single most important guarantee: an application CANNOT be submitted until
 * it has been reviewed/approved AND the user confirms accuracy. This is DB-backed.
 */
async function makeApplication() {
  const profile = await db.userProfile.create({ data: { legalName: "Test User", email: "t@example.com" } });
  const company = await db.company.create({ data: { name: "Acme" } });
  const job = await db.jobPosting.create({
    data: { companyId: company.id, title: "SWE Intern", atsProvider: "unknown" },
  });
  const app = await db.application.create({
    data: { userProfileId: profile.id, jobPostingId: job.id, status: "ready-for-review", applicationMode: "manual" },
  });
  return app.id;
}

describe("submission approval gate", () => {
  beforeAll(async () => {
    // Ensure the locked-on compliance setting exists.
    const settings = await getSettings();
    expect(settings.requireReviewBeforeSubmission).toBe(true);
  });

  it("refuses to submit an unapproved application", async () => {
    const appId = await makeApplication();
    await expect(submitApplication(appId, true)).rejects.toThrow(/approved/i);
    const app = await db.application.findUniqueOrThrow({ where: { id: appId } });
    expect(app.status).toBe("ready-for-review");
    expect(app.submittedAt).toBeNull();
  });

  it("refuses to submit an approved application without the accuracy confirmation", async () => {
    const appId = await makeApplication();
    await approvePacket(appId);
    await expect(submitApplication(appId, false)).rejects.toThrow(/accurate/i);
    const app = await db.application.findUniqueOrThrow({ where: { id: appId } });
    expect(app.submittedAt).toBeNull();
  });

  it("submits once approved AND confirmed (manual mode marks submitted)", async () => {
    const appId = await makeApplication();
    await approvePacket(appId);
    const result = await submitApplication(appId, true);
    expect(result.ok).toBe(true);
    const app = await db.application.findUniqueOrThrow({ where: { id: appId } });
    expect(app.status).toBe("submitted");
    expect(app.submittedAt).not.toBeNull();

    // An audit trail must exist for the approval and submission.
    const audits = await db.auditLog.findMany({ where: { entityId: appId } });
    const actions = audits.map((a) => a.action);
    expect(actions).toContain("approve.application");
    expect(actions).toContain("submit.application");
  });

  it("records a sanitized submission attempt", async () => {
    const appId = await makeApplication();
    await approvePacket(appId);
    await submitApplication(appId, true);
    const attempt = await db.submissionAttempt.findFirst({ where: { applicationId: appId } });
    expect(attempt).not.toBeNull();
    expect(attempt?.adapter).toBe("manual");
  });
});
