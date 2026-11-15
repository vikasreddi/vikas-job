import { KEYS, json, writeFile, readFile, userEmail, allowed } from "../../_shared.js";

export async function onRequestPut({ request, env, params }) {
  if (!allowed(request, env)) return json({ error: "forbidden" }, 403);
  const key = params.key;
  if (!KEYS(env).includes(key)) return json({ error: "unknown key" }, 400);

  let body;
  try { body = await request.json(); } catch { return json({ error: "bad json" }, 400); }
  const { rows, sha, message } = body || {};
  if (!Array.isArray(rows)) return json({ error: "rows must be an array" }, 400);
  if (JSON.stringify(rows).length > 2_000_000) return json({ error: "too large" }, 413);

  const res = await writeFile(env, key, rows, sha, message || `Dashboard: update ${key}`, userEmail(request));
  if (res.conflict) {
    const latest = await readFile(env, key);
    return json({ error: "conflict", latest }, 409);   // client reloads and re-applies the edit
  }
  return json({ ok: true, sha: res.sha });
}
