# TicketHub — AWS Deployment Guide

**Current live deployment:** App at `http://18.232.51.83`, MongoDB at `98.84.26.100` (us-east-1).

Deploys two free-tier EC2 instances (App + MongoDB) with Terraform, driven by GitHub Actions. Uses **S3 remote state** with DynamoDB locking so all operations (plan/apply/destroy) work consistently from any GitHub Actions runner.

```
Developer → GitHub (push / PR)
   ├─ ci.yml         → tests (40) + frontend build           (push main/develop)
   ├─ deploy.yml     → terraform plan (PR) / apply|destroy    (provisions AWS)
   │     └─ after apply → auto-updates EC2_APP_HOST secret → dispatches redeploy.yml
   └─ redeploy.yml   → SSH to App EC2, git pull + build + pm2 + Newman test (push production)

AWS (default VPC, us-east-1)
   ├─ EC2 #1 App      nginx :80 (React + /api proxy) · Node :5000 (PM2) · SG 22/80/443/5000/5173
   ├─ EC2 #2 MongoDB  mongod :27017 (auth) · SG 22 + 27017 from App SG only
   └─ S3 + DynamoDB   remote Terraform state (persistent across runners)
```

## Architecture

- **App EC2** serves the built React app via nginx on port 80 and proxies `/api` to the Node API on port 5000 (kept alive by PM2 as `event-ticketing-api`).
- **MongoDB EC2** runs MongoDB 7.0 with auth; port 27017 is reachable **only** from the app's security group.
- Terraform injects MongoDB's **private IP** into the app server's `backend/.env` automatically.
- **S3 remote state** (`event-ticketing-terraform-state`) + **DynamoDB lock table** (`event-ticketing-terraform-lock`) persist Terraform state across GitHub Actions runners. The bucket/table are auto-created by the workflow if missing.

---

## Prerequisites (one-time)

1. AWS account + IAM user with EC2/VPC permissions (programmatic access).
2. EC2 **Key Pair** created in `us-east-1` (download the `.pem`).
3. 8 GitHub Secrets set on the repo (see README.md).

---

## Path A — GitHub CI/CD (recommended)

### 1. Add repository secrets

| Secret | Purpose |
|---|---|
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | IAM user with EC2/VPC perms |
| `AWS_KEY_PAIR_NAME` | EC2 key pair name (us-east-1) |
| `MONGO_PASSWORD` | MongoDB user/admin password |
| `JWT_SECRET` | Backend JWT signing secret |
| `EC2_APP_HOST` | Placeholder initially (auto-updated after apply) |
| `EC2_SSH_KEY` | Private key (.pem contents) for SSH into the App EC2 |
| `GH_PAT` | GitHub PAT with `repo` scope for API calls (update secrets, dispatch workflows) |

### 2. Provision (apply)

`Actions → AWS Infrastructure CI/CD → Run workflow → Branch = production → action = apply`.

The workflow:
1. Creates S3 bucket + DynamoDB table (if missing)
2. Imports existing tagged resources into S3 state (first S3 run)
3. Runs `terraform apply` — provisions both EC2s (~3-5 min)
4. Extracts `app_public_ip` and **auto-updates** `EC2_APP_HOST` secret
5. **Auto-dispatches** `redeploy.yml` on production branch

### 3. Verify

```
http://<app-public-ip>          # React frontend
ssh -i ~/.ssh/<key>.pem ec2-user@<app-public-ip>
pm2 status                      # event-ticketing-api = online
sudo systemctl status nginx
```

### 4. Ship updates (continuous deployment)

Every push to `production` triggers `redeploy.yml` → SSH + pull + build + PM2 restart + Newman smoke test.

```bash
git push origin main            # CI
git push origin main:production # redeploy
```

---

## Path B — Manual Terraform

```bash
aws configure                      # us-east-1, json
cd terraform/
cat > terraform.tfvars <<EOF
key_pair_name = "event-ticketing-key"
github_repo   = "https://github.com/irasiii/event-ticket_2.git"
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

## Tear down

GitHub: `Actions → AWS Infrastructure CI/CD → Run workflow → Branch = production → action = destroy`.

Terraform finds managed resources via S3 state and destroys them. Or locally:
```bash
cd terraform/ && terraform destroy
```
