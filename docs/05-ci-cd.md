# CI/CD Pipeline Guide

## Overview

Two GitHub Actions workflows:

| Workflow | File | Trigger | What it does |
|---|---|---|---|
| CI | `.github/workflows/ci.yml` | Every push / PR | Lint, build, Docker build+push |
| CD | `.github/workflows/cd.yml` | Push to `main` only | Update K8s image tags, deploy |

## CI Pipeline (`ci.yml`)

### Jobs

**1. lint-and-build**
- Checks out code
- Sets up Node 20 with npm cache
- `npm ci` — clean install
- `npm run lint` — ESLint via Next.js
- `npm run build` — verifies the frontend compiles

**2. docker-build-push** (runs after lint-and-build passes)
- Runs in a matrix — all 10 services build in parallel
- Logs into GHCR using `GITHUB_TOKEN` (no extra secret needed)
- Builds Docker image for each service
- Pushes to GHCR **only on `main` branch** (PRs just build, don't push)
- Tags: `latest` + `<git-sha>` for rollback capability

### Image naming

```
ghcr.io/<github-username>/bookstore-frontend:latest
ghcr.io/<github-username>/bookstore-api-gateway:abc1234
ghcr.io/<github-username>/bookstore-user-service:abc1234
...
```

## CD Pipeline (`cd.yml`)

### Required Secrets

Go to your GitHub repo → Settings → Secrets and variables → Actions:

| Secret | Value |
|---|---|
| `KUBECONFIG` | Base64-encoded kubeconfig file: `cat ~/.kube/config \| base64` |

### What it does

1. Checks out code
2. Installs `kubectl`
3. Decodes `KUBECONFIG` secret and writes to `~/.kube/config`
4. Replaces image tags in all K8s YAML files with the current Git SHA
5. Changes `imagePullPolicy: Never` → `imagePullPolicy: Always`
6. Runs `k8s/deploy.sh` — applies all manifests

### Flow

```
Push to main
    ↓
CI runs (lint + build + docker push to GHCR)
    ↓
CD runs (update image tags → kubectl apply)
    ↓
K8s pulls new images from GHCR
    ↓
Rolling update with zero downtime
```

## First-Time Setup

1. Push your code to GitHub
2. Go to repo → Packages — your images will appear after first CI run
3. Make images public: Packages → each image → Package settings → Make public
4. Add `KUBECONFIG` secret for CD to work
5. Merge to `main` — CD deploys automatically

## Rollback

```bash
# Find the SHA you want to roll back to
git log --oneline

# Manually update image tag and apply
kubectl set image deployment/api-gateway \
  api-gateway=ghcr.io/<owner>/bookstore-api-gateway:<old-sha> \
  -n bookstore
```
