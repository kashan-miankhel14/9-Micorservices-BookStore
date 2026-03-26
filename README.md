# Bookstore Microservices

A production-grade microservices bookstore with full DevOps implementation.

## Quick Start

```bash
git clone https://github.com/<your-username>/bookstore-microservices.git
cd bookstore-microservices
cp .env.example .env
make up
```

Open http://localhost:3000 — everything is running.

## URLs

| Service    | URL                              | Credentials  |
|------------|----------------------------------|--------------|
| Frontend   | http://localhost:3000            |              |
| API Gateway| http://localhost:8090/health     |              |
| Prometheus | http://localhost:9091/targets    |              |
| Grafana    | http://localhost:3030            | admin / admin|

## Stack

- App: Next.js frontend, 9 Node.js/Express microservices, MongoDB
- Containers: Docker + Docker Compose
- Orchestration: Kubernetes (Deployments, StatefulSet, Ingress, HPA, NetworkPolicy)
- CI/CD: GitHub Actions → GHCR → K8s rolling deploy
- Observability: Prometheus + Grafana + Loki + Promtail + alerting rules

## Services

| Service                | Port | Responsibility          |
|------------------------|------|-------------------------|
| api-gateway            | 8090 | JWT auth, routing       |
| user-service           | 3001 | Signup, login           |
| book-catalog-service   | 3002 | Book CRUD               |
| order-service          | 3003 | Order lifecycle         |
| payment-service        | 3004 | Payment processing      |
| review-service         | 3005 | Book reviews            |
| cart-service           | 3006 | Shopping cart           |
| recommendation-service | 3007 | Book recommendations    |
| notification-service   | 3008 | Notifications           |

## Makefile Commands

```bash
make up           # Start all services
make down         # Stop all services
make build        # Rebuild images
make logs         # Follow all logs
make clean        # Remove containers, volumes, images
make deploy-k8s   # Deploy to Kubernetes
make monitoring   # Print monitoring URLs
```

## Documentation

| Doc | Description |
|-----|-------------|
| [Architecture](docs/01-architecture.md) | System diagram, service map, tech stack |
| [Local Development](docs/02-local-development.md) | Setup, run, verify |
| [Docker](docs/03-docker.md) | Dockerfiles, Compose deep dive |
| [Kubernetes](docs/04-kubernetes.md) | Manifests, deploy, HPA, NetworkPolicy |
| [CI/CD](docs/05-ci-cd.md) | GitHub Actions pipelines, GHCR, rollback |
| [Monitoring](docs/06-monitoring.md) | Prometheus, Grafana, Loki, PromQL |
| [Security](docs/07-security.md) | Secrets, NetworkPolicy, hardening checklist |
| [Troubleshooting](docs/08-troubleshooting.md) | Common issues and fixes |
| [Testing Guide](docs/09-testing-guide.md) | Manual test commands for every layer |
| [Runbook](docs/10-runbook.md) | Step-by-step verified setup from scratch |
