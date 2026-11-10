/**
 * Disposable Supabase CI fixture. Uses ONLY localhost Supabase, never live projects.
 * Creates real Auth users and separate fictional boys/girls/unrelated team data.
 * Run before applying add-staff-team-access.sql so existing staff are backfilled.
 */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const api = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
assert.equal(new URL(api).hostname, "127.0.0.1", "CI tests must use local Supabase only");
assert.ok(key, "No local service key supplied");
const admin = createClient(api, key, { auth: { persistSession: false, autoRefreshToken: false } });

async function required(promise, label) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

const password = `Ci-${randomBytes(18).toString("hex")}#Aa4`;
const label = randomBytes(5).toString("hex");
const subjects = [
  { key: "dual", email: `dual-coach-${label}@example.invalid`, name: "Demo Dual Coach", role: "admin", home: "boys" },
  { key: "girlsOnly", email: `girls-coach-${label}@example.invalid`, name: "Demo Girls Coach", role: "coach", home: "girls" },
  { key: "boysPlayer", email: `boys-player-${label}@example.invalid`, name: "Demo Boys Player", role: "player", home: "boys" },
  { key: "outsider", email: `outsider-coach-${label}@example.invalid`, name: "Demo Outsider Coach", role: "coach", home: "outsider" }
];
for (const person of subjects) {
  const { user } = await required(admin.auth.admin.createUser({
    email: person.email,
    password,
    email_confirm: true
  }), `Create local Auth user ${person.key}`);
  assert.ok(user?.id);
  person.id = user.id;
}

const teamsArray = [
  { name: "CI Boys Varsity Golf", school_name: "CI Dual-Squad High", primary_color: "#166534", secondary_color: "#0f172a", mascot: "Boys Eagles" },
  { name: "CI Girls Varsity Golf", school_name: "CI Dual-Squad High", primary_color: "#be185d", secondary_color: "#0f172a", mascot: "Girls Eagles" },
  { name: "CI Unrelated School", school_name: "CI Rival High", primary_color: "#2563eb", secondary_color: "#0f172a", mascot: "Rivals" }
];
const teamData = await required(admin.from("teams").insert(teamsArray).select("id,name"), "Insert local demo teams");
const teams = {
  boys: teamData.find((row) => row.name === teamsArray[0].name).id,
  girls: teamData.find((row) => row.name === teamsArray[1].name).id,
  outsider: teamData.find((row) => row.name === teamsArray[2].name).id
};
await required(admin.from("profiles").insert(subjects.map(person => ({
  id: person.id, team_id: teams[person.home], role: person.role, full_name: person.name, email: person.email
}))), "Insert local profiles");

const seasons = await required(admin.from("seasons").insert(Object.entries(teams).map(([key,team_id]) => ({
  team_id, name: `CI ${key} Season`, starts_on: "2026-03-01", ends_on: "2026-06-30", is_active: true
}))).select("id,team_id"), "Insert local seasons");
const seasonByTeam = Object.fromEntries(seasons.map(s=>[s.team_id,s.id]));

const playerRows = [
  { team_id: teams.boys, first_name: "Bradley", last_name: "BoysOnly", status: "active", profile_id: subjects.find(x=>x.key==="boysPlayer").id },
  { team_id: teams.girls, first_name: "Gemma", last_name: "GirlsOnly", status: "active" },
  { team_id: teams.outsider, first_name: "Riley", last_name: "RivalOnly", status: "active" }
];
const players = await required(admin.from("players").insert(playerRows).select("id,team_id,first_name"), "Insert local players");
for(const player of players) {
  const season_id=seasonByTeam[player.team_id];
  const ev = await required(admin.from("events").insert({
    team_id:player.team_id,season_id,event_type:"match",
    name:`CI ${player.first_name} Match`, event_date:"2026-04-20"
  }).select("id").single(), "Insert local event");
  await required(admin.from("rounds").insert({
    team_id:player.team_id,season_id,event_id:ev.id,player_id:player.id,
    played_on:"2026-04-20",holes:9,score:player.first_name==="Bradley"?39:player.first_name==="Gemma"?42:45
  }),"Insert local round");
}
const result={password,teams,subjects: Object.fromEntries(subjects.map(s=>[s.key,{id:s.id,email:s.email,role:s.role}])),players: Object.fromEntries(players.map(p=>[p.first_name,p.id]))};
writeFileSync("tests/e2e/.local-multi-team-fixture.json",JSON.stringify(result),{mode:0o600});
console.log("Prepared four real local Supabase Auth users, three fictional teams, and isolated sample rounds.");
