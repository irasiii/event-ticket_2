# SDLC Assignment 2 - Agent Summary

## Goal
Complete SDLC Assignment 2 for Event Ticket Booking System: 7+ design patterns, OOP, GitHub collaboration, Mocha/Chai unit tests, Postman API testing, CI/CD (GitHub Actions + AWS + Terraform S3 backend), report, video, declaration.

## Constraints & Preferences
- Repos: `irasiii/event-ticket_2` (main, production), `irasiii/event-ticket_3` (reference)
- Team (3): iirasras, Zunair, Kiran
- JIRA: `https://iirasras.atlassian.net/jira/software/projects/SCRUM/boards/1`
- EC2 key pair: `event-ticketing-key` (us-east-1)
- No `gh` CLI installed; use GitHub REST API via `hp_token` file for operations
- 9 GitHub Secrets set on event-ticket_2 + event-ticket_3
- Production branch protection: 1 approving review, linear history, enforce admins

## Live State
| Component | Value |
|---|---|
| App (React + API) | (torn down) |
| MongoDB | (torn down) |
| Terraform state | (torn down — S3 bucket + DynamoDB table deleted) |
| CI tests | 40/40 Mocha + Vite build (still runs on push) |
| Newman tests | Fixed (let data + timestamp), blocking step in redeploy |

## Progress
### Done (this session — 2026-06-29)
- **S3 backend** added to `terraform/main.tf` — bucket `event-ticketing-terraform-state` w/ versioning + DynamoDB lock table `event-ticketing-terraform-lock` created in AWS.
- **`deploy.yml` completely rewritten:**
  - Auto-creates S3 bucket + DynamoDB table if missing (all 3 jobs: plan/apply/destroy)
  - Imports existing tagged EC2s + SGs into S3 state on first run
  - After `apply`: extracts `app_public_ip` → updates `EC2_APP_HOST` secret via GitHub API
  - After `apply`: dispatches `redeploy.yml` on production branch
  - `destroy` now works from any runner (S3 persistent state)
- **`GH_PAT`** GitHub secret added for workflow-to-workflow API calls.
- **`.gitignore`** hardened: added `hp_token`, `AWS_Access`, `.postman/`, `postman/globals/`.
- **Postman collection fixed:** all 7 `const data` → `let data` (Newman VM sandbox); Register email uses `{{$timestamp}}` for idempotency. Pushed to main + production.
- **All `.md` docs updated:** README.md, DEPLOYMENT.md, PLAYBOOK.md, MERGE_GUIDE.md, terraform/README.md, AGENTS.md — all reflect S3 backend, auto-secret-update, fixed Newman, and current live IPs.
- **App verified live** at `http://18.232.51.83` (HTTP 200).
- **Full AWS teardown** via `scripts/aws_teardown.py --execute --include-s3`: terminated 2 EC2 instances, deleted 4 security groups, deleted S3 state bucket `event-ticketing-terraform-state`, deleted DynamoDB lock table `event-ticketing-terraform-lock`. Verified all clean.

### Done (earlier sessions)
- GitHub secrets set (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KEY_PAIR_NAME, MONGO_PASSWORD, JWT_SECRET, EC2_SSH_KEY, EC2_APP_HOST)
- JIRA secrets: JIRA_API_TOKEN, JIRA_EMAIL
- Collaborators added (Kiran, Zunair — admin)
- 9 JIRA gap tasks (SCRUM-275 to SCRUM-283) assigned
- `.github/workflows/jira-link.yml` — auto-links commits/PRs to JIRA
- Branch protection restored on production
- PR #12 (main → production) merged
- PRs #5, #9, #11 reviewed with approval recommendations

### Open PRs (unchanged)
| # | Branch | Author | Status |
|---|--------|--------|--------|
| 5 | feature/ticket-booking | kshrestha14 | Open — approved |
| 9 | feature/postman-tests | irasiii | Open — approved |
| 11 | docs/assignment2 | irasiii | Open — approved |

## JIRA Gap Tasks (unchanged)
| Key | Task | Assignee |
|-----|------|----------|
| SCRUM-275 | OOP domain layer | Zunair |
| SCRUM-276 | Design patterns | Zunair |
| SCRUM-277 | Service layer | iirasras |
| SCRUM-278 | Unit tests | Kiran |
| SCRUM-279 | Postman tests | Kiran |
| SCRUM-280 | Documentation | iirasras |
| SCRUM-281 | Diagrams & screenshots | iirasras |
| SCRUM-282 | Utility scripts | Kiran |
| SCRUM-283 | Task documentation | Zunair |

## Next Steps
1. Trigger `deploy.yml apply` from GitHub Actions on production branch to verify S3 backend + auto-import + secret update + auto-redeploy end-to-end.
2. Verify Newman smoke test passes with the fixed collection.
3. Final deliverables (report, video, declaration).
