import { KEYS, json, readFile, userEmail, allowed } from "../../_shared.js";

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return json({ error: "forbidden" }, 403);
  const out = { user: userEmail(request) };
  await Promise.all(KEYS(env).map(async (k) => { out[k] = await readFile(env, k); }));
  return json(out);
}
