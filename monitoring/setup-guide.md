# Setup Guide (Bookstore + Prometheus)

Follow this from top to bottom.

---

## 1. Requirements

| Tool | Why you need it | Download |
|------|-----------------|----------|
| Docker Desktop or Docker Engine | Runs all services in containers | https://www.docker.com/products/docker-desktop/ |
| Docker Compose | Starts multiple containers together | Comes with Docker Desktop |
| Web browser | View Prometheus, frontend, etc. | Any browser |

---

## 2. Start Everything

```bash
cp .env.example .env
make up
```

- `make up` runs `docker-compose up -d` in the background.

Check status:

```bash
make ps
```

All services should say `Up`.

---

## 3. Useful URLs

| Service      | URL                     |
|--------------|-------------------------|
| Frontend     | http://localhost:3000   |
| API Gateway  | http://localhost:8090   |
| Prometheus   | http://localhost:9091   |
| Grafana      | http://localhost:3030   |

Open each in the browser to confirm they work. Grafana login: admin / admin.

---

## 4. Test the App Quickly

1. Go to http://localhost:3000.
2. Sign up, log in, browse books, place an order.
3. These actions send traffic to all microservices, so Prometheus has data to show.

---

## 5. Prometheus Basics

- Prometheus scrapes each service on `/metrics`.
- Scrape interval comes from `monitoring/prometheus.yml` (already configured).
- Targets page (http://localhost:9091/targets) shows if each service is UP.

If a target is DOWN, click the entry to see the error message (usually 404 or DNS).

---

## 6. Shutdown / Cleanup

```bash
make down       # stop containers
make clean      # stop + remove volumes + remove images
```

Run `make clean` only if you want a completely fresh state.
