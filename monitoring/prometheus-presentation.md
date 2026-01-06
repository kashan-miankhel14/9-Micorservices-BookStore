# 📊 Prometheus Demo Playbook

Present this repo as a **complete, production-style monitoring example**. The guide is meant for a 10-15 minute walk-through in front of your instructor (or team).

---

## 1. What We Will Show

1. **Multi-service bookstore stack** (12 containers) running via Docker Compose.
2. **Prometheus** scraping every service (10 targets) + MongoDB.
3. **Instrumented metrics** created with `prom-client` in each Node/Next.js service.
4. **Live queries** in the Prometheus UI.
5. (Optional) **Grafana dashboard** demo using the same Prometheus data-source.

---

## 2. Spin Up the Stack

```bash
# from repo root
docker compose up --build -d  # rebuilds & starts all containers
```

Ports

| Service                | URL                         |
|------------------------|-----------------------------|
| API Gateway            | http://localhost:8090       |
| Frontend (Next.js)     | http://localhost:3000       |
| Prometheus UI          | http://localhost:9091       |

> Tip  `docker compose ps` to confirm every container is **Up**.

---

## 3. Verify Health / Metrics

```bash
# Gateway health
curl http://localhost:8090/health

# Any backend metrics endpoint
curl http://localhost:3003/metrics | head   # order-service example

# Frontend metrics
curl http://localhost:3000/metrics | head
```

Each endpoint returns text in Prometheus exposition format.

---

## 4. Explore Prometheus

1. Open **Targets** tab → confirm all `bookstore` job targets are **UP 1/1**.
2. Open **Graph** tab; run the following example queries:

```promql
up                                 # all targets with 1 = UP
http_request_duration_seconds_sum  # histogram sum per service
rate(process_cpu_seconds_total[1m])
```

3. Click **Execute** → **Graph** to visualize.

> Latency histogram metric name varies per service:
> * `http_request_duration_seconds`
> * `frontend_http_request_duration_seconds`

---

## 5. (Optional) Grafana Dashboard

Grafana isn’t part of the default compose file, but you can add it quickly:

```yaml
# append to docker-compose.yml
  grafana:
    image: grafana/grafana-oss:latest
    ports:
      - "3009:3000"
    depends_on:
      - prometheus
```

Then import dashboard **1860** (Prometheus 2.0 Overview) and set the data-source URL to `http://prometheus:9090`.

---

## 6. Talking Points for the Presentation

* **Service discovery** – static `scrape_configs` in `monitoring/prometheus.yml`.
* **Instrumentation** – `prom-client` used in every Express & Next.js service.
* **Histograms vs Counters** – why latency uses histograms; default process metrics.
* **Scaling** – same pattern works in Kubernetes using `prometheus.io/scrape` annotations.
* **Alerting** – mention adding rule files for 99th-percentile latency or target down alerts.

---

## 7. Troubleshooting Tips (Live Demo)

| Symptom                        | Quick Fix                                   |
|--------------------------------|---------------------------------------------|
| Target shows **DOWN**          | `docker compose logs <service>` → endpoint? |
| Frontend 404 on /metrics       | Ensure rebuild after code change.           |
| Prometheus stale data          | `curl -X POST http://localhost:9091/-/reload`|

---

## 8. Useful Commands Cheat-sheet

```bash
# Tail logs for one container
docker compose logs -f user-service

# Restart a single service
docker compose restart api-gateway

# Remove everything
docker compose down -v
```

---

## 9. PromQL & Graph UI Cheat-sheet

Use these live in the **Graph** or **Expression** tab to prove observability value.

| Goal | PromQL | Notes |
|------|--------|-------|
| Show all targets UP | `up` | value 1 per job/instance when healthy |
| Per-service request rate | `sum by (instance) (rate(http_request_duration_seconds_count[1m]))` | swap metric for `frontend_http_request_duration_seconds_count` on Next.js |
| 95th-percentile latency | `histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))` | shows p95 over 5-minute window |
| CPU usage % | `rate(process_cpu_seconds_total[1m]) * 100` | per container |
| Memory RSS bytes | `process_resident_memory_bytes` | gauge |
| Error ratio (4xx/5xx) | `sum(rate(http_requests_total{status=~"4..|5.."}[5m])) / sum(rate(http_requests_total[5m]))` | requires `http_requests_total` counter |

Steps in the UI:

1. **Expression** field → paste any query above.
2. Click **Execute**.
3. Switch between **Table** (raw values) and **Graph** for trends.
4. Use the time-range selector (top-right) to zoom (e.g., last 1h, 5m).
5. Use **Add Graph** to pin multiple queries side-by-side.

> For histogram metrics (`*_bucket`), always wrap with `rate()` and `histogram_quantile()` to get accurate percentiles.

## 10. Next Steps

* Add recording rules & alerts (`monitoring/alert.rules.yml`).
* Push metrics to Grafana Cloud or another remote write target.
* Automatic service discovery on Kubernetes via annotations.

---

### References

* Prometheus docs – https://prometheus.io/docs
* prom-client – https://github.com/siimon/prom-client
* Grafana – https://grafana.com
