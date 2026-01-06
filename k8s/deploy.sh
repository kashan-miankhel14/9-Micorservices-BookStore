#!/bin/bash

# Kubernetes Deployment Script for Online Bookstore Microservices
# Supports: Minikube, Kind, or cloud providers (GKE, EKS, AKS)

set -e

echo "==================================="
echo "Online Bookstore - K8s Deployment"
echo "==================================="

# Step 1: Create namespace
echo "[1/7] Creating namespace..."
kubectl apply -f k8s/namespace.yaml

# Step 2: Create ConfigMap
echo "[2/7] Creating ConfigMap..."
kubectl apply -f k8s/config-map.yaml

# Step 3: Create Secret
echo "[3/7] Creating Secret..."
kubectl apply -f k8s/secret.yaml

# Step 4: Create MongoDB PVC and StatefulSet
echo "[4/7] Deploying MongoDB..."
kubectl apply -f k8s/mongodb-pvc.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml

# Wait for MongoDB to be ready
echo "Waiting for MongoDB to be ready..."
kubectl wait --for=condition=ready pod -l app=mongodb -n bookstore --timeout=300s

# Step 5: Deploy all microservices
echo "[5/7] Deploying API Gateway..."
kubectl apply -f k8s/api-gateway-deployment.yaml

echo "[6/7] Deploying microservices..."
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/book-catalog-deployment.yaml
kubectl apply -f k8s/order-service-deployment.yaml
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/review-service-deployment.yaml
kubectl apply -f k8s/cart-service-deployment.yaml
kubectl apply -f k8s/recommendation-service-deployment.yaml
kubectl apply -f k8s/notification-service-deployment.yaml

# Step 6: Deploy Ingress
echo "[7/7] Deploying Ingress..."
kubectl apply -f k8s/ingress.yaml

echo ""
echo "==================================="
echo "Deployment Complete!"
echo "==================================="
echo ""
echo "Waiting for all deployments to be ready..."
kubectl wait --for=condition=available --timeout=300s deployment/api-gateway -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/user-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/book-catalog-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/order-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/payment-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/review-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/cart-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/recommendation-service -n bookstore
kubectl wait --for=condition=available --timeout=300s deployment/notification-service -n bookstore

echo ""
echo "Services deployed:"
kubectl get services -n bookstore
echo ""
echo "Deployments:"
kubectl get deployments -n bookstore
echo ""
echo "Access points:"
echo "- Bookstore UI: http://bookstore.local (via Ingress)"
echo "- API Gateway: http://api.bookstore.local"
echo ""
echo "For Minikube: minikube service -n bookstore api-gateway"
echo "For Kind: kubectl port-forward -n bookstore svc/api-gateway 3000:3000"
