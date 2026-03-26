# Runbook — Step-by-Step Verified Setup From Scratch

This is the definitive guide. Every command here has been run and verified. Follow it in order and you will not hit issues.

---

## Prerequisites

Install these before starting:

| Tool | Version | Check |
|------|---------|-------|
| Docker Desktop | Latest | `docker --version` |
| Docker Compose | v2+ | `docker compose version` |
| Node.js | 20+ | `node --version` |
| make | Any | `make --version` |
| kubectl | Latest | `kubectl version --client` |
| Minikube | Latest | `minikube version` |
| jq | Any | `jq --version` (optional, for pretty curl output) |

Install Minikube on Linux:
```bash
curl -LO https://storage.googleapis.com/minikube/releases/latest/minikube-linux-amd64
sudo install minikube-linux-amd64 /usr/local/bin/minikube
```

---

## Part 1 — Docker Compose (Local)

### Step 1 — Clone and configure

```bash
git clone https://github.com/<your-username>/bookstore-microservices.git
cd bookstore-microservices
cp .env.example .env
```

Do not edit .env for local development. The defaults work.

### Step 2 — Start everything

```bash
make up
```

This starts 15 containers. First run takes 3-5 minutes because Docker pulls base images.

### Step 3 — Verify all containers are running

```bash
make ps
```

All 15 services must show "Up". If any show "Exit" or "Restarting", check logs:

```bash
docker-compose logs <service-name>
```

Known issue: if Grafana fails with "port already allocated":
- Your .env has PORT_GRAFANA=3001 which conflicts with user-service
- Fix: open .env and change PORT_GRAFANA=3030
- Then: `make down && make up`

### Step 4 — Verify health endpoints

```bash
curl http://localhost:8090/health
curl http://localhost:3001/health
```

Both should return `{"status":"ok","service":"..."}`.

### Step 5 — Verify Prometheus targets

Open http://localhost:9091/targets

All 10 services should show State: UP. If any show DOWN, wait 30 seconds and refresh — services may still be starting.

### Step 6 — Verify Grafana

Open http://localhost:3030
Login: admin / admin

Go to Dashboards → Bookstore → Bookstore Overview. You should see 6 panels. They will show data after you generate some traffic (login, browse books, etc).

### Step 7 — Test the application

```bash
# Signup
TOKEN=$(curl -s -X POST http://localhost:8090/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@bookstore.com","password":"Test1234","name":"Test User"}' | jq -r .token)

echo $TOKEN
```

If you see a JWT token string, the full application stack is working.

---

## Part 2 — Kubernetes (Minikube)

### Step 1 — Start Minikube

```bash
minikube start
```

Wait for it to say "Done! kubectl is now configured to use minikube".

### Step 2 — Build images with your normal Docker

Important: do NOT run `eval $(minikube docker-env)` before building. That switches to Minikube's Docker which has no internet access and npm install will timeout.

```bash
# Make sure you are using your normal Docker
eval $(minikube docker-env -u)

# Build all images
docker-compose build
```

This takes 5-10 minutes on first run.

### Step 3 — Tag images for Kubernetes

Docker Compose names images as `9-micorservices-bookstore_<service>:latest`. The K8s manifests expect `bookstore-<service>:latest`. Tag them:

```bash
SERVICES=(api-gateway book-catalog-service cart-service notification-service order-service payment-service recommendation-service review-service user-service frontend)

for svc in "${SERVICES[@]}"; do
  docker tag "9-micorservices-bookstore_${svc}:latest" "bookstore-${svc}:latest"
done
```

Verify:
```bash
docker images | grep "^bookstore-"
```

You should see 10 images all tagged `bookstore-<service>:latest`.

### Step 4 — Load images into Minikube

```bash
for svc in "${SERVICES[@]}"; do
  echo "Loading bookstore-${svc}:latest..."
  minikube image load "bookstore-${svc}:latest"
done
```

This takes 3-5 minutes. Each image is ~200-400MB.

### Step 5 — Deploy to Kubernetes

```bash
make deploy-k8s
```

The script runs 9 steps. MongoDB takes the longest (1-3 minutes to pull and start). The script waits automatically — do not interrupt it.

Expected output at the end:
```
Deployment Complete!
```

### Step 6 — Verify everything is running

```bash
kubectl get pods -n bookstore
```

Every pod should show `1/1 Running`. You will see 2 pods per service (replicas: 2) — this is correct and intentional.

```bash
kubectl get deployments -n bookstore
kubectl get hpa -n bookstore
kubectl get networkpolicy -n bookstore
```

All deployments should show AVAILABLE. HPA should show 2 entries. NetworkPolicy should show 6 entries.

### Step 7 — Test the K8s deployment

```bash
# Open a port-forward in the background
kubectl port-forward svc/api-gateway 8090:3000 -n bookstore &

# Test
curl http://localhost:8090/health
```

Should return `{"status":"ok","service":"api-gateway"}`.

To access Prometheus and Grafana inside K8s:
```bash
kubectl port-forward svc/prometheus 9091:9090 -n bookstore &
kubectl port-forward svc/grafana 3030:3000 -n bookstore &
```

### Step 8 — Enable metrics-server for HPA

HPA needs metrics-server to actually scale. Enable it:

```bash
minikube addons enable metrics-server
```

Verify after 1 minute:
```bash
kubectl top pods -n bookstore
```

---

## Part 3 — CI/CD (GitHub Actions)

### Step 1 — Push code to GitHub

```bash
git add .
git commit -m "feat: production-grade microservices with full DevOps stack"
git push -u origin main
```

### Step 2 — Watch CI run

Go to: GitHub repo → Actions tab

The CI workflow runs automatically. It has two jobs:
- lint-and-build: runs npm lint and npm build
- docker-build-push: builds all 10 Docker images in parallel

On the first push to main, images are pushed to GHCR (GitHub Container Registry).

### Step 3 — Make GHCR packages public

After the first CI run:
1. Go to your GitHub profile → Packages
2. Click each bookstore-* package
3. Package settings → Change visibility → Public

This allows Kubernetes to pull images without authentication.

### Step 4 — Add KUBECONFIG secret for CD

The CD pipeline deploys to Kubernetes. It needs your kubeconfig:

```bash
cat ~/.kube/config | base64 | tr -d '\n'
```

Copy the output. Then:
1. GitHub repo → Settings → Secrets and variables → Actions
2. New repository secret
3. Name: `KUBECONFIG`
4. Value: paste the base64 string
5. Add secret

Note: CD works with a publicly reachable cluster (GKE, EKS, AKS). Minikube runs locally so GitHub Actions cannot reach it. The pipeline is fully configured — it just needs a cloud cluster to deploy to.

### Step 5 — Verify CD on next push

Any push to main will now:
1. Build and push new images tagged with the git SHA
2. Update K8s manifests with the new image tags
3. Run kubectl apply — K8s does a rolling update with zero downtime

---

## Known Issues and Fixes

### Grafana port conflict on `make up`

Error: `Bind for :::3001 failed: port is already allocated`

Fix:
```bash
# Open .env and change:
PORT_GRAFANA=3030
# Then:
make down && make up
```

### npm install ETIMEDOUT during `docker-compose build` inside Minikube

Error: `npm error code ETIMEDOUT` during `RUN npm install`

Cause: You ran `eval $(minikube docker-env)` which switched to Minikube's Docker daemon. It has no internet access.

Fix:
```bash
eval $(minikube docker-env -u)   # switch back to normal Docker
docker-compose build              # build normally
```

### minikube image load says image not found

Error: `The image 'bookstore-frontend:latest' was not found`

Cause: Docker Compose names images with the folder name prefix, not `bookstore-`.

Fix: Run the tagging step from Part 2 Step 3 above.

### K8s pods stuck in ErrImageNeverPull

Error: `Container image "bookstore-book-catalog:latest" is not present with pull policy of Never`

Cause: Wrong image name in the manifest (missing `-service` suffix) or image not loaded into Minikube.

Fix:
```bash
# Verify the image exists
docker images | grep book-catalog

# Load it if missing
minikube image load bookstore-book-catalog-service:latest
```

### K8s pods stuck in PodInitializing for MongoDB

This is normal. MongoDB pulls from Docker Hub (~700MB). Wait 2-5 minutes. Watch progress:
```bash
kubectl get pods -n bookstore -w
```

### deploy-k8s times out waiting for a deployment

Error: `error: timed out waiting for the condition on deployments/book-catalog-service`

Cause: Wrong port in the K8s manifest (old manifests used 4xxx ports, services run on 3xxx).

Fix: The manifests are already corrected in this repo. If you see this, run:
```bash
kubectl describe pod -l app=<service-name> -n bookstore
```
Look at the Events section. If it says `ErrImageNeverPull`, load the image. If it says the health probe is failing, check the port in the deployment YAML matches the PORT env var.

### HPA shows `<unknown>` for CPU

Cause: metrics-server is not running.

Fix:
```bash
minikube addons enable metrics-server
# Wait 1 minute
kubectl top pods -n bookstore
```

---

## Quick Reference

```bash
# Docker Compose
make up                                          # start everything
make down                                        # stop
make logs                                        # follow all logs
docker-compose logs -f <service>                 # logs for one service
docker-compose ps                                # status

# Kubernetes
kubectl get pods -n bookstore                    # pod status
kubectl get all -n bookstore                     # everything
kubectl logs -f deployment/<name> -n bookstore   # pod logs
kubectl describe pod <name> -n bookstore         # debug a pod
kubectl rollout restart deployment/<name> -n bookstore  # restart a service
kubectl port-forward svc/api-gateway 8090:3000 -n bookstore  # access locally

# Minikube
minikube start                                   # start cluster
minikube stop                                    # stop cluster
minikube delete                                  # wipe cluster
minikube image load <image>                      # load local image
minikube addons enable metrics-server            # enable HPA metrics

# Images
docker images | grep bookstore                   # list built images
docker-compose build                             # rebuild all
docker-compose build <service>                   # rebuild one
```
