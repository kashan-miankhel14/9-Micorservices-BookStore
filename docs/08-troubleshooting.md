# Troubleshooting Guide

## Docker Compose Issues

### Services not starting

```bash
# Check what's running
docker-compose ps

# Check logs for a specific service
docker-compose logs user-service

# Check all logs
make logs
```

### MongoDB connection refused

The services depend on MongoDB being healthy, not just running. If you see `MongoNetworkError`:

```bash
# Check MongoDB health
docker inspect mongo | grep -A 10 Health

# Force restart
docker-compose restart mongo
# Wait ~15s then:
docker-compose restart user-service
```

### Port already in use

```bash
# Find what's using the port
sudo lsof -i :3001

# Change the port in .env
PORT_USER=3011
docker-compose up -d
```

### Prometheus targets showing DOWN

```bash
# Verify the service's /metrics endpoint works
curl http://localhost:3001/metrics

# Check if the service is on the right network
docker network inspect 9-micorservices-bookstore_default
```

### Grafana shows "No data"

1. Check Prometheus is UP: http://localhost:9091/targets
2. In Grafana → Explore → select Prometheus → run `up` query
3. If Prometheus has data but Grafana doesn't, check the datasource URL is `http://prometheus:9090` (not `localhost`)

### Loki logs not appearing in Grafana

```bash
# Check Promtail is running
docker-compose ps promtail

# Check Promtail logs
docker-compose logs promtail

# Verify Loki is receiving data
curl http://localhost:3100/ready
```

---

## Kubernetes Issues

### Pods stuck in Pending

```bash
kubectl describe pod <pod-name> -n bookstore
# Look for "Events" section at the bottom
```

Common causes:
- Insufficient resources → reduce resource requests in deployment YAML
- PVC not bound → check `kubectl get pvc -n bookstore`
- Image pull error → check image name and GHCR access

### ImagePullBackOff

```bash
kubectl describe pod <pod-name> -n bookstore | grep -A 5 "Events"
```

- If using GHCR: make sure the package is public, or create an image pull secret
- If using local images: make sure `imagePullPolicy: Never` and image is loaded into Minikube

### Services can't reach each other

```bash
# Check NetworkPolicy isn't blocking
kubectl get networkpolicy -n bookstore

# Test connectivity from inside a pod
kubectl exec -it deployment/api-gateway -n bookstore -- wget -qO- http://user-service:3001/health
```

### HPA not scaling

```bash
kubectl describe hpa api-gateway-hpa -n bookstore
```

If you see `unknown` for CPU metrics, metrics-server is not running:
```bash
# Minikube
minikube addons enable metrics-server

# Verify
kubectl top pods -n bookstore
```

### MongoDB StatefulSet not ready

```bash
kubectl logs statefulset/mongodb -n bookstore
kubectl describe statefulset mongodb -n bookstore
```

The init container (`chmod`) runs first. If it fails, check PVC permissions.

---

## CI/CD Issues

### CI fails on lint

```bash
# Run locally first
npm run lint
npm run build
```

Fix any TypeScript or ESLint errors before pushing.

### Docker push fails (403)

- Make sure the GHCR package is set to public
- Or add a `GITHUB_TOKEN` with `packages: write` permission (already in the workflow)

### CD fails: kubectl not connecting

- Verify `KUBECONFIG` secret is correctly base64-encoded:
  ```bash
  cat ~/.kube/config | base64 | tr -d '\n'
  ```
- Make sure the cluster API server is publicly accessible (or use a self-hosted runner inside the cluster network)

---

## Common Commands Reference

```bash
# Docker
docker-compose ps                          # service status
docker-compose logs -f <service>           # follow logs
docker exec -it <container> sh             # shell into container
docker stats                               # resource usage

# Kubernetes
kubectl get all -n bookstore               # all resources
kubectl logs -f deployment/<name> -n bookstore
kubectl describe pod <name> -n bookstore
kubectl rollout restart deployment/<name> -n bookstore
kubectl rollout status deployment/<name> -n bookstore

# Prometheus
curl http://localhost:9091/api/v1/targets  # check targets
curl -X POST http://localhost:9091/-/reload # reload config

# Makefile shortcuts
make up       # start all
make down     # stop all
make logs     # follow all logs
make clean    # nuclear option
```
