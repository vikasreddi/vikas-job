// Password gate for the whole site (pages, /data, /files and /api).
// Used instead of Cloudflare Access. Needs two Cloudflare secrets:
//   APP_PASSWORD   the password you type on the login page
//   SESSION_SECRET a long random string used to sign the login cookie
// If either is missing the site stays locked (fails closed).

const COOKIE = "vj_session";
const MAX_AGE = 60 * 60 * 24 * 30; // 30 days
const enc = new TextEncoder();

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");

async function hmac(secret, msg) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return b64url(await crypto.subtle.sign("HMAC", key, enc.encode(msg)));
}

// Constant-time string compare (both sides are fixed-length HMAC outputs).
function same(a, b) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function makeToken(secret) {
  const exp = String(Math.floor(Date.now() / 1000) + MAX_AGE);
  return `${exp}.${await hmac(secret, exp)}`;
}

async function validToken(secret, token) {
  if (!token) return false;
  const [exp, sig] = token.split(".");
  if (!exp || !sig || Number(exp) < Date.now() / 1000) return false;
  return same(sig, await hmac(secret, exp));
}

function getCookie(request, name) {
  const m = (request.headers.get("cookie") || "").match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? m[1] : "";
}

const page = (msg = "", status = 200) =>
  new Response(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow"><title>Sign in</title>
<style>
:root{color-scheme:light dark}
body{font:16px system-ui,sans-serif;display:grid;place-items:center;min-height:100vh;margin:0;background:Canvas;color:CanvasText}
form{width:min(340px,90vw);display:grid;gap:12px}
h1{font-size:20px;margin:0 0 4px}
input,button{font:inherit;padding:10px 12px;border-radius:8px;border:1px solid color-mix(in srgb,CanvasText 25%,transparent);background:Canvas;color:CanvasText}
button{background:#2563eb;border-color:#2563eb;color:#fff;cursor:pointer}
.err{color:#dc2626;font-size:14px;min-height:1.2em}
</style></head><body>
<form method="post" action="/login">
<h1>Job hunt dashboard</h1>
<input type="password" name="password" placeholder="Password" autocomplete="current-password" autofocus required>
<button type="submit">Sign in</button>
<div class="err">${msg}</div>
</form></body></html>`,
    { status, headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } }
  );

const cookieHeader = (value, maxAge) =>
  `${COOKIE}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Strict`;

export async function onRequest(context) {
  const { request, env, next } = context;
  const url = new URL(request.url);

  if (!env.APP_PASSWORD || !env.SESSION_SECRET) {
    return new Response("Locked: APP_PASSWORD and SESSION_SECRET are not set in Cloudflare.", {
      status: 503, headers: { "cache-control": "no-store" },
    });
  }

  if (url.pathname === "/logout") {
    return new Response(null, { status: 302, headers: { location: "/login", "set-cookie": cookieHeader("", 0) } });
  }

  if (url.pathname === "/login") {
    if (request.method === "POST") {
      const form = await request.formData().catch(() => null);
      const given = String((form && form.get("password")) || "");
      // Compare HMACs so length and timing don't leak anything.
      const ok = same(await hmac(env.SESSION_SECRET, given), await hmac(env.SESSION_SECRET, env.APP_PASSWORD));
      if (!ok) {
        await new Promise((r) => setTimeout(r, 1500)); // slow down guessing
        return page("Wrong password.", 401);
      }
      return new Response(null, {
        status: 302,
        headers: { location: "/", "set-cookie": cookieHeader(await makeToken(env.SESSION_SECRET), MAX_AGE) },
      });
    }
    return page();
  }

  if (!(await validToken(env.SESSION_SECRET, getCookie(request, COOKIE)))) {
    if (url.pathname.startsWith("/api/") || url.pathname.startsWith("/data/")) {
      return new Response(JSON.stringify({ error: "unauthorized" }), {
        status: 401, headers: { "content-type": "application/json", "cache-control": "no-store" },
      });
    }
    return new Response(null, { status: 302, headers: { location: "/login" } });
  }

  // Signed in. The API functions expect the identity header that Cloudflare Access
  // would set, so replace anything the caller sent with the owner's address.
  const headers = new Headers(request.headers);
  const owner = (env.ALLOWED_EMAILS || "").split(",")[0].trim() || "owner@local";
  headers.set("Cf-Access-Authenticated-User-Email", owner);
  return next(new Request(request, { headers }));
}
