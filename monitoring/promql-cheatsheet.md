# 🧪 PromQL Cheat-sheet for Bookstore Demo

Use these commands in Prometheus → **Graph** tab (or `curl` to `/api/v1/query`). Each entry explains the purpose, when to run it, and how to talk about it.

| # | Query | Purpose / Talking Point | Demo Instructions |
|---|-------|-------------------------|-------------------|
| 1 | `up` | Shows health of every scrape target (1 = UP, 0 = DOWN). Proves Prometheus is pulling data from all services. | **Graph → Expression = `up` → Execute → Table.** Mention job labels (e.g., `bookstore`). |
| 2 | `up{job="bookstore"}` | Filters to only bookstore services. Useful if Prometheus scrapes other exporters. | Explain label filtering. |
| 3 | `sum by (instance) (rate(http_request_duration_seconds_count[1m]))` | Per-service request throughput in requests/sec (backend services). | After an API call, run query to see affected service spike. Mention that `_count` is auto-created for histograms. |
| 4 | `sum by (instance) (rate(frontend_http_request_duration_seconds_count[1m]))` | Same as #3 but specific to the Next.js frontend histogram. | Hit the frontend, refresh query. |
| 5 | `histogram_quantile(0.95, sum by (le, instance) (rate(http_request_duration_seconds_bucket[5m])))` | 95th percentile latency per service. Show why histograms matter. | Note: Wait a minute of traffic to populate buckets. |
| 6 | `rate(process_cpu_seconds_total[1m]) * 100` | CPU usage (approx. %) per container. Multiply by 100 to explain percentages. | Switch to **Graph** view, highlight spikes during load. |
| 7 | `process_resident_memory_bytes` | Current memory usage per target. Good for capacity discussions. | Use Table view, emphasize units (bytes). |
| 8 | `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))` | Error ratio (server errors / total). Use if you add the `http_requests_total` counter. | If missing metrics, explain required instrumentation. |
| 9 | `sum(rate(nodejs_eventloop_lag_seconds[5m]))` | Event loop responsiveness (if enabled). Shows Node health beyond CPU. | Optional — highlight extensibility of metrics. |
| 10 | `max_over_time(up{job="bookstore"}[1h])` | Detect if any service flapped in the last hour (value 0 indicates downtime). | Good reliability story. |

## How to Demo in the Graph Tab

1. Open Prometheus UI → **Graph**.
2. Paste a query from the table into **Expression**.
3. Press **Execute**.
4. Use **Tab** view to verify numeric values, then switch to **Graph** to visualize trends.
5. Use the time range selector (top-right) to zoom (e.g., 5m, 1h).
6. Optional: click **Add Graph** to pin multiple queries side-by-side (e.g., latency + throughput).

---

## Deep Dive: What Each Query Teaches You

### 1. `up`
* **Idea**: Every scrape target exposes an `up` metric set to `1` on successful scrapes.
* **Use it** to prove connectivity instantly; if any value is `0`, jump to the service logs.

### 2. `up{job="bookstore"}`
* **Idea**: Adds a label selector (`job="bookstore"`) so you only see the services from this stack.
* **Lesson**: PromQL is all about filtering with `{label="value"}` expressions.

### 3. `sum by (instance) (rate(http_request_duration_seconds_count[1m]))`
* **Idea**: Histograms automatically create `_count`; using `rate()` turns that into requests per second.
* **Lesson**: `rate(metric[window])` measures per-second change; `sum by (instance)` aggregates all routes per service.

### 4. Frontend counterpart
* **Query**: `sum by (instance) (rate(frontend_http_request_duration_seconds_count[1m]))`
* **Idea**: Same as #3 but for the Next.js histogram name. Shows the UI traffic.
* **Lesson**: Metric names differ per service; pattern stays the same.

### 5. 95th percentile latency
* **Query**: `histogram_quantile(0.95, sum by (le, instance) (rate(http_request_duration_seconds_bucket[5m])))`
* **Idea**: `histogram_quantile` turns bucket data into percentiles. Use `rate()` to convert counts into rates first.
* **Lesson**: Explains why we capture histogram buckets instead of just averages.

### 6. `rate(process_cpu_seconds_total[1m]) * 100`
* **Idea**: CPU time is cumulative seconds; `rate()` gives seconds/second → multiply by 100 for % (approx when 1 core).
* **Lesson**: You can transform raw counters into human-friendly units.

### 7. `process_resident_memory_bytes`
* **Idea**: A gauge showing current RSS memory. No `rate()` needed.
* **Lesson**: Compare across services to discuss capacity.

### 8. Error ratio
* **Query**: `sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
* **Idea**: Divides 5xx rate by overall rate to get a percentage of errors.
* **Lesson**: Combine filters (`status=~"5.."`) with math for SLO-style views.

### 9. Event loop lag
* **Query**: `sum(rate(nodejs_eventloop_lag_seconds[5m]))`
* **Idea**: Optional Node metric; spikes mean the event loop is blocked.
* **Lesson**: Prometheus is extensible—add exporters or custom metrics for deeper health.

### 10. `max_over_time(up{job="bookstore"}[1h])`
* **Idea**: Looks back over 1 hour; if any sample was `0`, max drops below 1.
* **Lesson**: Range vectors (`[1h]`) let you analyze history without leaving PromQL.

## Command-line Alternative

You can run queries outside the UI using HTTP:

```bash
curl -G "http://localhost:9091/api/v1/query" --data-urlencode "query=up"
```

This returns JSON. Mention you could wire this into scripts, alerting, or dashboards.

## What Else to Show in Prometheus

* **Targets** page – every service is UP and displays scrape duration / last scrape.
* **Rules** (if added later) – mention how alerts would appear here.
* **Status → Configuration** – show `scrape_configs` to prove manual service discovery.
* **Status → TSDB Status** – optional, but demonstrates Prometheus internals (storage size, churn).

## Storyline Tips

1. **Health** → `up` proves connectivity.
2. **Traffic** → request rate queries show live load.
3. **Latency** → percentiles show performance.
4. **Resources** → CPU/memory demonstrate backend health.
5. **Reliability** → `max_over_time` reveals downtime.
6. **Extensibility** → mention how additional queries/alerts build on the same data.

Use this sequence to impress the audience that Prometheus isn’t just a dashboard; it’s a query engine for all observability questions.
