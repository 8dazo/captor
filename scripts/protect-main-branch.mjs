#!/usr/bin/env node

import { execFileSync } from "node:child_process";

const branch = process.argv[2] ?? "main";
const requiredApprovals = Number(process.env.CAPTAR_REQUIRED_APPROVALS ?? "0");

function runGh(args, options = {}) {
  return execFileSync("gh", args, {
    encoding: "utf8",
    stdio: ["pipe", "pipe", "pipe"],
    ...options,
  }).trim();
}

const repo = JSON.parse(
  runGh(["repo", "view", "--json", "nameWithOwner"]),
).nameWithOwner;

const payload = {
  required_status_checks: null,
  enforce_admins: false,
  required_pull_request_reviews: {
    dismiss_stale_reviews: true,
    require_code_owner_reviews: false,
    required_approving_review_count: requiredApprovals,
    require_last_push_approval: false,
  },
  restrictions: null,
  required_linear_history: true,
  allow_force_pushes: false,
  allow_deletions: false,
  block_creations: false,
  required_conversation_resolution: true,
  lock_branch: false,
  allow_fork_syncing: false,
};

runGh(
  ["api", "-X", "PUT", `repos/${repo}/branches/${branch}/protection`, "--input", "-"],
  {
    input: JSON.stringify(payload),
  },
);

console.log(
  `Applied branch protection to ${repo}:${branch} with required approvals=${requiredApprovals}.`,
);
