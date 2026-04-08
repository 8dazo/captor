#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const desiredLabels = [
  {
    name: "severity/critical",
    color: "b60205",
    description: "Critical impact that blocks core usage or release readiness.",
  },
  {
    name: "severity/high",
    color: "d93f0b",
    description: "High impact issue that should be fixed in the current cycle.",
  },
  {
    name: "severity/medium",
    color: "fbca04",
    description: "Important but non-blocking issue for the current scope.",
  },
  {
    name: "severity/low",
    color: "0e8a16",
    description: "Low impact polish or follow-up work.",
  },
  {
    name: "area/sdk",
    color: "1d76db",
    description: "TypeScript SDK runtime and provider integration work.",
  },
  {
    name: "area/platform",
    color: "0052cc",
    description: "Platform app, ingest, and trace experience work.",
  },
  {
    name: "area/docs",
    color: "0e8a16",
    description: "Docs app or written product documentation.",
  },
  {
    name: "area/site",
    color: "c2e0c6",
    description: "Marketing site work.",
  },
  {
    name: "area/db",
    color: "5319e7",
    description: "Schema, seed, or persistence-layer work.",
  },
  {
    name: "area/infra",
    color: "bfdadc",
    description: "Infrastructure and environment setup work.",
  },
  {
    name: "area/repo",
    color: "6f42c1",
    description: "Repo workflow, automation, or shared tooling work.",
  },
];

function runGh(args, options = {}) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  }).trim();
}

function getRepoName() {
  const repo = JSON.parse(runGh(["repo", "view", "--json", "nameWithOwner"]));
  return repo.nameWithOwner;
}

function getExistingLabels(repo) {
  return JSON.parse(runGh(["api", `repos/${repo}/labels?per_page=100`]));
}

const repo = getRepoName();
const existingLabels = getExistingLabels(repo);
const desiredNames = new Set(desiredLabels.map((label) => label.name));

for (const label of desiredLabels) {
  runGh([
    "label",
    "create",
    label.name,
    "--color",
    label.color,
    "--description",
    label.description,
    "--force",
    "--repo",
    repo,
  ]);
}

for (const label of existingLabels) {
  if (desiredNames.has(label.name)) {
    continue;
  }

  runGh([
    "label",
    "delete",
    label.name,
    "--yes",
    "--repo",
    repo,
  ]);
}

console.log(`Synchronized ${desiredLabels.length} labels in ${repo}.`);

