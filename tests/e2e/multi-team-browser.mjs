/**
 * Real Chromium browser test of Supabase sign-in and the React team picker.
 * Browser, app, and Supabase Auth all run on disposable CI localhost ports.
 * No screenshots, real user data, or live credentials are captured.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const fixture=JSON.parse(readFileSync("tests/e2e/.local-multi-team-fixture.json","utf8"));
const api=process.env.NEXT_PUBLIC_SUPABASE_URL;
assert.equal(new URL(api).hostname,"127.0.0.1", "Browser QA must use disposable local Supabase");
const modulePath=process.env.PLAYWRIGHT_PACKAGE_PATH;
assert.ok(modulePath, "Set PLAYWRIGHT_PACKAGE_PATH to installed Playwright package");
const require=createRequire(import.meta.url);
const {chromium}=require(modulePath);
const root="http://127.0.0.1:3000";
const browser=await chromium.launch({headless:true, args:["--no-sandbox"]});
const context=await browser.newContext({viewport:{width:1280,height:900}});
const page=await context.newPage();
page.setDefaultTimeout(30000);

async function login(person) {
  await page.goto(root+"/login",{waitUntil:"domcontentloaded"});
  await page.getByPlaceholder("coach@example.com").fill(fixture.subjects[person].email);
  await page.getByPlaceholder("Enter your password").fill(fixture.password);
  await page.getByRole("button",{name:"Sign In",exact:true}).click();
  await page.waitForURL(url=>!url.pathname.startsWith("/login"),{timeout:45000});
}
async function assertRoster(teamName,expectedFirstName,absentFirstName) {
  await page.goto(root+"/roster",{waitUntil:"domcontentloaded"});
  await page.getByText(teamName,{exact:true}).first().waitFor({state:"visible"});
  await page.locator("main").getByText(expectedFirstName,{exact:true}).waitFor({state:"visible"});
  assert.equal(await page.locator("main").getByText(absentFirstName,{exact:true}).count(),0,
    `Unexpected ${absentFirstName} roster visible in ${teamName}`);
}

try {
  await login("dual");
  await assertRoster("CI Boys Varsity Golf","Bradley","Gemma");
  const selector=page.getByRole("combobox",{name:"Active golf team"});
  await selector.waitFor({state:"visible"});
  assert.equal(await selector.inputValue(),fixture.teams.boys,
    "Boys is expected to be the initial assigned team");
  await selector.selectOption(fixture.teams.girls);
  await page.waitForURL(url=>url.pathname==="/dashboard",{timeout:45000});
  await page.getByText("CI Girls Varsity Golf",{exact:true}).first().waitFor({state:"visible"});
  await assertRoster("CI Girls Varsity Golf","Gemma","Bradley");
  assert.equal(await page.getByRole("combobox",{name:"Active golf team"}).inputValue(),
    fixture.teams.girls);
  console.log("PASS: Chromium coach sign-in and boys-to-girls switch updated active roster.");

  await page.getByRole("combobox",{name:"Active golf team"}).selectOption(fixture.teams.boys);
  await page.waitForURL(url=>url.pathname==="/dashboard",{timeout:45000});
  await assertRoster("CI Boys Varsity Golf","Bradley","Gemma");
  console.log("PASS: Chromium girls-to-boys switch restored correct roster.");

  await page.getByRole("button",{name:"Sign Out"}).click();
  await page.waitForURL(url=>url.pathname==="/login",{timeout:45000});
  await login("girlsOnly");
  await assertRoster("CI Girls Varsity Golf","Gemma","Bradley");
  assert.equal(await page.getByRole("combobox",{name:"Active golf team"}).count(),0,
    "Single-team coach should not see selector");
  console.log("PASS: Chromium sign-out and single-team coach login hid team selector.");
  console.log("ALL real-browser Supabase Auth and team-switching checks PASSED.");
} finally {
  await browser.close();
}
