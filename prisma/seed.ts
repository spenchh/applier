/**
 * Seed data for a fictional student so the app can be demoed end-to-end with
 * the mock LLM provider and zero API keys.
 *
 * It creates: a CS student profile + truth-vault facts, a master resume, two
 * internship postings (SWE + Data Analyst) parsed through the pipeline, and one
 * application with a fully generated, truth-checked packet.
 */
import { db } from "../src/lib/db";
import { toJson } from "../src/lib/utils";
import { encrypt } from "../src/lib/encryption";
import { createJobFromText } from "../src/lib/services/job-service";
import { getOrCreateApplication } from "../src/lib/services/application-service";
import { generatePacket } from "../src/lib/services/tailor-service";

async function clear() {
  // Order respects FK constraints.
  await db.auditLog.deleteMany();
  await db.submissionAttempt.deleteMany();
  await db.followUpTask.deleteMany();
  await db.applicationAnswer.deleteMany();
  await db.coverLetter.deleteMany();
  await db.resumeVersion.deleteMany();
  await db.fileAsset.deleteMany();
  await db.application.deleteMany();
  await db.jobQuestion.deleteMany();
  await db.jobPosting.deleteMany();
  await db.company.deleteMany();
  await db.resume.deleteMany();
  await db.profileFact.deleteMany();
  await db.userProfile.deleteMany();
  await db.appSettings.deleteMany();
}

async function main() {
  console.log("🌱 Seeding InternPilot…");
  await clear();

  await db.appSettings.create({ data: { id: "singleton", llmProvider: "mock" } });

  // ---- Profile -----------------------------------------------------------
  const profile = await db.userProfile.create({
    data: {
      legalName: "Jordan A. Rivera",
      preferredName: "Jordan",
      email: "jordan.rivera@example.edu",
      phone: encrypt("(555) 123-4567"),
      location: "Austin, TX",
      school: "University of Texas at Austin",
      degree: "B.S.",
      major: "Computer Science",
      minor: "Statistics",
      graduationDate: new Date("2027-05-15"),
      gpa: "3.7",
      // Eligibility facts are user-entered and treated as verified here for the demo.
      workAuthorization: encrypt("Authorized to work in the U.S. without restriction"),
      sponsorshipRequired: false,
      earliestStartDate: new Date("2026-06-01"),
      preferredTerms: toJson(["Summer 2026"]),
      preferredLocations: toJson(["Austin, TX", "Remote"]),
      remotePreference: "hybrid",
      portfolioUrl: "https://jordanrivera.dev",
      githubUrl: "https://github.com/jordan-rivera",
      linkedinUrl: "https://linkedin.com/in/jordan-rivera",
      websiteUrl: "https://jordanrivera.dev",
    },
  });

  // ---- Truth Vault facts -------------------------------------------------
  const facts = [
    {
      type: "education",
      title: "B.S. in Computer Science",
      organization: "University of Texas at Austin",
      location: "Austin, TX",
      startDate: new Date("2023-08-20"),
      endDate: new Date("2027-05-15"),
      description: "Coursework in data structures, algorithms, databases, and machine learning. Minor in Statistics.",
      impact: "GPA 3.7 / 4.0; Dean's List 3 semesters.",
      skills: ["data structures", "algorithms", "sql", "statistics", "python"],
      verified: true,
    },
    {
      type: "experience",
      title: "Software Engineering Intern",
      organization: "Brightwave Tech",
      location: "Remote",
      startDate: new Date("2025-06-01"),
      endDate: new Date("2025-08-15"),
      description: "Built internal dashboards with React and TypeScript and added REST endpoints in Node.js backed by PostgreSQL.",
      impact: "Reduced a weekly reporting task from 3 hours to under 10 minutes for the ops team.",
      skills: ["react", "typescript", "node.js", "postgresql", "rest", "git"],
      verified: true,
    },
    {
      type: "project",
      title: "CampusEats — campus food-truck finder",
      organization: "Personal project",
      location: "",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-01-15"),
      description: "Full-stack web app showing live food-truck locations using a Next.js frontend and a Python/Flask API.",
      impact: "Used by ~400 students in its first semester; 4.6★ average feedback.",
      skills: ["next.js", "react", "python", "flask", "postgresql", "tailwind"],
      verified: true,
    },
    {
      type: "project",
      title: "StudyGraph — spaced-repetition study planner",
      organization: "Hackathon (HackTX)",
      location: "Austin, TX",
      startDate: new Date("2024-10-01"),
      endDate: new Date("2024-10-03"),
      description: "Built a study planner that schedules reviews using a spaced-repetition algorithm; analyzed usage data with pandas.",
      impact: "Won 'Best Use of Data' at HackTX among 60+ teams.",
      skills: ["python", "pandas", "data analysis", "javascript", "sql"],
      verified: true,
    },
    {
      type: "leadership",
      title: "Vice President, Coding Club",
      organization: "UT Austin Coding Club",
      location: "Austin, TX",
      startDate: new Date("2024-08-01"),
      endDate: undefined,
      description: "Organize weekly workshops on web development and interview prep for 50+ members.",
      impact: "Grew weekly attendance by 35% over two semesters.",
      skills: ["leadership", "javascript", "git"],
      verified: true,
    },
    {
      type: "coursement" as unknown as string,
      title: "Relevant Coursework",
      organization: "UT Austin",
      description: "Databases, Machine Learning, Operating Systems, Probability & Statistics, Software Engineering.",
      impact: "",
      skills: ["sql", "machine learning", "statistics"],
      verified: true,
    },
    {
      type: "skill",
      title: "Technical Skills",
      description: "Programming and tools I can confidently use on the job.",
      impact: "",
      skills: ["python", "javascript", "typescript", "react", "next.js", "node.js", "sql", "postgresql", "git", "pandas", "flask", "tailwind"],
      verified: true,
    },
  ];

  for (const f of facts) {
    await db.profileFact.create({
      data: {
        userProfileId: profile.id,
        type: f.type === "coursement" ? "coursework" : (f.type as string),
        title: f.title,
        organization: f.organization ?? null,
        location: f.location ?? null,
        startDate: f.startDate ?? null,
        endDate: f.endDate ?? null,
        description: f.description ?? null,
        impact: f.impact || null,
        skills: f.skills ? toJson(f.skills) : null,
        verified: f.verified ?? false,
      },
    });
  }

  // ---- Master resume -----------------------------------------------------
  const resumeText = `Jordan A. Rivera
jordan.rivera@example.edu | (555) 123-4567 | Austin, TX | github.com/jordan-rivera

EDUCATION
University of Texas at Austin — B.S. Computer Science, Minor in Statistics (May 2027)
GPA: 3.7/4.0. Coursework: Databases, Machine Learning, Operating Systems, Statistics.

EXPERIENCE
Software Engineering Intern — Brightwave Tech (Summer 2025)
- Built internal dashboards with React and TypeScript.
- Added REST endpoints in Node.js backed by PostgreSQL.

PROJECTS
CampusEats — Next.js, React, Python/Flask, PostgreSQL
StudyGraph — Python, pandas, spaced-repetition algorithm

SKILLS
Python, JavaScript, TypeScript, React, Next.js, Node.js, SQL, PostgreSQL, Git, pandas`;

  await db.resume.create({
    data: {
      userProfileId: profile.id,
      name: "Master Resume — Software Engineering",
      baseType: "software-engineering",
      rawText: resumeText,
      isMaster: true,
      structuredJson: toJson({
        header: {
          name: "Jordan A. Rivera",
          email: "jordan.rivera@example.edu",
          phone: "(555) 123-4567",
          location: "Austin, TX",
          links: ["github.com/jordan-rivera", "jordanrivera.dev"],
        },
        summary: "Computer Science student with internship and full-stack project experience.",
        education: [
          { school: "University of Texas at Austin", degree: "B.S. Computer Science", field: "Minor in Statistics", graduation: "May 2027", gpa: "3.7/4.0", details: ["Coursework: Databases, Machine Learning, Operating Systems, Statistics."] },
        ],
        experience: [
          { title: "Software Engineering Intern", organization: "Brightwave Tech", location: "Remote", startDate: "Jun 2025", endDate: "Aug 2025", bullets: ["Built internal dashboards with React and TypeScript.", "Added REST endpoints in Node.js backed by PostgreSQL."] },
        ],
        projects: [
          { name: "CampusEats", description: "Campus food-truck finder.", technologies: ["Next.js", "React", "Python", "Flask", "PostgreSQL"], bullets: ["Used by ~400 students in its first semester."] },
          { name: "StudyGraph", description: "Spaced-repetition study planner.", technologies: ["Python", "pandas"], bullets: ["Won 'Best Use of Data' at HackTX."] },
        ],
        skills: ["Python", "JavaScript", "TypeScript", "React", "Next.js", "Node.js", "SQL", "PostgreSQL", "Git", "pandas"],
        awards: ["Best Use of Data — HackTX 2024", "Dean's List (3 semesters)"],
      }),
    },
  });

  // ---- Job postings ------------------------------------------------------
  const sweText = `Northwind Labs is hiring a Software Engineering Intern (Summer 2026)
Location: Austin, TX (Hybrid)
Apply by August 1, 2026

About the role / Responsibilities:
- Build and ship features across our React + TypeScript frontend
- Write REST APIs in Node.js and work with PostgreSQL
- Collaborate with engineers using Git and CI/CD

Requirements:
- Pursuing a B.S. in Computer Science or related field
- Experience with JavaScript and React
- Familiarity with SQL and Git
- Strong problem-solving skills

Preferred qualifications:
- Exposure to TypeScript and Node.js
- Experience with Docker or AWS
- Prior internship or significant project experience

Compensation: $32/hr`;

  const dataText = `Company: Lumen Analytics
Role: Data Analyst Intern (Summer 2026)
Location: Remote
Apply by July 15, 2026

What you'll do:
- Analyze product usage data and build dashboards
- Write SQL queries against our data warehouse
- Use Python (pandas) for ad-hoc analysis and reporting
- Present findings to stakeholders

Requirements:
- Currently pursuing a degree in a quantitative field
- Strong SQL skills
- Experience with Python and pandas
- Familiarity with data visualization (Tableau a plus)

Preferred:
- Coursework in statistics
- Experience with A/B testing

Compensation: $28/hr`;

  const swe = await createJobFromText(sweText, { sourceUrl: "https://boards.greenhouse.io/northwindlabs/jobs/1234567", sourceName: "greenhouse", atsProvider: "greenhouse" });
  const data = await createJobFromText(dataText, { sourceUrl: "https://jobs.lever.co/lumen/data-analyst-intern", sourceName: "lever", atsProvider: "lever" });

  // Add a few realistic application questions (incl. a sensitive one) to SWE job.
  await db.jobQuestion.createMany({
    data: [
      { jobPostingId: swe.id, questionText: "Why do you want to work at Northwind Labs?", questionType: "textarea", required: true, sensitive: false },
      { jobPostingId: swe.id, questionText: "Describe a project where you used React.", questionType: "textarea", required: true, sensitive: false },
      { jobPostingId: swe.id, questionText: "Are you authorized to work in the United States?", questionType: "eligibility", required: true, sensitive: true },
      { jobPostingId: swe.id, questionText: "Voluntary self-identification: gender (optional).", questionType: "demographic", required: false, sensitive: true },
    ],
  });

  // ---- One application with a generated packet ---------------------------
  const app = await getOrCreateApplication(swe.id);
  await db.application.update({ where: { id: app.id }, data: { applicationMode: "manual" } });
  await generatePacket(app.id, { includeCoverLetter: true });

  // A follow-up task to show on the dashboard.
  await db.followUpTask.create({
    data: {
      applicationId: app.id,
      title: "Send a thank-you / referral note for Northwind Labs",
      dueDate: new Date(Date.now() + 1000 * 60 * 60 * 24 * 3),
    },
  });

  const factCount = await db.profileFact.count();
  const jobCount = await db.jobPosting.count();
  console.log(`✅ Seed complete: 1 profile, ${factCount} facts, ${jobCount} jobs, 1 generated application.`);
}

main()
  .then(async () => {
    await db.$disconnect();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await db.$disconnect();
    process.exit(1);
  });
