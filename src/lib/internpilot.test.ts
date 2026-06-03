import { describe, expect, it } from "vitest";
import { adapterFor, chooseApplicationMode } from "./adapters";
import { generateAnswerMock, parseJobPostingMock, truthCheckMaterial, type FactLike } from "./llm";
import { canSubmitApplication } from "./services/application";
import { calculateFit } from "./services/fit";
import { dedupeHash, extractTechnologies, isSensitiveQuestion } from "./text";

const fact: FactLike = {
  id: "fact_1",
  title: "Inventory App",
  type: "project",
  description: "Built a React and SQL inventory dashboard with Prisma.",
  impact: "Improved volunteer tracking.",
  skills: JSON.stringify(["React", "SQL", "Prisma", "Git"]),
  resumeAllowed: true,
  coverLetterAllowed: true,
  answersAllowed: true,
};

describe("InternPilot core behavior", () => {
  it("parses a job posting into schema-valid fields", () => {
    const parsed = parseJobPostingMock({
      company: "Acme",
      title: "Software Engineering Intern",
      rawDescription: "Build React dashboards. Required: SQL, Git, PostgreSQL. Question: Tell us about a project?",
    });

    expect(parsed.company).toBe("Acme");
    expect(parsed.technologies).toContain("postgresql");
    expect(parsed.applicationQuestions[0]?.questionText).toContain("project");
  });

  it("detects technologies when followed by punctuation", () => {
    expect(extractTechnologies("Experience with PostgreSQL.")).toContain("postgresql");
  });

  it("scores fit using stored facts", () => {
    const job = {
      keywords: JSON.stringify(["React", "SQL", "Git"]),
      requiredQualifications: JSON.stringify(["React"]),
      preferredQualifications: JSON.stringify(["SQL"]),
      riskFlagsJson: "[]",
      title: "Software Engineering Intern",
    } as never;
    const profileFact = { ...fact, createdAt: new Date(), updatedAt: new Date(), userProfileId: "u1", organization: null, location: null, startDate: null, endDate: null, evidenceNote: null, verified: true } as never;
    const fit = calculateFit(job, [profileFact]);

    expect(fit.fitScore).toBeGreaterThan(50);
    expect(fit.strongestEvidence.length).toBeGreaterThan(0);
  });

  it("flags unsupported generated technical claims", () => {
    const truth = truthCheckMaterial("Built services with AWS and React.", [fact]);
    expect(truth.weakClaims.join(" ")).toContain("aws");
  });

  it("blocks submission until approved", () => {
    expect(canSubmitApplication({ approvedAt: null, status: "ready for review" })).toBe(false);
    expect(canSubmitApplication({ approvedAt: new Date(), status: "approved" })).toBe(true);
  });

  it("forces restricted platforms into Manual Mode", () => {
    expect(chooseApplicationMode("https://www.linkedin.com/jobs/view/123")).toBe("manual");
  });

  it("deduplicates equivalent http and https job URLs", () => {
    const first = dedupeHash({ company: "Acme", title: "Intern", location: "Remote", sourceUrl: "https://jobs.example.com/1", rawDescription: "React SQL internship" });
    const second = dedupeHash({ company: "Acme", title: "Intern", location: "Remote", sourceUrl: "http://jobs.example.com/1", rawDescription: "React SQL internship" });
    expect(first).toBe(second);
  });

  it("falls official adapters back when credentials are absent", async () => {
    delete process.env.GREENHOUSE_API_KEY;
    const result = await adapterFor("greenhouse").submitApplication({ approvedAt: new Date(), status: "approved", applicationMode: "greenhouse" } as never);
    expect(result.status).toBe("not_configured");
  });

  it("marks sensitive questions for user confirmation", () => {
    expect(isSensitiveQuestion("Will you now or in the future require visa sponsorship?")).toBe(true);
    const answer = generateAnswerMock("Will you now or in the future require visa sponsorship?", [fact]);
    expect(answer.truthCheckStatus).toBe("sensitive_requires_confirmation");
  });
});
