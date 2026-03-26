# PromQL Queries in Plain Words

Use these commands in Prometheus Graph tab. Each entry shows the query followed by a one-line explanation.

`up`
: Prometheus can see the service (1 = OK, 0 = problem). Use first to prove everything is alive.

`up{job="bookstore"}`
: Same metric but filtered to our project only. Demonstrates label filtering.

`sum by (instance) (rate(http_request_duration_seconds_count[1m]))`
: Requests per second for each backend service after you generate traffic (login/order).

`sum by (instance) (rate(frontend_http_request_duration_seconds_count[1m]))`
: Requests per second hitting the Next.js frontend when you refresh the UI.

`histogram_quantile(0.95, sum by (le, instance) (rate(http_request_duration_seconds_bucket[5m])))`
: 95% of backend requests finish faster than this number - talk about latency and SLOs.

`rate(process_cpu_seconds_total[1m]) * 100`
: Approximate CPU usage percent per container. Great for resource discussion.

`process_resident_memory_bytes`
: Current memory (bytes) used by each service. Mention capacity planning.

`sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))`
: Percentage of requests returning server errors (5xx). Use for reliability/error budget.

`sum(rate(nodejs_eventloop_lag_seconds[5m]))`
: If this rises, the Node event loop is blocked. Advanced health signal.

`max_over_time(up{job="bookstore"}[1h])`
: Shows if any service was down during the last hour (1 = always up, 0 = had downtime).

---

## Step-by-step: Running a Query in Prometheus

1. Go to http://localhost:9091
2. Click Graph at the top.
3. In the Expression box, paste one of the queries above.
4. Press Execute.
5. Look at the Table view for numbers.
6. Click Graph to see the trend line. Resize time range with the drop-down (5m / 1h / 1d).

---

## Suggested Presentation Flow

1. Health Check -> Queries #1 and #2.
2. Traffic -> Queries #3 and #4 after you click around the app.
3. Latency -> Query #5 (explain 95th percentile).
4. Resources -> Queries #6 and #7.
5. Errors -> Query #8 (even if zero, explain the idea).
6. Advanced Signals -> Query #9 (if you instrument it) and #10 for downtime history.

---

## How to Start Everything

```bash
make up
```

Then open http://localhost:3000 (app) and http://localhost:9091 (Prometheus).
