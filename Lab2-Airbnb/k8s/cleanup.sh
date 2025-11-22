#!/bin/bash

# Cleanup Script for Lab2 Airbnb Kubernetes Deployment
# This script removes all deployed resources

set -e  # Exit on error

echo "========================================"
echo "Lab2 Airbnb - Kubernetes Cleanup"
echo "========================================"
echo ""

# Color codes
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Check if kubectl is installed
if ! command -v kubectl &> /dev/null; then
    print_error "kubectl is not installed."
    exit 1
fi

# Confirm deletion
print_warning "This will delete ALL resources in the 'airbnb-lab2' namespace."
read -p "Are you sure you want to continue? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Delete namespace (this will delete all resources within it)
echo "Deleting namespace and all resources..."
kubectl delete namespace airbnb-lab2 --ignore-not-found=true

print_warning "Waiting for namespace to be fully deleted..."
kubectl wait --for=delete namespace/airbnb-lab2 --timeout=120s 2>/dev/null || true

print_success "Cleanup complete!"
echo ""

echo "Resources removed:"
echo "  ✓ Namespace: airbnb-lab2"
echo "  ✓ All Deployments"
echo "  ✓ All Services"
echo "  ✓ All Pods"
echo "  ✓ All ConfigMaps and Secrets"
echo "  ✓ All PersistentVolumeClaims"
echo "  ✓ All HPAs"
echo "  ✓ Ingress"
echo ""

echo "Note: PersistentVolumes may need manual cleanup if they were statically provisioned."
echo ""

