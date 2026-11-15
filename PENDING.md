# Pending tasks

Status: **setup only.** No job search, listing or applying until Vikas says to start (`config/search.json` → `hunt_active: false`).
Tick an item when its data arrives, and update the files it names.

## From Vikas: data
- [x] Current resume → `profile/base-resumes/vikas_resume.pdf`; profile files filled from it (15 Nov 2026)
- [x] Notice period: 0 days (15 Nov 2026)
- [x] Target roles: backend engineer roles only (15 Nov 2026)
- [ ] Which stack to lead with (Java/Spring Boot, Python/Django, Rails) → `config/search.json`
- [x] Remote scope: global remote (15 Nov 2026)
- [x] CTC: current 16.5 LPA, expected 20+ LPA (15 Nov 2026)
- [ ] Minimum acceptable CTC (optional) → `profile/answers.json`, `config/search.json`
- [x] Approval mode: approve-first (15 Nov 2026)
- [ ] Answer bank gaps: years per technology, work authorisation, relocation, hybrid openness → `profile/answers.json`
- [ ] Personal projects to add: later, per Vikas → `profile/projects.md`
- [x] Excluded: Learnyst, LTIMindtree (15 Nov 2026). More can be added any time


## From Vikas: setup
- [ ] Confirm the `vikas-job` repo is private
- [x] Cloudflare Pages project `vikas-job` deployed, GitHub token + variables set (token expires 2027-02-13: renew)
- [x] (done 2026-11-15; password is weak and was shared in chat, change it soon) Vikas: add Cloudflare secrets `APP_PASSWORD` (long password) and `SESSION_SECRET` (random 40+ chars), then redeploy. Site stays locked until both exist
- [ ] Optional later: Cloudflare Access (needs a card on file even for Free) to replace the password login
- [x] Address: free `vikas-job.pages.dev`, no custom domain (15 Nov 2026)
- [ ] Turn on the Gmail connector for the job-hunt chat
- [ ] job-bot: where the code lives, and whether it's installed and signed in on the Mac
- [ ] Reusable template: name of the other repo you have for it (and its licence)

## Claude: ready to build, not started
- [ ] Target company list with Greenhouse / Lever / Ashby board names (`config/companies.json`)
- [ ] Staffing and aggregator blocklist (`config/blocklist.json`)
- [ ] GitHub Action for the daily company-board fetch (disabled until start)
- [ ] Daily scheduled task (created only when Vikas says start)
- [x] Dashboard: today's update card, search by company/role, newest/oldest/day filters, per-application Add update with history (15 Nov 2026)
- [ ] Dashboard v2: Interviews tab, action cards
- [ ] Sync step between job-bot and this repo (after reviewing job-bot's code)

## Standing rules from Vikas
- **Ask before updating any job-portal profile** (LinkedIn, Naukri, Instahyre, Wellfound, Cutshort or any other). Show the proposed change first; change nothing without a yes.
- **Don't search for or list jobs until Vikas says to start.**
