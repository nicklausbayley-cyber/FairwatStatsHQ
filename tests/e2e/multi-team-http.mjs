/**
 * End-to-end Auth + app-router smoke test against ephemeral Supabase CLI.
 * NO production connections: the local-host check is mandatory.
 * Uses real Supabase Auth JWTs, PostgREST RLS and Next.js team-selection endpoint.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const fixture=JSON.parse(readFileSync("tests/e2e/.local-multi-team-fixture.json","utf8"));
const api=process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
const app="http://127.0.0.1:3000";
assert.equal(new URL(api).hostname,"127.0.0.1", "Never use production Supabase");
assert.ok(anon&&service);
const admin=createClient(api,service,{auth:{persistSession:false,autoRefreshToken:false}});

const checks=[];
const verify=(name,fn)=>checks.push((async()=>{await fn();console.log("PASS:",name)})());
function session() {
  const jar=new Map();
  const supabase=createServerClient(api,anon,{
    cookies:{
      getAll:()=>[...jar].map(([name,value])=>({name,value})),
      setAll:(entries)=>{for(const {name,value,options} of entries) {
        if(options?.maxAge===0)jar.delete(name);else jar.set(name,value);
      }}
    }
  });
  return {jar,supabase};
}
function cookieHeader(s) {
  return [...s.jar].map(([name,value])=>`${encodeURIComponent(name)}=${encodeURIComponent(value)}`).join("; ");
}
function mergeSetCookies(s,res) {
  for(const line of res.headers.getSetCookie()) {
    const first=line.split(";",1)[0];
    const i=first.indexOf("=");
    if(i>0) {
      const name=decodeURIComponent(first.slice(0,i));
      const value=decodeURIComponent(first.slice(i+1));
      if(/max-age=0/i.test(line)||value==="")s.jar.delete(name);
      else s.jar.set(name,value);
    }
  }
}
async function request(s,path,opts={}) {
  const res=await fetch(app+path,{
    redirect:"manual",
    ...opts,
    headers:{
      cookie:cookieHeader(s),
      ...(opts.method==="POST" ? {"Content-Type":"application/json",Origin:app}:{}),
      ...(opts.headers||{})
    }
  });
  mergeSetCookies(s,res);
  return {res,text:await res.text()};
}
async function login(which) {
  const s=session();
  const p=fixture.subjects[which];
  const {data,error}=await s.supabase.auth.signInWithPassword({email:p.email,password:fixture.password});
  assert.ifError(error);
  assert.equal(data.user.id,p.id);
  return s;
}
async function page(s,path) {
  const {res,text}=await request(s,path);
  assert.equal(res.status,200,`${path}: ${res.status} ${text.slice(0,260)}`);
  return text;
}
async function postSelection(s,teamId,headers={}) {
  const {res,text}=await request(s,"/api/team-selection",{
    method:"POST",headers,body:JSON.stringify({teamId})
  });
  return {res,body:JSON.parse(text)};
}
async function visiblePlayers(s) {
  const {data,error}=await s.supabase.from("players").select("team_id,first_name");
  assert.ifError(error);
  return data||[];
}

// Test the real PLATFORM ADMIN ONBOARDING endpoint for an existing staff member.
// This is intentionally different from directly writing staff_team_access.
const platform=await login("platform");
const original=await admin.from("profiles").select("id,team_id,role,full_name,email")
  .eq("id",fixture.subjects.dual.id).single();
assert.ifError(original.error);
assert.equal(original.data.team_id,fixture.teams.boys);
assert.equal(original.data.role,"admin");
const beforeAssignments=await admin.from("staff_team_access")
  .select("team_id,role").eq("user_id",fixture.subjects.dual.id);
assert.ifError(beforeAssignments.error);
assert.deepEqual(beforeAssignments.data.map(x=>x.team_id),[fixture.teams.boys],
  "Existing coach must begin with only the backfilled boys membership");
const originalAuth=await admin.auth.admin.getUserById(fixture.subjects.dual.id);
assert.ifError(originalAuth.error);
assert.equal(originalAuth.data.user.email,fixture.subjects.dual.email);

const payload={
  action:"create-staff-login",
  teamId:fixture.teams.girls,
  fullName:"Demo Dual Coach",
  email:fixture.subjects.dual.email,
  role:"coach"
};

const notAdmin=await login("girlsOnly");
let attempted=await request(notAdmin,"/api/onboarding",{
  method:"POST",body:JSON.stringify(payload)
});
assert.equal(attempted.res.status,403,"Only a platform admin may assign an existing coach");
console.log("PASS: team coach cannot use platform onboarding to grant access");

let onboard=await request(platform,"/api/onboarding",{
  method:"POST",body:JSON.stringify(payload)
});
let onboardReply=JSON.parse(onboard.text);
assert.equal(onboard.res.status,200,JSON.stringify(onboardReply));
assert.equal(onboardReply.success,true);
assert.equal(onboardReply.userId,fixture.subjects.dual.id,
  "Adding a second team must reuse the original Auth user");

const after=await admin.from("profiles").select("id,team_id,role,full_name,email")
  .eq("id",fixture.subjects.dual.id).single();
assert.ifError(after.error);
assert.deepEqual(after.data,original.data,
  "Adding girls access must not overwrite original boys profile");
const memberships=await admin.from("staff_team_access")
  .select("team_id,role").eq("user_id",fixture.subjects.dual.id);
assert.ifError(memberships.error);
const expectedAccess=[
  {team_id:fixture.teams.boys,role:"admin"},
  {team_id:fixture.teams.girls,role:"coach"}
].sort((a,b)=>a.team_id.localeCompare(b.team_id));
assert.deepEqual(memberships.data.sort((a,b)=>a.team_id.localeCompare(b.team_id)),
  expectedAccess);
console.log("PASS: platform onboarding added girls as coach, retained boys as admin and original Auth/profile");

onboard=await request(platform,"/api/onboarding",{
  method:"POST",body:JSON.stringify(payload)
});
onboardReply=JSON.parse(onboard.text);
assert.equal(onboard.res.status,200,JSON.stringify(onboardReply));
assert.equal(onboardReply.userId,fixture.subjects.dual.id);
const repeat=await admin.from("staff_team_access").select("team_id")
  .eq("user_id",fixture.subjects.dual.id);
assert.ifError(repeat.error);
assert.equal(repeat.data.length,2,
  "Repeating the same onboarding request must not duplicate memberships");

const accountsResponse=await request(platform,"/api/onboarding");
assert.equal(accountsResponse.res.status,200,accountsResponse.text.slice(0,500));
const accountList=JSON.parse(accountsResponse.text);
assert.equal(accountList.success,true);
const assigned=(accountList.accounts||[]).filter(x=>x.profileId===fixture.subjects.dual.id);
assert.equal(assigned.length,2,
  "Onboarding account list must show an existing coach on both teams");
assert.deepEqual(assigned.map(x=>[x.teamId,x.role]).sort(),
  [[fixture.teams.boys,"admin"],[fixture.teams.girls,"coach"]].sort());

const conflict=await request(platform,"/api/onboarding",{
  method:"POST",body:JSON.stringify({...payload,email:fixture.subjects.boysPlayer.email})
});
assert.equal(conflict.res.status,409,"An existing player must never become a coach automatically");
const playerProfile=await admin.from("profiles").select("team_id,role")
  .eq("id",fixture.subjects.boysPlayer.id).single();
assert.ifError(playerProfile.error);
assert.equal(playerProfile.data.team_id,fixture.teams.boys);
assert.equal(playerProfile.data.role,"player");
console.log("PASS: onboarding is idempotent, lists both assignments, and refuses player-to-coach takeover");

const dual=await login("dual");
let roster=await page(dual,"/roster");
assert.ok(roster.includes("CI Boys Varsity Golf"), "Boys roster brand not visible");
assert.match(roster,/Bradley/);
assert.doesNotMatch(roster,/Gemma GirlsOnly|Riley RivalOnly/);
assert.ok(roster.includes("Active golf team"), "Multi-team coach selector not visible");
let dashboard=await page(dual,"/dashboard");
assert.match(dashboard,/CI Boys Varsity Golf/);
let rows=await visiblePlayers(dual);
assert.deepEqual(rows.map(x=>x.team_id).sort(),[fixture.teams.boys,fixture.teams.girls].sort());
console.log("PASS: real Supabase Auth login and boys dashboard, membership-scoped RLS");

const switchResult=await postSelection(dual,fixture.teams.girls);
assert.equal(switchResult.res.status,200,JSON.stringify(switchResult.body));
assert.equal(switchResult.body.teamId,fixture.teams.girls);
assert.equal(dual.jar.get("fshq_selected_team"),fixture.teams.girls);
roster=await page(dual,"/roster");
assert.ok(roster.includes("CI Girls Varsity Golf"), "Girls roster brand not visible");
assert.match(roster,/Gemma/);
assert.doesNotMatch(roster,/Bradley BoysOnly|Riley RivalOnly/);
dashboard=await page(dual,"/dashboard");
assert.match(dashboard,/CI Girls Varsity Golf/);
assert.doesNotMatch(dashboard,/Bradley BoysOnly/);
console.log("PASS: HTTP team switch sets cookie and changes roster/dashboard");

let invalid=await postSelection(dual,fixture.teams.outsider);
assert.equal(invalid.res.status,403);
assert.equal(dual.jar.get("fshq_selected_team"),fixture.teams.girls);
invalid=await postSelection(dual,fixture.teams.boys,{Origin:"https://untrusted.example.invalid"});
assert.equal(invalid.res.status,403);
console.log("PASS: forged team and cross-origin requests rejected");

const single=await login("girlsOnly");
roster=await page(single,"/roster");
assert.match(roster,/Gemma/);
assert.ok(!roster.includes("Active golf team"), "Single-team coach selector should be hidden");
invalid=await postSelection(single,fixture.teams.boys);
assert.equal(invalid.res.status,403);
assert.deepEqual((await visiblePlayers(single)).map(x=>x.team_id),[fixture.teams.girls]);
console.log("PASS: single-team coach cannot access or select boys");

const player=await login("boysPlayer");
invalid=await postSelection(player,fixture.teams.girls);
assert.equal(invalid.res.status,403);
assert.deepEqual((await visiblePlayers(player)).map(x=>x.team_id),[fixture.teams.boys]);
console.log("PASS: player account cannot select girls team");

const outsider=await login("outsider");
assert.deepEqual((await visiblePlayers(outsider)).map(x=>x.team_id),[fixture.teams.outsider]);
console.log("PASS: unrelated coach cannot read boys/girls data");

// A stale selected-team cookie must never confer access after revocation.
const {error:revokeError}=await admin.from("staff_team_access").delete()
  .eq("user_id",fixture.subjects.dual.id).eq("team_id",fixture.teams.girls);
assert.ifError(revokeError);
roster=await page(dual,"/roster");
assert.ok(roster.includes("CI Boys Varsity Golf"), "Boys roster brand not visible");
assert.match(roster,/Bradley/);
assert.doesNotMatch(roster,/Gemma GirlsOnly/);
rows=await visiblePlayers(dual);
assert.deepEqual(rows.map(x=>x.team_id),[fixture.teams.boys]);
invalid=await postSelection(dual,fixture.teams.girls);
assert.equal(invalid.res.status,403);
console.log("PASS: revoked membership blocks HTTP switching and PostgREST reads");

// Restore the fictional girls assignment for the subsequent interactive browser QA.
const {error:restoreError}=await admin.from("staff_team_access").upsert({
  user_id:fixture.subjects.dual.id,team_id:fixture.teams.girls,role:"coach"
},{onConflict:"user_id,team_id"});
assert.ifError(restoreError);

console.log("ALL multi-team real Supabase Auth and Next.js HTTP integration checks PASSED.");
