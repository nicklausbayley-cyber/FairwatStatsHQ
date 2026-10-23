import assert from "node:assert/strict";
import test from "node:test";
import {
  buildCoachSetupProgress,
  type CoachSetupInput
} from "../lib/setup/coach-progress";

const empty: CoachSetupInput = {
  isSignedIn: true,
  schoolName: null,
  logoUrl: null,
  primaryColor: null,
  secondaryColor: null,
  activeSeasonName: null,
  activePlayerCount: 0,
  activeSeasonEventCount: 0
};

const branded: CoachSetupInput = {
  ...empty,
  schoolName: "Example High School",
  logoUrl: "https://example.com/school-logo.png",
  primaryColor: "#166534",
  secondaryColor: "#EAB308"
};

test("a signed-in coach starts with one of five milestones", () => {
  const result = buildCoachSetupProgress(empty);
  assert.equal(result.completedCount, 1);
  assert.equal(result.totalCount, 5);
  assert.equal(result.percent, 20);
  assert.equal(result.complete, false);
  assert.equal(result.nextStep?.id, "branding");
});

test("branding requires school name, both colors and a logo", () => {
  const result = buildCoachSetupProgress(branded);
  assert.equal(result.steps.find((s) => s.id === "branding")?.complete, true);
  assert.equal(result.completedCount, 2);
  for (const partial of [
    { ...branded, logoUrl: null },
    { ...branded, schoolName: " " },
    { ...branded, primaryColor: "bad" },
    { ...branded, secondaryColor: "" }
  ]) {
    assert.equal(
      buildCoachSetupProgress(partial).steps.find((s) => s.id === "branding")?.complete,
      false
    );
  }
});

test("an event only counts if an active season exists", () => {
  const result = buildCoachSetupProgress({
    ...branded,
    activeSeasonEventCount: 5
  });
  const eventStep = result.steps.find((s) => s.id === "event")!;
  assert.equal(eventStep.complete, false);
  assert.equal(eventStep.href, "/settings");
  assert.match(eventStep.detail, /active season/);
});

test("roster readiness begins when an active player exists", () => {
  const result = buildCoachSetupProgress({
    ...empty,
    activePlayerCount: 1
  });
  const rosterStep = result.steps.find((s) => s.id === "roster")!;
  assert.equal(rosterStep.complete, true);
  assert.match(rosterStep.detail, /1 active player/);
});

test("all milestones complete and quick start becomes primary", () => {
  const result = buildCoachSetupProgress({
    ...branded,
    activeSeasonName: "Spring 2027",
    activePlayerCount: 6,
    activeSeasonEventCount: 2
  });
  assert.equal(result.completedCount, 5);
  assert.equal(result.percent, 100);
  assert.equal(result.complete, true);
  assert.equal(result.nextStep, null);
});

test("switching to a season without events makes that step incomplete", () => {
  const result = buildCoachSetupProgress({
    ...branded,
    activeSeasonName: "Spring 2027",
    activePlayerCount: 6,
    activeSeasonEventCount: 0
  });
  assert.equal(result.completedCount, 4);
  assert.equal(result.nextStep?.id, "event");
  assert.equal(result.nextStep?.href, "/events");
});

test("invalid count values cannot mark roster or events complete", () => {
  const result = buildCoachSetupProgress({
    ...branded,
    activeSeasonName: "Spring 2027",
    activePlayerCount: Number.NaN,
    activeSeasonEventCount: -20
  });
  assert.equal(result.steps.find((s) => s.id === "roster")?.complete, false);
  assert.equal(result.steps.find((s) => s.id === "event")?.complete, false);
});

test("account completion is based on the current signed-in session", () => {
  const result = buildCoachSetupProgress({ ...branded, isSignedIn: false });
  assert.equal(result.steps[0].complete, false);
  assert.equal(result.nextStep?.id, "account");
});
