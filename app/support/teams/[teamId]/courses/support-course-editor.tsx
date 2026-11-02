"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { validateSupportCourseInput, type SupportCourseHole } from "../../../../../lib/support/course-input";

type Course = {
  id: string;
  name: string;
  location: string | null;
  holes: SupportCourseHole[];
};

type FormHole = {
  holeNumber: number;
  par: string;
  handicap: string;
  yardage: string;
};

type Notice = { type: "success" | "error"; message: string };

function defaultHoles(count: 9 | 18, previous: FormHole[] = []): FormHole[] {
  return Array.from({ length: count }, (_, index) => {
    const holeNumber = index + 1;
    return previous.find(hole => hole.holeNumber === holeNumber) ?? {
      holeNumber, par: "4", handicap: "", yardage: ""
    };
  });
}

function loadFormHoles(holes: SupportCourseHole[], count: 9 | 18) {
  const filled = holes.map(hole => ({
    holeNumber: hole.holeNumber,
    par: String(hole.par),
    handicap: hole.handicap === null ? "" : String(hole.handicap),
    yardage: hole.yardage === null ? "" : String(hole.yardage)
  }));
  return defaultHoles(count, filled);
}

function stat(value: number | null) {
  return value === null ? "—" : value.toLocaleString();
}

export function SupportCourseEditor({
  teamId,
  previewReadOnly
}: {
  teamId: string;
  previewReadOnly: boolean;
}) {
  const [teamName, setTeamName] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedId, setSelectedId] = useState("");
  const [courseName, setCourseName] = useState("");
  const [location, setLocation] = useState("");
  const [holeCount, setHoleCount] = useState<9 | 18>(9);
  const [holes, setHoles] = useState<FormHole[]>(defaultHoles(9));
  const [notice, setNotice] = useState<Notice | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const currentCourse = courses.find(course => course.id === selectedId) ?? null;
  const totalPar = useMemo(() =>
    holes.reduce((sum, hole) => sum + (Number(hole.par) || 0), 0), [holes]
  );
  const totalYardage = useMemo(() => {
    const yardages = holes.map(hole => hole.yardage.trim() === "" ? null : Number(hole.yardage));
    return yardages.every(value => value !== null && Number.isInteger(value) && value > 0)
      ? yardages.reduce<number>((sum, value) => sum + (value ?? 0), 0)
      : null;
  }, [holes]);

  const chooseCourse = useCallback((course: Course | null) => {
    setSelectedId(course?.id ?? "");
    setCourseName(course?.name ?? "");
    setLocation(course?.location ?? "");
    const count: 9 | 18 = course?.holes.length === 18 ? 18 : 9;
    setHoleCount(count);
    setHoles(loadFormHoles(course?.holes ?? [], count));
    setNotice(null);
  }, []);

  const reloadCourses = useCallback(async (preferredCourseId?: string) => {
    const response = await fetch("/api/support/courses?teamId=" + encodeURIComponent(teamId), {
      cache: "no-store"
    });
    const result = await response.json();
    if (!response.ok || !result.success || !Array.isArray(result.courses)) {
      throw new Error(result.message || "Could not load team courses.");
    }
    const updated: Course[] = result.courses;
    setTeamName(result.team?.name ?? "");
    setCourses(updated);
    chooseCourse(updated.find(course => course.id === preferredCourseId) ?? updated[0] ?? null);
  }, [teamId, chooseCourse]);

  useEffect(() => {
    void reloadCourses()
      .catch(error => setNotice({ type: "error", message: error instanceof Error ? error.message : "Unable to load courses." }))
      .finally(() => setLoading(false));
  }, [reloadCourses]);

  function changeHoleCount(count: 9 | 18) {
    setHoleCount(count);
    setHoles(current => defaultHoles(count, current));
    setNotice(null);
  }

  function changeHole(index: number, key: "par" | "handicap" | "yardage", value: string) {
    setHoles(current => current.map((hole, i) =>
      i === index ? { ...hole, [key]: value } : hole
    ));
    setNotice(null);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    const result = validateSupportCourseInput({
      teamId,
      courseId: selectedId || null,
      name: courseName,
      location,
      holes: holes.map(hole => ({
        holeNumber: hole.holeNumber,
        par: Number(hole.par),
        handicap: hole.handicap.trim() ? Number(hole.handicap) : null,
        yardage: hole.yardage.trim() ? Number(hole.yardage) : null
      }))
    });

    if (!result.valid) {
      setNotice({ type: "error", message: result.message });
      return;
    }

    if (previewReadOnly) {
      setNotice({
        type: "success",
        message: "Course setup passes validation. This is a preview only; nothing was saved."
      });
      return;
    }

    if (currentCourse?.holes.length === 18 && result.value.holes.length === 9) {
      if (!window.confirm("Saving 9 holes will remove holes 10–18 from this course setup. Continue?")) {
        return;
      }
    }

    setSaving(true);
    try {
      const response = await fetch("/api/support/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.value)
      });
      const saved = await response.json();
      if (!response.ok || !saved.success) {
        throw new Error(saved.message || "Course could not be saved.");
      }
      await reloadCourses(saved.courseId);
      setNotice({ type: "success", message: saved.message });
    } catch (error) {
      setNotice({ type: "error", message: error instanceof Error ? error.message : "Could not save course." });
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-5">
      {loading ? <p role="status" className="rounded-lg bg-slate-50 p-4 text-sm">Loading team courses...</p> : null}
      {notice ? (
        <p role="status" className={notice.type === "error"
          ? "rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          : "rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
        }>{notice.message}</p>
      ) : null}
      {!loading && teamName ? (
        <div className="grid gap-5 lg:grid-cols-[0.8fr_1.7fr]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5">
            <h2 className="text-lg font-bold text-slate-950">{teamName}</h2>
            <p className="mt-1 text-xs text-slate-500">{courses.length} courses registered</p>
            <button type="button" onClick={() => chooseCourse(null)}
              className={"mt-4 w-full rounded-lg border px-3 py-2.5 text-sm font-semibold " +
                (selectedId === "" ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-slate-300 text-emerald-800 hover:bg-slate-50")}>
              + Add a Course
            </button>
            <div className="mt-4 space-y-2">
              {courses.map(course => (
                <button key={course.id} type="button" onClick={() => chooseCourse(course)}
                  className={"w-full rounded-lg border p-3 text-left text-sm " +
                    (selectedId === course.id ? "border-emerald-700 bg-emerald-50" : "border-slate-200 hover:bg-slate-50")}>
                  <span className="block font-semibold text-slate-950">{course.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">
                    {course.holes.length} configured holes · {course.location || "Location not provided"}
                  </span>
                </button>
              ))}
              {!courses.length ? <p className="text-sm text-slate-500">No courses are configured for this team yet.</p> : null}
            </div>
          </aside>

          <form onSubmit={submit} className="space-y-5">
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-emerald-700">
                  {selectedId ? "Edit course" : "New course"}
                </p>
                <h2 className="mt-1 text-xl font-bold text-slate-950">Course information</h2>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-semibold text-slate-700">
                  Course name
                  <input type="text" required maxLength={150} value={courseName}
                    onChange={event => setCourseName(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
                </label>
                <label className="block text-sm font-semibold text-slate-700">
                  City / location (optional)
                  <input type="text" maxLength={200} value={location}
                    onChange={event => setLocation(event.target.value)}
                    className="mt-1 block w-full rounded-lg border border-slate-300 p-3" />
                </label>
              </div>
              <label className="block max-w-xs text-sm font-semibold text-slate-700">
                Holes
                <select value={holeCount} onChange={event => changeHoleCount(Number(event.target.value) as 9 | 18)}
                  className="mt-1 block w-full rounded-lg border border-slate-300 p-3">
                  <option value={9}>9 holes</option>
                  <option value={18}>18 holes</option>
                </select>
              </label>
              {currentCourse?.holes.length === 18 && holeCount === 9 ? (
                <p className="text-sm font-medium text-amber-800">
                  Changing to 9 holes removes holes 10–18 from the course setup when saved.
                </p>
              ) : null}
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-950">Hole setup</h2>
                  <p className="mt-1 text-sm text-slate-500">Par is required. Handicap and yardage are optional.</p>
                </div>
                <div className="text-right text-sm font-semibold text-slate-700">
                  <p>Par: {totalPar}</p>
                  <p>Yards: {stat(totalYardage)}</p>
                </div>
              </div>
              <div className="grid gap-3">
                {holes.map((hole, index) => (
                  <div key={hole.holeNumber} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[0.6fr_1fr_1fr_1.1fr] sm:items-end">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Hole</p>
                      <p className="mt-1 text-lg font-bold text-slate-950">{hole.holeNumber}</p>
                    </div>
                    <label className="block text-xs font-semibold text-slate-700">
                      Par
                      <select aria-label={"Hole " + hole.holeNumber + " par"} value={hole.par}
                        onChange={event => changeHole(index, "par", event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm">
                        {[3, 4, 5, 6].map(par => <option value={par} key={par}>{par}</option>)}
                      </select>
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Handicap
                      <input aria-label={"Hole " + hole.holeNumber + " handicap"} type="number" inputMode="numeric"
                        min={1} max={18} value={hole.handicap}
                        onChange={event => changeHole(index, "handicap", event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" />
                    </label>
                    <label className="block text-xs font-semibold text-slate-700">
                      Yardage
                      <input aria-label={"Hole " + hole.holeNumber + " yardage"} type="number" inputMode="numeric"
                        min={1} value={hole.yardage}
                        onChange={event => changeHole(index, "yardage", event.target.value)}
                        className="mt-1 block w-full rounded-lg border border-slate-300 bg-white p-2.5 text-sm" />
                    </label>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                <p className="text-xs text-slate-500">
                  {previewReadOnly
                    ? "Preview validation only — no changes to live courses"
                    : "Changes are saved together and recorded in the support audit log"}
                </p>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white hover:bg-emerald-800 disabled:opacity-60">
                  {saving ? "Saving..." : previewReadOnly ? "Validate Draft (No Save)" : selectedId ? "Save Course & Holes" : "Create Course & Holes"}
                </button>
              </div>
            </section>
          </form>
        </div>
      ) : null}
    </div>
  );
}
