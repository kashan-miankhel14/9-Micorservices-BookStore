# Monitoring Guide

## Stack

| Tool | Role | Port |
|---|---|---|
| Prometheus | Metrics collection & alerting | 9091 |
| Grafana | Dashboards & visualization | 3030 |
| Loki | Log aggregation | 3100 |
| Promtail | Log shipping (Docker → Loki) | — |

## Accessing

```bash
make up
```

| URL | Credentials |
|---|---|
| http://localhost:9091 | Prometheus (no login) |
| http://localhost:3030 | Grafana: admin / admin |

## Prometheus

### How metrics are collected

Every service instruments itself with `prom-client`:
- Default Node.js metrics (CPU, memory, event loop lag, GC)
- Custom `http_request_duration_seconds` histogram with labels: `method`, `route`, `status`

Prometheus scrapes `/metrics` from all 10 services every 10 seconds.

### Checking targets

http://localhost:9091/targets — all services should be **UP**.

### Key PromQL queries

```promql
# Request rate per service (req/s)
sum by (instance) (rate(http_request_duration_seconds_count[1m]))

# p95 latency per service
histogram_quantile(0.95,
  sum by (le, instance) (rate(http_request_duration_seconds_bucket[5m]))
)

# 5xx error rate
sum by (instance) (rate(http_request_duration_seconds_count{status=~"5.."}[5m]))

# Error rate as percentage
rate(http_request_duration_seconds_count{status=~"5.."}[5m])
/ rate(http_request_duration_seconds_count[5m]) * 100

# Service health
up{job="bookstore"}

# Memory usage
process_resident_memory_bytes{job="bookstore"}

# Average request duration
rate(http_request_duration_seconds_sum[5m])
/ rate(http_request_duration_seconds_count[5m])
```

## Alerting Rules

Defined in `monitoring/alert-rules.yml`:

| Alert | Condition | Severity |
|---|---|---|
| `ServiceDown` | `up == 0` for 1m | critical |
| `HighErrorRate` | 5xx rate > 5% for 5m | warning |
| `HighLatency` | p95 > 1s for 5m | warning |
| `HighMemoryUsage` | RSS > 500MB for 5m | warning |

View active alerts: http://localhost:9091/alerts

### Hot-reload alert rules (no restart needed)

```bash
curl -X POST http://localhost:9091/-/reload
```

## Grafana

### Pre-provisioned dashboard: "Bookstore Overview"

Panels:
- Request Rate (req/s) per service
- p95 Latency per service
- 5xx Error Rate per service
- Service Health (UP/DOWN status)
- Memory Usage per service
- Container Logs (from Loki)

Grafana auto-loads this dashboard on startup — no manual import needed.

### Adding more dashboards

1. Create/edit a dashboard in Grafana UI
2. Export as JSON (Dashboard → Share → Export)
3. Save to `monitoring/grafana/dashboards/`
4. It will be auto-loaded on next Grafana restart

## Loki + Promtail

Promtail runs as a container with access to the Docker socket. It:
1. Discovers all running containers via Docker SD
2. Tails their logs
3. Pushes to Loki with labels: `container`, `stream`

In Grafana, use the **Loki** datasource to query logs:
```
{container="api-gateway"}
{container="user-service"} |= "error"
{job="docker"} | json | level="error"
```

## Kubernetes Monitoring

In K8s, Prometheus uses pod auto-discovery via the Kubernetes SD config. To enable scraping for a pod, add these annotations:

```yaml
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/path: "/metrics"
    prometheus.io/port: "3001"
```

Access in K8s:
```bash
kubectl port-forward svc/prometheus 9091:9090 -n bookstore
kubectl port-forward svc/grafana 3030:3000 -n bookstore
```
