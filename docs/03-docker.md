# Docker Guide

## Dockerfiles

### Frontend (root `Dockerfile`) — Multi-Stage Build

```
Stage 1 (builder): node:20-alpine
  - npm ci (installs all deps including devDeps)
  - npm run build (produces .next/)

Stage 2 (production): node:20-alpine
  - npm ci --only=production (no devDeps = smaller image)
  - COPY --from=builder .next/ and public/
  - CMD ["npm", "start"]
```

Why multi-stage? The builder stage needs TypeScript, ESLint, etc. The production image doesn't. This cuts the final image size significantly.

### Microservice Dockerfiles (`services/*/Dockerfile`)

Single-stage, minimal:
```dockerfile
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package.json ./
RUN npm install --only=production
COPY . .
EXPOSE <port>
CMD ["node", "index.js"]
```

## Docker Compose

### Key concepts used

**Health checks** — MongoDB has a health check using `mongosh ping`. Services that depend on MongoDB use `condition: service_healthy` so they don't start until MongoDB is actually ready (not just running).

**Docker DNS** — Services reference each other by container name (e.g., `http://user-service:3001`). Docker Compose creates an internal network where container names resolve automatically.

**Named volumes** — `mongo-data`, `prometheus-data`, `grafana-data`, `loki-data` persist data across `docker-compose down`. Use `make clean` to wipe them.

**Environment variables** — All secrets and config come from `.env`. Never hardcoded in `docker-compose.yml`.

### Useful commands

```bash
# Build all images
docker-compose build

# Build a single service
docker-compose build user-service

# Rebuild without cache
docker-compose build --no-cache

# View resource usage
docker stats

# Exec into a container
docker exec -it user-service sh

# Check a service's environment
docker exec api-gateway env
```

## Image Tagging (CI/CD)

In CI, images are tagged with both `latest` and the Git SHA:
```
ghcr.io/<owner>/bookstore-api-gateway:latest
ghcr.io/<owner>/bookstore-api-gateway:abc1234
```

The SHA tag enables rollbacks — you can always deploy a specific commit's image.

## .dockerignore

The root `.dockerignore` excludes `node_modules`, `.next`, `.git`, etc. to keep build context small and fast.
