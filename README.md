# vikas-job

Vikas's job hunt: a daily search for remote jobs at product companies, a tailored resume for each job, application tracking, and a private dashboard.

- `config/search.json`: what to search for (roles, stack, remote scope, platforms, exclusions)
- `profile/`: source material for resumes (about, experience, skills, projects, base resumes)
- `site/`: the dashboard. `site/data/*.json` is the data; `site/files/resumes/` holds tailored resume PDFs
- `CLAUDE.md`: data schemas and rules for the daily run

## How this site is hosted
Cloudflare Pages (root directory `site`) with Cloudflare Access in front, so only allowed emails can open it. The data is read from and written to this private repo through Pages Functions. Full setup: [docs-hosting.md](docs-hosting.md).

Cloudflare Pages variables: `GITHUB_TOKEN` (secret), `GITHUB_REPO=vikasreddi/vikas-job`, `GITHUB_BRANCH=main`, `DATA_DIR=site/data`, `DATA_KEYS=jobs,applications,responses,daily_log`, `ALLOWED_EMAILS=<your email>`.

**Always pull before you push**: the dashboard and the daily run both commit to `main`.
