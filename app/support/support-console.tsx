"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Team = {
  id: string;
  name: string;
  school_name: string | null;
  contact_email: string | null;
  coaches: number;
  players: number;
  courses: number;
  events: number;
  rounds: number;
  activeSeason: string | null;
};
type Course = { id: string; team_id: string; name: string; location: string | null };

export function SupportConsole({ previewReadOnly = false }: { previewReadOnly?: boolean }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState("");
  const [teamId, setTeamId] = useState("");
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/support", { cache: "no-store" });
        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.message || "Unable to load support console.");
        }
        setTeams(result.teams);
        setCourses(result.courses);
        setTeamId(result.teams[0]?.id ?? "");
      } catch (error) {
        setLoadError(error instanceof Error ? error.message : "Unable to load support data.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const selectedTeam = teams.find(team => team.id === teamId);
  const teamCourses = courses.filter(course => course.team_id === teamId);
  const filteredTeams = useMemo(() => teams.filter(team =>
    [team.name, team.school_name, team.contact_email]
      .some(value => value?.toLowerCase().includes(filter.toLowerCase()))
  ), [teams, filter]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
      <section className="rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="text-lg font-bold text-slate-950">Find a team</h2>
        <input aria-label="Search teams" value={filter}
          onChange={event => setFilter(event.target.value)}
          placeholder="Search school, team or email"
          className="mt-3 w-full rounded-lg border border-slate-300 p-3" />
        {loading ? <p className="mt-4 text-sm text-slate-500">Loading teams...</p> : null}
        {loadError ? <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">{loadError}</p> : null}
        <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
          {filteredTeams.map(team => (
            <button type="button" key={team.id} onClick={() => setTeamId(team.id)}
              className={"w-full rounded-xl border p-4 text-left " +
                (team.id === teamId ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50")}>
              <span className="block font-semibold">{team.name}</span>
              <span className="block text-sm text-slate-600">{team.school_name || "School not set"}</span>
              <span className="mt-1 block text-xs text-slate-500">{team.players} players · {team.rounds} rounds · {team.courses} courses</span>
            </button>
          ))}
          {!loading && !loadError && !filteredTeams.length ? (
            <p className="text-sm text-slate-500">{teams.length ? "No matching teams." : "No teams have been created yet."}</p>
          ) : null}
        </div>
      </section>

      <section className="space-y-5">
        {selectedTeam ? (
          <>
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Team troubleshooting</p>
              <h2 className="mt-1 text-xl font-bold text-slate-950">{selectedTeam.name}</h2>
              <p className="text-sm text-slate-500">{selectedTeam.contact_email || "No contact email"}</p>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
                {([
                  ["Coaches", selectedTeam.coaches],
                  ["Players", selectedTeam.players],
                  ["Events", selectedTeam.events],
                  ["Rounds", selectedTeam.rounds],
                  ["Courses", selectedTeam.courses],
                  ["Active season", selectedTeam.activeSeason || "Not set"]
                ] as const).map(([label, value]) => (
                  <div key={label} className="rounded-lg bg-slate-50 p-3">
                    <p className="text-xs text-slate-500">{label}</p>
                    <p className="font-bold">{value}</p>
                  </div>
                ))}
              </div>
              <Link href={"/support/teams/" + selectedTeam.id}
                className="mt-5 inline-flex rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800">
                View Team Dashboard (Read Only)
              </Link>
              <p className="mt-3 text-xs text-slate-500">Dashboard calculations are read-only; support does not impersonate coach accounts.</p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <h2 className="text-lg font-bold text-slate-950">Team golf courses</h2>
              <p className="mt-1 text-sm text-slate-600">
                {previewReadOnly
                  ? "View current courses and validate new hole setups in Preview without changing live data."
                  : "Add and edit courses, including hole-by-hole par, handicap, and yardage."}
              </p>
              <div className="mt-4 space-y-2">
                {teamCourses.map(course => (
                  <div key={course.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                    <span className="font-semibold text-slate-950">{course.name}</span>
                    {course.location ? <span className="ml-2 text-slate-500">{course.location}</span> : null}
                  </div>
                ))}
                {!teamCourses.length ? <p className="text-sm text-slate-500">No courses added yet.</p> : null}
              </div>
              <Link href={"/support/teams/" + selectedTeam.id + "/courses"}
                className="mt-4 inline-flex rounded-lg border border-emerald-700 px-4 py-2.5 text-sm font-semibold text-emerald-800 hover:bg-emerald-50">
                Manage Course Setup
              </Link>
            </div>
          </>
        ) : (
          <p className="text-sm text-slate-600">Select a school to see its support details.</p>
        )}
      </section>
    </div>
  );
}
