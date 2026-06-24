#!/bin/bash
# EC2 Bootstrap: Node.js 20 + React + PM2 + nginx on Amazon Linux 2023
# Variables injected by Terraform templatefile:
#   mongodb_private_ip | mongo_user | mongo_password | mongo_db
#   jwt_secret | github_repo | node_env
set -euxo pipefail
exec > >(tee /var/log/user-data.log | logger -t user-data) 2>&1

echo "========================================="
echo " Event Ticketing -- App Server Setup     "
echo "========================================="

# 1. System update
dnf update -y --allowerasing
dnf install -y git wget unzip tar --allowerasing

# 2. Install Node.js 20 (NodeSource -- works on AL2023 glibc 2.34)
curl -fsSL https://rpm.nodesource.com/setup_20.x | bash -
dnf install -y nodejs
echo "Node.js: $(node --version)  npm: $(npm --version)"

# 3. Install PM2
npm install -g pm2
pm2 startup systemd -u ec2-user --hp /home/ec2-user

# 4. Install nginx
dnf install -y nginx
systemctl enable nginx

# 5. Create app directory
APP_DIR=/home/ec2-user/app
mkdir -p $APP_DIR
chown ec2-user:ec2-user $APP_DIR

# 6. Clone GitHub repo
GITHUB_REPO="${github_repo}"
if [ -n "$GITHUB_REPO" ]; then
  echo "Cloning: $GITHUB_REPO"
  sudo -u ec2-user git clone "$GITHUB_REPO" "$APP_DIR"
else
  echo "No repo specified -- skipping clone."
fi

# 7. Write backend .env
BACKEND_DIR="$APP_DIR/backend"
if [ -d "$BACKEND_DIR" ]; then
  cat > "$BACKEND_DIR/.env" << ENVFILE
PORT=5000
MONGO_URI=mongodb://${mongo_user}:${mongo_password}@${mongodb_private_ip}:27017/${mongo_db}?authSource=${mongo_db}
JWT_SECRET=${jwt_secret}
JWT_EXPIRE=24h
NODE_ENV=${node_env}
ENVFILE
  chown ec2-user:ec2-user "$BACKEND_DIR/.env"

  cd "$BACKEND_DIR"
  sudo -u ec2-user npm install
  sudo -u ec2-user npm run seed || echo "Seed skipped."
  sudo -u ec2-user pm2 start server.js --name "event-ticketing-api" --cwd "$BACKEND_DIR"
  sudo -u ec2-user pm2 save

  # --- Newman (Postman CLI) for real API testing on this host ---
  npm install -g newman newman-reporter-htmlextra || echo "Newman install skipped."

  # Run an initial real end-to-end API test against the live app (non-fatal).
  sleep 8
  sudo -u ec2-user bash -lc "cd '$APP_DIR' && newman run postman/TicketHub.postman_collection.json \
      --env-var baseUrl=http://localhost:5000 \
      --reporters cli,htmlextra \
      --reporter-htmlextra-export '$APP_DIR/newman-report.html'" \
    || echo "Initial Newman test reported failures (non-fatal at boot)."
fi

# 8. Build React frontend
FRONTEND_DIR="$APP_DIR/frontend"
if [ -d "$FRONTEND_DIR" ]; then
  cat > "$FRONTEND_DIR/.env.production" << FRONTENV
VITE_API_URL=/api
FRONTENV

  cd "$FRONTEND_DIR"
  sudo -u ec2-user npm install
  sudo -u ec2-user npm run build
  cp -r "$FRONTEND_DIR/dist/"* /usr/share/nginx/html/
fi

# 9. Configure nginx reverse proxy
cat > /etc/nginx/conf.d/event-ticketing.conf << 'NGINXCFG'
server {
    listen 80;
    server_name _;
    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass         http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }
}
NGINXCFG

nginx -t && systemctl start nginx

echo "========================================="
echo " App Server setup complete!             "
echo " Node.js : $(node --version)            "
echo " PM2     : $(pm2 --version)             "
echo "========================================="
