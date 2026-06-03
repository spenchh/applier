import type { DiscoveryQuery, JobConnector, NormalizedSourcedJob } from "./types";

const now = Date.now();
const day = 24 * 60 * 60 * 1000;

const mockJobs: NormalizedSourcedJob[] = [
  {
    provider: "mock",
    externalId: "mock-ce-hardware-2026",
    company: "Northstar Robotics",
    title: "Computer Engineering Intern",
    location: "Chicago, IL",
    workplaceType: "hybrid",
    internshipTerm: "summer",
    sourceUrl: "https://careers.example.com/northstar-robotics/computer-engineering-intern",
    rawDescription:
      "Computer Engineering Intern supporting embedded systems, Python test automation, C++, hardware validation, microcontrollers, and cross-functional design reviews. Required: coursework in circuits or computer architecture. Preferred: Git, debugging, communication, and lab documentation.",
    compensationMin: 28,
    compensationMax: 34,
    compensationText: "$28-$34/hr",
    visaSponsorshipFriendly: true,
    workAuthNotRequired: false,
    postedAt: new Date(now - 2 * day),
    deadline: new Date(now + 21 * day),
  },
  {
    provider: "mock",
    externalId: "mock-civic-data-2026",
    company: "Civic Metrics Studio",
    title: "Data and Policy Research Intern",
    location: "Remote",
    workplaceType: "remote",
    internshipTerm: "summer",
    sourceUrl: "https://careers.example.com/civic-metrics/data-policy-research-intern",
    rawDescription:
      "Research internship analyzing public data, writing concise memos, building dashboards, and presenting recommendations to stakeholders. Required: Excel or SQL, writing, research, and communication. Preferred: Python, Tableau, public policy interest.",
    compensationMin: 22,
    compensationMax: 27,
    compensationText: "$22-$27/hr",
    visaSponsorshipFriendly: false,
    workAuthNotRequired: true,
    postedAt: new Date(now - 5 * day),
    deadline: new Date(now + 12 * day),
  },
  {
    provider: "mock",
    externalId: "mock-product-growth-2026",
    company: "BrightCart",
    title: "Product Growth Intern",
    location: "New York, NY",
    workplaceType: "onsite",
    internshipTerm: "fall",
    sourceUrl: "https://careers.example.com/brightcart/product-growth-intern",
    rawDescription:
      "Support product experiments, user research synthesis, campaign analysis, stakeholder updates, and customer interviews. Required: communication, analytics, writing, and comfort learning new tools. Preferred: Figma, SQL, marketing, and product management interest.",
    compensationMin: 24,
    compensationMax: 30,
    compensationText: "$24-$30/hr",
    visaSponsorshipFriendly: false,
    workAuthNotRequired: false,
    postedAt: new Date(now - 1 * day),
    deadline: new Date(now + 35 * day),
  },
  {
    provider: "mock",
    externalId: "mock-ops-2026",
    company: "Harbor Community Arts",
    title: "Operations and Events Intern",
    location: "Chicago, IL",
    workplaceType: "hybrid",
    internshipTerm: "summer",
    sourceUrl: "https://careers.example.com/harbor-community-arts/operations-events-intern",
    rawDescription:
      "Support event planning, volunteer coordination, process improvement, scheduling, stakeholder communication, and post-event reporting. Required: organization, writing, communication, and project management.",
    compensationMin: 18,
    compensationMax: 22,
    compensationText: "$18-$22/hr",
    visaSponsorshipFriendly: false,
    workAuthNotRequired: true,
    postedAt: new Date(now - 8 * day),
    deadline: new Date(now + 9 * day),
  },
  {
    provider: "mock",
    externalId: "mock-finance-2026",
    company: "Lakeview Capital Partners",
    title: "Finance Intern",
    location: "Remote",
    workplaceType: "remote",
    internshipTerm: "spring",
    sourceUrl: "https://careers.example.com/lakeview/finance-intern",
    rawDescription:
      "Assist with market research, financial modeling, Excel analysis, presentation decks, and investment memo preparation. Required: Excel, writing, quantitative research, and attention to detail. Preferred: accounting, valuation, and finance coursework.",
    compensationMin: 25,
    compensationMax: 32,
    compensationText: "$25-$32/hr",
    visaSponsorshipFriendly: false,
    workAuthNotRequired: false,
    postedAt: new Date(now - 11 * day),
    deadline: new Date(now + 18 * day),
  },
];

export class MockConnector implements JobConnector {
  provider = "mock";
  label = "Demo discovery";

  status() {
    return {
      provider: this.provider,
      label: this.label,
      configured: true,
      enabled: true,
    };
  }

  async search(query?: DiscoveryQuery) {
    void query;
    return mockJobs;
  }
}
