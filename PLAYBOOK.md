# TicketHub — Project Playbook (do-it-yourself runbook)

A complete, repeatable guide to everything in this project: setup, code, tests, Postman,
Git workflow, CI/CD, AWS deployment, Jira, and how to spin up the next assignment.
Follow top to bottom the first time; use the cheat sheet at the end afterwards.

---

## 0. What this project is

**TicketHub** — an event‑ticketing web app (MERN stack).

- **Backend**: Node.js + Express + MongoDB (Mongoose), JWT auth.
- **Frontend**: React 18 + Vite + React Router + Axios.
- **Infra**: Terraform (2 AWS EC2: app + MongoDB) driven by GitHub Actions.
- **Quality**: 40 Mocha/Chai unit tests, a Postman collection (32 requests).

Repos & folders:

| Assignment | Local folder | GitHub repo |
|---|---|---|
| Assignment 2 | `D:\SDLC\assignmnet_2` | `github.com/irasiii/event-ticket_2` |
| Assignment 3 | `D:\SDLC\assignment_3` | `github.com/irasiii/event-ticket_3` |
| (original/A1) | `D:\QUT\...\assignment_1` | `github.com/irasiii/event-ticket` |

---

## 1. Accounts & tools you need (one‑time)

1. **Node.js 20 LTS** and **npm** — https://nodejs.org
2. **Git** — https://git-scm.com
3. **MongoDB** — either a free **MongoDB Atlas** cloud cluster, or local MongoDB Community Server.
4. **GitHub account** + a **Personal Access Token (PAT)** with `repo` scope (for pushing).
5. **AWS account** + an **IAM user** with EC2/VPC permissions (access key + secret).
6. **Terraform ≥ 1.6** and **AWS CLI** (only if you provision from your machine).
7. **Postman** (desktop app) for API testing.
8. **Jira** (Atlassian) — the `SCRUM` project / board.

> Keep all tokens/keys OUT of git. Store them in a local `.env` (gitignored) or GitHub Secrets.

---

## 2. Get the code running locally

```bash
# clone
cd D:\SDLC
git clone https://github.com/irasiii/event-ticket_3.git assignment_3
cd assignment_3

# backend
cd backend
copy .env.example .env          # then edit .env (see below)
npm install
npm run seed                    # loads sample users/events (needs MONGO_URI)
npm run dev                     # API on http://localhost:5000

# frontend (new terminal)
cd ../frontend
npm install
npm run dev                     # app on http://localhost:5173
```

### backend/.env (create from .env.example)
```
PORT=5000
MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/event_ticketing
JWT_SECRET=<a-long-random-string>
JWT_EXPIRE=24h
NODE_ENV=development
```

**Seeded logins** (from `backend/seed.js`): admin `admin@tickets.com / admin123`,
user `john@example.com / user123`.

---

## 3. The database

There is **no database bundled** with the code — `MONGO_URI` points to wherever your data lives.

- **Cloud (recommended, matches config):** create a free cluster at MongoDB Atlas →
  Database Access (create user) → Network Access (allow your IP) → copy the connection
  string into `MONGO_URI`.
- **Local:** install MongoDB, use `MONGO_URI=mongodb://localhost:27017/event_ticketing`.

Then `npm run seed` populates categories, venues, users, and events.

---

## 4. Backend structure (where things live)

```
backend/
  server.js            # Express app, route mounting, error handler
  config/db.js         # Mongo connection
  models/              # Mongoose schemas: User, Event, Venue, Category, Booking
  routes/              # *Routes.js — map URLs to controllers + middleware
  controllers/         # request/response + persistence
  middleware/          # auth.js (JWT) , admin.js (role guard)  <- Chain of Responsibility
  services/
    bookingService.js  # pure, testable booking logic (validate/price/seats)
  domain/              # OOP layer
    User.js Admin.js Member.js Guest.js UserFactory.js
  patterns/            # design patterns
    Logger.js                 # Singleton
    PaymentAdapter.js         # Adapter (+ getPaymentGateway factory)
    cancellationStrategy.js   # Strategy
    BookingNotifier.js        # Observer
    BookingFacade.js          # Facade (orchestrates the booking flow)
    ticketPricing.js          # Decorator
    EventPrototype.js         # Prototype
    AnalyticsProxy.js         # Proxy
  test/                # Mocha/Chai unit tests
  seed.js              # sample data loader
```

OOP principles live in `domain/` (encapsulation via `#private` fields, inheritance,
polymorphism). Design patterns live in `patterns/`. See the docx reports for details.

---

## 5. Run the unit tests

```bash
cd backend
npm test                 # runs all 40 tests (mocha --recursive)
# focused run:
npx mocha --grep "Adapter pattern"
```
Tests are **DB‑free** (they test pure logic), so they run in milliseconds.
Expect: **40 passing**.

To capture a pass screenshot, run `npm test` in your terminal and screenshot the output.

---

## 6. Postman API testing

1. Open Postman → **Import** → select both files in `postman/`:
   - `TicketHub.postman_collection.json` (32 requests)
   - `TicketHub.postman_environment.json`
2. Select the **TicketHub Local** environment (top‑right).
3. Start the backend (`npm run dev`) and seed the DB.
4. Run **Auth → Login** first (it saves the JWT to a variable automatically).
5. Use **Collection Runner** to run the whole collection; each request has a test script
   that asserts the status and saves ids for chaining.
6. **Export for submission:** the two JSON files in `postman/` are the export.

`baseUrl` = `http://localhost:5000` locally, or `http://<app-public-ip>` once deployed.

---

## 7. Git workflow (branch per task → main → production)

This is a **feature‑branch + environment‑promotion** flow (lightweight GitFlow):

```
feature/*  --PR-->  main (CI gate)  --PR-->  production (deploy)
```

### Branches we use
`feature/oop-principles`, `feature/design-patterns`, `feature/unit-testing`,
`feature/postman-tests`, `feature/aws-cicd`, `docs/assignment3`.

### Create a feature branch and push
```bash
git checkout main
git checkout -b feature/oop-principles
# ...make changes, then add ONLY the files for this task (never `git add -A`
# if you have line-ending noise)...
git add backend/domain/ backend/controllers/authController.js
git commit -m "feat(oop): user hierarchy + factory"
git push -u origin feature/oop-principles
```

### Merge into main (one by one)
1. On GitHub, open a **Pull Request**: base = `main`, compare = the feature branch.
2. **CI runs automatically** (`ci.yml`): backend tests + frontend build. Wait for green.
3. Review, then **Merge pull request**.
4. Repeat for each branch. Merge code branches in order
   (oop → design-patterns → unit-testing) so tests have their code.

### Promote main → production (deploy)
1. Open a PR: base = `production`, compare = `main`.
2. `deploy.yml` runs `terraform plan` and posts it as a PR comment (review it).
3. Merge → push to `production` triggers `redeploy.yml` (SSH pull + rebuild + pm2 restart).

### CLI shortcut (needs `gh auth login`)
```bash
gh pr create --base main --head feature/oop-principles --fill
gh pr merge feature/oop-principles --merge --delete-branch
```

---

## 8. CI/CD pipelines (what runs when)

| Workflow | Trigger | Does |
|---|---|---|
| `.github/workflows/ci.yml` | PR to `main`; push to `main`/`develop` | mongo:6 service + `npm test` (40) + frontend build |
| `.github/workflows/deploy.yml` | PR to `production`; manual `workflow_dispatch` | `terraform plan` (PR comment); manual `apply`/`destroy` provisions/destroys EC2s |
| `.github/workflows/redeploy.yml` | push to `production`; manual | SSH to App EC2 → pull + build + `pm2 restart` |

`main` = Continuous Integration. `production` = Continuous Deployment. Terraform **apply**
is a deliberate manual gate.

---

## 9. AWS deployment

### Architecture
Two free‑tier EC2 (Amazon Linux 2023, t2.micro):
- **App server**: nginx :80 (serves React, proxies `/api`), Node API :5000 under PM2.
- **MongoDB server**: MongoDB 7.0 :27017, reachable **only** from the app's security group.

Terraform injects MongoDB's **private IP** into the app's `backend/.env` automatically via
the `user_data` bootstrap scripts.

### A. GitHub secrets (add to the repo: Settings → Secrets and variables → Actions)
| Secret | What |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with EC2/VPC perms |
| `AWS_KEY_PAIR_NAME` | EC2 key pair name (create it in EC2 → Key Pairs, region us-east-1) |
| `MONGO_PASSWORD` | MongoDB user/admin password |
| `JWT_SECRET` | backend JWT signing secret |
| `EC2_APP_HOST` | App EC2 public IP (for redeploy.yml) — fill in after first apply |
| `EC2_SSH_KEY` | private key (.pem contents) for SSH into the App EC2 |

Also create a GitHub **Environment** named `production` (Settings → Environments).

### B. Provision (first time)
- Via GitHub: Actions → **AWS Infrastructure CI/CD** → Run workflow → `action = apply`.
  Bootstrap installs Mongo/Node/PM2/nginx, clones the repo, writes `.env`, seeds, builds,
  starts services. (~3–5 min). Copy the App public IP from the run summary.
- Or locally:
  ```bash
  cd terraform
  # create terraform.tfvars: key_pair_name, github_repo, mongo_password, jwt_secret
  terraform init
  terraform plan
  terraform apply        # type yes
  terraform output summary
  ```

### C. Verify
```
http://<app-public-ip>          # React frontend
ssh -i ~/.ssh/<key>.pem ec2-user@<app-public-ip>
pm2 status                      # event-ticketing-api = online
```

### D. Tear down (avoid charges)
Actions → AWS Infrastructure CI/CD → `action = destroy`, or `terraform destroy`.

> **Note:** Terraform state is local (no S3 backend), so run `apply`/`destroy` consistently
> from the same place. For a robust pipeline add an S3 backend + DynamoDB lock.

---

## 10. Jira (SCRUM project)

- Site: `https://iirasras.atlassian.net`, project key **SCRUM**, board id 1.
- **Sprint 2** = id 37 ("SCRUM Sprint 2"). The three teammates: Ibrahim (iirasras),
  Zunair Muhammad Zafar, Kiran Shrestha.

### Create + assign a task (UI)
Backlog → Create → Task → set summary, assignee, and drag into the sprint.

### Move a task through the board
To Do → In Progress (when you start the branch) → Done (after merge).

We split each assignment's 6 tasks **2 per person** (OOP, Design patterns, Unit testing,
Postman, AWS/CI‑CD, Documentation).

---

## 11. Clone a project to the next assignment (exact steps used for A3)

Goal: copy assignment_2 → a new repo/folder, keep assignment_2 untouched.

1. **Create an empty GitHub repo** (e.g. `event-ticket_3`) — no README/gitignore.
2. **Copy the working tree** (exclude git, deps, secrets):
   ```bash
   rsync -a \
     --exclude='.git' --exclude='node_modules' \
     --exclude='token' --exclude='jira_token' --exclude='*.log' \
     D:/SDLC/assignmnet_2/  D:/SDLC/assignment_3/
   ```
3. **Init + push** (run on Windows where git works natively):
   ```bash
   cd D:\SDLC\assignment_3
   git init -b main
   git add .                       # .gitignore keeps secrets out
   git commit -m "Initial commit: cloned from assignment_2"
   git remote add origin https://github.com/irasiii/event-ticket_3.git
   git push -u origin main
   git branch production && git push -u origin production
   ```
4. **Create the feature branches** (off main):
   ```bash
   for b in feature/oop-principles feature/design-patterns feature/unit-testing \
            feature/postman-tests feature/aws-cicd docs/assignment3; do
     git branch $b main && git push -u origin $b
   done
   ```
5. **Add the GitHub secrets** to the new repo (see §9A) before any deploy.
6. **Create the Jira tasks** for the new assignment, assigned across the team.

---

## 12. Secrets & safety

- **Never commit**: `token`, `jira_token`, `*.pem`, `accessKeys.csv`, `.env`,
  `terraform.tfvars`. The `.gitignore` already blocks these — keep it.
- If a secret was ever committed, **rotate it** (generate a new one) and remove it from
  history. The old GitHub PAT / Mongo password should be considered compromised.
- Default credentials in `terraform/variables.tf` should be overridden by GitHub Secrets,
  not used as‑is.

---

## 13. Troubleshooting (real gotchas we hit)

- **`git` fails inside the synced folder with "Operation not permitted" on `.git/*.lock`**
  → the cloud/desktop sync layer doesn't support git's lock files. Fix: do git work in a
  normal local folder (a fresh `git clone`), not inside a special mounted/synced path.
- **66 files show as "modified" but content is identical** → CRLF vs LF line endings.
  Add a `.gitattributes` with `* text=auto eol=lf`, or stage files individually (avoid
  `git add -A`).
- **TOC in a Word doc shows a placeholder** → right‑click the TOC → Update Field →
  Update entire table (Word fills page numbers on your machine).
- **Booking can oversell under load** → seat deduction is read‑modify‑write; use an atomic
  `findOneAndUpdate` with `$inc` guarded by availability (tracked in the code‑review issue).
- **First push rejected / "Repository not found"** → the target repo must exist and be
  empty, and your PAT needs `repo` scope.

---

## 14. Live build status (branches → Jira → PR → CI)

Each Jira task has its own branch with its own commit/file. Open a PR per branch into
`main`; `ci.yml` runs on the PR (tests + build); review and merge; then promote `main` →
`production`.

### event-ticket_2 (assignment_2) — branches carry the real files

The 3 **code** branches are **stacked** (`oop ⊂ design-patterns ⊂ unit-testing`) so the
tests have the code they import — otherwise the unit-testing PR would fail CI with
"Cannot find module". Verified locally: `npm test` → **40 passing**, frontend `npm run build`
ok, and merging all 6 branches → **0 conflicts**, 40 passing, all modules load.

| Branch | Jira | Commit | Built on | Contents | CI |
|---|---|---|---|---|---|
| `feature/oop-principles` | SCRUM-262 | e7f5fb0 | main | `backend/domain/*` + `authController.js` | green (tests skipped) |
| `feature/design-patterns` | SCRUM-263 | 40aacd3 | oop | `patterns/*` + `services/` + controllers + `eventRoutes.js` | green (tests skipped) |
| `feature/unit-testing` | SCRUM-264 | 7ac1d08 | design-patterns | `backend/test/*` + `package.json`/lock | green (**runs 40 tests**) |
| `feature/postman-tests` | SCRUM-265 | bbaf377 | main | `postman/*` | green (tests skipped) |
| `feature/aws-cicd` | SCRUM-266 | ba00223 | main | `DEPLOYMENT.md`, `arch.png` | green (tests skipped) |
| `docs/assignment2` | SCRUM-267 | 0902484 | main | reports (`.docx`), diagrams (`.drawio`), screenshots | green (tests skipped) |

> Branches without a `test` script skip the test step (`npm test --if-present`) and pass on
> the frontend build. Only `feature/unit-testing` runs the 40 tests. **Merge the code
> branches in order** (oop → design-patterns → unit-testing) so each PR diff is clean.

### event-ticket_3 (assignment_3) — full code on `main`; each branch has a task scaffold

`main` already has the full code + test setup, so CI runs the 40 tests on every PR.

| Branch | Jira | Marker file |
|---|---|---|
| `feature/oop-principles` | SCRUM-269 | `docs/tasks/feature_oop-principles.md` |
| `feature/design-patterns` | SCRUM-271 | `docs/tasks/feature_design-patterns.md` |
| `feature/unit-testing` | SCRUM-273 | `docs/tasks/feature_unit-testing.md` |
| `feature/postman-tests` | SCRUM-274 | `docs/tasks/feature_postman-tests.md` |
| `feature/aws-cicd` | SCRUM-272 | `docs/tasks/feature_aws-cicd.md` |
| `docs/assignment3` | SCRUM-270 | `docs/tasks/docs_assignment3.md` |

### Finish each task (in the GitHub UI)

1. Move the Jira task **To Do → In Progress**.
2. Open a **Pull Request**: base = `main`, compare = the feature branch
   (`https://github.com/irasiii/<repo>/pull/new/<branch>`).
3. **CI runs** (`ci.yml` → jobs **Backend CI** + **Frontend CI**). Wait for green.
4. Review the diff, then **Merge pull request**.
5. Move the Jira task **→ Done**.

Then promote: open a PR base = `production`, compare = `main` → `deploy.yml` posts the
terraform plan → merge → `redeploy.yml` ships to the App EC2.

### Enforce "no merge without passing tests" (branch protection) — REQUIRED

This makes GitHub **block the Merge button until CI is green**, and re-tests the merge
against the latest `main` so a merge can never break `main`. Set it once per repo:

1. Open **one** PR first and let `ci.yml` run once — GitHub only lists a check after it has
   run at least once. (Check names: **Backend CI**, **Frontend CI**.)
2. Repo → **Settings → Branches → Add branch protection rule** (or **Settings → Rules →
   Rulesets → New branch ruleset**).
3. Branch name pattern: `main`.
4. Tick:
   - ☑ **Require a pull request before merging** (blocks direct pushes to `main`).
   - ☑ **Require status checks to pass before merging** → select **Backend CI** and
     **Frontend CI**.
   - ☑ **Require branches to be up to date before merging** ← re-runs CI on the merge
     result, so `main` can't be broken by a stale branch.
   - ☑ (optional) **Do not allow bypassing the above settings** (include admins).
5. **Save.** Repeat with pattern `production` to gate deploys.

> **Why the assistant can't toggle this:** branch-protection, PR create/merge, and
> `workflow_dispatch` all go through `api.github.com`, which is blocked from the sandbox.
> Branch pushes work; protection + PR + merge + CI are your clicks in the UI.

---

## 15. Cheat sheet

```bash
# run locally
cd backend && npm run dev
cd frontend && npm run dev
npm run seed                      # reseed DB

# tests
cd backend && npm test            # 40 passing
npx mocha --grep "Strategy"

# git: new task branch
git checkout main && git checkout -b feature/<name>
git add <files> && git commit -m "feat: ..."
git push -u origin feature/<name>

# PR + merge (gh CLI, if api reachable)
gh pr create --base main --head feature/<name> --fill
gh pr merge feature/<name> --merge --delete-branch

# promote to production (deploys)
gh pr create --base production --head main --fill
gh pr merge --merge

# AWS via Terraform (local)
cd terraform && terraform init && terraform plan && terraform apply
terraform output summary
terraform destroy                 # when done
```

---

---

## 16. Real API testing on the deployed stack (Newman)

Postman is a desktop GUI — it won't run on a headless EC2. **Newman** is Postman's CLI and
runs the *same* exported collection. It's wired up two ways:

- **Automatic at boot** — `terraform/user_data/app.sh` installs Newman and runs an initial
  test after the API starts, writing `~/app/newman-report.html`.
- **Automatic in CI** — the `smoke-test` job in `redeploy.yml` runs Newman from a GitHub
  runner against `http://${EC2_APP_HOST}` after every deploy and uploads `newman-report`.
- **Manual on the app host:**
  ```bash
  cd ~/app && bash scripts/run_api_tests.sh           # tests http://localhost:5000
  # copy the report to your PC:
  scp -i $key ec2-user@<app-ip>:~/app/newman-report.html .
  ```

For a guaranteed green run, reseed first so the DB is clean:
```bash
cd ~/app && git pull origin main
cd backend && npm run seed && cd ..
bash scripts/run_api_tests.sh
```

### Collection design rules we had to fix (so the run is green)
- **Order:** Categories + Venues are created **before** Events (Create event needs
  `categoryId`/`venueId`), and **Bookings run before any deletes** (booking a *cancelled*
  event returns 400).
- **Cleanup phase last:** destructive deletes run at the end in order
  **event → clone event → venue → category** (the Prototype clone is a draft event that
  also uses the venue, so it must be deleted before the venue, or venue-delete returns 400).
- **Idempotent register:** the Register request uses `jane.tester+{{$timestamp}}@example.com`
  so re-runs don't hit "email already in use".
- **Capture ids:** `List users` saves `userId`; `Clone event` saves `clonedEventId`.

## 17. From-scratch deploy (demolish → rebuild) + every gotcha we hit

### Tear down — DON'T rely on `terraform destroy`
There is **no S3 backend**, so Terraform state lived only on the Actions runner and is gone
after apply. A `destroy` run starts with empty state and won't find your resources. Instead:
- **AWS Console:** terminate both EC2s, then delete their security groups, or
- **Script:** `python scripts/aws_teardown.py --region us-east-1 --execute`
  (dry-run first without `--execute`; scoped to the `Project=event-ticketing` tag).

### Rebuild — clean sequence
1. **Apply:** Actions → *AWS Infrastructure CI/CD* → Run workflow → **Branch = `production`**
   → `action = apply`. (~5 min. App auto-clones event-ticket_3, seeds, starts API, installs
   Newman + runs an initial test.)
2. **Get the new App public IP** from the run summary (it changes every apply).
3. **Update the `EC2_APP_HOST`** secret to that IP.
4. **SSH in** and run the real test (see §16). New key each run only if you recreated the
   key pair.
5. **Trigger CI deploy + smoke-test:** push `main → production`.

### Gotchas (cause → fix) — keep this list handy
| Symptom | Cause | Fix |
|---|---|---|
| `Could not load credentials from any providers` (Terraform Plan, 4s) | AWS secrets not set **on this repo** (secrets are per-repo, don't copy across) | Add `AWS_ACCESS_KEY_ID/SECRET`, `AWS_KEY_PAIR_NAME`, `MONGO_PASSWORD`, `JWT_SECRET` to event-ticket_3 |
| `Redeploy` fails ~13s at SSH | EC2 not provisioned yet, or `EC2_APP_HOST=placeholder` | Run `apply` first; set `EC2_APP_HOST` to the new IP |
| App EC2 runs the wrong code | `deploy.yml` cloned `event-ticket` (A1) | Fixed: it now clones `event-ticket_3` |
| `not a recognised key file format` (PuTTY) | `.pem` is OpenSSH, PuTTY needs `.ppk` | PuTTYgen → Load → Save private key (.ppk); or use Windows `ssh` |
| `UNPROTECTED PRIVATE KEY FILE` / `bad permissions` | Windows ACLs too open on `.pem` | `icacls $key /inheritance:r /grant:r "$($env:USERNAME):R"` |
| `Load key … invalid format` | key has BOM/UTF-16, or it's a `.ppk` | re-download `.pem`, or PuTTYgen → Export OpenSSH key |
| `Permission denied (publickey)` (perms OK) | `.pem` doesn't match `AWS_KEY_PAIR_NAME` | use the matching key, or recreate key pair + re-apply |
| `EACCES … /usr/lib/node_modules/newman` | global npm install needs root on EC2 | `sudo npm install -g newman` (the script now falls back to sudo) |
| Create event `400`; booking `404` cascade | collection ordering (see §16) | fixed in the collection |
| `Delete venue 400` "used by active event" | leftover draft (the Prototype clone) | Cleanup deletes the clone before the venue |

---

*Personal runbook — keep in the repo root so the whole team follows the same steps.*

*Last updated: 2026-06-21 — added §16 real API testing (Newman) and §17 from-scratch deploy
+ full gotchas table (SSH key, perms, per-repo secrets, ephemeral TF state, collection fixes).*
