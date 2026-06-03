import { describe, it, expect } from "vitest";
import { parseJobPosting } from "@/lib/llm";
import { parsedJobSchema } from "@/lib/llm/types";
import { detectRiskFlags, extractTechnologies } from "@/lib/text/extract";

const SAMPLE = `Acme Corp is hiring a Software Engineering Intern (Summer 2026)
Location: Remote

Responsibilities:
- Build features with React and TypeScript
- Write APIs in Node.js with PostgreSQL

Requirements:
- Pursuing a B.S. in Computer Science
- Experience with JavaScript and SQL
- Familiarity with Git

Preferred:
- Exposure to Docker
Apply by August 1, 2026`;

describe("parseJobPosting", () => {
  it("produces a schema-valid ParsedJob", async () => {
    const parsed = await parseJobPosting(SAMPLE, "https://example.com");
    expect(() => parsedJobSchema.parse(parsed)).not.toThrow();
  });

  it("extracts core fields and technologies", async () => {
    const parsed = await parseJobPosting(SAMPLE);
    expect(parsed.title.toLowerCase()).toContain("intern");
    expect(parsed.workplaceType).toBe("remote");
    expect(parsed.technologies).toEqual(expect.arrayContaining(["react", "typescript", "sql"]));
    expect(parsed.requiredQualifications.length).toBeGreaterThan(0);
  });
});

describe("extractTechnologies", () => {
  it("matches known tech terms and ignores noise", () => {
    const tech = extractTechnologies("We use Python, React and PostgreSQL. Also banana.");
    expect(tech).toEqual(expect.arrayContaining(["python", "react", "postgresql"]));
    expect(tech).not.toContain("banana");
  });
});

describe("detectRiskFlags (always-on safety)", () => {
  it("flags scam indicators in a suspicious posting", () => {
    const scam = `Work from home, no experience needed, easy money!
Contact us on Telegram only for the interview.
You must pay a $200 training fee upfront to apply.
We pay via Bitcoin and gift cards.`;
    const flags = detectRiskFlags(scam);
    const codes = flags.map((f) => f.code);
    expect(codes).toContain("asks-for-payment");
    expect(codes).toContain("payment-forwarding");
    expect(codes).toContain("messaging-app-interview");
    expect(flags.some((f) => f.severity === "high")).toBe(true);
  });

  it("does not over-flag a normal posting", () => {
    const flags = detectRiskFlags(SAMPLE, { sourceUrl: "https://example.com" });
    // A clean posting should not contain high-severity scam flags.
    expect(flags.some((f) => f.severity === "high")).toBe(false);
  });

  it("never asserts a posting is safe (returns indicators only)", () => {
    const flags = detectRiskFlags(SAMPLE);
    // The contract is a list of risk indicators; "safe" is never a value.
    expect(Array.isArray(flags)).toBe(true);
    expect(flags.every((f) => ["low", "medium", "high"].includes(f.severity))).toBe(true);
  });
});
