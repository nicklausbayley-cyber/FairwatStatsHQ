"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";

type Team = { id: string; name: string; school_name: string | null; contact_email: string | null; coaches: number; players: number; courses: number; events: number; rounds: number; activeSeason: string | null };
type Course = { id: string; team_id: string; name: string; location: string | null };

export function SupportConsole() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [filter, setFilter] = useState("");
  const [teamId, setTeamId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [name, setName] = useState("");
  const [location, setLocation] = useState("");
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  async function refresh() {
    const response = await fetch("/api/support", { cache: "no-store" });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || "Unable to load support console.");
    setTeams(result.teams);
    setCourses(result.courses);
    setTeamId(current => result.teams.some((team: Team) => team.id === current) ? current : (result.teams[0]?.id ?? ""));
  }

  useEffect(() => {
    void refresh().catch(error => setMessage(error instanceof Error ? error.message : "Unable to load support data.")).finally(() => setLoading(false));
  }, []);

  const selectedTeam = teams.find(team => team.id === teamId);
  const selectedCourses = courses.filter(course => course.team_id === teamId);
  const filteredTeams = useMemo(() => teams.filter(team =>
    [team.name, team.school_name, team.contact_email].some(value => value?.toLowerCase().includes(filter.toLowerCase()))
  ), [teams, filter]);

  async function saveCourse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true); setMessage("");
    try {
      const response = await fetch("/api/support/courses", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId, courseId: courseId || undefined, name, location })
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || "Save failed.");
      setName(""); setLocation(""); setCourseId("");
      await refresh();
      setMessage("Course saved and logged.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Unable to save course.");
    } finally { setSaving(false); }
  }

  return <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
    <section className="rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="text-lg font-bold text-slate-950">Find a team</h2>
      <input aria-label="Search teams" className="mt-3 w-full rounded-lg border border-slate-300 p-3" placeholder="Search school, team or email" value={filter} onChange={e => setFilter(e.target.value)} />
      {loading ? <p className="mt-4 text-sm">Loading...</p> : null}
      <div className="mt-4 max-h-[520px] space-y-2 overflow-y-auto">
        {filteredTeams.map(team => <button key={team.id} type="button" onClick={() => { setTeamId(team.id); setCourseId(""); setName(""); setLocation(""); setMessage(""); }}
          className={"w-full rounded-xl border p-4 text-left " + (team.id === teamId ? "border-emerald-600 bg-emerald-50" : "border-slate-200 hover:bg-slate-50")}>
          <span className="block font-semibold">{team.name}</span>
          <span className="block text-sm text-slate-600">{team.school_name || "School not set"}</span>
          <span className="mt-1 block text-xs text-slate-500">{team.players} players · {team.rounds} rounds · {team.courses} courses</span>
        </button>)}
        {!loading && filteredTeams.length === 0 ? <p className="text-sm text-slate-500">No matching teams.</p> : null}
      </div>
    </section>
    <section className="space-y-5">
      {selectedTeam ? <>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Team troubleshooting</p>
          <h2 className="mt-1 text-xl font-bold">{selectedTeam.name}</h2>
          <p className="text-sm text-slate-500">{selectedTeam.contact_email || "No contact email"}</p>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm sm:grid-cols-3">
            {([["Coaches",selectedTeam.coaches],["Players",selectedTeam.players],["Events",selectedTeam.events],["Rounds",selectedTeam.rounds],["Courses",selectedTeam.courses],["Active season",selectedTeam.activeSeason || "Not set"]] as const).map(([label,value])=>
              <div key={label} className="rounded-lg bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="font-bold">{value}</p></div>)}
          </div>
          <p className="mt-4 text-xs text-slate-500">Team data is read-only in this workspace. No impersonation of coach accounts.</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-bold">Manage courses</h2>
          <p className="mt-1 text-sm text-slate-600">Add or correct a course for this team. All changes are logged.</p>
          <div className="mt-3 space-y-2">{selectedCourses.map(course =>
            <button type="button" key={course.id} onClick={() => { setCourseId(course.id); setName(course.name); setLocation(course.location ?? ""); }} className="block w-full rounded-lg border border-slate-200 px-3 py-2 text-left text-sm hover:bg-slate-50">
              <span className="font-medium">{course.name}</span><span className="block text-xs text-slate-500">{course.location || "No location"}</span>
            </button>)}</div>
          <form onSubmit={saveCourse} className="mt-5 space-y-3">
            <label className="block text-sm font-medium">Course name<input required maxLength={150} value={name} onChange={e => setName(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
            <label className="block text-sm font-medium">Location<input maxLength={200} value={location} onChange={e => setLocation(e.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 p-3" /></label>
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !name.trim()} className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : courseId ? "Save changes" : "Add course"}</button>
              {courseId ? <button type="button" className="rounded-lg border px-4 py-2 text-sm" onClick={() => { setCourseId(""); setName(""); setLocation(""); }}>New course</button> : null}
            </div>
          </form>
          {message ? <p role="status" className="mt-3 text-sm text-slate-700">{message}</p> : null}
        </div>
      </> : <p className="text-sm text-slate-600">Select a team to view its setup.</p>}
    </section>
  </div>;
}
