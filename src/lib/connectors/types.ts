export type DiscoveryQuery = {
  keyword?: string;
  location?: string;
  workplaceType?: string;
  internshipTerm?: string;
  postedWithinDays?: number;
  company?: string;
  minCompensation?: number;
  maxCompensation?: number;
  visaSponsorshipFriendly?: boolean;
  workAuthNotRequired?: boolean;
  deadlineWithinDays?: number;
  source?: string;
};

export type NormalizedSourcedJob = {
  provider: string;
  externalId: string;
  company: string;
  title: string;
  location?: string | null;
  workplaceType?: string | null;
  internshipTerm?: string | null;
  sourceUrl?: string | null;
  rawDescription: string;
  compensationMin?: number | null;
  compensationMax?: number | null;
  compensationText?: string | null;
  visaSponsorshipFriendly?: boolean;
  workAuthNotRequired?: boolean;
  deadline?: Date | null;
  postedAt?: Date | null;
  expiresAt?: Date | null;
};

export type ConnectorStatus = {
  provider: string;
  label: string;
  configured: boolean;
  enabled: boolean;
  reason?: string;
};

export interface JobConnector {
  provider: string;
  label: string;
  status(): ConnectorStatus;
  search(query: DiscoveryQuery): Promise<NormalizedSourcedJob[]>;
}
