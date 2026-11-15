# vikas-job: instructions for Claude

This repo runs Vikas's job hunt: a daily search for remote jobs at product companies, a tailored resume for each job, application tracking, and a private dashboard (Cloudflare Pages + Access; see `docs-hosting.md`).

## Layout
- `config/search.json`: target roles, stack, remote scope, exclusions, platforms, daily target, apply mode.
- `profile/`: Vikas's source material (about, skills, projects, experience) and `base-resumes/`. **Tailored resumes may only use facts found here.** Never invent experience, numbers, employers or skills.
- `site/`: the dashboard (Cloudflare Pages root). `site/index.html` is the whole app.
- `site/data/*.json`: the database. Each file is an array of objects with a stable string `id`.
- `site/files/resumes/`: tailored resume PDFs, linked from applications (served behind Access).

## Data schemas
`jobs.json`: one entry per job posting found
```json
{ "id": "j-2026-11-15-acme-backend", "found_on": "2026-11-15", "company": "Acme", "role": "Backend Engineer",
  "url": "https://...", "source": "LinkedIn", "location": "Remote (India)", "remote_scope": "india",
  "stack": ["Ruby", "Postgres"], "salary": "", "match_score": 82, "match_notes": "why it fits / gaps",
  "status": "new" }
```
`status` values for jobs: `new` → `approved` (Vikas OK'd it on the dashboard) or `skipped` → `applied`.

`applications.json`: one entry per application submitted
```json
{ "id": "a-acme-backend", "job_id": "j-...", "company": "Acme", "role": "Backend Engineer", "url": "https://...",
  "source": "LinkedIn", "applied_on": "2026-11-15", "resume_file": "files/resumes/acme-backend.pdf",
  "status": "applied", "last_update": "2026-11-15", "next_followup": "2026-11-22", "notes": "",
  "history": [ { "date": "2026-11-15", "status": "applied", "note": "Easy Apply" } ] }
```
`status` values for applications: `applied`, `viewed`, `in_touch`, `assessment`, `interview`, `offer`, `rejected`, `no_response`, `withdrawn`.

`responses.json`: one entry per reply (email, LinkedIn, Naukri…)
```json
{ "id": "r-2026-11-18-acme", "application_id": "a-acme-backend", "date": "2026-11-18", "channel": "email",
  "from": "recruiter@acme.com", "type": "interview", "summary": "Invite to a 30-min screening call" }
```
`type`: `reply`, `assessment`, `interview`, `rejection`, `offer`, `other`.

`daily_log.json`: one entry per daily run
```json
{ "id": "d-2026-11-15", "date": "2026-11-15", "jobs_found": 14, "applied": 6, "responses": 1,
  "summary": "short human summary of the day", "problems": "" }
```

## Rules
- **Start switch:** while `config/search.json` → `hunt_active` is `false`, do not search for, list, score or apply to any job. Only setup and planning. Vikas flips it when he says to start.
- **Job-portal profiles:** never edit Vikas's profile on LinkedIn, Naukri, Instahyre, Wellfound, Cutshort or any other portal without asking first. Show the proposed change and wait for a yes. (Naukri's daily resume re-upload counts as a profile change: it also needs his OK before it's switched on.)
- Open items live in `PENDING.md`; tick them as data arrives and update the files they name.
- Edit and delete by `id`, never by array index. Keep JSON valid (`python3 -m json.tool file.json`).
- Remove duplicates: the same company + role posted on several sites is one job (keep the best link, note the other sources).
- Product companies only, remote only (check the description; drop hybrid or onsite "remote" posts).
- Never submit an application unless `config/search.json` → `apply_mode` allows it (`approve-first` means only jobs with status `approved`).
- Never type passwords or one-time codes. If a site needs a login Claude can't use, mark the job and say so in the daily log.
- Commit message for data runs: `Daily run YYYY-MM-DD: N found, N applied, N responses`. Always pull before pushing (the dashboard also commits).
- Data files keep personal info; the repo must stay private.
