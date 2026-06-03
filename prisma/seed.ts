import crypto from "node:crypto";
import { prisma } from "../src/lib/db";
import { ensureDatabaseReady } from "../src/lib/runtime-db";
import { approveApplication, markSubmitted } from "../src/lib/services/application";
import { createJobFromInput } from "../src/lib/services/job";
import { createProfileFact, upsertProfile } from "../src/lib/services/profile";
import { createResume } from "../src/lib/services/resume";
import { updateSettings } from "../src/lib/services/settings";
import { generateApplicationPacket } from "../src/lib/services/tailoring";

async function clearData() {
  await ensureDatabaseReady();
  await prisma.auditLog.deleteMany();
  await prisma.userSession.deleteMany();
  await prisma.userAccount.deleteMany();
  await prisma.company.deleteMany();
  await updateSettings({
    llmProvider: "mock",
    defaultResumeTemplate: "general_internship",
    targetRoleTypes: [],
    targetIndustries: [],
    excludedKeywords: [],
  });
}

async function seedDemoData() {
  const { hash, salt } = await hashSeedPassword("demo-password-123");
  const user = await prisma.userAccount.create({
    data: {
      email: "student@example.edu",
      displayName: "Demo Student",
      passwordHash: hash,
      passwordSalt: salt,
    },
  });

  const profile = await upsertProfile({
    legalName: "Demo Student",
    preferredName: "Demo",
    email: "student@example.edu",
    location: "Chicago, IL",
    school: "Example University",
    degree: "B.A./B.S.",
    major: "Undeclared",
    graduationDate: "2027-05-15",
    workAuthorization: "Add your verified answer before applying",
    sponsorshipRequired: false,
    preferredTerms: ["summer"],
    preferredLocations: ["Chicago", "Remote"],
    remotePreference: "hybrid",
  }, user.id);

  await createProfileFact({
    userProfileId: profile.id,
    type: "project",
    title: "Community Research Project",
    organization: "Example University",
    description: "Collected stakeholder input, organized findings, and presented recommendations for a campus service initiative.",
    impact: "Created a concise summary that helped the team prioritize next steps.",
    skills: ["Research", "Writing", "Communication", "Presentation"],
    evidenceNote: "Class project materials.",
    verified: true,
  });

  await createProfileFact({
    userProfileId: profile.id,
    type: "leadership",
    title: "Student Organization Coordinator",
    organization: "Campus Organization",
    description: "Coordinated weekly planning, outreach, and event logistics for student volunteers.",
    impact: "Supported recurring events with clear task ownership and follow-up.",
    skills: ["Operations", "Project Management", "Communication"],
    evidenceNote: "Organization roster.",
    verified: true,
  });

  await createResume({
    userProfileId: profile.id,
    name: "Demo Master Resume",
    baseType: "general_internship",
    isMaster: true,
    rawText: `Demo Student
student@example.edu | Chicago, IL

EDUCATION
Example University, Expected May 2027

EXPERIENCE
Student Organization Coordinator
- Coordinated planning, outreach, and event logistics for student volunteers.

PROJECTS
Community Research Project
- Collected stakeholder input, organized findings, and presented recommendations.

SKILLS
Research, Writing, Communication, Project Management`,
  });

  const operationsJob = await createJobFromInput({
    company: "Harbor Community Arts",
    title: "Operations Intern",
    roleCategory: "operations",
    location: "Hybrid",
    sourceName: "Manual",
    rawDescription: `Operations Intern
Support scheduling, volunteer coordination, process improvement, and event logistics.
Required: communication, organization, and comfort working with stakeholders.
Preferred: project management, writing, and interest in community programs.
Question: Tell us about a time you coordinated a project.`,
    userAccountId: user.id,
  });

  const application = await generateApplicationPacket(operationsJob.id, profile.id);
  await approveApplication(application.id, user.id);
  await markSubmitted(application.id, user.id);
}

async function main() {
  await clearData();
  if (process.env.SEED_DEMO === "true") {
    await seedDemoData();
    console.log("Seeded optional InternPilot demo data.");
    return;
  }
  console.log("Cleared local data and initialized blank InternPilot settings.");
}

function hashSeedPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("base64url");
  return new Promise<{ hash: string; salt: string }>((resolve, reject) => {
    crypto.scrypt(password, salt, 64, (error, derivedKey) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({ hash: derivedKey.toString("hex"), salt });
    });
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
