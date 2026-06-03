import { describe, expect, it } from "vitest";
import { Document, Packer, Paragraph } from "docx";
import mammoth from "mammoth";
import { z } from "zod";
import { extractJson, generateAIObject, getAIProvider, getAIWrapperStatus } from "./ai-wrapper";
import { adapterFor, chooseApplicationMode } from "./adapters";
import { MockConnector } from "./connectors/mock";
import { generateAnswerMock, parseJobPostingMock, truthCheckMaterial, type FactLike } from "./llm";
import { canSubmitApplication } from "./services/application";
import { matchesDiscoveryQuery, normalizeDiscoveryQuery, sourcedJobToJobInput } from "./services/discovery";
import { calculateFit } from "./services/fit";
import { parseCalendarFeed } from "./services/calendar-feed";
import { buildResumeDocxBuffer, extractResumeTextFromFile, parseResumeStructure } from "./services/resume";
import { resumeUploadSchema } from "./schemas";
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

  it("parses non-tech role families without forcing a software template", () => {
    const parsed = parseJobPostingMock({
      company: "Northline Museum",
      title: "Marketing Intern",
      roleCategory: "marketing",
      rawDescription: "Support social media campaigns, brand writing, event promotion, and stakeholder communication.",
    });

    expect(parsed.roleCategory).toBe("marketing");
    expect(parsed.keywords).toContain("marketing");
    expect(parsed.keywords).toContain("social media");
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

  it("reports mock AI wrapper as locally configured", () => {
    const status = getAIWrapperStatus({ provider: "mock" });
    expect(status.configured).toBe(true);
    expect(status.mode).toBe("local_mock");
  });

  it("falls external AI providers back to mock mode when keys are absent", () => {
    delete process.env.OPENAI_API_KEY;
    const status = getAIWrapperStatus({ provider: "openai" });
    expect(status.configured).toBe(false);
    expect(status.effectiveProvider).toBe("mock");
    expect(getAIProvider({ provider: "openai" }).name).toBe("mock");
  });

  it("extracts structured JSON from fenced model responses", () => {
    expect(extractJson("```json\n{\"fit\":92}\n```")).toEqual({ fit: 92 });
  });

  it("can generate structured objects through the mock wrapper", async () => {
    const result = await generateAIObject(
      { provider: "mock" },
      { prompt: "{\"summary\":\"ready\"}" },
      z.object({ summary: z.string() }),
    );
    expect(result.summary).toBe("ready");
  });

  it("normalizes mock discovery jobs into parseable job postings", async () => {
    const jobs = await new MockConnector().search({ keyword: "computer engineering" });
    const first = jobs[0];
    expect(first?.provider).toBe("mock");
    const parsed = parseJobPostingMock({
      company: first.company,
      title: first.title,
      location: first.location,
      rawDescription: first.rawDescription,
      sourceUrl: first.sourceUrl,
    });
    expect(parsed.title).toContain("Computer Engineering");
    expect(parsed.keywords.length).toBeGreaterThan(0);
  });

  it("validates and applies discovery filters", () => {
    const query = normalizeDiscoveryQuery({
      keyword: "engineering",
      workplaceType: "hybrid",
      postedWithinDays: "14",
      visaSponsorshipFriendly: "true",
    });
    const job = {
      title: "Computer Engineering Intern",
      company: "Northstar Robotics",
      location: "Chicago, IL",
      workplaceType: "hybrid",
      internshipTerm: "summer",
      provider: "mock",
      rawDescription: "Embedded systems engineering internship with Python.",
      keywords: JSON.stringify(["engineering", "python"]),
      compensationMin: 28,
      compensationMax: 34,
      visaSponsorshipFriendly: true,
      workAuthNotRequired: false,
      deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
      postedAt: new Date(),
    };
    expect(matchesDiscoveryQuery(job, query)).toBe(true);
    expect(matchesDiscoveryQuery({ ...job, workplaceType: "remote" }, query)).toBe(false);
  });

  it("keeps sourced job saves on the existing dedupe basis", () => {
    const sourced = {
      company: "Northstar Robotics",
      title: "Computer Engineering Intern",
      location: "Chicago, IL",
      internshipTerm: "summer",
      workplaceType: "hybrid",
      sourceUrl: "https://careers.example.com/northstar-robotics/computer-engineering-intern",
      provider: "mock",
      rawDescription: "Computer Engineering Intern supporting embedded systems and Python.",
    };
    const input = sourcedJobToJobInput(sourced);
    const first = dedupeHash(input);
    const second = dedupeHash({ ...input, sourceUrl: input.sourceUrl?.replace("https://", "http://") });
    expect(first).toBe(second);
  });

  it("parses resume text into structured sections", () => {
    const structure = parseResumeStructure(`Demo Student
student@example.edu | Chicago, IL

EDUCATION
Example University

PROJECTS
- Built a React dashboard with SQL.

SKILLS
React, SQL, Git`);
    expect(structure.nameLine).toBe("Demo Student");
    expect(structure.sections.map((section) => section.heading)).toContain("Projects");
    expect(structure.skills).toEqual(expect.arrayContaining(["React", "SQL"]));
  });

  it("rejects invalid resume uploads", () => {
    expect(() =>
      resumeUploadSchema.parse({
        name: "Resume",
        baseType: "general_internship",
        filename: "resume.txt",
        mimeType: "text/plain",
        size: 100,
      }),
    ).toThrow();
    expect(() =>
      resumeUploadSchema.parse({
        name: "Resume",
        baseType: "general_internship",
        filename: "resume.pdf",
        mimeType: "application/pdf",
        size: 6 * 1024 * 1024,
      }),
    ).toThrow();
  });

  it("extracts text from a DOCX upload buffer", async () => {
    const document = new Document({
      sections: [{ children: [new Paragraph("Demo Student"), new Paragraph("PROJECTS"), new Paragraph("Built a React dashboard.")] }],
    });
    const buffer = await Packer.toBuffer(document);
    const text = await extractResumeTextFromFile({
      bytes: new Uint8Array(buffer),
      mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    });
    expect(text).toContain("Demo Student");
    expect(text).toContain("Built a React dashboard");
  });

  it("parses iCal calendar feeds into upcoming events", () => {
    const startsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000);
    const events = parseCalendarFeed(`BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
UID:test-office-hours
SUMMARY:ECE office hours
DESCRIPTION:Bring lab questions\\, notes\\, and draft report.
DTSTART:${formatIcsUtc(startsAt)}
DTEND:${formatIcsUtc(endsAt)}
END:VEVENT
END:VCALENDAR`);

    expect(events).toHaveLength(1);
    expect(events[0]?.title).toBe("ECE office hours");
    expect(events[0]?.description).toContain("lab questions, notes");
    expect(events[0]?.startsAt.toISOString()).toBe(startsAt.toISOString().replace(/\.\d{3}Z$/, ".000Z"));
  });

  it("exports a tailored resume as a readable DOCX buffer", async () => {
    const buffer = await buildResumeDocxBuffer({
      text: `Demo Student
student@example.edu

SUMMARY
Computer engineering student.

PROJECTS
- Built a React dashboard.`,
    });
    expect(buffer.byteLength).toBeGreaterThan(1000);
    const raw = await mammoth.extractRawText({ buffer });
    expect(raw.value).toContain("Demo Student");
    expect(raw.value).toContain("Projects");
  });
});

function formatIcsUtc(date: Date) {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}
