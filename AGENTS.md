# SDLC Assignment 2 - Agent Summary

## Goal
Complete SDLC Assignment 2 for Event Ticket Booking System: SRS, 7+ design patterns, OOP, GitHub collaboration, Mocha/Chai unit tests, Postman API testing, CI/CD (GitHub Actions + AWS), report, video, declaration — plus sync gaps from `event-ticket_3` into `event-ticket_2`.

## Constraints & Preferences
- Project directory: `D:\SDLC\assignmnet_2`
- Repos: `irasiii/event-ticket_2` (main, 9 branches), `irasiii/event-ticket_3` (reference)
- Team (3): iirasras, Zunair, Kiran
- JIRA: `https://iirasras.atlassian.net/jira/software/projects/SCRUM/boards/1`
- EC2: key `event-ticketing-key.pem` (RSA 2048, LF)
- SSH key file: `D:\SDLC\assignmnet_2\event-ticketing-key.pem` (gitignored)
- 9 GitHUb Secrets set on both event-ticket_2 and event-ticket_3

## Progress

### Done
- GitHub secrets set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_KEY_PAIR_NAME, MONGO_PASSWORD, JWT_SECRET, EC2_SSH_KEY, EC2_APP_HOST
- JIRA secrets: JIRA_API_TOKEN, JIRA_EMAIL
- Collaborators added: Kiran (kshrestha14), Zunair (zunair-hub) — both admin
- 9 JIRA gap tasks (SCRUM-275 to SCRUM-283) assigned
- `.github/workflows/jira-link.yml` — auto-links commits/PRs to JIRA
- Branch protection restored on `production` (1 review, linear history, enforce admins)
- PR #12 (main → production) merged
- PRs #5, #9, #11 reviewed with approval recommendations

### Open PRs
| # | Branch | Author | Status |
|---|--------|--------|--------|
| 5 | feature/ticket-booking | kshrestha14 | Open — approved |
| 9 | feature/postman-tests | irasiii | Open — approved |
| 11 | docs/assignment2 | irasiii | Open — approved |

## JIRA Gap Tasks
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
1. **All .md documentation updated** — README.md, DEPLOYMENT.md, PLAYBOOK.md, MERGE_GUIDE.md, terraform/README.md, AGENTS.md all reflect live IPs and current state.
2. Consider fixing Postman collection test scripts (`const data` → `let data`, auth token propagation) for a green Newman smoke test.
3. Final deliverables (report, video, declaration).
