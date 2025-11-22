#!/bin/bash

# Deploy All Kubernetes Resources for Lab2 Airbnb
# This script deploys all services in the correct order

set -e  # Exit on error

echo "========================================"
echo "Lab2 Airbnb - Kubernetes Deployment"
echo "========================================"
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to print colored output
print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed. Please install kubectl first."
    exit 1
fi

# Check if cluster is accessible
if ! kubectl cluster-info &> /dev/null; then
    print_error "Cannot connect to Kubernetes cluster. Please check your kubeconfig."
    exit 1
fi

print_success "Connected to Kubernetes cluster"
echo ""

# Step 1: Create Namespace
echo "Step 1: Creating namespace..."
kubectl apply -f namespace.yaml
print_success "Namespace created"
echo ""

# Step 2: Create ConfigMaps and Secrets
echo "Step 2: Creating ConfigMaps and Secrets..."
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
print_success "ConfigMaps and Secrets created"
echo ""

# Step 3: Deploy MongoDB
echo "Step 3: Deploying MongoDB..."
kubectl apply -f mongodb-deployment.yaml
print_warning "Waiting for MongoDB to be ready (this may take 1-2 minutes)..."
kubectl wait --for=condition=ready pod -l app=mongodb -n airbnb-lab2 --timeout=180s || {
    print_error "MongoDB failed to start. Check logs with: kubectl logs -n airbnb-lab2 -l app=mongodb"
    exit 1
}
print_success "MongoDB is ready"
echo ""

# Step 4: Deploy Zookeeper
echo "Step 4: Deploying Zookeeper..."
kubectl apply -f zookeeper-deployment.yaml
print_warning "Waiting for Zookeeper to be ready..."
kubectl wait --for=condition=ready pod -l app=zookeeper -n airbnb-lab2 --timeout=120s || {
    print_error "Zookeeper failed to start. Check logs with: kubectl logs -n airbnb-lab2 -l app=zookeeper"
    exit 1
}
print_success "Zookeeper is ready"
echo ""

# Step 5: Deploy Kafka
echo "Step 5: Deploying Kafka..."
kubectl apply -f kafka-deployment.yaml
print_warning "Waiting for Kafka to be ready (this may take 1-2 minutes)..."
kubectl wait --for=condition=ready pod -l app=kafka -n airbnb-lab2 --timeout=180s || {
    print_error "Kafka failed to start. Check logs with: kubectl logs -n airbnb-lab2 -l app=kafka"
    exit 1
}
print_success "Kafka is ready"
echo ""

# Step 6: Deploy Microservices
echo "Step 6: Deploying Microservices..."

echo "  - Deploying Traveler Service..."
kubectl apply -f traveler-service-deployment.yaml

echo "  - Deploying Owner Service..."
kubectl apply -f owner-service-deployment.yaml

echo "  - Deploying Property Service..."
kubectl apply -f property-service-deployment.yaml

echo "  - Deploying Booking Service..."
kubectl apply -f booking-service-deployment.yaml

echo "  - Deploying AI Agent Service..."
kubectl apply -f ai-agent-service-deployment.yaml

print_warning "Waiting for all microservices to be ready (this may take 2-3 minutes)..."

# Wait for all services to have at least 1 ready pod
for service in traveler-service owner-service property-service booking-service ai-agent-service; do
    kubectl wait --for=condition=ready pod -l app=$service -n airbnb-lab2 --timeout=180s || {
        print_error "$service failed to start. Check logs with: kubectl logs -n airbnb-lab2 -l app=$service"
        exit 1
    }
    print_success "$service is ready"
done
echo ""

# Step 7: Deploy Ingress
echo "Step 7: Deploying Ingress..."
kubectl apply -f ingress.yaml
print_success "Ingress created"
echo ""

# Display deployment status
echo "========================================"
echo "Deployment Summary"
echo "========================================"
echo ""

echo "Namespace:"
kubectl get namespace airbnb-lab2
echo ""

echo "Pods:"
kubectl get pods -n airbnb-lab2 -o wide
echo ""

echo "Services:"
kubectl get svc -n airbnb-lab2
echo ""

echo "Deployments:"
kubectl get deployments -n airbnb-lab2
echo ""

echo "HPA (Horizontal Pod Autoscalers):"
kubectl get hpa -n airbnb-lab2
echo ""

echo "Ingress:"
kubectl get ingress -n airbnb-lab2
echo ""

echo "========================================"
print_success "Deployment Complete!"
echo "========================================"
echo ""

echo "Next Steps:"
echo "1. Add 'airbnb-lab2.local' to your /etc/hosts file:"
echo "   echo '127.0.0.1 airbnb-lab2.local' | sudo tee -a /etc/hosts"
echo ""
echo "2. Access services via:"
echo "   http://airbnb-lab2.local/api/traveler/health"
echo "   http://airbnb-lab2.local/api/property/health"
echo ""
echo "3. Monitor pods:"
echo "   kubectl get pods -n airbnb-lab2 --watch"
echo ""
echo "4. View logs:"
echo "   kubectl logs -n airbnb-lab2 -l app=traveler-service -f"
echo ""
echo "5. Port forward (alternative access):"
echo "   kubectl port-forward -n airbnb-lab2 svc/traveler-service 5001:5001"
echo ""

