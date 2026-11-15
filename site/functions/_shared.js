// Helpers shared by all API functions.
const GH = "https://api.github.com";

export const KEYS = (env) =>
  (env.DATA_KEYS || "jobs,applications,responses,daily_log").split(",").map(s => s.trim()).filter(Boolean);

export function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

// Email of the person Cloudflare Access let in.
export function userEmail(request) {
  return request.headers.get("Cf-Access-Authenticated-User-Email") || "";
}

// Defence in depth: Access already blocks everyone else; this double-checks.
export function allowed(request, env) {
  const list = (env.ALLOWED_EMAILS || "").toLowerCase().split(",").map(s => s.trim()).filter(Boolean);
  const me = userEmail(request).toLowerCase();
  return list.length === 0 ? !!me : list.includes(me);
}

function ghHeaders(env) {
  return {
    authorization: `Bearer ${env.GITHUB_TOKEN}`,
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
    "user-agent": "pages-dashboard",
  };
}

const path = (env, key) => `${env.DATA_DIR || "site/data"}/${key}.json`;

// UTF-8 safe base64 (data may contain non-English text).
const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str); let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);   // chunked so large files don't overflow the call stack
};
const b64decode = (b64) =>
  new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, "")), c => c.charCodeAt(0)));

export async function readFile(env, key) {
  const url = `${GH}/repos/${env.GITHUB_REPO}/contents/${path(env, key)}?ref=${env.GITHUB_BRANCH || "main"}`;
  const r = await fetch(url, { headers: ghHeaders(env) });
  if (r.status === 404) return { rows: [], sha: null };
  if (!r.ok) throw new Error(`GitHub read ${key}: ${r.status}`);
  const j = await r.json();
  // Contents API returns content only for files up to 1 MB; use the blob API for bigger files.
  let text = j.content ? b64decode(j.content) : "";
  if (!text && j.git_url) {
    const b = await (await fetch(j.git_url, { headers: ghHeaders(env) })).json();
    text = b64decode(b.content);
  }
  return { rows: JSON.parse(text || "[]"), sha: j.sha };
}

export async function writeFile(env, key, rows, sha, message, email) {
  const url = `${GH}/repos/${env.GITHUB_REPO}/contents/${path(env, key)}`;
  const body = {
    message: `${message} [CI Skip]`,          // don't rebuild Pages for data-only commits
    content: b64encode(JSON.stringify(rows, null, 2) + "\n"),
    branch: env.GITHUB_BRANCH || "main",
    committer: { name: env.COMMIT_NAME || "Dashboard", email: env.COMMIT_EMAIL || email || "dashboard@users.noreply.github.com" },
  };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: "PUT", headers: ghHeaders(env), body: JSON.stringify(body) });
  if (r.status === 409 || r.status === 422) return { conflict: true };
  if (!r.ok) throw new Error(`GitHub write ${key}: ${r.status} ${await r.text()}`);
  const j = await r.json();
  return { sha: j.content.sha };
}
