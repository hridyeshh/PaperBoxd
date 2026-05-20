/**
 * Test Go backend authentication
 * Usage: npx tsx scripts/test-backend-auth.ts
 *
 * Replace TEST_EMAIL / TEST_PASSWORD with a real migrated user.
 */

const API_BASE = "https://paperboxd-backend-production-d9e0.up.railway.app";

// ── config ──────────────────────────────────────────────────────────────────
const TEST_EMAIL = process.env.TEST_EMAIL ?? ""; // e.g. youruser@gmail.com
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? ""; // real password
// ────────────────────────────────────────────────────────────────────────────

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const body = await res.json().catch(() => null);

  if (!res.ok) {
    // Go backend wraps errors as { error: { code, message } }
    const message =
      body?.error?.message ??
      body?.message ??
      `${res.status} ${res.statusText} — ${endpoint}`;
    throw new Error(message);
  }

  return body as T;
}

async function run() {
  console.log("=== PaperBoxd Backend Auth Test ===\n");

  // 1. Health check
  try {
    const health = await apiRequest<{ status: string }>("/health");
    console.log("✅ Health check:", health.status);
  } catch (err) {
    console.error("❌ Health check failed:", (err as Error).message);
    process.exit(1);
  }

  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log(
      "\n⚠️  Skipping login test — set TEST_EMAIL and TEST_PASSWORD env vars."
    );
    console.log(
      "   e.g.  TEST_EMAIL=you@example.com TEST_PASSWORD=secret npx tsx scripts/test-backend-auth.ts"
    );
    return;
  }

  // 2. Login
  let accessToken: string;
  let username: string;

  try {
    const login = await apiRequest<{
      access_token: string;
      refresh_token: string;
      user: { username: string; email: string; name: string };
    }>("/api/v1/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: TEST_EMAIL, password: TEST_PASSWORD }),
    });

    accessToken = login.access_token;
    username = login.user.username;

    console.log("✅ Login successful");
    console.log("   username:", username);
    console.log("   token:   ", accessToken.slice(0, 30) + "...");
  } catch (err) {
    console.error("❌ Login failed:", (err as Error).message);
    process.exit(1);
  }

  // 3. Fetch own profile (authenticated)
  try {
    const profile = await apiRequest<{ username: string; name: string }>(
      `/api/v1/users/${username}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log("✅ Profile fetch:", profile.username, "/", profile.name);
  } catch (err) {
    console.error("❌ Profile fetch failed:", (err as Error).message);
  }

  // 4. /users/me
  try {
    const me = await apiRequest<{ username: string; email: string }>(
      "/api/v1/users/me",
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    console.log("✅ /users/me:", me.username, me.email);
  } catch (err) {
    console.error("❌ /users/me failed:", (err as Error).message);
  }

  console.log("\n=== Done ===");
}

run().catch((err) => {
  console.error("Unexpected error:", err);
  process.exit(1);
});
