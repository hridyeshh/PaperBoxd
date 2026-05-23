import { cookies } from "next/headers";
import { NextResponse } from "next/server";

function isLocalHost(host: string | null): boolean {
  if (!host) return false;
  const hostname = host.split(":")[0]?.toLowerCase() ?? "";
  return hostname === "localhost" || hostname === "127.0.0.1";
}

/** Names to expire even if missing from this request (tabs / stale clients). */
const EXTRA_COOKIE_NAMES = [
  "authjs.csrf-token",
  "authjs.callback-url",
  "authjs.session-token",
  "pb_access_token",
  "pb_refresh_token",
  "pb_user",
  "next-auth.session-token",
  "__Secure-next-auth.session-token",
  "next-auth.callback-url",
  "next-auth.csrf-token",
  "__Host-next-auth.csrf-token",
] as const;

/**
 * Development helper: open in the browser on localhost to clear cookies for this origin
 * (including HttpOnly tokens set by Next.js / next-auth).
 *
 * http://localhost:3000/api/dev/clear-localhost-cookies
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Only available in development" }, { status: 403 });
  }

  const host = request.headers.get("host");
  if (!isLocalHost(host)) {
    return NextResponse.json(
      { error: "Only allowed for Host localhost or 127.0.0.1" },
      { status: 403 }
    );
  }

  const store = await cookies();
  const names = new Set<string>(store.getAll().map((c) => c.name));
  for (const n of EXTRA_COOKIE_NAMES) names.add(n);

  for (const name of names) {
    store.delete(name);
  }

  const cleared = [...names];
  const payload = { ok: true as const, host, cleared };

  const wantsJson = request.headers.get("accept")?.includes("application/json");
  if (wantsJson) {
    return NextResponse.json(payload);
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Cookies cleared (dev)</title>
</head>
<body style="font-family: ui-sans-serif, system-ui; padding: 2rem; max-width: 40rem; line-height: 1.5;">
  <h1 style="font-size: 1.25rem;">Localhost cookies cleared</h1>
  <p>Host: <code>${host ?? "(none)"}</code></p>
  <p>Sent delete for <strong>${cleared.length}</strong> cookie name(s).</p>
  <pre style="background: #f4f4f5; padding: 1rem; overflow: auto; font-size: 0.85rem;">${cleared.join("\n")}</pre>
  <p><a href="/">Home</a> · <a href="/auth">Sign in</a></p>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
