"use client";

import type { EventCourseOption } from "../../lib/events/events";
import {
  allowedEventHoleSelections,
  eventHoleSelectionLabel,
  type EventHoleSelection
} from "../../lib/events/hole-selection";
import { inputClassName } from "../ui/primitives";

export type EventCourseFieldsValue = {
  courseId: string;
  holeSelection: EventHoleSelection | "";
  courseName: string;
  location: string;
};

export function EventCourseFields({
  courses,
  value,
  onChange
}: {
  courses: EventCourseOption[];
  value: EventCourseFieldsValue;
  onChange: (changes: Partial<EventCourseFieldsValue>) => void;
}) {
  const selected = courses.find(course => course.id === value.courseId) ?? null;
  const options = allowedEventHoleSelections(selected?.configuredHoles ?? null);

  return (
    <>
      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">Course</span>
        <select
          className={inputClassName}
          value={selected?.id ?? ""}
          onChange={event => {
            const course = courses.find(item => item.id === event.target.value);
            onChange(course
              ? {
                  courseId: course.id,
                  courseName: course.name,
                  location: course.location ?? "",
                  holeSelection: course.configuredHoles === 9 ? "front_9" : ""
                }
              : { courseId: "", holeSelection: "", courseName: "", location: "" });
          }}
        >
          <option value="">Other course / not configured</option>
          {courses.map(course => (
            <option key={course.id} value={course.id} disabled={!course.configuredHoles}>
              {course.name}{course.configuredHoles ? ` (${course.configuredHoles} holes)` : " (finish course setup)"}
            </option>
          ))}
        </select>
      </label>

      {selected ? (
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Holes played</span>
          <select
            className={inputClassName}
            value={value.holeSelection}
            onChange={event => onChange({ holeSelection: event.target.value as EventHoleSelection | "" })}
            required
            disabled={options.length === 1}
          >
            {options.length !== 1 ? <option value="">Choose holes</option> : null}
            {options.map(option => (
              <option key={option} value={option}>
                {eventHoleSelectionLabel(option, selected.configuredHoles === 9)}
              </option>
            ))}
          </select>
          <p className="text-xs text-slate-500">
            {selected.configuredHoles === 9
              ? "This is a 9-hole course, so all nine holes are used."
              : "For a 9-hole event, choose the side of the 18-hole course being played."}
          </p>
        </label>
      ) : (
        <label className="space-y-2">
          <span className="text-sm font-semibold text-slate-700">Course name (optional)</span>
          <input
            type="text"
            value={value.courseName}
            onChange={event => onChange({ courseName: event.target.value })}
            className={inputClassName}
            placeholder="Enter a course not in your saved list"
          />
          <p className="text-xs text-slate-500">
            To use a Front 9 / Back 9 scorecard, first configure the course on the Courses page.
          </p>
        </label>
      )}

      <label className="space-y-2">
        <span className="text-sm font-semibold text-slate-700">Location</span>
        <input
          type="text"
          value={value.location}
          onChange={event => onChange({ location: event.target.value })}
          className={inputClassName}
        />
      </label>
    </>
  );
}
