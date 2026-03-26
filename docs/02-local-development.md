# Local Development Guide

## Prerequisites

- Docker Desktop (or Docker Engine + Docker Compose v2)
- Node.js 20+
- npm
- Git
- make (optional but recommended)

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/<your-username>/bookstore-microservices.git
cd bookstore-microservices
```

### 2. Create your .env file

```bash
cp .env.example .env
```

The defaults in `.env.example` work out of the box for local development. Only change them if you have port conflicts.

### 3. Start everything

```bash
make up
# or without make:
docker-compose up -d
```

This starts: MongoDB, all 9 microservices, API Gateway, Frontend, Prometheus, Grafana, Loki, Promtail.

### 4. Verify services are running

```bash
make ps
# or:
docker-compose ps
```

All services should show `Up`.

### 5. Access the application

| URL | What |
|---|---|
| http://localhost:3000 | Frontend (Next.js) |
| http://localhost:8090/health | API Gateway health check |
| http://localhost:9091 | Prometheus |
| http://localhost:3030 | Grafana (admin / admin) |

### 6. Verify Prometheus targets

Open http://localhost:9091/targets — all 10 services should show **UP** (green).

### 7. View logs

```bash
make logs
# or a specific service:
docker-compose logs -f user-service
```

## Running Frontend Locally (without Docker)

```bash
npm install
npm run dev
```

The frontend runs on http://localhost:3000 and proxies API calls to `http://localhost:8090`.

## Stopping

```bash
make down          # stop containers, keep volumes
make clean         # stop + remove volumes + remove images
```
