export type EventHoleSelection = "front_9" | "back_9" | "full_18";

export const eventHoleChoices: ReadonlyArray<{ value: EventHoleSelection; label: string }> = [
  { value: "front_9", label: "Front 9 (holes 1–9)" },
  { value: "back_9", label: "Back 9 (holes 10–18)" },
  { value: "full_18", label: "Full 18 (holes 1–18)" }
];

export function isEventHoleSelection(value: unknown): value is EventHoleSelection {
  return value === "front_9" || value === "back_9" || value === "full_18";
}

/** A configured course must have exactly holes 1–9 or holes 1–18. */
export function getConfiguredHoleCount(numbers: number[]): 9 | 18 | null {
  const ordered = [...numbers].sort((a, b) => a - b);
  if (ordered.length !== 9 && ordered.length !== 18) return null;
  return ordered.every((number, index) => number === index + 1) ? ordered.length as 9 | 18 : null;
}

export function allowedEventHoleSelections(holeCount: 9 | 18 | null): EventHoleSelection[] {
  if (holeCount === 9) return ["front_9"];
  if (holeCount === 18) return ["front_9", "back_9", "full_18"];
  return [];
}

export function expectedEventHoleNumbers(selection: EventHoleSelection): number[] {
  const first = selection === "back_9" ? 10 : 1;
  const count = selection === "full_18" ? 18 : 9;
  return Array.from({ length: count }, (_, index) => first + index);
}

export function eventHoleSelectionLabel(selection: EventHoleSelection | null, nineHoleCourse = false): string {
  if (nineHoleCourse && selection === "front_9") return "All 9 holes";
  return eventHoleChoices.find(choice => choice.value === selection)?.label ?? "Not set";
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
