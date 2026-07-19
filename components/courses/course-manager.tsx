"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import {
  Badge,
  EmptyState,
  FormSection,
  Message,
  PageHeader,
  cn,
  inputClassName,
  primaryButtonClassName
} from "../ui/primitives";

export type CourseHole = {
  holeNumber: number;
  par: number;
  handicap: number | null;
  yardage: number | null;
};

export type CourseSummary = {
  id: string;
  name: string;
  location: string | null;
  holes: CourseHole[];
};

type HoleFormRow = {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
};

type FormMessage = {
  type: "success" | "error";
  text: string;
};

type CourseActionResult = {
  success: boolean;
  message: string;
  courseId?: string;
};

function createDefaultHoles(count: 9 | 18, existing: CourseHole[] = []): HoleFormRow[] {
  return Array.from({ length: count }, (_, index) => {
    const holeNumber = index + 1;
    const existingHole = existing.find((hole) => hole.holeNumber === holeNumber);

    return {
      holeNumber,
      par: (existingHole?.par ?? 4).toString(),
      handicap: existingHole?.handicap?.toString() ?? "",
      yardage: existingHole?.yardage?.toString() ?? ""
    };
  });
}

function validateHoles(holes: HoleFormRow[]) {
  for (const hole of holes) {
    const par = Number(hole.par);
    const handicap = hole.handicap.trim() ? Number(hole.handicap) : null;
    const yardage = hole.yardage.trim() ? Number(hole.yardage) : null;

    if (!Number.isInteger(par) || par < 3 || par > 6) {
      return `Hole ${hole.holeNumber} par must be between 3 and 6.`;
    }

    if (handicap !== null && (!Number.isInteger(handicap) || handicap < 1 || handicap > 18)) {
      return `Hole ${hole.holeNumber} handicap must be between 1 and 18.`;
    }

    if (yardage !== null && (!Number.isInteger(yardage) || yardage <= 0)) {
      return `Hole ${hole.holeNumber} yardage must be greater than 0.`;
    }
  }

  return null;
}

export function CourseManager({ courses }: { courses: CourseSummary[] }) {
  const router = useRouter();
  const [selectedCourseId, setSelectedCourseId] = useState(courses[0]?.id ?? "");
  const selectedCourse = useMemo(
    () => courses.find((course) => course.id === selectedCourseId) ?? courses[0] ?? null,
    [courses, selectedCourseId]
  );
  const initialHoleCount = selectedCourse?.holes.length === 9 ? 9 : 18;
  const [holeCount, setHoleCount] = useState<9 | 18>(initialHoleCount);
  const [holes, setHoles] = useState<HoleFormRow[]>(
    createDefaultHoles(initialHoleCount, selectedCourse?.holes ?? [])
  );
  const [newCourseName, setNewCourseName] = useState("");
  const [newCourseLocation, setNewCourseLocation] = useState("");
  const [message, setMessage] = useState<FormMessage | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [isSavingHoles, setIsSavingHoles] = useState(false);

  function chooseCourse(courseId: string) {
    const course = courses.find((item) => item.id === courseId) ?? null;
    const nextHoleCount = course?.holes.length === 9 ? 9 : 18;

    setSelectedCourseId(courseId);
    setHoleCount(nextHoleCount);
    setHoles(createDefaultHoles(nextHoleCount, course?.holes ?? []));
    setMessage(null);
  }

  function changeHoleCount(value: 9 | 18) {
    setHoleCount(value);
    setHoles((current) => createDefaultHoles(value, current.map((hole) => ({
      holeNumber: hole.holeNumber,
      par: Number(hole.par) || 4,
      handicap: hole.handicap.trim() ? Number(hole.handicap) : null,
      yardage: hole.yardage.trim() ? Number(hole.yardage) : null
    }))));
  }

  function updateHole(index: number, field: keyof Omit<HoleFormRow, "holeNumber">, value: string) {
    setHoles((current) =>
      current.map((hole, holeIndex) =>
        holeIndex === index ? { ...hole, [field]: value } : hole
      )
    );
  }

  async function createCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!newCourseName.trim()) {
      setMessage({ type: "error", text: "Course name is required." });
      return;
    }

    setIsCreating(true);

    try {
      const response = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newCourseName.trim(),
          location: newCourseLocation.trim() || null
        })
      });
      const result = (await response.json()) as CourseActionResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not add course. Please try again."
        });
        return;
      }

      setNewCourseName("");
      setNewCourseLocation("");
      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not add course. Please try again."
      });
    } finally {
      setIsCreating(false);
    }
  }

  async function saveHoleSetup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);

    if (!selectedCourse) {
      setMessage({ type: "error", text: "Choose a course before saving holes." });
      return;
    }

    const validationError = validateHoles(holes);

    if (validationError) {
      setMessage({ type: "error", text: validationError });
      return;
    }

    setIsSavingHoles(true);

    try {
      const response = await fetch(`/api/courses/${selectedCourse.id}/holes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          holes: holes.map((hole) => ({
            holeNumber: hole.holeNumber,
            par: Number(hole.par),
            handicap: hole.handicap.trim() ? Number(hole.handicap) : null,
            yardage: hole.yardage.trim() ? Number(hole.yardage) : null
          }))
        })
      });
      const result = (await response.json()) as CourseActionResult;

      if (!response.ok || !result.success) {
        setMessage({
          type: "error",
          text: result.message || "Could not save hole setup. Please try again."
        });
        return;
      }

      setMessage({ type: "success", text: result.message });
      router.refresh();
    } catch (error) {
      setMessage({
        type: "error",
        text:
          error instanceof Error
            ? error.message
            : "Could not save hole setup. Please try again."
      });
    } finally {
      setIsSavingHoles(false);
    }
  }

  return (
    <section className="space-y-6">
      <PageHeader
        eyebrow="Course Setup"
        title="Courses"
        description="Build course records with hole-by-hole par, handicap, and yardage for score entry."
        meta={<Badge>{courses.length} courses</Badge>}
      />

      {message ? (
        <Message type={message.type}>{message.text}</Message>
      ) : null}

      <form
        onSubmit={createCourse}
        className="space-y-0"
      >
        <FormSection
          eyebrow="Course Management"
          title="Add Course"
          description="Create a course shell first, then save its 9- or 18-hole setup below."
        >
          <div className="grid gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Course name</span>
              <input
                type="text"
                value={newCourseName}
                onChange={(event) => setNewCourseName(event.target.value)}
                required
                className={inputClassName}
              />
            </label>
            <label className="space-y-2">
              <span className="text-sm font-semibold text-slate-700">Location</span>
              <input
                type="text"
                value={newCourseLocation}
                onChange={(event) => setNewCourseLocation(event.target.value)}
                className={inputClassName}
              />
            </label>
            <button
              type="submit"
              disabled={isCreating}
              className={primaryButtonClassName}
            >
              {isCreating ? "Adding..." : "Add Course"}
            </button>
          </div>
        </FormSection>
      </form>

      {courses.length === 0 ? (
        <EmptyState message="No courses found yet. Add a course to start setting up holes." />
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.85fr_1.35fr]">
          <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5">
            <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
              Existing Courses
            </p>
            <div className="mt-4 space-y-3">
              {courses.map((course) => (
                <button
                  key={course.id}
                  type="button"
                  onClick={() => chooseCourse(course.id)}
                  className={cn(
                    "w-full rounded-md border p-4 text-left transition focus:outline-none focus:ring-2 focus:ring-green-100",
                    selectedCourse?.id === course.id
                      ? "border-green-700 bg-green-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-green-200 hover:bg-green-50/40"
                  )}
                >
                  <p className="font-semibold text-slate-950">{course.name}</p>
                  <p className="mt-1 text-sm text-slate-600">
                    {course.location || "Location not set"}
                  </p>
                  <p className="mt-2 text-xs font-semibold uppercase tracking-wide text-green-700">
                    {course.holes.length} holes configured
                  </p>
                </button>
              ))}
            </div>
          </div>

          <form
            onSubmit={saveHoleSetup}
            className="space-y-5 rounded-lg border border-slate-200 bg-white p-6 shadow-sm shadow-slate-900/5"
          >
            <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
              <div>
                <p className="text-sm font-semibold uppercase tracking-wide text-green-700">
                  Hole Setup
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950">
                  {selectedCourse?.name ?? "Select a Course"}
                </h2>
              </div>
              <label className="space-y-2">
                <span className="text-sm font-semibold text-slate-700">Holes</span>
                <select
                  value={holeCount}
                  onChange={(event) => changeHoleCount(Number(event.target.value) as 9 | 18)}
                  className={inputClassName}
                >
                  <option value={9}>9 holes</option>
                  <option value={18}>18 holes</option>
                </select>
              </label>
            </div>

            <div className="grid gap-3">
              {holes.map((hole, index) => (
                <div
                  key={hole.holeNumber}
                  className="grid gap-3 rounded-md border border-slate-200 bg-slate-50/60 p-4 sm:grid-cols-[0.6fr_0.8fr_1fr_1fr] sm:items-end"
                >
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Hole
                    </p>
                    <p className="mt-2 text-lg font-bold text-slate-950">{hole.holeNumber}</p>
                  </div>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-slate-700">Par</span>
                    <select
                      value={hole.par}
                      onChange={(event) => updateHole(index, "par", event.target.value)}
                      className={inputClassName}
                    >
                      {[3, 4, 5, 6].map((par) => (
                        <option key={par} value={par}>
                          {par}
                        </option>
                      ))}
                    </select>
                  </label>
                  <NumberField
                    label="Handicap"
                    value={hole.handicap}
                    onChange={(value) => updateHole(index, "handicap", value)}
                    min={1}
                    max={18}
                  />
                  <NumberField
                    label="Yardage"
                    value={hole.yardage}
                    onChange={(value) => updateHole(index, "yardage", value)}
                    min={1}
                  />
                </div>
              ))}
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-5">
              <button
                type="submit"
                disabled={!selectedCourse || isSavingHoles}
                className={primaryButtonClassName}
              >
                {isSavingHoles ? "Saving..." : "Save Hole Setup"}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  );
}

function NumberField({
  label,
  value,
  onChange,
  min,
  max
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
}) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-semibold text-slate-700">{label}</span>
      <input
        type="number"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        min={min}
        max={max}
        inputMode="numeric"
        className={inputClassName}
      />
    </label>
  );
}
