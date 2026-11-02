export type SupportCourseHole = {
  holeNumber: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

export type SupportCourseInput = {
  teamId: string;
  courseId: string | null;
  name: string;
  location: string | null;
  holes: SupportCourseHole[];
};

type ValidationResult =
  | { valid: true; value: SupportCourseInput }
  | { valid: false; message: string };

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && uuidPattern.test(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function validateSupportCourseInput(input: unknown): ValidationResult {
  if (!isRecord(input)) {
    return { valid: false, message: "Invalid course request." };
  }

  if (!isUuid(input.teamId)) {
    return { valid: false, message: "Choose a valid school or team." };
  }

  const courseId = input.courseId === null || input.courseId === undefined || input.courseId === ""
    ? null : input.courseId;
  if (courseId !== null && !isUuid(courseId)) {
    return { valid: false, message: "Invalid course selection." };
  }

  const name = typeof input.name === "string" ? input.name.trim() : "";
  const location = typeof input.location === "string" ? input.location.trim() : "";

  if (!name || name.length > 150) {
    return { valid: false, message: "Course name must contain 1–150 characters." };
  }
  if (location.length > 200) {
    return { valid: false, message: "Location cannot exceed 200 characters." };
  }

  if (!Array.isArray(input.holes) || (input.holes.length !== 9 && input.holes.length !== 18)) {
    return { valid: false, message: "Choose exactly 9 or 18 holes." };
  }

  const holes: SupportCourseHole[] = [];

  for (let index = 0; index < input.holes.length; index += 1) {
    const hole: unknown = input.holes[index];
    if (!isRecord(hole) || hole.holeNumber !== index + 1) {
      return { valid: false, message: "Hole numbers must be consecutive, starting at 1." };
    }

    if (!Number.isInteger(hole.par) || Number(hole.par) < 3 || Number(hole.par) > 6) {
      return { valid: false, message: "Hole " + (index + 1) + " par must be between 3 and 6." };
    }

    const handicap = hole.handicap === null || hole.handicap === undefined ? null : hole.handicap;
    const yardage = hole.yardage === null || hole.yardage === undefined ? null : hole.yardage;

    if (handicap !== null && (!Number.isInteger(handicap) || Number(handicap) < 1 || Number(handicap) > 18)) {
      return { valid: false, message: "Hole " + (index + 1) + " handicap must be between 1 and 18." };
    }
    if (yardage !== null && (!Number.isInteger(yardage) || Number(yardage) < 1 || Number(yardage) > 2147483647)) {
      return { valid: false, message: "Hole " + (index + 1) + " yardage must be a positive whole number." };
    }

    holes.push({
      holeNumber: index + 1,
      par: hole.par as number,
      handicap: handicap as number | null,
      yardage: yardage as number | null
    });
  }

  return {
    valid: true,
    value: {
      teamId: input.teamId,
      courseId,
      name,
      location: location || null,
      holes
    }
  };
}
