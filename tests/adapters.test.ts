import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type { Application, JobPosting } from "@prisma/client";
import { GreenhouseAdapter } from "@/lib/adapters/greenhouse";
import { LeverAdapter } from "@/lib/adapters/lever";
import { AshbyAdapter } from "@/lib/adapters/ashby";
import { ManualAdapter } from "@/lib/adapters/manual";
import { EmailAdapter } from "@/lib/adapters/email";

const fakeApp = {} as Application;

describe("adapter submission fallback (unconfigured)", () => {
  const saved = { ...process.env };
  beforeEach(() => {
    delete process.env.GREENHOUSE_API_KEY;
    delete process.env.LEVER_API_KEY;
    delete process.env.ASHBY_API_KEY;
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
  });
  afterEach(() => {
    process.env = { ...saved };
  });

  it("Greenhouse falls back to Manual Mode when no API key is configured", async () => {
    const result = await new GreenhouseAdapter().submitApplication(fakeApp);
    expect(result.status).toBe("fallback");
    expect(result.fallbackTo).toBe("manual");
  });

  it("Lever and Ashby also fall back when unconfigured", async () => {
    expect((await new LeverAdapter().submitApplication(fakeApp)).status).toBe("fallback");
    expect((await new AshbyAdapter().submitApplication(fakeApp)).status).toBe("fallback");
  });

  it("validateApplication reports the missing configuration", async () => {
    const v = await new GreenhouseAdapter().validateApplication(fakeApp);
    expect(v.valid).toBe(false);
    expect(v.missingRequired).toContain("GREENHOUSE_API_KEY");
  });
});

describe("ManualAdapter never auto-submits", () => {
  it("returns a pending instruction, not a submission", async () => {
    const result = await new ManualAdapter().submitApplication(fakeApp);
    expect(result.status).toBe("pending");
    expect(result.message.toLowerCase()).toContain("does not submit");
  });
});

describe("EmailAdapter", () => {
  it("exports a draft when no email provider is configured", async () => {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const result = await new EmailAdapter().submitApplication(fakeApp);
    expect(result.status).toBe("exported");
  });

  it("surfaces the application email from the parsed job for its fields", async () => {
    const job = {
      parsedJson: JSON.stringify({ applicationEmail: "careers@acme.com" }),
    } as JobPosting;
    expect(EmailAdapter.applicationEmailFor(job)).toBe("careers@acme.com");
    const fields = await new EmailAdapter().getRequiredFields(job);
    expect(fields.find((f) => f.name === "to")?.value).toBe("careers@acme.com");
  });
});

describe("Greenhouse import parses board/job id and falls back gracefully", () => {
  it("forces manual when the URL has no parseable job id", async () => {
    const imported = await new GreenhouseAdapter().importJob({ url: "https://boards.greenhouse.io/acme" });
    expect(imported.imported).toBe(false);
    expect(imported.forceManual).toBe(true);
  });
});
