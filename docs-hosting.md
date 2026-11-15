# Host a private, editable dashboard: GitHub + Cloudflare Pages + Cloudflare Access

> **For Claude (or any AI assistant) reading this:** this file is a complete, from-scratch recipe.
> Follow it step by step to host a single-page web app (a dashboard, tracker, notes site, etc.) that:
> - is served free on Cloudflare Pages, on its own custom domain,
> - is private: only allowed email addresses can open it (one-time PIN login),
> - stores **all data as JSON files in a private GitHub repo**, with no database,
> - lets the owner **add, edit and delete** items from the website, with each save written back to GitHub as a commit.
>
> Ask the owner for the values in **Section 1** before you start. Never ask them to paste passwords or tokens into the chat. They enter secrets directly in the Cloudflare dashboard.
> Use the exact project names, file names and variable names below unless the owner asks otherwise.

This is the same setup used for Gokul's job-hunt dashboard (`gk-job` repo → `gk-job.pages.dev`), written generically so it can be reused for any project.

---

## 0. How it works (architecture)

```
             ┌──────────── Browser (owner) ────────────┐
             │  https://app.example.com                │
             │  index.html (single page, plain JS)     │
             └──────────────┬──────────────────────────┘
                            │ 1. Cloudflare Access: email one-time PIN
                            ▼
┌────────────────── Cloudflare Pages project ──────────────────┐
│ Static files (from GitHub, folder "site/")                   │
│   index.html, _headers, data/*.json (read-only copy)         │
│ Pages Functions (folder "site/functions/")                   │
│   GET  /api/data         → reads every data/*.json from GitHub│
│   PUT  /api/data/<key>   → writes data/<key>.json to GitHub   │
│   GET  /api/health       → reports config problems            │
│ Secret env vars: GITHUB_TOKEN, GITHUB_REPO, GITHUB_BRANCH ... │
└──────────────┬───────────────────────────────────────────────┘
               │ GitHub REST API (fine-grained token, 1 repo only)
               ▼
┌────────── Private GitHub repo ──────────┐
│ site/data/tasks.json, items.json, ...   │  ← the "database"
│ every website save = 1 commit           │
└─────────────────────────────────────────┘
```

**Why this design**
- **Free and serverless.** There's no VM, no database and no server to patch.
- **Git is the database.** You get full history, diffs and undo for free, and the data is easy to edit by hand or with an AI.
- **Private.** Cloudflare Access sits in front of the whole site, functions included. A visitor who isn't on the allowed list never reaches the page.
- **The secret stays on the server.** The GitHub token lives only in Cloudflare's encrypted environment variables. It never ships to the browser and is never committed.

**Data flow**
1. **Loading.** The page calls `GET /api/data`. The function reads every `site/data/*.json` from GitHub through the Contents API and returns `{ key: { rows, sha } }` plus the signed-in user's email.
2. **Saving from the website.** After an add, edit or delete, the page sends `PUT /api/data/<key>` with `{ rows, sha }`. The function commits the new file to GitHub with the message `Dashboard: <action> [CI Skip]`.
   - `sha` is the file version the page last loaded. If someone changed the file in between, GitHub returns 409 and the page must reload and retry. This stops two saves from silently overwriting each other.
   - `[CI Skip]` tells Cloudflare Pages **not** to rebuild for data-only commits. A rebuild isn't needed, because the function always reads live from GitHub.
3. **Editing locally (you or an AI).** Edit the JSON or code in the repo, commit and push. Cloudflare Pages rebuilds automatically, in about a minute.
4. **Fallback.** If `/api/data` fails, the page loads the static copies at `data/<key>.json` (as they were at the last deploy) in **read-only** mode and shows a banner explaining why.

**Syncing rule (important).** Website saves are commits on GitHub, so **always pull before you push local changes**. In GitHub Desktop: *Fetch origin → Pull origin → (merge) → Push origin*. On the command line: `git pull --rebase && git push`.

---

## 1. Values to collect from the owner (ask first)

| Value | Example | Notes |
|---|---|---|
| Project name | `my-tracker` | Used for the repo name and the Pages project name |
| GitHub account | `octocat` | The owner creates the repo themselves |
| Allowed email(s) | `me@gmail.com` | People who may open the site |
| Custom domain | `example.com` → site at `app.example.com` | Optional. Without it the site is `<project>.pages.dev` |
| Data collections | `tasks`, `notes`, `links` | Each becomes `site/data/<key>.json` (an array of objects with an `id`) |
| Domain registrar | Cloudflare Registrar, Namecheap, GoDaddy… | Only if buying a new domain |

Accounts the owner needs (all free tiers are enough): **GitHub**, **Cloudflare**. A domain costs money (about ₹800–1,500 a year for a `.com`). Everything else is free.

---

## 2. Repository layout

Create this in a new **private** GitHub repo:

```
<project>/
├── README.md
└── site/                      ← Cloudflare Pages "root directory"
    ├── index.html             ← the whole app (HTML + CSS + JS in one file)
    ├── _headers               ← security headers
    ├── data/
    │   ├── tasks.json         ← [] to start
    │   └── notes.json
    └── functions/
        ├── _shared.js
        └── api/
            ├── health.js
            ├── data/
            │   ├── index.js   ← GET  /api/data
            │   └── [key].js   ← PUT  /api/data/<key>
```

Pages Functions are discovered automatically from `site/functions/` because `site/` is the root directory. No build step and no `package.json` are needed.

### 2.1 `site/_headers`

```
/*
  X-Robots-Tag: noindex, nofollow
  X-Frame-Options: DENY
  Referrer-Policy: no-referrer
  X-Content-Type-Options: nosniff
/data/*
  Cache-Control: no-cache
```

If you later need to show a file from your own site inside an iframe (for example a PDF viewer), override the frame rule only for that folder:

```
/files/*
  ! X-Frame-Options
  X-Frame-Options: SAMEORIGIN
```

### 2.2 `site/functions/_shared.js`

```js
// Helpers shared by all API functions.
const GH = "https://api.github.com";

export const KEYS = (env) =>
  (env.DATA_KEYS || "tasks,notes").split(",").map(s => s.trim()).filter(Boolean);

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
```

### 2.3 `site/functions/api/data/index.js` (GET all data)

```js
import { KEYS, json, readFile, userEmail, allowed } from "../../_shared.js";

export async function onRequestGet({ request, env }) {
  if (!allowed(request, env)) return json({ error: "forbidden" }, 403);
  const out = { user: userEmail(request) };
  await Promise.all(KEYS(env).map(async (k) => { out[k] = await readFile(env, k); }));
  return json(out);
}
```

### 2.4 `site/functions/api/data/[key].js` (PUT one collection)

```js
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
```

### 2.5 `site/functions/api/health.js`

```js
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
```

### 2.6 Client side: what `index.html` must do

Keep the app one self-contained file (inline CSS and JS, no build tools). The data layer needs:

```js
const KEYS = ["tasks", "notes"];            // same list as DATA_KEYS
const state = { data: {}, sha: {}, canWrite: false };

async function load() {
  try {
    const r = await fetch("/api/data", { headers: { accept: "application/json" } });
    if (!r.ok) throw new Error("api " + r.status);
    const j = await r.json();
    for (const k of KEYS) { state.data[k] = j[k]?.rows || []; state.sha[k] = j[k]?.sha || null; }
    state.canWrite = true;
  } catch (e) {
    // Read-only fallback: static copies deployed with the site
    const v = Date.now();
    for (const k of KEYS) state.data[k] = await fetch(`data/${k}.json?v=${v}`).then(r => r.ok ? r.json() : []).catch(() => []);
    state.canWrite = false;
    showBanner("Read-only copy: saving is unavailable. Open /api/health to see why.");
  }
  render();
}

async function save(key, message) {
  const r = await fetch(`/api/data/${key}`, {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ rows: state.data[key], sha: state.sha[key], message }),
  });
  if (r.status === 409) {                       // someone else saved first
    const { latest } = await r.json();
    alertUser("This list changed elsewhere. Reloaded the latest copy. Please redo your last change.");
    state.data[key] = latest.rows; state.sha[key] = latest.sha; render(); return false;
  }
  if (!r.ok) { alertUser("Save failed (" + r.status + ")"); return false; }
  state.sha[key] = (await r.json()).sha;
  return true;
}
```

Rules for the UI:
- Every row has a stable `id` string. Edit and delete by `id`, never by array index.
- Hide add/edit/delete buttons when `state.canWrite` is false.
- Store only UI preferences (last tab, filters, theme) in `localStorage`, inside `try/catch`. Never store real data there.
- Escape every value before putting it into HTML (an `esc()` helper), because data can be edited by hand.

---

## 3. Step-by-step setup from scratch

### Step 1: GitHub repo
1. The owner creates a **private** repo, e.g. `github.com/<owner>/<project>`, with default branch `main`.
2. Add the files from Section 2 and commit with message `Initial dashboard`. Push.

### Step 2: GitHub fine-grained token (the owner does this; never paste it in chat)
1. GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token**.
2. **Repository access:** *Only select repositories* → pick this repo only.
3. **Permissions → Repository permissions → Contents: Read and write.** Metadata (read) is added automatically. Nothing else.
4. Expiration: up to 1 year. Put a calendar reminder to renew it. When it expires, saving stops and `/api/health` will say so.
5. Copy the token for Step 3 and keep it nowhere else.

### Step 3: Cloudflare Pages project
1. Cloudflare dashboard → **Workers & Pages → Create → Pages → Connect to Git** → authorise GitHub → choose the repo.
2. Build settings:
   - Framework preset: **None**
   - Build command: *(leave empty)*
   - Build output directory: **`.`**
   - Root directory (advanced): **`site`**
3. **Settings → Variables and Secrets** (Production; add the same to Preview if you use preview branches):

   | Name | Type | Value |
   |---|---|---|
   | `GITHUB_TOKEN` | **Secret** | token from Step 2 |
   | `GITHUB_REPO` | Text | `<owner>/<project>` |
   | `GITHUB_BRANCH` | Text | `main` |
   | `DATA_DIR` | Text | `site/data` |
   | `DATA_KEYS` | Text | `tasks,notes` (your collections) |
   | `ALLOWED_EMAILS` | Text | `me@gmail.com` (comma-separated) |
   | `COMMIT_NAME` / `COMMIT_EMAIL` | Text | name and email to show on website commits (optional) |

4. **Deployments → Retry deployment**, so the variables take effect. The site is now at `https://<project>.pages.dev`, but it's **not private yet**. Do Step 4 immediately.

### Step 4: Make it private with Cloudflare Access (free for up to 50 users)
1. Cloudflare dashboard → **Zero Trust**. The first time, choose a team name and the **Free** plan; no card should be needed for Free.
2. **Settings → Authentication → Login methods:** make sure **One-time PIN** is enabled.
3. **Access → Applications → Add an application → Self-hosted.**
   - Name: `<project>`
   - Application domain: `<project>.pages.dev`. Add a second destination `*.<project>.pages.dev` so preview URLs are protected too. If you set up a custom domain (Step 5), add `app.example.com` as well.
   - Session duration: e.g. 1 month.
4. **Policy:** Action **Allow**, Include → **Emails** → the owner's email(s). Save.
5. Test in a private window: opening the site should show the Cloudflare login, then ask for an email, then email a 6-digit code. Only listed emails get in.

> A shortcut: Pages project → **Settings → General → Access policy → Enable** creates an Access app for the preview URLs. You still need Step 4 for the production `pages.dev` and custom domains.

### Step 5: Separate custom domain (optional)
1. **Buy a domain.** The easiest is **Cloudflare → Domain Registration → Register Domains**, sold at cost, and DNS is set automatically. If bought elsewhere (Namecheap, GoDaddy…): Cloudflare → **Add a domain** → Free plan → Cloudflare shows 2 nameservers → at the registrar, replace the nameservers with those two → wait until Cloudflare shows the domain as **Active**. This usually takes minutes, sometimes up to 24 hours.
2. Pages project → **Custom domains → Set up a custom domain** → `app.example.com` (or the bare `example.com`). Cloudflare creates the DNS record and SSL certificate automatically.
3. Add the same hostname to the Access application in Step 4.3. **Never leave a public hostname unprotected.**
4. Optional: in Pages, redirect `<project>.pages.dev` to the custom domain, or keep both behind Access.

### Step 6: Verify end to end
- Open `https://app.example.com` (or the pages.dev URL) → sign in with a PIN → the page loads with live data.
- Open `/api/health` → it should show `{"ok":true,"problems":[]}`.
- Add an item on the website → a new commit `Dashboard: … [CI Skip]` appears on GitHub, and **no** new Pages build starts.
- Edit a JSON file locally, then pull, commit and push → Pages builds in about a minute → refresh the page to see it.
- In a private window with a non-allowed email → access is denied.

---

## 4. Day-to-day workflow

| Task | How |
|---|---|
| Change data from anywhere | Use the website. It saves straight to GitHub. |
| Change code or design | Edit `site/index.html` locally → **pull first** → commit → push. Pages auto-deploys. |
| Bulk data change (by an AI) | Pull → edit `site/data/*.json` → validate JSON (`python3 -m json.tool file.json`) → commit → push. |
| Undo a bad save | GitHub → file history → revert that commit, or `git revert <sha>`. |
| Add a new collection | Create `site/data/<key>.json` with `[]` → add `<key>` to `DATA_KEYS` (Cloudflare) and `KEYS` (index.html) → redeploy. |
| Token expired | Make a new fine-grained token (Step 2) → update the `GITHUB_TOKEN` secret → retry the deployment. |
| Add another viewer | Add their email to the Access policy and to `ALLOWED_EMAILS`. |

**Git tips on a Mac folder shared with an AI sandbox:** if git leaves `.git/*.lock` files behind ("File exists" errors), move them aside: `for f in .git/*.lock; do mv "$f" "$f.old"; done`. Never commit secrets, `.env` files or tool caches. Add them to `.gitignore`.

---

## 5. Limits and costs (check current docs; these change)

- **Cloudflare Pages Free:** unlimited static requests and bandwidth, 500 builds a month, a 25 MiB maximum per file, and 20,000 files per site. Pages Functions count against the Workers Free daily request quota (about 100,000 requests a day), far beyond personal use.
- **Cloudflare Access (Zero Trust Free):** up to 50 users.
- **GitHub API:** 5,000 requests an hour per token, fine for one person. The Contents API only returns file content inline up to 1 MB (the helper above falls back to the blob API), and files over 100 MB can't be stored at all.
- **Large files (PDFs, images):** commit them under `site/files/` and they're served as static files. Keep each under 25 MiB, or Pages will reject the deploy.

---

## 6. Security checklist

- [ ] Repo is **private**.
- [ ] Token is fine-grained, limited to **one repo**, with **Contents read/write only**, and has an expiry date.
- [ ] Token is stored only as a Cloudflare **Secret**: never in code, chat, screenshots or commits.
- [ ] Access protects **every** hostname: `<project>.pages.dev`, `*.<project>.pages.dev` (previews) and custom domains.
- [ ] `ALLOWED_EMAILS` is set (a second check inside the functions).
- [ ] `_headers` blocks framing and indexing.
- [ ] The page escapes all data before rendering it as HTML.

---

## 7. Instructions for the AI doing the setup

1. Ask for the Section 1 values in one message. Don't ask for the token. The owner pastes it into Cloudflare themselves.
2. Create the files in Section 2 with the owner's collection names. Start each data file as `[]` or with sample rows the owner provides.
3. Walk the owner through Steps 2–5 one at a time, waiting for "done" after each. Cloudflare and GitHub screens can only be clicked by the owner, or by you through their browser **only if they allow it**. Never type passwords or one-time codes for them.
4. Run the Step 6 checks and report the results honestly, including anything that didn't work.
5. Afterwards, add a short "How this site is hosted" section to the new project's README, pointing to this file.
