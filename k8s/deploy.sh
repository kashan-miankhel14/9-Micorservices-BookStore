#!/bin/bash
set -e

echo "==================================="
echo "Online Bookstore - K8s Deployment"
echo "==================================="

echo "[1/9] Creating namespace..."
kubectl apply -f k8s/namespace.yaml

echo "[2/9] Creating ConfigMap and Secret..."
kubectl apply -f k8s/config-map.yaml
kubectl apply -f k8s/secret.yaml

echo "[3/9] Deploying MongoDB..."
kubectl apply -f k8s/mongodb-pv.yaml
kubectl apply -f k8s/mongodb-pvc.yaml
kubectl apply -f k8s/mongodb-statefulset.yaml
echo "Waiting for MongoDB..."
kubectl wait --for=condition=ready pod -l app=mongodb -n bookstore --timeout=300s

echo "[4/9] Deploying API Gateway..."
kubectl apply -f k8s/api-gateway-deployment.yaml

echo "[5/9] Deploying microservices..."
kubectl apply -f k8s/user-service-deployment.yaml
kubectl apply -f k8s/book-catalog-deployment.yaml
kubectl apply -f k8s/order-service-deployment.yaml
kubectl apply -f k8s/payment-service-deployment.yaml
kubectl apply -f k8s/review-service-deployment.yaml
kubectl apply -f k8s/cart-service-deployment.yaml
kubectl apply -f k8s/recommendation-service-deployment.yaml
kubectl apply -f k8s/notification-service-deployment.yaml
kubectl apply -f k8s/frontend-deployment.yaml

echo "[6/9] Deploying Ingress..."
kubectl apply -f k8s/ingress.yaml

echo "[7/9] Applying HPA and NetworkPolicy..."
kubectl apply -f k8s/hpa.yaml
kubectl apply -f k8s/network-policy.yaml

echo "[8/9] Deploying monitoring stack..."
kubectl apply -f k8s/prometheus-deployment.yaml
kubectl apply -f k8s/grafana-deployment.yaml

echo "[9/9] Waiting for deployments to be ready..."
DEPLOYMENTS=(api-gateway user-service book-catalog-service order-service payment-service review-service cart-service recommendation-service notification-service prometheus grafana)
for d in "${DEPLOYMENTS[@]}"; do
  kubectl wait --for=condition=available --timeout=300s deployment/$d -n bookstore
done

echo ""
echo "==================================="
echo "Deployment Complete!"
echo "==================================="
kubectl get deployments -n bookstore
kubectl get services -n bookstore
kubectl get hpa -n bookstore
echo ""
echo "Access:"
echo "  Frontend:   kubectl port-forward svc/frontend 3000:3000 -n bookstore"
echo "  API GW:     kubectl port-forward svc/api-gateway 8090:3000 -n bookstore"
echo "  Prometheus: kubectl port-forward svc/prometheus 9091:9090 -n bookstore"
echo "  Grafana:    kubectl port-forward svc/grafana 3030:3000 -n bookstore"
