#!/usr/bin/env bash
# Deploy the Exercise Duel sync backend to YOUR AWS account.
# Run it yourself (it uses your AWS credentials) — I don't touch your account.
#
#   ./infra/deploy.sh                 # deploys, prints EXPO_PUBLIC_* values
#   AWS_PROFILE=me AWS_REGION=us-west-2 ./infra/deploy.sh
#
# Re-running reuses the same API key from your existing stack (idempotent).
set -euo pipefail

STACK="${STACK:-exercise-duel}"
REGION="${AWS_REGION:-us-west-2}"
TEMPLATE="$(dirname "$0")/backend-template.yaml"

# Reuse the key from an existing stack if present, else generate a fresh one.
API_KEY="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Parameters[?ParameterKey=='ApiKey'].ParameterValue" --output text 2>/dev/null || true)"
if [ -z "${API_KEY:-}" ] || [ "$API_KEY" = "None" ]; then
  # openssl instead of tr</dev/urandom|head: the pipe SIGPIPEs head, which
  # under `set -o pipefail` aborts the whole script before it can deploy.
  API_KEY="$(openssl rand -hex 16)"
fi

echo "Deploying stack '$STACK' to $REGION ..."
aws cloudformation deploy \
  --stack-name "$STACK" \
  --region "$REGION" \
  --template-file "$TEMPLATE" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides "ApiKey=$API_KEY"

API_BASE="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='ApiBase'].OutputValue" --output text)"
API_BASE="${API_BASE%/}"

echo
echo "Done. Put these in a .env file at the project root (see .env.example):"
echo "  EXPO_PUBLIC_API_BASE=$API_BASE"
echo "  EXPO_PUBLIC_API_KEY=$API_KEY"
