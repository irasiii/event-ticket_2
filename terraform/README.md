# Event Ticketing — Terraform Infrastructure

**Current deployment:** App `18.232.51.83`, MongoDB `98.84.26.100` (us-east-1).

Provisions **2 free-tier EC2 instances** on AWS using Amazon Linux 2023:

| Instance | Role | Ports |
|---|---|---|
| `event-ticketing-mongodb` | MongoDB 7.0 database | 22 (SSH), 27017 (app only) |
| `event-ticketing-app` | Node.js API + React frontend + GitHub CLI | 22 (SSH), 80 (nginx), 5000 (API) |

---

## Prerequisites

1. **Terraform** ≥ 1.6 — https://developer.hashicorp.com/terraform/downloads
2. **AWS CLI** configured with your credentials:
   ```bash
   aws configure
   # Enter: Access Key ID, Secret Access Key, region (us-east-1), output (json)
   ```
3. **EC2 Key Pair** created in your AWS account:
   - Go to AWS Console → EC2 → Key Pairs → Create key pair
   - Name it `event-ticketing-key`, download the `.pem` file
   - Move it to `~/.ssh/` and restrict permissions:
     ```bash
     mv ~/Downloads/event-ticketing-key.pem ~/.ssh/
     chmod 400 ~/.ssh/event-ticketing-key.pem
     ```

---

## Quick Start

```bash
# 1. Enter the terraform directory
cd terraform/

# 2. Edit your values (key pair name, passwords, optional GitHub repo)
notepad terraform.tfvars

# 3. Initialise Terraform (downloads AWS provider)
terraform init

# 4. Preview what will be created
terraform plan

# 5. Deploy (takes ~3-5 minutes for EC2 + bootstrap)
terraform apply
# Type "yes" when prompted

# 6. View the output (IPs, SSH commands, URLs)
terraform output summary
```

---

## What Gets Created

### EC2 1 — MongoDB Server
- Amazon Linux 2023, t2.micro (free tier)
- MongoDB 7.0 installed and running
- Authentication enabled with the credentials from `terraform.tfvars`
- Port 27017 open **only to the app server** (not the public internet)

### EC2 2 — App Server
- Amazon Linux 2023, t2.micro (free tier)
- **Node.js 20 LTS** + npm
- **GitHub CLI** (`gh`) — run `gh auth login` after SSH-ing in
- **PM2** — keeps the Node.js API running in the background
- **nginx** — serves the React frontend on port 80, proxies `/api` to Node.js
- Backend `.env` auto-generated pointing to the MongoDB server's private IP
- If `github_repo` is set in `terraform.tfvars`, the repo is cloned and built automatically

### Security Groups
- **MongoDB SG**: SSH from anywhere, MongoDB (27017) from app server only
- **App SG**: SSH, HTTP (80), HTTPS (443), Node.js API (5000), Vite dev (5173)

---

## After Deployment

### SSH into servers
```bash
# App server
ssh -i ~/.ssh/event-ticketing-key.pem ec2-user@<app-public-ip>

# MongoDB server
ssh -i ~/.ssh/event-ticketing-key.pem ec2-user@<mongodb-public-ip>
```

### Authenticate GitHub CLI on App Server
```bash
ssh -i ~/.ssh/event-ticketing-key.pem ec2-user@<app-public-ip>
gh auth login
# Choose: GitHub.com → HTTPS → Login with token → paste your PAT
```

### Clone & deploy your repo manually (if github_repo was empty)
```bash
# SSH into app server first
cd ~/app
gh repo clone your-username/event-ticketing .
# or: git clone https://github.com/your-username/event-ticketing.git .

# Backend
cd backend
cp .env.example .env
# Edit .env — MONGO_URI is already configured by user_data
npm install
npm run seed
pm2 start server.js --name event-ticketing-api

# Frontend
cd ../frontend
npm install
npm run build
sudo cp -r dist/* /usr/share/nginx/html/
```

### Check service status
```bash
# On app server:
pm2 status
pm2 logs event-ticketing-api
sudo systemctl status nginx

# On MongoDB server:
sudo systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log
```

---

## Tear Down (destroy all AWS resources)

```bash
terraform destroy
# Type "yes" to confirm
```

This removes both EC2 instances and their security groups. **Data will be lost.**

> ⚠️ **Note on Terraform state:** State is stored locally (no S3 backend). If you run `terraform destroy` from a GitHub Actions runner, it starts with empty state and won't find your resources. Either run destroy **locally** from the same machine that ran `apply`, or use the `scripts/aws_teardown.py` cleanup script. Security Group names use `random_id.suffix.hex` to avoid name collisions on re-apply.

---

## Cost

Both instances use **t2.micro** which is covered by the **AWS Free Tier** for 12 months (750 hours/month per instance). Storage is 8 GB gp2 EBS each, well within the 30 GB free tier limit.

> ⚠️ Stop instances when not in use to preserve free-tier hours:
> `aws ec2 stop-instances --instance-ids <id1> <id2>`
