import assert from "node:assert/strict";
import test from "node:test";
import {
  allowedEventHoleSelections,
  eventHoleSelectionLabel,
  expectedEventHoleNumbers,
  getConfiguredHoleCount,
  isEventHoleSelection
} from "../lib/events/hole-selection";

test("9-hole course exposes exactly one selection with real hole numbers 1–9", () => {
  const count = getConfiguredHoleCount([1, 2, 3, 4, 5, 6, 7, 8, 9]);
  assert.equal(count, 9);
  assert.deepEqual(allowedEventHoleSelections(count), ["front_9"]);
  assert.equal(eventHoleSelectionLabel("front_9", true), "All 9 holes");
});

test("18-hole course supports Front 9, Back 9 and Full 18", () => {
  const count = getConfiguredHoleCount(Array.from({ length: 18 }, (_, i) => i + 1));
  assert.equal(count, 18);
  assert.deepEqual(allowedEventHoleSelections(count), ["front_9", "back_9", "full_18"]);
  assert.deepEqual(expectedEventHoleNumbers("front_9"), [1,2,3,4,5,6,7,8,9]);
  assert.deepEqual(expectedEventHoleNumbers("back_9"), [10,11,12,13,14,15,16,17,18]);
  assert.deepEqual(expectedEventHoleNumbers("full_18"), Array.from({ length: 18 }, (_, i) => i + 1));
});

test("incomplete or duplicated course holes cannot be selected", () => {
  assert.equal(getConfiguredHoleCount([]), null);
  assert.equal(getConfiguredHoleCount([1,2,3,4,5,6,7,7,9]), null);
  assert.equal(getConfiguredHoleCount([10,11,12,13,14,15,16,17,18]), null);
  assert.deepEqual(allowedEventHoleSelections(null), []);
});

test("invalid hole selections are rejected", () => {
  assert.equal(isEventHoleSelection("front_9"), true);
  assert.equal(isEventHoleSelection("back_9"), true);
  assert.equal(isEventHoleSelection("full_18"), true);
  assert.equal(isEventHoleSelection("all"), false);
  assert.equal(isEventHoleSelection(null), false);
});
