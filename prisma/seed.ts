import { prisma } from "../src/lib/db";
import { approveApplication, markSubmitted } from "../src/lib/services/application";
import { createJobFromInput } from "../src/lib/services/job";
import { createProfileFact, upsertProfile } from "../src/lib/services/profile";
import { createResume } from "../src/lib/services/resume";
import { updateSettings } from "../src/lib/services/settings";
import { generateApplicationPacket } from "../src/lib/services/tailoring";

async function main() {
  await prisma.auditLog.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.company.deleteMany();
  await updateSettings({ llmProvider: "mock", defaultResumeTemplate: "software_engineering" });

  const profile = await upsertProfile({
    legalName: "Maya Chen",
    preferredName: "Maya",
    email: "maya.chen@example.edu",
    phone: "312-555-0184",
    location: "Chicago, IL",
    school: "Midwest State University",
    degree: "B.S.",
    major: "Computer Science",
    graduationDate: "2027-05-15",
    gpa: "3.7",
    workAuthorization: "Authorized to work in the United States for internships",
    sponsorshipRequired: false,
    earliestStartDate: "2026-05-20",
    preferredTerms: ["summer"],
    preferredLocations: ["Chicago", "Remote", "New York"],
    remotePreference: "hybrid",
    githubUrl: "https://github.com/mayachen",
    linkedinUrl: "https://www.linkedin.com/in/mayachen",
    portfolioUrl: "https://maya.example.edu",
  });

  await createProfileFact({
    userProfileId: profile.id,
    type: "internship",
    title: "Software Engineering Intern",
    organization: "Lakefront Labs",
    description: "Built React components and REST API integrations for an internal operations dashboard.",
    impact: "Reduced repeated manual QA checks by creating reusable validation views.",
    skills: ["React", "JavaScript", "REST", "Git"],
    evidenceNote: "Offer letter and manager feedback on file.",
    verified: true,
  });
  await createProfileFact({
    userProfileId: profile.id,
    type: "project",
    title: "Campus Pantry Inventory App",
    organization: "Midwest State University",
    description: "Created a full-stack inventory tool with Next.js, Prisma, SQLite, and role-based admin views.",
    impact: "Helped volunteers track item availability during weekly distribution windows.",
    skills: ["Next.js", "React", "Prisma", "SQLite", "TypeScript"],
    evidenceNote: "GitHub repository and demo screenshots.",
    verified: true,
  });
  await createProfileFact({
    userProfileId: profile.id,
    type: "project",
    title: "Course Demand Forecast",
    organization: "Data Mining Course",
    description: "Analyzed enrollment patterns with Python, SQL, pandas, and dashboard visualizations.",
    impact: "Presented findings to classmates with clear caveats about model limits.",
    skills: ["Python", "SQL", "pandas", "Excel"],
    evidenceNote: "Course project submission.",
    verified: true,
  });
  await createProfileFact({
    userProfileId: profile.id,
    type: "leadership",
    title: "Code Club Workshop Lead",
    organization: "MSU Code Club",
    description: "Led beginner workshops on Git, JavaScript, and debugging fundamentals.",
    impact: "Supported weekly sessions for 20 to 30 students.",
    skills: ["Git", "JavaScript", "Communication"],
    evidenceNote: "Club officer roster.",
    verified: true,
  });

  await createResume({
    userProfileId: profile.id,
    name: "Master Resume",
    baseType: "software_engineering",
    isMaster: true,
    rawText: `Maya Chen
maya.chen@example.edu | Chicago, IL

EDUCATION
Midwest State University, B.S. Computer Science, Expected May 2027

EXPERIENCE
Software Engineering Intern, Lakefront Labs
- Built React components and REST API integrations for an internal operations dashboard.

PROJECTS
Campus Pantry Inventory App
- Created a full-stack inventory tool with Next.js, Prisma, SQLite, and role-based admin views.
Course Demand Forecast
- Analyzed enrollment patterns with Python, SQL, pandas, and dashboard visualizations.

SKILLS
Python, JavaScript, TypeScript, React, Next.js, SQL, Prisma, SQLite, Git`,
  });

  const softwareJob = await createJobFromInput({
    company: "Northstar Robotics",
    title: "Software Engineering Intern",
    location: "Chicago, IL",
    sourceUrl: "https://boards.greenhouse.io/northstar/jobs/123",
    sourceName: "Greenhouse",
    rawDescription: `Company: Northstar Robotics
Software Engineering Intern
Location: Chicago, IL hybrid
Summer internship building internal tools for robotics operations.
Responsibilities include building React UI components, integrating REST APIs, testing workflows, and collaborating with engineers.
Required: currently pursuing a computer science degree, experience with JavaScript, React, Git, and databases.
Preferred: TypeScript, SQL, PostgreSQL.
Question: Why are you interested in this role?
Question: Tell us about a relevant project.
Applicants must be authorized to work in the United States.`,
  });

  const dataJob = await createJobFromInput({
    company: "Civic Metrics Studio",
    title: "Data Analyst Intern",
    location: "Remote",
    sourceUrl: "https://jobs.lever.co/civicmetrics/456",
    sourceName: "Lever",
    rawDescription: `Company: Civic Metrics Studio
Data Analyst Intern
Location: Remote
Analyze operational datasets, build dashboards, and communicate findings to product teams.
Required: SQL, Excel, communication, and experience explaining data limitations.
Preferred: Python, pandas, Tableau, and interest in civic technology.
Question: Describe a data project you are proud of.
Question: Why this company?`,
  });

  const softwareApplication = await generateApplicationPacket(softwareJob.id, profile.id);
  await approveApplication(softwareApplication.id);
  await markSubmitted(softwareApplication.id);
  await generateApplicationPacket(dataJob.id, profile.id);

  console.log("Seeded InternPilot demo data.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
