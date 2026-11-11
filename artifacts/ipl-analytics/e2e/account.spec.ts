/**
 * Account (Supabase Auth) flows on /account, desktop and mobile. Every Supabase request is mocked in the browser and any
 * unmocked one is aborted, so the suite never sends an email or touches the real project. Row isolation is checked
 * in the database itself by supabase/tests/profiles_rls.sql.
 */
import { test, expect, type Page } from "@playwright/test";
import path from "node:path";
import { loadEnv } from "vite";

const env = loadEnv("production", path.resolve(import.meta.dirname, ".."), "VITE_");
const supabaseUrl = env.VITE_SUPABASE_URL?.trim();
const storageKey = supabaseUrl ? `sb-${new URL(supabaseUrl).hostname.split(".")[0]}-auth-token` : "";
const user = { id: "11111111-1111-4111-8111-111111111111", aud: "authenticated", role: "authenticated", email: "fan@example.invalid" };

test.skip(() => !supabaseUrl || !env.VITE_SUPABASE_PUBLISHABLE_KEY, "needs Supabase configured");

/** Aborts every Supabase call, then lets the test add its own mocks (later routes win). Returns the request log. */
async function isolate(page: Page) {
  const calls: string[] = [];
  await page.route(`${supabaseUrl}/**`, (route) => {
    calls.push(`UNMOCKED ${route.request().method()} ${route.request().url()}`);
    return route.abort();
  });
  await page.route(`${supabaseUrl}/auth/v1/settings`, route => route.fulfill({ json: { external: { google: false, github: false, discord: false, email: true } } }));
  await page.route(`${supabaseUrl}/rest/v1/user_workspace**`, route => route.fulfill({ json: null }));
  await page.route(`${supabaseUrl}/rest/v1/saved_feature_data**`, route => route.fulfill({ json: [] }));
  await page.route("**/api/analytics/public", route => route.fulfill({json:{onlineOptIn:0,pageViews30d:0,registeredUsers:null}}));
  return calls;
}

test("signed out: sign-in link request carries the /account redirect", async ({ page, baseURL }) => {
  const calls = await isolate(page);
  let otp: { url: URL; body: Record<string, unknown> } | undefined;
  await page.route(`${supabaseUrl}/auth/v1/otp**`, (route) => {
    otp = { url: new URL(route.request().url()), body: route.request().postDataJSON() };
    return route.fulfill({ status: 200, json: {} });
  });
  await page.goto("/account");
  await page.getByLabel("Email").fill("fan@example.invalid");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText("Check your email for a sign-in link.")).toBeVisible();
  expect(otp?.url.searchParams.get("redirect_to")).toBe(new URL("/account", baseURL).href);
  expect(otp?.body).toMatchObject({ email: "fan@example.invalid", create_user: true });
  expect(calls).toEqual([]);
});

test("sign-in link request failure shows a retry message", async ({ page }) => {
  await isolate(page);
  await page.route(`${supabaseUrl}/auth/v1/otp**`, (route) => route.fulfill({ status: 429, json: { code: 429, error_code: "over_email_send_rate_limit", msg: "rate limited" } }));
  await page.goto("/account");
  await page.getByLabel("Email").fill("fan@example.invalid");
  await page.getByRole("button", { name: "Email me a sign-in link" }).click();
  await expect(page.getByText(/Could not send a sign-in link/)).toBeVisible();
});

test("expired email link explains itself and clears the URL", async ({ page }) => {
  await isolate(page);
  await page.goto("/account#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired");
  await expect(page.getByText(/sign-in link is invalid or has expired/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  expect(new URL(page.url()).hash).toBe("");
});

test("session persists across reload, loads only the own profile, and signs out", async ({ page }) => {
  const calls = await isolate(page);
  const profileQueries: URLSearchParams[] = [];
  let loggedOut = false;
  let savedArcade = false;
  await page.route("**/api/notifications", route=>route.fulfill({json:{preferences:null,notifications:[]}}));
  let savedAlerts=false;
  await page.route("**/api/notifications/preferences",route=>{
    expect(route.request().postDataJSON()).toMatchObject({topics:["wicket"],channels:["in_app"]});
    expect(route.request().headers().authorization).toMatch(/^Bearer /);
    savedAlerts=true;return route.fulfill({json:{saved:true}});
  });
  await page.route(`${supabaseUrl}/rest/v1/saved_feature_data**`, route => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({ user_id: user.id, feature: "arcade", payload: { version: 1, highScore: 17, recent: [] } });
      savedArcade = true;
      return route.fulfill({ status: 201, body: "" });
    }
    expect(new URL(route.request().url()).searchParams.get("user_id")).toBe(`eq.${user.id}`);
    return route.fulfill({ json: [{ feature: "arcade", payload: { version: 1, highScore: 17, recent: [] }, updated_at: "2026-10-29T00:00:00Z" }] });
  });
  await page.route(`${supabaseUrl}/auth/v1/user**`, (route) => route.fulfill({ status: 200, json: user }));
  await page.route(`${supabaseUrl}/rest/v1/profiles**`, (route) => {
    if (route.request().method() === "POST") {
      expect(route.request().postDataJSON()).toMatchObject({ id: user.id, display_name: "" });
      expect(route.request().headers().prefer).toContain("resolution=ignore-duplicates");
      return route.fulfill({ status: 201, body: "" });
    }
    profileQueries.push(new URL(route.request().url()).searchParams);
    return route.fulfill({ status: 200, json: { display_name: "Ash" } });
  });
  await page.route(`${supabaseUrl}/auth/v1/logout**`, (route) => {
    loggedOut = true;
    return route.fulfill({ status: 204 });
  });
  const session = { access_token: "e2e.not-a-real.token", refresh_token: "e2e-refresh", token_type: "bearer", expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
  await page.addInitScript(([key, value]) => { if (!sessionStorage.getItem("e2e-seeded")) { localStorage.setItem(key, value); sessionStorage.setItem("e2e-seeded", "1"); } }, [storageKey, JSON.stringify(session)]);

  await page.goto("/account");
  await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();
  await expect(page.getByLabel("Display name")).toHaveValue("Ash");
  await expect(page.getByText(`CF-${user.id}`, { exact: true })).toBeVisible();
  await page.getByRole("checkbox",{name:"Wickets",exact:true}).check();
  await page.getByRole("checkbox",{name:"In-app",exact:true}).check();
  await page.getByRole("button",{name:"Save alert preferences",exact:true}).click();
  await expect(page.getByText("Notification preferences saved.")).toBeVisible();
  expect(savedAlerts).toBe(true);
  await page.getByRole("button", { name: "Restore arcade", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("cricfield_hl_high_score"))).toBeNull();
  await page.getByRole("button", { name: "Confirm restore", exact: true }).click();
  expect(await page.evaluate(() => localStorage.getItem("cricfield_hl_high_score"))).toBe("17");
  await page.goto("/arcade");
  await page.getByRole("button", { name: "Save Arcade progress to account", exact: true }).click();
  await expect(page.getByText("Saved to your account.", { exact: true })).toBeVisible();
  expect(savedArcade).toBe(true);
  await page.goto("/account");
  await page.reload();
  await expect(page.getByText(`Signed in as ${user.email}`)).toBeVisible();
  // The client asks for its own row only; the database policy (profiles_rls.sql) enforces it regardless.
  expect(profileQueries.length).toBeGreaterThan(0);
  for (const q of profileQueries) expect(q.get("id")).toBe(`eq.${user.id}`);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  expect(loggedOut).toBe(true);
  expect(await page.evaluate((key) => localStorage.getItem(key), storageKey)).toBeNull();
  await page.reload();
  await expect(page.getByRole("button", { name: "Email me a sign-in link" })).toBeVisible();
  expect(calls).toEqual([]);
});

for (const provider of ["google"]) {
  test(`${provider}: enabled provider opens OAuth with account redirect`, async ({ page, baseURL }) => {
    await isolate(page);
    await page.route(`${supabaseUrl}/auth/v1/settings`, route => route.fulfill({ json: { external: { [provider]: true } } }));
    let destination: URL | undefined;
    await page.route(`${supabaseUrl}/auth/v1/authorize**`, route => {
      destination = new URL(route.request().url());
      return route.fulfill({ contentType: "text/html", body: "<h1>Mock provider</h1>" });
    });
    await page.goto("/account");
    await page.getByRole("button", { name: new RegExp(`Continue with ${provider}`, "i") }).click();
    await expect(page.getByRole("heading", { name: "Mock provider" })).toBeVisible();
    expect(destination?.searchParams.get("provider")).toBe(provider);
    expect(destination?.searchParams.get("redirect_to")).toBe(new URL("/account", baseURL).href);
  });
}

test("disabled providers stay unavailable and mobile card fits", async ({ page }) => {
  await isolate(page);
  await page.goto("/account");
  await expect(page.getByRole("button", { name: /Continue with Google Coming soon/ })).toBeDisabled();
  await expect(page.getByRole("button", { name: /Continue with Apple Coming Soon/ })).toBeDisabled();

  expect(await page.locator(".account-shell").evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
});

test("provider check failure can be retried", async ({ page }) => {
  await isolate(page);
  let attempts = 0;
  await page.route(`${supabaseUrl}/auth/v1/settings`, route => ++attempts === 1 ? route.fulfill({ status: 503, json: {} }) : route.fulfill({ json: { external: { google: true } } }));
  await page.goto("/account");
  await page.getByRole("button", { name: "Try again", exact: true }).click();
  await expect(page.getByRole("button", { name: "Continue with Google", exact: true })).toBeEnabled();
});

test("cancelled OAuth shows safe feedback and removes callback errors", async ({ page }) => {
  await isolate(page);
  await page.goto("/account?error=access_denied&error_description=untrusted");
  await expect(page.getByRole("status")).toContainText("Sign-in was cancelled");
  expect(new URL(page.url()).search).toBe("");
});


test("admin analytics requires token and renders verified response", async ({ page }) => {
  await isolate(page);
  await page.route("**/api/admin/analytics", route => route.request().headers()["x-admin-token"] === "admin-test" ? route.fulfill({json:{registeredUsers:3,onlineOptIn:2,pageViews30d:17,features:[],queue:[],logs:[]}}) : route.fulfill({status:401,json:{error:"unauthorized"}}));
  await page.goto("/admin/analytics");
  await page.getByLabel("Admin token").fill("invalid");
  await page.getByRole("button",{name:"Load analytics",exact:true}).click();
  await expect(page.getByRole("alert")).toContainText("Access denied");
  await page.getByLabel("Admin token").fill("admin-test");
  await page.getByRole("button",{name:"Load analytics",exact:true}).click();
  await expect(page.getByText("Confirmed accounts",{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>Object.keys(localStorage).some(key=>/admin.*token/i.test(key)))).toBe(false);
});

test("first-party usage remains off until explicit consent",async({page})=>{
  await isolate(page);
  const events: any[]=[];
  await page.route("**/api/analytics/events",route=>{events.push(route.request().postDataJSON());return route.fulfill({json:{ok:true}});});
  await page.goto("/account");
  const consent=page.getByRole("checkbox",{name:"Share anonymous page and feature usage"});
  await expect(consent).not.toBeChecked();
  expect(events).toEqual([]);
  await consent.check();
  await expect.poll(()=>events.some(event=>event.action==="page_view")).toBe(true);
  expect(events.every(event=>event.feature==="account"&&!event.email&&!event.userId&&!event.question)).toBe(true);
  await consent.uncheck();
  expect(await page.evaluate(()=>localStorage.getItem("cricfield_analytics_optin"))).toBe("false");
});
