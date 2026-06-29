# TicketHub — Event Ticketing Platform

A full-stack event ticketing application deployed on AWS via GitHub Actions + Terraform CI/CD pipeline.

## Live Deployment

The app is currently deployed and accessible at:

| Component | IP Address |
|---|---|
| App (React + API) | `http://18.232.51.83` |
| MongoDB | `98.84.26.100` (private network to app only) |

> These IPs change on every `terraform apply`. After a fresh provision, update the `EC2_APP_HOST` and `EC2_SSH_KEY` GitHub Secrets before the redeploy workflow works.

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
```

| Instance | Name | OS | Type | Software |
|---|---|---|---|---|
| App | `event-ticketing-app` | Amazon Linux 2023 | t2.micro | Node.js 20, Nginx, PM2 |
| Database | `event-ticketing-mongodb` | Amazon Linux 2023 | t2.micro | MongoDB 7.0 |

## Repository Layout

```
assignment_1/
├── .github/
│   └── workflows/
│       ├── ci.yml            # Runs tests + frontend build on every push
│       ├── deploy.yml        # Terraform: provision/destroy EC2 infrastructure
│       └── redeploy.yml      # Deploy code changes to running EC2 (git pull + restart)
├── terraform/
│   ├── main.tf               # EC2 instances, Security Groups, AMI
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
└── frontend/                 # React + Vite SPA
    └── src/
        ├── pages/            # EventsPage, EventDetailPage, MyTicketsPage, etc.
        ├── components/       # EventCard, Navbar, etc.
        └── context/          # AuthContext
```

## GitHub Secrets Required

Go to your repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Secret | Description |
|---|---|
| `AWS_ACCESS_KEY_ID` | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret key |
| `AWS_KEY_PAIR_NAME` | EC2 key pair name (must exist in `us-east-1`) |
| `MONGO_PASSWORD` | Password for the MongoDB `tickethub` user |
| `JWT_SECRET` | Secret string for signing JWT tokens |
| `EC2_APP_HOST` | Public IP of the app EC2 instance (add after first deploy) |
| `EC2_SSH_KEY` | Full contents of your `.pem` private key file — **must include** `-----BEGIN RSA PRIVATE KEY-----` header and footer (add after first deploy) |

## Workflows

### `ci.yml` — Continuous Integration
Triggers on every push to `main` or `develop`.
- Runs backend tests (`npm test`)
- Runs frontend build (`npm run build`)

### `deploy.yml` — Infrastructure Provisioning
Triggers **manually** via `workflow_dispatch`.
- **Action: plan** — runs `terraform plan`, shows what will be created
- **Action: apply** — runs `terraform apply`, creates both EC2 instances from scratch
- **Action: destroy** — runs `terraform destroy`, tears down all AWS resources

> ⚠️ Only run `apply` on a clean AWS account (no existing instances/security groups from a previous run) because Terraform uses local state (no S3 backend). Security Group names use `random_id.suffix.hex` to avoid name collisions on re-apply.

### `redeploy.yml` — Deploy Code Changes
Triggers automatically on every push to `production`, or manually via `workflow_dispatch`.
- SSHes into the app EC2 instance using `EC2_APP_HOST` and `EC2_SSH_KEY` secrets
- Fetches and hard-resets to latest `origin/production` (handles force-push history)
- Reinstalls backend dependencies
- Deletes and rebuilds the React frontend (clean install avoids platform binary issues)
- Copies built files to Nginx web root
- Restarts the Node.js backend via PM2
- Runs **Newman smoke test** against the live API (non-blocking, uploads `newman-report` artifact)

> ⚠️ The Newman step runs as an informational check. Known collection bugs (`const data` redeclaration, auth token not flowing to mutating endpoints) cause test assertion failures but do not block deployment.

---

## First-Time Infrastructure Setup

### 1. Clone and push to `production` branch

```bash
git clone https://github.com/irasiii/event-ticket.git
cd event-ticket
git checkout production
```

### 2. Add all GitHub Secrets (see table above)

For the first deploy, you only need the first 5 secrets (`AWS_*`, `MONGO_PASSWORD`, `JWT_SECRET`).  
Add `EC2_APP_HOST` and `EC2_SSH_KEY` after the instances are running.

### 3. Run the Deploy workflow

1. Go to **Actions → Deploy Infrastructure → Run workflow**
2. Select **action: apply**
3. Click **Run workflow**

Wait ~5 minutes. When complete, the job summary shows:
```
app_public_ip    = "54.x.x.x"
mongodb_public_ip = "3.x.x.x"
```

### 4. Add the remaining secrets

Once you have the app IP:
- `EC2_APP_HOST` → the `app_public_ip` value (e.g. `54.221.x.x`)
- `EC2_SSH_KEY` → run the command below, then paste the output into GitHub

```powershell
# Windows — copies key to clipboard
Get-Content "$env:USERPROFILE\.ssh\event-ticketing-key.pem" -Raw | Set-Clipboard
```

The secret must include the full header and footer:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEo...
-----END RSA PRIVATE KEY-----
```

These are needed for the `redeploy.yml` workflow to SSH in.

### 5. Access the app

Open `http://<app_public_ip>` in your browser.

**Default accounts (seeded automatically):**

| Role | Email | Password |
|---|---|---|
| Admin | `admin@tickets.com` | `admin123` |
| User | `john@example.com` | `user123` |

---

## Deploying Code Changes to Production

After the infrastructure is running, use this workflow whenever you change backend or frontend code.

### Automatic (recommended)

Push your changes to both `main` and `production`:

```bash
# Make your change
git add .
git commit -m "fix: update event booking logic"
git push origin main              # triggers CI/CD Pipeline (tests + build check)
git push origin main:production   # triggers Redeploy App (deploys to EC2)
```

GitHub Actions `redeploy.yml` will automatically:
1. SSH into the app EC2
2. `git fetch origin production && git reset --hard origin/production`
3. `npm install --production` (backend)
4. Clean install + `npm run build` (React frontend with Vite 4)
5. Copy built files to `/usr/share/nginx/html/`
6. `pm2 restart event-ticketing-api`

Completes in ~30 seconds. ✅

### Manual trigger

Go to **Actions → Redeploy App → Run workflow → Run workflow**

### What each change type requires

| Change type | Action needed |
|---|---|
| Backend route/logic fix | Push to `production` → auto redeploy |
| Frontend component fix | Push to `production` → auto redeploy (rebuilds React) |
| New npm package (backend) | Push to `production` → auto redeploy (`npm install` runs) |
| New npm package (frontend) | Push to `production` → auto redeploy (`npm install` runs) |
| New EC2 instance / security group | Run `deploy.yml` with **action: apply** |
| Tear down all infrastructure | Run `deploy.yml` with **action: destroy** |

---

## Destroying Infrastructure

1. Go to **Actions → Deploy Infrastructure → Run workflow**
2. Select **action: destroy**
3. Click **Run workflow**

This terminates both EC2 instances and deletes all security groups.

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
