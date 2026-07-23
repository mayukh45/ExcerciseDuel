#!/usr/bin/env bash
# Build the web app and host it in YOUR AWS account: private S3 bucket behind
# CloudFront (HTTPS). Run it yourself — it uses your AWS credentials.
#
#   ./infra/deploy-web.sh
#   AWS_PROFILE=me AWS_REGION=us-west-2 ./infra/deploy-web.sh
#
# PREREQ: deploy the sync backend first (./infra/deploy.sh) and put the printed
# EXPO_PUBLIC_* values in .env — they get baked into the build below. Without
# them the hosted app runs local-only (no cross-phone sync).
set -euo pipefail

STACK="${WEB_STACK:-move-together-web}"
REGION="${AWS_REGION:-us-west-2}"
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/.." && pwd)"
TEMPLATE="$HERE/web-template.yaml"

if [ ! -f "$ROOT/.env" ]; then
  echo "warning: no .env found — the hosted app will run local-only (no sync)."
  echo "         run ./infra/deploy.sh first and fill .env for two-phone sync."
fi

echo "Building web export..."
# --clear busts Metro's cache so edited EXPO_PUBLIC_* env / config actually
# re-inline (stale cache once shipped a build with sync disabled).
( cd "$ROOT" && npx expo export -p web --clear )

echo "Deploying hosting stack '$STACK' to $REGION ..."
aws cloudformation deploy \
  --stack-name "$STACK" \
  --region "$REGION" \
  --template-file "$TEMPLATE"

out() {
  aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
BUCKET="$(out BucketName)"
DIST="$(out DistributionId)"
URL="$(out Url)"

echo "Uploading dist/ to s3://$BUCKET ..."
aws s3 sync "$ROOT/dist/" "s3://$BUCKET/" --delete

echo "Invalidating CloudFront cache ..."
aws cloudfront create-invalidation --distribution-id "$DIST" --paths "/*" >/dev/null

echo
echo "Done. Live at:"
echo "  $URL"
echo "Open it on both phones and 'Add to Home Screen'. (First deploy can take"
echo "a few minutes for CloudFront to finish propagating.)"
