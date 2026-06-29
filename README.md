# TicketHub — Event Ticketing Platform

A full-stack event ticketing application deployed on AWS via GitHub Actions + Terraform CI/CD pipeline, with S3 remote state and fully automated deploy lifecycle.

## Live Deployment

| Component | IP Address |
|---|---|
| App (React + API) | `http://18.232.51.83` |
| MongoDB | `98.84.26.100` (private network to app only) |

> IPs persist across `terraform apply` runs via S3 remote state. On re-apply with new instances, `EC2_APP_HOST` and `EC2_SSH_KEY` secrets are updated automatically by the deploy workflow.

---

## Architecture

```
                        GitHub Actions
                              │
              ┌───────────────┼───────────────┐
              │               │               │
          ci.yml          deploy.yml      redeploy.yml
       (test + build)   (infrastructure)  (code changes)
                               │               │
                               ▼               ▼
                         ┌─────────────────────────┐
                         │         AWS EC2          │
                         │                          │
  Internet ─────────────►│  ┌──────────────────┐   │
  (HTTP port 80)         │  │  event-ticketing  │   │
                         │  │  -app  (t2.micro) │   │
                         │  │                  │   │
                         │  │  Node.js 20 API   │   │
                         │  │  React + Nginx    │   │
                         │  │  PM2              │   │
                         │  └────────┬─────────┘   │
                         │           │ port 27017   │
                         │  ┌────────▼─────────┐   │
                         │  │  event-ticketing  │   │
                         │  │  -mongodb         │   │
                         │  │  (t2.micro)       │   │
                         │  │                  │   │
                         │  │  MongoDB 7.0      │   │
                         │  └──────────────────┘   │
                         └─────────────────────────┘
                              Amazon Linux 2023

                    ┌─────────────────────────────┐
                    │  Terraform Remote State      │
                    │  S3: event-ticketing-        │
                    │      terraform-state         │
                    │  DynamoDB: event-ticketing-  │
                    │      terraform-lock          │
                    └─────────────────────────────┘
```

| Instance | Name | OS | Type | Software |
|---|---|---|---|---|
| App | `event-ticketing-app` | Amazon Linux 2023 | t2.micro | Node.js 20, Nginx, PM2 |
| Database | `event-ticketing-mongodb` | Amazon Linux 2023 | t2.micro | MongoDB 7.0 |
| State | S3 bucket + DynamoDB | — | — | Terraform remote state |

## Repository Layout

```
event-ticket_2/
├── .github/
│   └── workflows/
│       ├── ci.yml            # Runs tests + frontend build on every push
│       ├── deploy.yml        # Terraform: plan/apply/destroy + auto-update secrets + trigger redeploy
│       └── redeploy.yml      # Deploy code changes to running EC2 (git pull + restart + Newman test)
├── terraform/
│   ├── main.tf               # EC2 instances, Security Groups, AMI, S3 backend config
│   ├── variables.tf          # Input variables
│   ├── outputs.tf            # Outputs (IPs, SSH commands)
│   └── user_data/
│       ├── app.sh            # App server bootstrap (Node, Nginx, PM2, clone repo)
│       └── mongodb.sh        # MongoDB server bootstrap
├── backend/                  # Express.js REST API
│   ├── models/               # Mongoose schemas (Event, User, Booking, Venue, Category)
│   ├── routes/               # API routes (auth, events, bookings, venues, admin)
│   ├── middleware/           # Auth middleware
│   ├── seed.js               # Database seeder
│   └── server.js             # Entry point
├── frontend/                 # React + Vite SPA
│   └── src/
│       ├── pages/            # EventsPage, EventDetailPage, MyTicketsPage, etc.
│       ├── components/       # EventCard, Navbar, etc.
│       └── context/          # AuthContext
└── postman/                  # API testing collection
    └── TicketHub API.postman_collection.json
```

## GitHub Secrets Required

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_KEY_PAIR_NAME` | EC2 key pair name (must exist in `us-east-1`) |
| `MONGO_PASSWORD` | Password for the MongoDB `tickethub` user |
| `JWT_SECRET` | Secret string for signing JWT tokens |
| `EC2_APP_HOST` | Public IP of the app EC2 instance (**auto-updated** after apply) |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key file |
| `GH_PAT` | GitHub PAT with `repo` scope — used by workflow to update secrets and dispatch workflows |

## Workflows

### `ci.yml` — Continuous Integration
Triggers on every push to `main` or `develop`.
- Runs backend tests (`npm test`)
- Runs frontend build (`npm run build`)

### `deploy.yml` — Infrastructure Provisioning
Triggers **manually** via `workflow_dispatch` on the `production` branch.
- **Action: plan** — runs `terraform plan`, shows what will be created
- **Action: apply** — runs `terraform apply`, then **auto-updates** `EC2_APP_HOST` secret with the new IP, then **auto-dispatches** `redeploy.yml` to deploy code
- **Action: destroy** — runs `terraform destroy`, tears down all AWS resources

> Terraform uses **S3 remote state** (`event-ticketing-terraform-state`) with **DynamoDB locking** (`event-ticketing-terraform-lock`) — state is persistent across runners. Security Group names use `random_id.suffix.hex` to avoid collisions. The deploy workflow auto-creates the bucket/table if missing, and imports existing resources on the first S3-backed run.

### `redeploy.yml` — Deploy Code Changes
Triggers automatically on every push to `production`, manually via `workflow_dispatch`, or automatically by `deploy.yml` after apply.
- SSHes into the app EC2 instance using `EC2_APP_HOST` and `EC2_SSH_KEY` secrets
- Fetches and hard-resets to latest `origin/production`
- Reinstalls backend dependencies
- Deletes and rebuilds the React frontend (clean install avoids platform binary issues)
- Copies built files to Nginx web root
- Restarts the Node.js backend via PM2
- Runs **Newman smoke test** against the live API, uploads `newman-report.html` artifact

---

## First-Time Infrastructure Setup

### 1. Add GitHub Secrets

Add all 8 secrets (see table above). `EC2_APP_HOST` and `EC2_SSH_KEY` can be placeholder values — they will be updated after the first apply.

### 2. Create EC2 Key Pair

In AWS Console (us-east-1): EC2 → Key Pairs → Create key pair → name `event-ticketing-key` → download `.pem`.

### 3. Run the Deploy workflow

1. Go to **Actions → AWS Infrastructure CI/CD → Run workflow**
2. Branch: `production`, Action: `apply`
3. Click **Run workflow**

Wait ~5 minutes. The workflow:
1. Creates S3 bucket + DynamoDB table (if missing)
2. Imports any existing resources into S3 state
3. Runs `terraform apply` — provisions both EC2s
4. **Automatically updates** `EC2_APP_HOST` secret with the new IP
5. **Automatically dispatches** `redeploy.yml` to deploy the latest code

### 4. Add EC2_SSH_KEY secret

If not set yet, copy the PEM contents:
```powershell
Get-Content "$env:USERPROFILE\.ssh\event-ticketing-key.pem" -Raw | Set-Clipboard
```

### 5. Access the app

Open `http://<app_public_ip>` in your browser.

**Default accounts (seeded automatically):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@tickets.com` | `admin123` |
| User | `john@example.com` | `user123` |

---

## Deploying Code Changes to Production

### Automatic (recommended)

Push your changes to both `main` and `production`:

```bash
git add .
git commit -m "fix: update event booking logic"
git push origin main              # triggers CI (tests + build check)
git push origin main:production   # triggers redeploy (SSH + build + PM2 restart + Newman)
```

Completes in ~30 seconds + ~2 min for Newman smoke test.

### What each change type requires

| Change type | Action needed |
|---|---|
| Backend route/logic fix | Push to `production` → auto redeploy |
| Frontend component fix | Push to `production` → auto redeploy (rebuilds React) |
| New npm package | Push to `production` → auto redeploy |
| New EC2 / infrastructure change | Run `deploy.yml` with **action: apply** |
| Tear down all infrastructure | Run `deploy.yml` with **action: destroy** |

---

## Destroying Infrastructure

1. Go to **Actions → AWS Infrastructure CI/CD → Run workflow**
2. Branch: `production`, Action: `destroy`
3. Click **Run workflow**

Terraform uses S3 state, so destroy finds and removes all managed resources.

---

## Testing the App (Use Cases)

| Use Case | Steps |
|---|---|
| Browse events | Open app → Events page shows all 6 seeded events |
| Register | Click Register → fill in name/email/password |
| Login | Click Login → `admin@tickets.com` / `admin123` |
| Book tickets | Open an event → select quantity → click Book Now → QR code shown |
| View my tickets | Click My Tickets → shows all bookings with QR codes |
| Cancel booking | My Tickets → click Cancel Booking |
| Admin panel | Login as admin → Admin link in navbar → manage events/users/bookings |

---

## Local Development

```bash
# Terminal 1 — Backend
cd backend
cp .env.example .env    # set MONGO_URI, JWT_SECRET
npm install
npm run dev             # runs on port 5000

# Terminal 2 — Frontend
cd frontend
npm install
npm run dev             # runs on port 5173 (proxies /api to port 5000)
```

---

## Security Notes

- MongoDB port `27017` is only accessible from the App server's security group — not the public internet
- JWT tokens expire after 7 days
- Passwords are hashed with bcrypt (10 rounds)
- Admin routes are protected by role-based middleware
- Secrets (`hp_token`, `AWS_Access`, `*.pem`) are gitignored and never committed
