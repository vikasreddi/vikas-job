import { json } from "../_shared.js";

export async function onRequestGet({ env }) {
  const problems = [];
  if (!env.GITHUB_TOKEN) problems.push("GITHUB_TOKEN is not set in Cloudflare Pages → Settings → Variables and Secrets.");
  if (!env.GITHUB_REPO) problems.push("GITHUB_REPO is not set (format owner/repo).");
  if (env.GITHUB_TOKEN && env.GITHUB_REPO) {
    const r = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}`, {
      headers: { authorization: `Bearer ${env.GITHUB_TOKEN}`, "user-agent": "pages-dashboard" },
    });
    if (!r.ok) problems.push(`GitHub says ${r.status} for ${env.GITHUB_REPO}: token expired, wrong repo, or token lacks access.`);
  }
  return json({ ok: problems.length === 0, problems });
}
