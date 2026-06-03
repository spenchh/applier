import { describe, it, expect } from "vitest";
import { scoreFit, tailorResume, truthCheck, generateApplicationAnswers } from "@/lib/llm";
import type { MockFact } from "@/lib/llm/mock";

const facts: MockFact[] = [
  {
    id: "f1",
    type: "experience",
    title: "Software Engineering Intern",
    organization: "Brightwave",
    description: "Built dashboards with React and TypeScript and APIs in Node.js.",
    impact: "Cut reporting time from 3h to 10min.",
    skills: ["react", "typescript", "node.js", "postgresql"],
    resumeAllowed: true,
    coverLetterAllowed: true,
    answersAllowed: true,
  },
  {
    id: "f2",
    type: "project",
    title: "CampusEats",
    organization: "Personal",
    description: "Full-stack app with Next.js and Python.",
    impact: "Used by 400 students.",
    skills: ["next.js", "python", "react"],
    resumeAllowed: true,
    coverLetterAllowed: true,
    answersAllowed: true,
  },
];

const job = {
  title: "Software Engineering Intern",
  technologies: ["react", "typescript", "node.js", "aws", "docker"],
  requiredQualifications: ["Experience with React", "Pursuing a CS degree", "Experience with Kubernetes"],
  preferredQualifications: ["Exposure to Docker"],
};

describe("scoreFit", () => {
  it("returns a score in [0,100] with matched and missing requirements", async () => {
    const fit = await scoreFit(facts, job);
    expect(fit.fitScore).toBeGreaterThanOrEqual(0);
    expect(fit.fitScore).toBeLessThanOrEqual(100);
    // React is in facts -> should be matched somewhere; Kubernetes is not -> missing.
    expect(JSON.stringify(fit.matched).toLowerCase()).toContain("react");
    expect(JSON.stringify(fit.missing).toLowerCase()).toContain("kubernetes");
  });

  it("recommends a software-engineering template for a SWE posting", async () => {
    const fit = await scoreFit(facts, job);
    expect(fit.recommendedTemplate).toBe("software-engineering");
  });
});

describe("tailorResume keyword coverage", () => {
  it("reports unsupported required keywords as missing/omitted, never fabricated", async () => {
    const tailored = await tailorResume(facts, job, { major: "CS" }, null, null);
    // aws/docker are not in the user's facts -> must appear as missing, not as skills.
    expect(tailored.keywordCoverage.missing).toEqual(expect.arrayContaining(["aws", "docker"]));
    expect(tailored.keywordCoverage.intentionallyOmitted).toEqual(expect.arrayContaining(["aws", "docker"]));
    expect(tailored.unsupportedClaims).toHaveLength(0);
    expect(tailored.structured.skills.map((s) => s.toLowerCase())).not.toContain("aws");
  });
});

describe("truthCheck (unsupported claim detection)", () => {
  it("flags a claim that maps to no stored fact as unsupported", async () => {
    const result = await truthCheck(
      [
        "Built dashboards with React and TypeScript.", // supported by f1
        "Led a team of 12 engineers and managed a $2M budget.", // unsupported
      ],
      facts,
    );
    const unsupportedTexts = result.unsupported.map((c) => c.text);
    expect(unsupportedTexts.join(" ")).toContain("Led a team of 12");
    expect(result.supported.length).toBeGreaterThan(0);
  });
});

describe("generateApplicationAnswers (sensitive handling)", () => {
  it("never auto-answers demographic self-id and flags it", async () => {
    const { answers } = await generateApplicationAnswers(
      [{ questionText: "Voluntary self-identification: gender (optional).", questionType: "demographic", sensitive: true }],
      facts,
      {},
      job,
    );
    const a = answers[0];
    expect(a.answerText).toBe("");
    expect(a.needsUserInput).toBe(true);
    expect(a.sensitive).toBe(true);
  });

  it("only uses stored eligibility and still requires confirmation", async () => {
    const withAuth = await generateApplicationAnswers(
      [{ questionText: "Are you authorized to work in the US?", questionType: "eligibility", sensitive: true }],
      facts,
      { workAuthorization: "Authorized to work in the U.S." },
      job,
    );
    expect(withAuth.answers[0].answerText).toContain("Authorized");
    expect(withAuth.answers[0].needsUserInput).toBe(true); // confirm per application

    const withoutAuth = await generateApplicationAnswers(
      [{ questionText: "Are you authorized to work in the US?", questionType: "eligibility", sensitive: true }],
      facts,
      {},
      job,
    );
    expect(withoutAuth.answers[0].answerText).toBe("");
    expect(withoutAuth.answers[0].needsUserInput).toBe(true);
  });
});
