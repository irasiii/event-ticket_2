# TicketHub — Branch Merge & CI/CD Workflow

Feature-branch development with **environment promotion**:
`feature/* → main (CI) → production (CD)`.

```
feature/*  --PR-->  main  --PR-->  production
   |                  |                 |
   |         ci.yml (tests+build)   redeploy.yml (SSH pull, build, pm2 restart)
   |                              + deploy.yml plan on the PR
   '--- ci.yml runs on PR to main ---'
Infra (EC2 #1/#2): deploy.yml  workflow_dispatch  action=apply  (manual, one-time)
```

## Which workflow runs when

| Workflow | Trigger | What it does |
|---|---|---|
| **ci.yml** | PR to `main`; push to `main`/`develop` | Backend job (mongo:6 service + 40 unit tests) + frontend build. The merge gate. |
| **deploy.yml** | PR to `production`; manual `workflow_dispatch` | On PR: `terraform plan`, posts plan as PR comment. Manual `apply`/`destroy` provisions/tears down the 2 EC2s. |
| **redeploy.yml** | push to `production`; manual | SSH to App EC2 → `git pull` production → rebuild frontend → `pm2 restart`. |

## Step 1 — Merge each feature branch into `main` (one by one)

Order: `oop-principles → design-patterns → unit-testing`, then `postman-tests`, `aws-cicd`, `docs/assignment2`.

For each branch:

1. `git push -u origin feature/<name>`
2. Open a PR with **base = main**, compare = the feature branch.
3. **ci.yml runs automatically** (PR → main): backend job spins up MongoDB and runs the 40 tests; frontend job builds. Both must be green.
4. Review the diff + green checks → **Merge pull request**. The push to `main` re-runs `ci.yml` on main.
5. Repeat for the next branch. Merge the stacked code branches in order so the tests have their code.

### CLI shortcut (gh)

```bash
for b in feature/oop-principles feature/design-patterns feature/unit-testing \
         feature/postman-tests feature/aws-cicd docs/assignment2; do
  git push -u origin "$b"
  gh pr create --base main --head "$b" --fill
  gh pr merge "$b" --merge --delete-branch
done
```

## Step 2 — Promote `main` to `production` (deploy)

Once everything is merged into `main` and CI is green:

1. Open a PR with **base = production**, compare = `main`.
2. **deploy.yml runs** on the PR → `terraform plan` → posts the plan as a PR comment (review infra changes).
3. Merge the PR. The push to `production` triggers **redeploy.yml** → SSH to App EC2 → pull + build + `pm2 restart` → live.
4. **First time only:** if the EC2s don't exist, run Actions → *AWS Infrastructure CI/CD* → Run workflow → `action = apply` once. After that, releases are just the `main → production` merge.

```bash
git push origin main
gh pr create --base production --head main --title "Release: assignment-2" --fill
# review the terraform plan comment, then:
gh pr merge --merge
```

## One-time reconciliation

`main` is ahead of `production` by 13 commits and `production` ahead by 2. Before the first promotion, sync them:

```bash
git checkout main
git merge origin/production    # resolve any conflicts
git push origin main
```

Then `main` is a superset and future `main → production` PRs are clean.

## Pipeline flow used

Lightweight **GitFlow / environment promotion**: `main` = Continuous Integration (tests + build gate via `ci.yml`); `production` = Continuous Deployment (app redeploy via `redeploy.yml`), with an infrastructure **plan on the PR** (`deploy.yml`) and a **manual Terraform apply** gate for provisioning.
