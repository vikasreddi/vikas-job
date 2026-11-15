# vikas-job

Vikas's job hunt: a daily search for remote jobs at product companies, a tailored resume for each job, application tracking, and a private dashboard.

- `PENDING.md`: open tasks and standing rules (start here)
- `config/search.json`: what to search for (roles, stack, remote scope, platforms, exclusions). `hunt_active: false` until the hunt starts
- `profile/`: source material for resumes (about, experience, skills, projects, base resumes)
- `site/`: the dashboard. `site/data/*.json` is the data; `site/files/resumes/` holds tailored resume PDFs
- `CLAUDE.md`: data schemas and rules for the daily run

## How this site is hosted
Cloudflare Pages (root directory `site`) behind a password login (`site/functions/_middleware.js`, secrets `APP_PASSWORD` and `SESSION_SECRET`), so only Vikas can open it. Cloudflare Access (email PIN) is the stronger option if a card is added later. The data is read from and written to this private repo through Pages Functions. Full setup: [docs-hosting.md](docs-hosting.md).

Cloudflare Pages variables: `GITHUB_TOKEN` (secret), `GITHUB_REPO=vikasreddi/vikas-job`, `GITHUB_BRANCH=main`, `DATA_DIR=site/data`, `DATA_KEYS=jobs,applications,responses,daily_log`, `ALLOWED_EMAILS=<your email>`, plus the secrets `APP_PASSWORD` and `SESSION_SECRET` (login gate).

### Change the login password or rotate secrets
Do this in your own browser, never while an assistant can see the screen, and never paste secrets into a chat.
1. Cloudflare dashboard → Workers & Pages → `vikas-job` → Settings → Variables and secrets → Edit.
2. Click into the value box of `APP_PASSWORD` (it shows "Value encrypted") and type the new password. Use a passphrase of 4+ unrelated words or 16+ random characters. The login only delays each wrong guess by 1.5 s, so length matters.
3. Optionally replace `SESSION_SECRET` with fresh random characters (16+, ideally 32+). This signs out every device.
4. Click Save.
5. Deployments → the `...` menu on the latest deployment → Retry deployment. Secrets only apply to a new deployment.
6. Open the site and sign in with the new password; the old one must be rejected.

### Renew or replace the GitHub token (`GITHUB_TOKEN`)
The fine-grained token `vikas-job-dashboard` is limited to this repo (Contents: read and write) and expires on 2027-02-13.
1. GitHub → Settings → Developer settings → Fine-grained tokens → `vikas-job-dashboard` → Regenerate token (or create a new one with the same limits).
2. Copy it with the copy icon (it is shown only once).
3. Edit `GITHUB_TOKEN` in Cloudflare, paste it, Save, then retry the deployment as above.
4. Open `/api/health` while signed in: it should show `{"ok":true,"problems":[]}`.

If the site shows "Locked", `APP_PASSWORD` or `SESSION_SECRET` is missing.

**Always pull before you push**: the dashboard and the daily run both commit to `main`.
