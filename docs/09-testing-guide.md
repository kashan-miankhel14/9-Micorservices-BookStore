# Manual Testing Guide — Bookstore Microservices

Run these in order. Each section tests one layer of the stack.

---

## 0. Prerequisites

Everything should already be running. Verify:

```bash
make ps
```

All 15 containers should show "Up". If not:

```bash
make up
```

---

## 1. Application Layer

### 1.1 Health checks — all services

```bash
curl http://localhost:8090/health
curl http://localhost:3001/health
curl http://localhost:3002/health
curl http://localhost:3003/health
curl http://localhost:3004/health
curl http://localhost:3005/health
curl http://localhost:3006/health
curl http://localhost:3007/health
curl http://localhost:3008/health
```

Every one should return: `{"status":"ok","service":"<name>"}`

### 1.2 User signup

```bash
curl -s -X POST http://localhost:8090/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bookstore.com","password":"Test1234","name":"Test User"}' | jq .
```

Expected: `{ "token": "...", "user": { "id": "...", "email": "...", "name": "..." } }`

Save the token:

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@bookstore.com","password":"Test1234","name":"Dev User"}' | jq -r .token)

echo $TOKEN
```

### 1.3 Login

```bash
TOKEN=$(curl -s -X POST http://localhost:8090/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"dev@bookstore.com","password":"Test1234"}' | jq -r .token)

echo $TOKEN
```

### 1.4 Get current user (protected route)

```bash
curl -s http://localhost:8090/users/me \
  -H "Authorization: Bearer $TOKEN" | jq .
```

Expected: your user object. Without the token you should get 401.

### 1.5 Books

```bash
# List books (public)
curl -s http://localhost:8090/books | jq .

# Add a book
curl -s -X POST http://localhost:8090/books \
  -H "Content-Type: application/json" \
  -d '{"title":"Clean Code","author":"Robert Martin","price":29.99,"genre":"Programming"}' | jq .

# Get book by ID (replace <id> with one from the list)
curl -s http://localhost:8090/books/<id> | jq .
```

### 1.6 Cart (protected)

```bash
# Add to cart
curl -s -X POST http://localhost:8090/cart \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"<book-id>","quantity":1}' | jq .

# View cart
curl -s http://localhost:8090/cart \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 1.7 Orders (protected)

```bash
# Place order
curl -s -X POST http://localhost:8090/orders \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"items":[{"bookId":"<book-id>","quantity":1,"price":29.99}],"total":29.99}' | jq .

# List orders
curl -s http://localhost:8090/orders \
  -H "Authorization: Bearer $TOKEN" | jq .
```

### 1.8 Reviews (public read, auth write)

```bash
curl -s -X POST http://localhost:8090/reviews \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"bookId":"<book-id>","rating":5,"comment":"Great book"}' | jq .

curl -s http://localhost:8090/reviews?bookId=<book-id> | jq .
```

### 1.9 Recommendations (public)

```bash
curl -s http://localhost:8090/recs | jq .
```

### 1.10 Auth guard test — should return 401

```bash
curl -s http://localhost:8090/orders
curl -s http://localhost:8090/cart
```

Both should return: `{"error":"Missing Authorization header"}`

---

## 2. Frontend

Open http://localhost:3000 in your browser.

- Sign up with a new account
- Log in
- Browse books
- Add a book to cart
- Place an order
- Leave a review

---

## 3. Metrics Layer

### 3.1 Verify /metrics endpoints

```bash
curl -s http://localhost:3001/metrics | head -20
curl -s http://localhost:3002/metrics | head -20
curl -s http://localhost:8090/metrics | head -20
```

You should see Prometheus exposition format text starting with `# HELP` and `# TYPE`.

### 3.2 Prometheus targets

Open: http://localhost:9091/targets

All 10 services under the `bookstore` job should show State: UP.

If any show DOWN, check:

```bash
docker-compose logs <service-name>
```

### 3.3 Prometheus queries

Open: http://localhost:9091/graph

Paste each query and click Execute:

```promql
# Are all services up?
up{job="bookstore"}

# Request rate per service
sum by (instance) (rate(http_request_duration_seconds_count[1m]))

# p95 latency
histogram_quantile(0.95, sum by (le, instance) (rate(http_request_duration_seconds_bucket[5m])))

# Memory usage
process_resident_memory_bytes{job="bookstore"}

# CPU usage
rate(process_cpu_seconds_total[1m]) * 100
```

Generate traffic first (run the curl commands from section 1), then re-run the queries to see values.

### 3.4 Alert rules

Open: http://localhost:9091/alerts

You should see 4 rules listed:
- ServiceDown
- HighErrorRate
- HighLatency
- HighMemoryUsage

All should be in "inactive" state (green) when everything is healthy.

### 3.5 Trigger ServiceDown alert (optional test)

```bash
# Stop one service
docker-compose stop payment-service

# Wait ~1 minute, then check Prometheus alerts
# http://localhost:9091/alerts -> ServiceDown should go "pending" then "firing"

# Bring it back
docker-compose start payment-service
```

---

## 4. Grafana

Open: http://localhost:3030
Login: admin / admin

### 4.1 Check datasources

Go to: Connections -> Data sources

You should see:
- Prometheus (default) — URL: http://prometheus:9090
- Loki — URL: http://loki:3100

Click each -> "Save & test" -> should show green "Data source is working".

### 4.2 Check pre-built dashboard

Go to: Dashboards -> Bookstore -> Bookstore Overview

You should see 6 panels:
- Request Rate
- p95 Latency
- 5xx Error Rate
- Service Health (UP/DOWN)
- Memory Usage
- Container Logs

Generate traffic (run curl commands from section 1) and watch the panels update.

### 4.3 Check logs in Grafana (Loki)

Go to: Explore -> select Loki datasource

Run this query:

```
{job="docker"}
```

You should see live logs from all containers. Filter to one service:

```
{container="api-gateway"}
```

---

## 5. Docker Layer

### 5.1 All containers running

```bash
docker-compose ps
```

### 5.2 Resource usage

```bash
docker stats --no-stream
```

Shows CPU and memory per container.

### 5.3 Logs

```bash
# All services
make logs

# Single service
docker-compose logs -f api-gateway
docker-compose logs -f user-service
```

### 5.4 Verify volumes persist

```bash
# Stop everything
make down

# Start again
make up

# Data should still be there
curl -s http://localhost:8090/books | jq .
```

### 5.5 Rebuild a single service

```bash
docker-compose build user-service
docker-compose up -d user-service
```

---

## 6. Environment / Secrets

### 6.1 Verify no hardcoded secrets in compose

```bash
grep -n "supersecret\|password123\|example" docker-compose.yml
```

Should return nothing — all values come from .env.

### 6.2 Verify .env is gitignored

```bash
git status
```

`.env` should NOT appear in untracked files. `.env.example` should appear.

---

## 7. Kubernetes (requires a cluster)

### 7.1 Deploy

```bash
# Minikube
minikube start
eval $(minikube docker-env)
docker-compose build
make deploy-k8s
```

### 7.2 Verify all pods running

```bash
kubectl get pods -n bookstore
kubectl get deployments -n bookstore
kubectl get services -n bookstore
```

All pods should be Running, all deployments Available.

### 7.3 Check HPA

```bash
kubectl get hpa -n bookstore
```

Should show api-gateway-hpa and frontend-hpa with MINPODS/MAXPODS.

### 7.4 Check NetworkPolicy

```bash
kubectl get networkpolicy -n bookstore
```

Should list: default-deny-ingress, allow-frontend-ingress, allow-api-gateway, allow-services-from-gateway, allow-mongodb, allow-prometheus-scrape.

### 7.5 Access services in K8s

```bash
kubectl port-forward svc/api-gateway 8090:3000 -n bookstore &
kubectl port-forward svc/prometheus 9091:9090 -n bookstore &
kubectl port-forward svc/grafana 3030:3000 -n bookstore &
```

Then run the same curl tests from section 1.

### 7.6 Check liveness/readiness probes

```bash
kubectl describe deployment api-gateway -n bookstore | grep -A 10 "Liveness\|Readiness"
```

### 7.7 Test rolling restart (zero downtime)

```bash
kubectl rollout restart deployment/api-gateway -n bookstore
kubectl rollout status deployment/api-gateway -n bookstore
```

Should complete without downtime.

### 7.8 Test manual scaling

```bash
kubectl scale deployment api-gateway --replicas=3 -n bookstore
kubectl get pods -n bookstore | grep api-gateway
kubectl scale deployment api-gateway --replicas=2 -n bookstore
```

---

## 8. CI/CD (requires GitHub repo)

### 8.1 Trigger CI

```bash
git add .
git commit -m "test: trigger CI pipeline"
git push
```

Go to: GitHub repo -> Actions tab

You should see the CI workflow running with jobs:
- lint-and-build
- docker-build-push (matrix of 10 services)

### 8.2 Verify images in GHCR

Go to: GitHub profile -> Packages

After CI passes on main, you should see 10 packages:
- bookstore-frontend
- bookstore-api-gateway
- bookstore-user-service
- ... etc

### 8.3 Trigger CD

Merge or push to main branch. The CD workflow should:
1. Update image tags in K8s manifests to the new SHA
2. Run kubectl apply
3. K8s pulls new images and does a rolling update

---

## 9. Quick Smoke Test (all at once)

Run this to hit every service in one go:

```bash
BASE=http://localhost:8090

# Health
for port in 8090 3001 3002 3003 3004 3005 3006 3007 3008; do
  echo -n "Port $port: "
  curl -s http://localhost:$port/health | jq -r .status 2>/dev/null || echo "no /health"
done

# Signup and get token
TOKEN=$(curl -s -X POST $BASE/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"smoke@test.com","password":"Test1234","name":"Smoke Test"}' | jq -r .token)

echo "Token: ${TOKEN:0:20}..."

# Protected route
curl -s $BASE/orders -H "Authorization: Bearer $TOKEN" | jq .

# Metrics
echo "Metrics check:"
curl -s http://localhost:3001/metrics | grep "http_request_duration" | head -3
```

---

## Summary Checklist

- [ ] All 15 containers running (make ps)
- [ ] All 9 health endpoints return ok
- [ ] Signup / login / protected routes work
- [ ] Prometheus targets all UP (http://localhost:9091/targets)
- [ ] Alert rules visible (http://localhost:9091/alerts)
- [ ] Grafana dashboard loads with data (http://localhost:3030)
- [ ] Loki logs visible in Grafana Explore
- [ ] .env is gitignored, no hardcoded secrets in compose
- [ ] K8s: all pods Running, HPA and NetworkPolicy present
- [ ] CI: GitHub Actions passes on push
- [ ] CD: push to main triggers deploy
