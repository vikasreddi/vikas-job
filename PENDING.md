# Pending tasks

Status: **setup only.** No job search, listing or applying until Vikas says to start (`config/search.json` → `hunt_active: false`).
Tick an item when its data arrives, and update the files it names.

## From Vikas: data
- [x] Current resume → `profile/base-resumes/vikas_resume.pdf`; profile files filled from it (15 Nov 2026)
- [x] Notice period: 0 days (15 Nov 2026)
- [ ] Target roles and which stack to lead with (Java/Spring Boot, Python/Django, Rails) → `config/search.json`
- [ ] Remote scope: India-remote only, or global remote too → `config/search.json`
- [ ] Current, expected and minimum CTC → `profile/answers.json`, `config/search.json`
- [ ] Approval mode: approve-first, hybrid or auto → `config/search.json`
- [ ] Answer bank gaps: years per technology, work authorisation, relocation, hybrid openness → `profile/answers.json`
- [ ] Personal projects to add (optional) → `profile/projects.md`
- [ ] Companies to exclude (already applied, not interested) → `config/search.json`

## From Vikas: setup
- [ ] Confirm the `vikas-job` repo is private
- [ ] Cloudflare: GitHub fine-grained token → Pages project → Access with your email (walkthrough in `docs-hosting.md`)
- [ ] Choose the address: free `vikas-job.pages.dev` or a custom domain
- [ ] Turn on the Gmail connector for the job-hunt chat
- [ ] job-bot: where the code lives, and whether it's installed and signed in on the Mac
- [ ] Reusable template: name of the other repo you have for it (and its licence)

## Claude: ready to build, not started
- [ ] Target company list with Greenhouse / Lever / Ashby board names (`config/companies.json`)
- [ ] Staffing and aggregator blocklist (`config/blocklist.json`)
- [ ] GitHub Action for the daily company-board fetch (disabled until start)
- [ ] Daily scheduled task (created only when Vikas says start)
- [ ] Dashboard v2: Interviews tab, action cards
- [ ] Sync step between job-bot and this repo (after reviewing job-bot's code)

## Standing rules from Vikas
- **Ask before updating any job-portal profile** (LinkedIn, Naukri, Instahyre, Wellfound, Cutshort or any other). Show the proposed change first; change nothing without a yes.
- **Don't search for or list jobs until Vikas says to start.**
