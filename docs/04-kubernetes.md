# Kubernetes Guide

## Prerequisites

- `kubectl` installed
- A running cluster: Minikube, Kind, or cloud (GKE/EKS/AKS)
- For local: images must be built and loaded into the cluster

## Manifest Structure

```
k8s/
├── namespace.yaml              # bookstore namespace
├── config-map.yaml             # non-secret config (URLs, ports)
├── secret.yaml                 # JWT, DB passwords, Grafana password
├── mongodb-pv.yaml             # PersistentVolume (local only)
├── mongodb-pvc.yaml            # PersistentVolumeClaim
├── mongodb-statefulset.yaml    # MongoDB StatefulSet + headless Service
├── api-gateway-deployment.yaml # Deployment + ClusterIP Service
├── *-deployment.yaml           # One file per microservice
├── frontend-deployment.yaml    # Frontend Deployment
├── frontend-service.yaml       # Frontend Service
├── ingress.yaml                # NGINX Ingress
├── hpa.yaml                    # HorizontalPodAutoscaler
├── network-policy.yaml         # NetworkPolicy (zero-trust)
├── prometheus-deployment.yaml  # Prometheus + RBAC + PVC
├── grafana-deployment.yaml     # Grafana + PVC
└── deploy.sh                   # Full deployment script
```

## Deploy

### Local (Minikube)

```bash
# Start Minikube
minikube start

# Build and load images
eval $(minikube docker-env)
docker-compose build

# Deploy
make deploy-k8s

# Access services
kubectl port-forward svc/frontend 3000:3000 -n bookstore
kubectl port-forward svc/api-gateway 8090:3000 -n bookstore
kubectl port-forward svc/prometheus 9091:9090 -n bookstore
kubectl port-forward svc/grafana 3030:3000 -n bookstore
```

### Cloud (GKE/EKS/AKS)

Images are pushed to GHCR by CI. The CD pipeline updates image refs and runs `deploy.sh` automatically on push to `main`.

For manual deploy:
```bash
# Update image refs to GHCR
export SHA=<git-sha>
export OWNER=<github-username>
sed -i "s|image: bookstore-api-gateway:.*|image: ghcr.io/$OWNER/bookstore-api-gateway:$SHA|g" k8s/api-gateway-deployment.yaml
# ... repeat for each service

make deploy-k8s
```

## Key Concepts

### ConfigMap vs Secret

- `config-map.yaml` — non-sensitive: service URLs, ports, Node env
- `secret.yaml` — sensitive: JWT secret, DB password, Grafana password
  - In production, use Sealed Secrets or AWS Secrets Manager instead of plain `stringData`

### StatefulSet for MongoDB

MongoDB uses a StatefulSet (not Deployment) because:
- Stable network identity (`mongodb-0.mongodb`)
- Ordered startup/shutdown
- Persistent storage via `volumeClaimTemplates`

### HorizontalPodAutoscaler

```yaml
# k8s/hpa.yaml
api-gateway: min=2, max=5, CPU target=70%
frontend:    min=2, max=4, CPU target=70%
```

Requires `metrics-server` to be running in the cluster:
```bash
# Minikube
minikube addons enable metrics-server
```

### NetworkPolicy (Zero-Trust)

Default: **deny all ingress**. Then explicit allow rules:
- Frontend ← ingress controller
- API Gateway ← frontend
- Microservices ← api-gateway (and inter-service where needed)
- MongoDB ← only the services that need it
- All pods ← prometheus (for scraping)

### Liveness vs Readiness Probes

- **Liveness**: Is the container alive? If it fails, K8s restarts it.
- **Readiness**: Is the container ready to serve traffic? If it fails, K8s removes it from the Service endpoints (no traffic sent).

All deployments have both probes hitting `/health`.

## Useful Commands

```bash
# Check all resources
kubectl get all -n bookstore

# Check HPA status
kubectl get hpa -n bookstore

# Check network policies
kubectl get networkpolicy -n bookstore

# View pod logs
kubectl logs -f deployment/api-gateway -n bookstore

# Describe a failing pod
kubectl describe pod <pod-name> -n bookstore

# Scale manually
kubectl scale deployment api-gateway --replicas=3 -n bookstore

# Rolling restart
kubectl rollout restart deployment/api-gateway -n bookstore

# Check rollout status
kubectl rollout status deployment/api-gateway -n bookstore
```
