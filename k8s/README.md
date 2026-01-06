# Online Bookstore - Kubernetes Deployment

## Overview
This directory contains all Kubernetes manifests for deploying the Online Bookstore microservices application.

## Files
- `namespace.yaml` - Bookstore namespace
- `config-map.yaml` - Environment configuration for all services
- `secret.yaml` - Secrets (JWT, credentials, API keys)
- `mongodb-pvc.yaml` - PersistentVolumeClaim for MongoDB data
- `mongodb-statefulset.yaml` - MongoDB database (StatefulSet)
- `api-gateway-deployment.yaml` - API Gateway (2 replicas)
- `*-service-deployment.yaml` - Individual microservice deployments (2 replicas each)
- `ingress.yaml` - Ingress for external access
- `deploy.sh` - Automated deployment script

## Supported Environments

### Minikube (Recommended for Local Testing)
\`\`\`bash
# Start Minikube
minikube start --cpus=4 --memory=8192

# Enable Ingress addon
minikube addons enable ingress

# Run deployment
bash k8s/deploy.sh

# Access services
minikube service -n bookstore api-gateway
minikube ip  # Get IP to add to /etc/hosts
\`\`\`

### Kind (Kubernetes in Docker)
\`\`\`bash
# Create cluster with Ingress support
kind create cluster --name bookstore --config - <<EOF
kind: Cluster
apiVersion: kind.x-k8s.io/v1alpha4
nodes:
- role: control-plane
  extraPortMappings:
  - containerPort: 80
    hostPort: 80
  - containerPort: 443
    hostPort: 443
EOF

# Install NGINX Ingress Controller
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml

# Wait for Ingress controller
kubectl wait --namespace ingress-nginx --for=condition=ready pod --selector=app.kubernetes.io/component=controller --timeout=120s

# Run deployment
bash k8s/deploy.sh
\`\`\`

### GKE (Google Kubernetes Engine)
\`\`\`bash
# Create cluster
gcloud container clusters create bookstore-cluster --region us-central1 --num-nodes 3

# Get credentials
gcloud container clusters get-credentials bookstore-cluster --region us-central1

# Ensure GKE Ingress controller is active (automatic)

# Run deployment
bash k8s/deploy.sh
\`\`\`

### EKS (Amazon Elastic Kubernetes Service)
\`\`\`bash
# Create cluster (via AWS Console or CLI)
eksctl create cluster --name bookstore-cluster --region us-east-1 --nodes 3

# Install AWS Load Balancer Controller
# Install NGINX Ingress or use AWS ALB

# Run deployment
bash k8s/deploy.sh
\`\`\`

### AKS (Azure Kubernetes Service)
\`\`\`bash
# Create cluster
az aks create --resource-group bookstore-rg --name bookstore-cluster --node-count 3

# Get credentials
az aks get-credentials --resource-group bookstore-rg --name bookstore-cluster

# Install Ingress controller (automatic in AKS)

# Run deployment
bash k8s/deploy.sh
\`\`\`

## Pre-Deployment Steps

### 1. Build Docker Images (from root directory)
\`\`\`bash
# Build each service image
docker build -t bookstore/api-gateway:latest -f services/api-gateway/Dockerfile services/api-gateway
docker build -t bookstore/user-service:latest -f services/user-service/Dockerfile services/user-service
docker build -t bookstore/book-catalog-service:latest -f services/book-catalog-service/Dockerfile services/book-catalog-service
docker build -t bookstore/order-service:latest -f services/order-service/Dockerfile services/order-service
docker build -t bookstore/payment-service:latest -f services/payment-service/Dockerfile services/payment-service
docker build -t bookstore/review-service:latest -f services/review-service/Dockerfile services/review-service
docker build -t bookstore/cart-service:latest -f services/cart-service/Dockerfile services/cart-service
docker build -t bookstore/recommendation-service:latest -f services/recommendation-service/Dockerfile services/recommendation-service
docker build -t bookstore/notification-service:latest -f services/notification-service/Dockerfile services/notification-service
\`\`\`

### 2. Push to Registry (optional, for production)
For cloud deployments, push images to a container registry:
\`\`\`bash
# Docker Hub
docker tag bookstore/api-gateway:latest yourusername/bookstore-api-gateway:latest
docker push yourusername/bookstore-api-gateway:latest

# Update image references in deployment YAML files
\`\`\`

### 3. Update Secrets (IMPORTANT FOR PRODUCTION)
Edit `k8s/secret.yaml` and change default values:
\`\`\`yaml
stringData:
  JWT_SECRET: "your-production-jwt-secret-key"
  MONGO_PASSWORD: "your-strong-database-password"
  STRIPE_KEY: "your-real-stripe-key"
  PAYMENT_API_KEY: "your-payment-provider-key"
\`\`\`

## Deployment

### Quick Deploy (Automated)
\`\`\`bash
chmod +x k8s/deploy.sh
bash k8s/deploy.sh
\`\`\`

### Manual Deploy
\`\`\`bash
# 1. Create namespace and config
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/config-map.yaml
kubectl apply -f k8s/secret.yaml

# 2. Deploy database
kubectl apply -f k8s/mongodb-pvc.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml

# 3. Deploy services
kubectl apply -f k8s/api-gateway-deployment.yaml
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/book-catalog-deployment.yaml
kubectl apply -f k8s/order-service-deployment.yaml
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/review-service-deployment.yaml
kubectl apply -f k8s/cart-service-deployment.yaml
kubectl apply -f k8s/recommendation-service-deployment.yaml
kubectl apply -f k8s/notification-service-deployment.yaml

# 4. Deploy Ingress
kubectl apply -f k8s/ingress.yaml
\`\`\`

## Verification

### Check Status
\`\`\`bash
# Namespace
kubectl get namespace bookstore

# All resources
kubectl get all -n bookstore

# Specific resources
kubectl get pods -n bookstore
kubectl get services -n bookstore
kubectl get deployments -n bookstore
kubectl get statefulsets -n bookstore
kubectl get pvc -n bookstore
kubectl get ingress -n bookstore
\`\`\`

### View Logs
\`\`\`bash
# API Gateway
kubectl logs -n bookstore -l app=api-gateway --tail=50

# User Service
kubectl logs -n bookstore -l app=user-service --tail=50

# MongoDB
kubectl logs -n bookstore -l app=mongodb --tail=50

# Follow logs in real-time
kubectl logs -n bookstore -l app=api-gateway -f
\`\`\`

### Port Forward for Testing
\`\`\`bash
# API Gateway
kubectl port-forward -n bookstore svc/api-gateway 3000:3000

# Individual services
kubectl port-forward -n bookstore svc/user-service 4001:4001
kubectl port-forward -n bookstore svc/book-catalog-service 4002:4002

# MongoDB
kubectl port-forward -n bookstore svc/mongodb 27017:27017
\`\`\`

### Test API
\`\`\`bash
# Health check
curl http://localhost:3000/health

# Get books
curl http://localhost:3000/books

# Create user (signup)
curl -X POST http://localhost:3000/users/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'

# Login
curl -X POST http://localhost:3000/users/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"Password123"}'
\`\`\`

## Accessing the Application

### Minikube
\`\`\`bash
# Get Minikube IP
MINIKUBE_IP=$(minikube ip)

# Add to /etc/hosts
echo "$MINIKUBE_IP bookstore.local api.bookstore.local" | sudo tee -a /etc/hosts

# Access via browser
open http://bookstore.local

# Or use port-forward
kubectl port-forward -n bookstore svc/api-gateway 3000:3000
open http://localhost:3000
\`\`\`

### Kind
\`\`\`bash
# Kind maps ports 80 and 443 to localhost
open http://localhost

# Or via service port-forward
kubectl port-forward -n bookstore svc/api-gateway 3000:3000
open http://localhost:3000
\`\`\`

### Cloud Providers (GKE/EKS/AKS)
\`\`\`bash
# Get external IP (may take a few minutes)
kubectl get ingress -n bookstore

# Use the external IP or hostname
open http://<EXTERNAL-IP>
\`\`\`

## Scaling

### Scale Deployments
\`\`\`bash
# Scale API Gateway to 5 replicas
kubectl scale deployment api-gateway -n bookstore --replicas=5

# Scale User Service to 3 replicas
kubectl scale deployment user-service -n bookstore --replicas=3

# View current replicas
kubectl get deployments -n bookstore
\`\`\`

## Updates & Rollouts

### Update Image
\`\`\`bash
# Set new image
kubectl set image deployment/api-gateway api-gateway=bookstore/api-gateway:v2 -n bookstore

# Watch rollout
kubectl rollout status deployment/api-gateway -n bookstore

# Rollback if needed
kubectl rollout undo deployment/api-gateway -n bookstore
\`\`\`

## Cleanup

### Delete Deployment
\`\`\`bash
# Delete all resources in bookstore namespace
kubectl delete namespace bookstore

# Or delete individual resources
kubectl delete -f k8s/
\`\`\`

## Monitoring & Observability

### Resource Usage
\`\`\`bash
# View resource usage
kubectl top pods -n bookstore
kubectl top nodes

# Install metrics-server if not available
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
\`\`\`

### Logs Aggregation (Optional)
Consider adding:
- ELK Stack (Elasticsearch, Logstash, Kibana)
- Prometheus + Grafana for metrics
- Jaeger for distributed tracing

## Troubleshooting

### Pods not starting
\`\`\`bash
kubectl describe pod <pod-name> -n bookstore
kubectl logs <pod-name> -n bookstore
\`\`\`

### MongoDB connection issues
\`\`\`bash
# Verify MongoDB is running
kubectl get pods -n bookstore -l app=mongodb

# Check logs
kubectl logs -n bookstore -l app=mongodb

# Test connection
kubectl exec -it -n bookstore pod/mongodb-0 -- mongosh
\`\`\`

### Services not communicating
\`\`\`bash
# Test DNS resolution
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -n bookstore -- nslookup user-service

# Test service connection
kubectl run -it --rm debug --image=nicolaka/netshoot --restart=Never -n bookstore -- curl http://user-service:4001/health
\`\`\`

### Ingress not working
\`\`\`bash
# Check Ingress status
kubectl get ingress -n bookstore -o wide

# Verify Ingress controller is running
kubectl get pods --all-namespaces | grep ingress

# Describe Ingress for events
kubectl describe ingress bookstore-ingress -n bookstore
\`\`\`

## Production Considerations

1. **Security**
   - Update secrets with strong passwords
   - Use RBAC and Network Policies
   - Enable Pod Security Policies
   - Use HTTPS/TLS certificates

2. **High Availability**
   - Increase replicas for each deployment
   - Use Pod Disruption Budgets
   - Configure proper resource limits

3. **Data Persistence**
   - Use managed database services (Cloud SQL, RDS, CosmosDB)
   - Configure MongoDB with replication
   - Regular backups

4. **Monitoring**
   - Deploy Prometheus + Grafana
   - Configure alerting rules
   - Implement centralized logging

5. **Performance**
   - Use Horizontal Pod Autoscaler (HPA)
   - Implement service mesh (Istio, Linkerd)
   - Cache with Redis or Memcached

6. **CI/CD Integration**
   - Use GitHub Actions, GitLab CI, or Jenkins
   - Automated image builds and pushes
   - GitOps with ArgoCD or Flux
