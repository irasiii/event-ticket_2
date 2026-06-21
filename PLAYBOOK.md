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

## 14. Cheat sheet

```bash
# run locally
cd backend && npm run dev
cd frontend && npm run dev
npm run seed                      # reseed DB

# tests
cd backend && npm test
npx mocha --grep "Strategy"

# git: new task branch
git checkout main && git checkout -b feature/<name>
git add <files> && git commit -m "feat: ..."
git push -u origin feature/<name>

# PR + merge (gh CLI)
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

*Generated as a personal runbook. Keep this file in the repo root so the whole team can
follow the same steps.*
