# TicketHub — AWS Deployment Guide

Deploys two free-tier EC2 instances (App + MongoDB) with Terraform, driven by GitHub Actions.

```
Developer → GitHub (push / PR)
   ├─ ci.yml         → tests (40) + frontend build           (push main/develop)
   ├─ deploy.yml     → terraform plan (PR) / apply|destroy    (provisions AWS)
   └─ redeploy.yml   → SSH to App EC2, git pull + build + pm2 (push production)

AWS (default VPC, us-east-1)
   ├─ EC2 #1 App      nginx :80 (React + /api proxy) · Node :5000 (PM2) · SG 22/80/443/5000/5173
   └─ EC2 #2 MongoDB  mongod :27017 (auth) · SG 22 + 27017 from App SG only
```

## Architecture

- **App EC2** serves the built React app via nginx on port 80 and proxies `/api` to the Node API on port 5000 (kept alive by PM2 as `event-ticketing-api`).
- **MongoDB EC2** runs MongoDB 7.0 with auth; port 27017 is reachable **only** from the app's security group.
- Terraform injects MongoDB's **private IP** into the app server's `backend/.env` automatically.

---

## Prerequisites (one-time)

1. AWS account + IAM user with EC2/VPC permissions (programmatic access).
2. EC2 **Key Pair** created in `us-east-1` (download the `.pem`).
3. Terraform ≥ 1.6 and AWS CLI installed (only for the manual path).
4. Repo pushed; the `github_repo` Terraform value matches your repo URL.

---

## Path A — GitHub CI/CD (recommended)

### 1. Add repository secrets
`Settings → Secrets and variables → Actions`:

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` | IAM access key (EC2/VPC perms) |
| `AWS_SECRET_ACCESS_KEY` | IAM secret key |
| `AWS_KEY_PAIR_NAME` | EC2 key pair name (SSH) |
| `MONGO_PASSWORD` | MongoDB user/admin password |
| `JWT_SECRET` | Backend JWT signing secret |
| `EC2_APP_HOST` | App EC2 public IP (for `redeploy.yml`) |
| `EC2_SSH_KEY` | Private key contents for SSH into the app EC2 |

### 2. Create the `production` environment
`Settings → Environments → production` (add a required reviewer if you want an approval gate — the apply/destroy jobs use it).

### 3. Verify CI is green
Push to `main` (or open a PR). `ci.yml` runs the 40 backend unit tests against a temporary MongoDB and builds the frontend.

### 4. Review the plan
Open a PR targeting `production`. `deploy.yml` runs `terraform plan` and posts it as a PR comment (2 EC2s + 2 security groups).

### 5. Provision (apply)
`Actions → AWS Infrastructure CI/CD → Run workflow → action = apply`.
Bootstrap then auto-installs MongoDB, Node 20, PM2, nginx; clones the repo; writes `.env`; runs `npm install` + `npm run seed`; starts the API under PM2; builds the frontend; configures the nginx reverse proxy. (~3–5 min.) Copy the **app public IP** from the run summary.

### 6. Ship updates (continuous deployment)
Every push to `production` triggers `redeploy.yml`:

```bash
cd ~/app
git fetch origin production && git reset --hard origin/production
cd backend && npm install --production && cd ..
cd frontend && npm install && VITE_API_URL=/api npm run build
sudo cp -r dist/* /usr/share/nginx/html/ && cd ..
pm2 restart event-ticketing-api
```

---

## Path B — Manual Terraform

```bash
aws configure                      # us-east-1, json
mv ~/Downloads/event-ticketing-key.pem ~/.ssh/ && chmod 400 ~/.ssh/event-ticketing-key.pem

cd terraform/
cat > terraform.tfvars <<EOF
key_pair_name = "event-ticketing-key"
github_repo   = "https://github.com/<you>/event-ticket.git"
mongo_password = "<strong-password>"
jwt_secret     = "<strong-secret>"
environment    = "production"
EOF

terraform init
terraform plan
terraform apply            # type 'yes'
terraform output summary   # IPs, SSH commands, URLs
```

---

## Verify

```bash
# Browser
http://<app-public-ip>          # React frontend (nginx :80)

# App server
ssh -i ~/.ssh/event-ticketing-key.pem ec2-user@<app-public-ip>
pm2 status                      # event-ticketing-api = online
sudo systemctl status nginx

# MongoDB server
ssh -i ~/.ssh/event-ticketing-key.pem ec2-user@<mongodb-public-ip>
sudo systemctl status mongod
```

Run the Postman collection against `http://<app-public-ip>` to test every API.

---

## Tear down

GitHub: `Actions → AWS Infrastructure CI/CD → Run workflow → action = destroy`. Or locally:

```bash
cd terraform/ && terraform destroy   # type 'yes'
```

Both instances are `t2.micro` (free tier). Stop them when idle to preserve free-tier hours.

---

## Note — Terraform remote state

State is stored locally, so a GitHub Actions runner starts with empty state each run. For a robust pipeline, add an **S3 backend + DynamoDB lock** to the `terraform {}` block so `apply`/`destroy` track the same resources. For a one-off demo, run `apply` and `destroy` consistently from the same place.
