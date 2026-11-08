#!/usr/bin/env bash
# Deploy backend (CloudFormation via Amplify Gen 2) and the static site
# (Amplify Hosting manual deployment) for one branch.
#
#   AWS_PROFILE=chenyu scripts/deploy.sh
#
# Env: AMPLIFY_APP_ID (default: HARF app), AMPLIFY_BRANCH (default: main), AWS_REGION (default: us-east-2)
set -euo pipefail
cd "$(dirname "$0")/.."

APP_ID="${AMPLIFY_APP_ID:-d1teugon3t49oi}"
BRANCH="${AMPLIFY_BRANCH:-main}"
export AWS_REGION="${AWS_REGION:-us-east-2}"

echo "→ Deploying backend for $APP_ID/$BRANCH"
CI=1 npx ampx pipeline-deploy --branch "$BRANCH" --app-id "$APP_ID"

echo "→ Writing amplify_outputs.json"
npx ampx generate outputs --branch "$BRANCH" --app-id "$APP_ID"

echo "→ Building site"
npm run build

ZIP="$(mktemp -d)/site.zip"
(cd out && zip -qr "$ZIP" .)

echo "→ Uploading site"
DEPLOYMENT=$(aws amplify create-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --output json)
JOB_ID=$(node -pe 'JSON.parse(process.argv[1]).jobId' "$DEPLOYMENT")
UPLOAD_URL=$(node -pe 'JSON.parse(process.argv[1]).zipUploadUrl' "$DEPLOYMENT")
curl -sf -X PUT -H "Content-Type: application/zip" --data-binary @"$ZIP" "$UPLOAD_URL"
aws amplify start-deployment --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" >/dev/null

while true; do
  STATUS=$(aws amplify get-job --app-id "$APP_ID" --branch-name "$BRANCH" --job-id "$JOB_ID" --query job.summary.status --output text)
  case "$STATUS" in
    SUCCEED) echo "✔ Live at https://$BRANCH.$APP_ID.amplifyapp.com"; break ;;
    FAILED|CANCELLED) echo "✘ Hosting job $JOB_ID $STATUS"; exit 1 ;;
    *) sleep 5 ;;
  esac
done
