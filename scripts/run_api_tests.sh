#!/usr/bin/env bash
# ============================================================================
# run_api_tests.sh — real end-to-end API test of the DEPLOYED stack, using
# Newman (the Postman CLI). Runs the TicketHub Postman collection against the
# live Node API, which in turn talks to the MongoDB EC2.
#
# Run it ON the app EC2 (where the API on :5000 reaches the private Mongo host):
#     ssh -i ~/.ssh/<key>.pem ec2-user@<app-public-ip>
#     cd ~/app && bash scripts/run_api_tests.sh
#
# Or from anywhere against the public URL:
#     bash scripts/run_api_tests.sh http://<app-public-ip>:5000
#
# Newman = Postman without the GUI. Same collection, headless, scriptable.
# ============================================================================
set -euo pipefail

# Base URL of the API to test (default: the API running locally on the app host)
BASE_URL="${1:-http://localhost:5000}"

# Locate the collection relative to this script (repo is cloned to ~/app)
DIR="$(cd "$(dirname "$0")/.." && pwd)"
COLLECTION="$DIR/postman/TicketHub.postman_collection.json"

if [ ! -f "$COLLECTION" ]; then
  echo "ERROR: collection not found at $COLLECTION"
  echo "Run this from the repo root (e.g. ~/app) so postman/ is reachable."
  exit 1
fi

# 1) Ensure Newman is installed (Node.js is already on the app server)
if ! command -v newman >/dev/null 2>&1; then
  echo "==> Installing Newman (Postman CLI) + HTML reporter..."
  # global install needs root on EC2 but not on CI runners — try plain, fall back to sudo
  npm install -g newman newman-reporter-htmlextra 2>/dev/null \
    || sudo npm install -g newman newman-reporter-htmlextra
fi

# 2) Optional: make sure the API is up before testing
echo "==> Checking API at $BASE_URL ..."
if command -v curl >/dev/null 2>&1; then
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$BASE_URL/" || echo 000)
  echo "    API responded: HTTP $code"
  if [ "$code" = "000" ]; then
    echo "    WARNING: API not reachable at $BASE_URL. Is the backend (pm2) running?"
  fi
fi

# 3) Run the collection. The login requests capture JWTs into collection
#    variables, so the protected endpoints (bookings, admin) run authenticated.
REPORT="$DIR/newman-report.html"
echo "==> Running TicketHub API collection against $BASE_URL"
newman run "$COLLECTION" \
  --env-var "baseUrl=$BASE_URL" \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export "$REPORT" \
  --color on

echo
echo "==> Done. HTML report written to: $REPORT"
echo "    (copy it back with: scp ec2-user@<app-ip>:~/app/newman-report.html .)"
