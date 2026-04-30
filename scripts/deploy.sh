#!/usr/bin/env bash
set -euo pipefail

# Captar Vercel Deployment Script
# Usage: ./scripts/deploy.sh
#
# Prerequisites:
#   - vercel CLI installed: npm i -g vercel
#   - vercel login (run once)
#   - DATABASE_URL set in local .env

echo "Captar Vercel Deployment"
echo "========================"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

check_command() {
  if ! command -v "$1" &> /dev/null; then
    echo -e "${RED}Error: $1 not found. Install it first.${NC}"
    exit 1
  fi
}

check_command vercel
check_command pnpm

# Load env for DB URL
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "${YELLOW}Warning: DATABASE_URL not set. You will need to add it manually.${NC}"
fi

if [ -z "${AUTH_SECRET:-}" ]; then
  echo -e "${YELLOW}Warning: AUTH_SECRET not set. Generating one...${NC}"
  AUTH_SECRET=$(openssl rand -base64 32)
  echo "Generated AUTH_SECRET: $AUTH_SECRET"
fi

# Detect project names from package.json or prompt
MARKETING_NAME="captar-marketing"
PLATFORM_NAME="captar-platform"

deploy_app() {
  local app_dir="$1"
  local project_name="$2"
  local url_env="$3"

  echo -e "\n${GREEN}--- Deploying $project_name ---${NC}"

  cd "$app_dir"

  # Link or create project if not linked
  if [ ! -d .vercel ]; then
    echo "Linking $project_name to Vercel..."
    vercel link --yes --project "$project_name" || vercel --confirm "$project_name"
  fi

  # Pull env if exists
  vercel env pull .env.local 2>/dev/null || true

  # Deploy
  echo "Building $project_name..."
  vercel --prod

  cd - > /dev/null
}

# --- Deploy Marketing ---
# Marketing doesn't need DB or auth secret
echo -e "\n${GREEN}Deploy Marketing Site${NC}"
read -p "Press Enter to deploy marketing, or Ctrl+C to skip..."
deploy_app "apps/marketing" "$MARKETING_NAME" "NEXT_PUBLIC_MARKETING_URL"

# --- Deploy Platform ---
# Platform needs all env vars
if [ -z "${DATABASE_URL:-}" ]; then
  echo -e "\n${GREEN}--- Platform App ---${NC}"
  echo "Platform needs DATABASE_URL. Add it to Vercel env vars:"
  echo "  vercel env add DATABASE_URL"
  echo "  vercel env add AUTH_SECRET"
  echo "  vercel env add AUTH_URL"
  echo "  vercel env add AUTH_TRUST_HOST"
  exit 0
fi

echo -e "\n${GREEN}Deploy Platform App${NC}"
read -p "Press Enter to deploy platform, or Ctrl+C to skip..."
deploy_app "apps/platform" "$PLATFORM_NAME" "AUTH_URL"

echo -e "\n${GREEN}Deployment complete!${NC}"
echo ""
echo "Next steps:"
echo "  1. Add custom domains in Vercel dashboard"
echo "  2. Set CAPTAR_INGEST_API_KEY if using the SDK"
echo "  3. Run database migrations: pnpm db:migrate"
echo ""
echo "Marketing URL: https://$(vercel ls "$MARKETING_NAME" --meta | head -1 || echo "check Vercel dashboard")"
echo "Platform URL:  https://$(vercel ls "$PLATFORM_NAME" --meta | head -1 || echo "check Vercel dashboard")"
