# Bookstore Microservices with Prometheus Monitoring

A comprehensive microservices-based bookstore application with full Prometheus monitoring implementation.

## 🏗️ Architecture Overview

This project consists of:
- **Frontend**: Next.js application (port 3000)
- **API Gateway**: Express.js gateway (port 8090)
- **9 Microservices**: Individual Node.js services
- **Database**: MongoDB
- **Monitoring**: Prometheus with comprehensive metrics

## 📊 Prometheus Implementation

### ✅ What's Implemented

#### Prometheus Server
- **Image**: `prom/prometheus:latest`
- **Port**: 9091 (mapped from container port 9090)
- **Configuration**: Mounted from `./monitoring/prometheus.yml`
- **Storage**: TSDB storage enabled
- **Lifecycle**: Hot-reload enabled via `--web.enable-lifecycle`

#### Metrics Collection
All microservices implement comprehensive Prometheus metrics:

```javascript
// Each service includes:
- prom-client for metrics collection
- Default Node.js metrics (CPU, memory, etc.)
- Custom HTTP request duration histogram
- /metrics endpoint for scraping
```

**Custom Metrics:**
- `http_request_duration_seconds`: Tracks request latency by method, route, and status code
- Labels: `method`, `route`, `status`

**Default Metrics:**
- Node.js process metrics
- Event loop lag
- Memory usage
- GC statistics

#### Scrape Configuration
```yaml
scrape_configs:
  - job_name: 'bookstore'
    static_configs:
      - targets:
          - 'frontend:3000'
          - 'api-gateway:3000'
          - 'user-service:3001'
          - 'book-catalog-service:3002'
          - 'order-service:3003'
          - 'payment-service:3004'
          - 'review-service:3005'
          - 'cart-service:3006'
          - 'recommendation-service:3007'
          - 'notification-service:3008'
    metrics_path: '/metrics'
    scrape_interval: 10s
    scheme: http
```

## 🚀 Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 18+ (for local development)

### Running the Application

1. **Start all services:**
```bash
docker-compose up -d
```

2. **Access Prometheus:**
- Open http://localhost:9091
- Browse targets at Status > Targets
- All services should be "UP"

3. **Access the application:**
- Frontend: http://localhost:3000
- API Gateway: http://localhost:8090

## 📈 Monitoring Dashboard

### Key Metrics to Monitor

1. **HTTP Request Duration**
   ```promql
   # Average request duration by service
   rate(http_request_duration_seconds_sum[5m]) / 
   rate(http_request_duration_seconds_count[5m])
   ```

2. **Request Rate**
   ```promql
   # Requests per second by service
   rate(http_request_duration_seconds_count[5m])
   ```

3. **Error Rate**
   ```promql
   # 5xx error rate
   rate(http_request_duration_seconds_count{status=~"5.."}[5m])
   ```

4. **Service Health**
   ```promql
   # Service availability
   up{job="bookstore"}
   ```

### Service-Specific Monitoring

Each microservice exposes metrics at:
- `http://localhost:<port>/metrics`

Example service endpoints:
- User Service: http://localhost:3001/metrics
- API Gateway: http://localhost:8090/metrics
- Book Catalog: http://localhost:3002/metrics

## 🔧 Configuration Details

### Prometheus Configuration File
Location: `./monitoring/prometheus.yml`

Key settings:
- **Global scrape interval**: 15s
- **Evaluation interval**: 15s
- **Job scrape interval**: 10s (more frequent for real-time monitoring)

### Docker Compose Integration
The Prometheus service depends on all other services, ensuring:
- Services are running before scraping begins
- Proper startup sequence
- Health checks for MongoDB

### Metrics Implementation Pattern
Each service follows this pattern:

```javascript
import promClient from "prom-client";

// Create registry
const register = new promClient.Registry();
promClient.collectDefaultMetrics({ register });

// Custom metrics
const httpRequestDuration = new promClient.Histogram({
  name: "http_request_duration_seconds",
  help: "Duration of HTTP requests in seconds",
  labelNames: ["method", "route", "status"],
});

// Middleware for request tracking
app.use((req, res, next) => {
  const end = httpRequestDuration.startTimer();
  res.on("finish", () => {
    end({
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode,
    });
  });
  next();
});

// Metrics endpoint
app.get("/metrics", async (_req, res) => {
  res.set("Content-Type", register.contentType);
  res.end(await register.metrics());
});
```

## 📁 Project Structure

```
├── services/                 # Microservices
│   ├── api-gateway/
│   ├── user-service/
│   ├── book-catalog-service/
│   ├── order-service/
│   ├── payment-service/
│   ├── review-service/
│   ├── cart-service/
│   ├── recommendation-service/
│   └── notification-service/
├── monitoring/              # Prometheus configs
│   ├── prometheus.yml      # Main configuration
│   └── *.md               # Documentation files
├── docker-compose.yml      # All services
├── Dockerfile             # Frontend build
└── package.json           # Dependencies
```

## 🔍 Troubleshooting

### Common Issues

1. **Services not showing in Prometheus targets**
   - Check if services are running: `docker-compose ps`
   - Verify service health: Check logs with `docker-compose logs <service>`
   - Ensure metrics endpoints are accessible

2. **No metrics data**
   - Verify `/metrics` endpoint returns data
   - Check Prometheus configuration syntax
   - Ensure proper service discovery (Docker DNS)

3. **High memory usage**
   - Adjust scrape intervals in prometheus.yml
   - Consider metric retention settings

### Useful Commands

```bash
# Check Prometheus targets
curl http://localhost:9091/api/v1/targets

# Query metrics
curl 'http://localhost:9091/api/v1/query?query=up'

# Check service metrics
curl http://localhost:3001/metrics

# View Prometheus logs
docker-compose logs prometheus

# Reload Prometheus config
curl -X POST http://localhost:9091/-/reload
```

## 📚 Additional Resources

- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client npm package](https://www.npmjs.com/package/prom-client)
- [Docker Compose Reference](https://docs.docker.com/compose/)

## 🎯 Next Steps

Potential enhancements:
- Add Grafana for visualization
- Implement alerting rules
- Add custom business metrics
- Implement service-level objectives (SLOs)
- Add distributed tracing

---

**Status**: ✅ Prometheus monitoring fully implemented and operational
