import { AdzunaConnector } from "./adzuna";
import { MockConnector } from "./mock";
import { RemotiveConnector } from "./remotive";
import type { JobConnector } from "./types";
import { UsajobsConnector } from "./usajobs";

export function getJobConnectors(): JobConnector[] {
  return [
    new MockConnector(),
    new AdzunaConnector(),
    new UsajobsConnector(),
    new RemotiveConnector(),
  ];
}

export function getConnectorStatuses() {
  return getJobConnectors().map((connector) => connector.status());
}

export type { DiscoveryQuery, JobConnector, NormalizedSourcedJob } from "./types";
