import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import path from "node:path";

import type {
  CaptarEvent,
  ControlPlaneProject,
  SessionPolicy,
  SessionSummary,
} from "@captar/types";

type StoredSession = {
  sessionId: string;
  projectId: string;
  firstSeenAt: string;
  lastSeenAt: string;
  summary?: SessionSummary;
};

type ControlPlaneStore = {
  projects: ControlPlaneProject[];
  events: Record<string, CaptarEvent[]>;
  sessions: Record<string, StoredSession[]>;
};

const DATA_DIR = path.resolve(process.cwd(), ".data");
const STORE_FILE = path.join(DATA_DIR, "control-plane.json");
const LEGACY_STORE_FILE = path.resolve(
  process.cwd(),
  "apps/platform/.data/control-plane.json",
);

const DEFAULT_POLICY: SessionPolicy = {
  budget: {
    maxSpendUsd: 1,
    softLimitPct: 0.8,
    finalizationReserveUsd: 0.1,
    maxRepeatedCalls: 3,
  },
  call: {
    maxEstimatedCostUsd: 0.5,
    timeoutMs: 30_000,
    retriesCeiling: 1,
  },
  tool: {
    maxCallsPerSession: 10,
  },
};

function createId(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`;
}

function ensureStore(): ControlPlaneStore {
  mkdirSync(DATA_DIR, { recursive: true });
  if (!existsSync(STORE_FILE) && existsSync(LEGACY_STORE_FILE)) {
    mkdirSync(DATA_DIR, { recursive: true });
    renameSync(LEGACY_STORE_FILE, STORE_FILE);
  }
  try {
    const raw = readFileSync(STORE_FILE, "utf8");
    return JSON.parse(raw) as ControlPlaneStore;
  } catch {
    const emptyStore: ControlPlaneStore = {
      projects: [],
      events: {},
      sessions: {},
    };
    writeFileSync(STORE_FILE, JSON.stringify(emptyStore, null, 2));
    return emptyStore;
  }
}

function writeStore(store: ControlPlaneStore): void {
  mkdirSync(DATA_DIR, { recursive: true });
  writeFileSync(STORE_FILE, JSON.stringify(store, null, 2));
}

export function listProjects(): ControlPlaneProject[] {
  const store = ensureStore();
  return [...store.projects].sort((left, right) =>
    right.updatedAt.localeCompare(left.updatedAt),
  );
}

export function getProjectById(projectId: string): ControlPlaneProject | undefined {
  return ensureStore().projects.find((project) => project.id === projectId);
}

export async function createLocalProject(input: {
  name?: string;
}): Promise<ControlPlaneProject> {
  const store = ensureStore();
  const now = new Date().toISOString();
  const project: ControlPlaneProject = {
    id: createId("cp"),
    name: input.name ?? "Untitled Captar Project",
    createdAt: now,
    updatedAt: now,
    policy: DEFAULT_POLICY,
  };

  store.projects.push(project);
  store.events[project.id] = [];
  store.sessions[project.id] = [];
  writeStore(store);
  return project;
}

export function ingestProjectEvents(projectId: string, events: CaptarEvent[]): void {
  const store = ensureStore();
  const project = store.projects.find((item) => item.id === projectId);
  if (!project) {
    throw new Error(`Unknown control-plane project: ${projectId}`);
  }

  project.updatedAt = new Date().toISOString();
  store.events[projectId] = [...(store.events[projectId] ?? []), ...events].sort(
    (left, right) => left.timestamp.localeCompare(right.timestamp),
  );

  const sessionMap = new Map(
    (store.sessions[projectId] ?? []).map((session) => [session.sessionId, session]),
  );

  for (const event of events) {
    const current = sessionMap.get(event.sessionId) ?? {
      sessionId: event.sessionId,
      projectId,
      firstSeenAt: event.timestamp,
      lastSeenAt: event.timestamp,
    };

    current.lastSeenAt = event.timestamp;
    if (event.type === "session.closed") {
      current.summary = event.data as unknown as SessionSummary;
    }
    sessionMap.set(event.sessionId, current);
  }

  store.sessions[projectId] = Array.from(sessionMap.values()).sort((left, right) =>
    right.lastSeenAt.localeCompare(left.lastSeenAt),
  );
  writeStore(store);
}

export function getProjectTimeline(projectId: string): CaptarEvent[] {
  return ensureStore().events[projectId] ?? [];
}

export function getProjectSessions(projectId: string): StoredSession[] {
  return ensureStore().sessions[projectId] ?? [];
}
