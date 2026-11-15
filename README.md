# vikas-job

Vikas's job hunt: a daily search for remote jobs at product companies, a tailored resume for each job, application tracking, and a private dashboard.

- `PENDING.md`: open tasks and standing rules (start here)
- `config/search.json`: what to search for (roles, stack, remote scope, platforms, exclusions). `hunt_active: false` until the hunt starts
- `profile/`: source material for resumes (about, experience, skills, projects, base resumes)
- `site/`: the dashboard. `site/data/*.json` is the data; `site/files/resumes/` holds tailored resume PDFs
- `CLAUDE.md`: data schemas and rules for the daily run

## How this site is hosted
Cloudflare Pages (root directory `site`) behind a password login (`site/functions/_middleware.js`, secrets `APP_PASSWORD` and `SESSION_SECRET`), so only Vikas can open it. Cloudflare Access (email PIN) is the stronger option if a card is added later. The data is read from and written to this private repo through Pages Functions. Full setup: [docs-hosting.md](docs-hosting.md).

Cloudflare Pages variables: `GITHUB_TOKEN` (secret), `GITHUB_REPO=vikasreddi/vikas-job`, `GITHUB_BRANCH=main`, `DATA_DIR=site/data`, `DATA_KEYS=jobs,applications,responses,daily_log`, `ALLOWED_EMAILS=<your email>`.

**Always pull before you push**: the dashboard and the daily run both commit to `main`.
