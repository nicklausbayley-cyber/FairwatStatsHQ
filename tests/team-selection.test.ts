import assert from "node:assert/strict";
import test from "node:test";
import { canSwitchToTeam, resolveStaffTeamId } from "../lib/auth/team-selection";

const assignments = [
  { team_id: "boys", role: "admin" as const },
  { team_id: "girls", role: "coach" as const }
];

test("a coach can select either explicitly assigned team", () => {
  assert.equal(resolveStaffTeamId(assignments, "boys", "girls"), "girls");
  assert.equal(resolveStaffTeamId(assignments, "boys", "boys"), "boys");
  assert.equal(canSwitchToTeam(assignments, "girls"), true);
});

test("unassigned or stale selections fall back to an assigned home team", () => {
  assert.equal(resolveStaffTeamId(assignments, "boys", "other"), "boys");
  assert.equal(canSwitchToTeam(assignments, "other"), false);
});

test("revoking access invalidates a previously selected team", () => {
  const reduced = assignments.filter((a) => a.team_id !== "girls");
  assert.equal(resolveStaffTeamId(reduced, "boys", "girls"), "boys");
  assert.equal(canSwitchToTeam(reduced, "girls"), false);
});

test("an account without any staff assignments cannot select a team", () => {
  assert.equal(resolveStaffTeamId([], "boys", "boys"), null);
  assert.equal(canSwitchToTeam([], "boys"), false);
});

test("team access respects per-team roles", () => {
  const selected = assignments.find((a) => a.team_id === "girls");
  assert.equal(selected?.role, "coach");
});
