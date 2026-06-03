import { describe, it, expect } from "vitest";
import { dedupeHash, findDuplicate, descriptionSimilarity } from "@/lib/services/dedupe";
import { isRestrictedPlatform, planUrlImport, detectAtsProvider } from "@/lib/url";
import { adapterForImport } from "@/lib/adapters/registry";

describe("deduplication", () => {
  it("produces identical hashes for the same strong key regardless of formatting", () => {
    const a = dedupeHash({ company: "Acme Corp", title: "SWE Intern", location: "Remote", sourceUrl: "https://x.com/1" });
    const b = dedupeHash({ company: "  acme   corp ", title: "swe intern", location: "remote", sourceUrl: "http://x.com/1" });
    expect(a).toBe(b);
  });

  it("detects an exact-key duplicate", () => {
    const hash = dedupeHash({ company: "Acme", title: "SWE Intern", location: "Remote" });
    const match = findDuplicate(
      { hash, description: "anything" },
      [{ id: "job1", dedupeHash: hash, rawDescription: "x" }],
    );
    expect(match?.id).toBe("job1");
    expect(match?.reason).toBe("exact-key");
  });

  it("detects a near-duplicate by description similarity", () => {
    const desc = "Software Engineering Intern building React TypeScript dashboards and Node APIs with Postgres";
    const match = findDuplicate(
      { hash: "different-hash", description: desc + " and Redis caching" },
      [{ id: "job2", dedupeHash: "other", rawDescription: desc }],
    );
    expect(match?.id).toBe("job2");
    expect(match?.reason).toBe("similar-description");
  });

  it("does not flag unrelated postings as duplicates", () => {
    const match = findDuplicate(
      { hash: "h1", description: "Marketing internship writing blog posts and social media" },
      [{ id: "job3", dedupeHash: "h2", rawDescription: "Backend engineer working on distributed Kafka pipelines" }],
    );
    expect(match).toBeNull();
  });

  it("similarity is symmetric-ish and bounded", () => {
    const s = descriptionSimilarity("react node postgres", "react node postgres");
    expect(s).toBeCloseTo(1, 5);
  });
});

describe("restricted platforms are forced into Manual Mode", () => {
  it.each([
    "https://www.linkedin.com/jobs/view/123",
    "https://indeed.com/viewjob?jk=abc",
    "https://app.joinhandshake.com/jobs/456",
    "https://simplify.jobs/p/xyz",
    "https://ripplematch.com/job/abc",
  ])("identifies %s as restricted", (url) => {
    expect(isRestrictedPlatform(url)).toBe(true);
    const plan = planUrlImport(url);
    expect(plan.restricted).toBe(true);
    expect(plan.canAttemptOfficialImport).toBe(false);
    // The chosen import adapter must be the Manual adapter (no scraping).
    expect(adapterForImport(url).provider).toBe("manual");
  });

  it("routes known ATS hosts to their official adapter", () => {
    expect(detectAtsProvider("https://boards.greenhouse.io/acme/jobs/1")).toBe("greenhouse");
    expect(adapterForImport("https://boards.greenhouse.io/acme/jobs/1").provider).toBe("greenhouse");
    expect(adapterForImport("https://jobs.lever.co/acme/123").provider).toBe("lever");
  });

  it("treats unknown sites as Manual (no generic scraping)", () => {
    expect(adapterForImport("https://some-random-startup.com/careers/1").provider).toBe("manual");
  });
});
