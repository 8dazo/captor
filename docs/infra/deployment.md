# Captar Deployment Guide

## Architecture Overview

```
┌─────────────────┐     ┌─────────────────┐     ┌───────────────┐
│   Marketing     │     │    Platform     │     │   PostgreSQL  │
│  (Vercel)       │     │   (Vercel)      │     │  (Neon/       │
│  Static/Pages   │     │  Serverless     │     │  Supabase)    │
│  captar.aurat.ai      │     │  platform.captar.aurat.ai  │     │               │
└─────────────────┘     └────────┬────────┘     └───────────────┘
                                  │
                         ┌────────┴────────┐
                         │  API /ingest     │
                         │  Dashboard       │
                         │  Auth            │
                         └──────────────────┘
```

| Component      | Technology     | Deploy To                          |
| -------------- | -------------- | ---------------------------------- |
| Marketing site | Next.js 15     | **Vercel** (static + ISR)          |
| Platform app   | Next.js 15     | **Vercel** (serverless)            |
| Database       | PostgreSQL 14+ | Neon, Supabase, or Vercel Postgres |
| SDK packages   | npm            | npm registry (optional)            |

## Prerequisites

- Vercel account (pro for team features)
- PostgreSQL database
- GitHub repository connected to Vercel

---

## Step 1: Database Setup

### Option A: Neon (Recommended for Serverless)

```bash
# 1. Create project at https://neon.tech
# 2. Copy the connection string
# 3. Add to Vercel environment variables
```

Connection string format:

```
postgresql://user:password@db.neon.tech/dbname?sslmode=require
```

### Option B: Supabase

```bash
# 1. Create project at https://supabase.com
# 2. Get connection string from Project Settings > Database
# 3. Use pooled connection for serverless (port 6543)
```

Connection string:

```
postgresql://postgres.xxx:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
```

### Option C: Vercel Postgres

```bash
# 1. Add Storage in Vercel Dashboard
# 2. Select Postgres
# 3. Copy environment variables automatically
```

### Database Initialization

```bash
# Run migrations and seed locally (or via CI)
prisma migrate deploy --schema db/prisma/schema.prisma
# Or for fresh deploys:
pm run db:push
npm run db:seed
```

---

## Step 2: Deploy Marketing Site

### Method A: Vercel Dashboard (Recommended for Monorepos)

1. Go to https://vercel.com/new
2. Import `8dazo/captor`
3. **Configure:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/marketing`
   - **Build Command**: `cd ../.. && pnpm install && pnpm db:generate && pnpm --filter marketing build`
   - **Output Directory**: `apps/marketing/.next`
   - **Install Command**: `cd ../.. && pnpm install`

4. Add Environment Variables:

   ```
   NEXT_PUBLIC_MARKETING_URL=https://captar.aurat.ai
   ```

5. **Deploy**

The `vercel.json` in `apps/marketing/` already has these settings:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm install && pnpm db:generate && pnpm --filter marketing build",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": "apps/marketing/.next",
  "regions": ["iad1"]
}
```

**Project Settings:**

| Setting          | Value            |
| ---------------- | ---------------- |
| Framework Preset | Next.js          |
| Root Directory   | `apps/marketing` |
| Build Command    | `pnpm build`     |
| Output Directory | `.next`          |
| Install Command  | `pnpm install`   |

**Key Environment Variables:**

```bash
NEXT_PUBLIC_MARKETING_URL=https://captar.aurat.ai
```

### Build Settings

The marketing app builds to static output:

```json
// turbo.json task
echo '{ "tasks": { "build": { "dependsOn": ["^build"], "outputs": ["dist/**", ".next/**"] } } }'
```

### Domain Configuration

```bash
# Add custom domain
vercel domains add captar.aurat.ai

# Or in Vercel Domains settings
# - A/AAAA records for apex domain
# - CNAME for www subdomain
```

---

## Step 3: Deploy Platform App

### Method A: Vercel Dashboard (Recommended)

1. Go to https://vercel.com/new
2. Import `8dazo/captor` (same repo, different project)
3. **Configure:**
   - **Framework Preset**: Next.js
   - **Root Directory**: `apps/platform`
   - **Build Command**: `cd ../.. && pnpm install && pnpm db:generate && pnpm --filter @captar/platform build`
   - **Output Directory**: `apps/platform/.next`
   - **Install Command**: `cd ../.. && pnpm install`

4. **Required Environment Variables:**

| Variable              | Description                                               | Example                            |
| --------------------- | --------------------------------------------------------- | ---------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection                                     | `postgresql://...`                 |
| `AUTH_SECRET`         | NextAuth secret (generate with `openssl rand -base64 32`) | `abc123...`                        |
| `AUTH_URL`            | Your platform URL                                         | `https://platform.captar.aurat.ai` |
| `AUTH_TRUST_HOST`     | Required for Vercel                                       | `true`                             |
| `CAPTAR_PLATFORM_URL` | Platform URL for SDK                                      | `https://platform.captar.aurat.ai` |

5. **Deploy**

The `vercel.json` in `apps/platform/` already has these settings:

```json
{
  "framework": "nextjs",
  "buildCommand": "cd ../.. && pnpm install && pnpm db:generate && pnpm --filter @captar/platform build",
  "installCommand": "cd ../.. && pnpm install",
  "outputDirectory": "apps/platform/.next",
  "regions": ["iad1"],
  "functions": {
    "app/api/ingest/route.ts": {
      "maxDuration": 30
    }
  }
}
```

**Project Settings:**

| Setting          | Value           |
| ---------------- | --------------- |
| Framework Preset | Next.js         |
| Root Directory   | `apps/platform` |
| Build Command    | `pnpm build`    |
| Output Directory | `.next`         |

**Required Environment Variables:**

| Variable              | Description                                               | Example                            |
| --------------------- | --------------------------------------------------------- | ---------------------------------- |
| `DATABASE_URL`        | PostgreSQL connection                                     | `postgresql://...`                 |
| `AUTH_SECRET`         | NextAuth secret (generate with `openssl rand -base64 32`) | `abc123...`                        |
| `AUTH_URL`            | Your platform URL                                         | `https://platform.captar.aurat.ai` |
| `AUTH_TRUST_HOST`     | Required for Vercel                                       | `true`                             |
| `CAPTAR_PLATFORM_URL` | Platform URL for SDK                                      | `https://platform.captar.aurat.ai` |

**Optional:**

| Variable                    | Description              |
| --------------------------- | ------------------------ |
| `CAPTAR_INGEST_API_KEY`     | API key for SDK ingest   |
| `CAPTAR_DEMO_HOOK_ID`       | Demo hook for onboarding |
| `CAPTAR_DEMO_USER_EMAIL`    | Demo login email         |
| `CAPTAR_DEMO_USER_PASSWORD` | Demo login password      |

### Database Migrations on Deploy

Add to `package.json` or as Vercel build command:

```bash
# Option 1: Build-step migration (Vercel build)
prisma migrate deploy && next build

# Option 2: Manual migration via CLI
# Run before first deploy or after schema changes
```

**Build Command for Vercel:**

```bash
cd ../.. && pnpm db:generate && cd apps/platform && NODE_OPTIONS='--max-old-space-size=4096' next build
```

---

## Step 4: Environment Configuration

### `.env.production` Example

```bash
# Database
DATABASE_URL="postgresql://user:password@db.neon.tech/captar?sslmode=require"

# Auth
AUTH_SECRET="your-32-char-secret-here"
AUTH_URL="https://platform.captar.aurat.ai"
AUTH_TRUST_HOST="true"

# URLs
NEXT_PUBLIC_MARKETING_URL="https://captar.aurat.ai"
NEXT_PUBLIC_PLATFORM_URL="https://platform.captar.aurat.ai"
CAPTAR_PLATFORM_URL="https://platform.captar.aurat.ai"
CAPTAR_CONTROL_PLANE_URL="https://platform.captar.aurat.ai"

# Ingest
CAPTAR_INGEST_URL="https://platform.captar.aurat.ai/api/ingest"
CAPTAR_INGEST_API_KEY="your-api-key"
```

### Vercel Environment UI

1. Go to Project Settings > Environment Variables
2. Add each variable
3. Select environments: Production, Preview, Development
4. For `AUTH_SECRET`: Production only

---

## Step 5: Ingest API & Backend

The platform app IS the backend. The ingest API lives at:

```
POST https://platform.captar.aurat.ai/api/ingest
```

### How it works:

1. **SDK sends traces** → Platform `/api/ingest`
2. **Platform writes to PostgreSQL** → Prisma ORM
3. **Dashboard reads from PostgreSQL** → Server Components

### Architecture

```
SDK Client ──POST───> /api/ingest ───> Prisma ───> PostgreSQL
                                           ^
Dashboard ───GET───> Server Actions ─────┘
```

This is a **single-backend pattern** — the Next.js app serves both:

- **Pages** (dashboard UI)
- **API Routes** (ingest endpoint, auth)

No separate backend server needed for v1.

---

## Step 6: GitHub Actions Auto-Deploy

### Marketing Site

```yaml
#.github/workflows/deploy-marketing.yml
name: Deploy Marketing

on:
  push:
    branches: [main]
    paths:
      - 'apps/marketing/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: '10.0.0' }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm --filter marketing build
      - name: Deploy to Vercel
        run: |
          npx vercel --token ${{ secrets.VERCEL_TOKEN }} --prod --scope ${{ secrets.VERCEL_TEAM }}
        working-directory: apps/marketing
```

### Platform App

```yaml
#.github/workflows/deploy-platform.yml
name: Deploy Platform

on:
  push:
    branches: [main]
    paths:
      - 'apps/platform/**'
      - 'db/**'
      - 'packages/**'

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v3
        with: { version: '10.0.0' }
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'pnpm'
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:generate
      - run: pnpm --filter @captar/platform build
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          AUTH_SECRET: ${{ secrets.AUTH_SECRET }}
      - name: Deploy to Vercel
        run: |
          npx vercel --token ${{ secrets.VERCEL_TOKEN }} --prod --scope ${{ secrets.VERCEL_TEAM }}
        working-directory: apps/platform
```

### Required Secrets

Add these to GitHub Repository Settings > Secrets and variables > Actions:

| Secret         | Value                        |
| -------------- | ---------------------------- |
| `VERCEL_TOKEN` | Vercel personal access token |
| `VERCEL_TEAM`  | Vercel team/org slug         |
| `DATABASE_URL` | Production database URL      |
| `AUTH_SECRET`  | Production auth secret       |

---

## Step 7: Domain & DNS Setup

### Marketing Site (Root Domain)

```
captar.aurat.ai          A     76.76.21.21
www.captar.aurat.ai      CNAME cname.vercel-dns.com
```

### Platform App (Subdomain)

```
platform.captar.aurat.ai      CNAME cname.vercel-dns.com
```

### Configure in Vercel:

1. Marketing project: Settings > Domains > Add `captar.aurat.ai`
2. Platform project: Settings > Domains > Add `platform.captar.aurat.ai`

### Cross-Origin Setup

```bash
# Marketing needs to know platform URL
NEXT_PUBLIC_PLATFORM_URL=https://platform.captar.aurat.ai

# Platform needs to allow marketing origin
# (handled in NextAuth config)
```

---

## Step 8: Post-Deploy Verification

```bash
# Check marketing site
curl -s https://captar.aurat.ai | head -20

# Check platform health
curl -s https://platform.captar.aurat.ai/api/health

# Test ingest endpoint
curl -X POST https://platform.captar.aurat.ai/api/ingest \
  -H "Content-Type: application/json" \
  -d '{"events":[],"hookId":"test"}'

# Check database connectivity
# (via platform dashboard login page)
```

---

## Scaling Considerations

### Current (V1):

- Single PostgreSQL instance
- Next.js serverless functions
- Up to ~100K requests/day on Vercel Hobby, millions on Pro

### Future (V2+):

- **Read replicas** for dashboard queries
- **Redis** for session caching
- **ClickHouse** for high-volume event storage
- **Separate ingest worker** (queue-based)

See `infra/README.md` for infrastructure roadmap.

---

## Troubleshooting

### Build fails on Vercel

```bash
# Increase memory
NODE_OPTIONS='--max-old-space-size=4096'

# Clean .next cache
rm -rf apps/platform/.next apps/marketing/.next
```

### Database connection errors

```bash
# Verify SSL mode
DATABASE_URL="...?sslmode=require"

# Check connection pool limits (Neon: 10, Supabase: 10-30)
```

### Auth redirect issues

```bash
# Ensure AUTH_URL matches deployed URL exactly
AUTH_URL=https://platform.captar.aurat.ai  # NOT http://localhost:3000
```

---

## One-Command Deploy

```bash
# After initial setup, deploying is:
pnpm build
vercel --prod  # Marketing
vercel --prod  # Platform (in separate project)
```

Or with Git push (auto-deploy via Actions):

```bash
git push origin main
# Both sites deploy automatically
```
