#!/usr/bin/env bash
set -euo pipefail

# Create (or reuse) the EKS cluster and deploy all Kubernetes manifests that mirror docker-compose services.
# Requires: aws CLI configured, eksctl installed, kubectl installed.

CLUSTER_NAME="${CLUSTER_NAME:-data236-cluster}"
REGION="${REGION:-us-east-1}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${SCRIPT_DIR}/eksctl-cluster.yaml"
K8S_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)/k8s"

for bin in aws eksctl kubectl helm; do
  if ! command -v "$bin" >/dev/null 2>&1; then
    echo "Missing dependency: $bin" >&2
    exit 1
  fi
done

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "Cluster config not found at $CONFIG_PATH" >&2
  exit 1
fi

echo "Ensuring cluster $CLUSTER_NAME exists in $REGION..."
if ! eksctl get cluster --name "$CLUSTER_NAME" --region "$REGION" >/dev/null 2>&1; then
  eksctl create cluster -f "$CONFIG_PATH"
else
  echo "Cluster already exists; skipping creation."
fi

echo "Updating kubeconfig for $CLUSTER_NAME..."
aws eks update-kubeconfig --name "$CLUSTER_NAME" --region "$REGION"

echo "Installing/ensuring EBS CSI driver add-on..."
eksctl create addon --name aws-ebs-csi-driver --version latest --cluster "$CLUSTER_NAME" --region "$REGION" --force

echo "Setting up AWS Load Balancer Controller for ALB..."
# Check if IAM OIDC provider exists
if ! eksctl utils describe-stacks --cluster "$CLUSTER_NAME" --region "$REGION" 2>/dev/null | grep -q "oidc"; then
  echo "Creating IAM OIDC provider..."
  eksctl utils associate-iam-oidc-provider --cluster "$CLUSTER_NAME" --region "$REGION" --approve
fi

# Check if service account exists
if ! kubectl get serviceaccount -n kube-system aws-load-balancer-controller >/dev/null 2>&1; then
  echo "Creating IAM service account for AWS Load Balancer Controller..."
  ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
  
  # Create IAM policy if it doesn't exist
  if ! aws iam get-policy --policy-arn "arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy" >/dev/null 2>&1; then
    echo "Creating IAM policy for AWS Load Balancer Controller..."
    curl -s https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.7.0/docs/install/iam_policy.json -o /tmp/alb-policy.json
    aws iam create-policy \
      --policy-name AWSLoadBalancerControllerIAMPolicy \
      --policy-document file:///tmp/alb-policy.json \
      --description "Policy for AWS Load Balancer Controller" >/dev/null 2>&1 || echo "Policy may already exist"
  fi
  
  eksctl create iamserviceaccount \
    --cluster="$CLUSTER_NAME" \
    --namespace=kube-system \
    --name=aws-load-balancer-controller \
    --attach-policy-arn="arn:aws:iam::${ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy" \
    --override-existing-serviceaccounts \
    --approve \
    --region="$REGION" || echo "Service account may already exist"
fi

# Install AWS Load Balancer Controller via Helm if not installed
if ! helm list -n kube-system | grep -q aws-load-balancer-controller; then
  echo "Installing AWS Load Balancer Controller via Helm..."
  helm repo add eks https://aws.github.io/eks-charts >/dev/null 2>&1
  helm repo update >/dev/null 2>&1
  
  helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
    -n kube-system \
    --set clusterName="$CLUSTER_NAME" \
    --set serviceAccount.create=false \
    --set serviceAccount.name=aws-load-balancer-controller \
    --set region="$REGION" \
    --wait --timeout=5m || echo "Controller may already be installed"
else
  echo "AWS Load Balancer Controller already installed"
fi

# Wait for controller to be ready
echo "Waiting for AWS Load Balancer Controller to be ready..."
for i in {1..30}; do
  if kubectl get pods -n kube-system -l app.kubernetes.io/name=aws-load-balancer-controller 2>/dev/null | grep -q Running; then
    echo "AWS Load Balancer Controller is ready"
    break
  fi
  echo "Waiting for controller pods... ($i/30)"
  sleep 10
done

echo "Applying Kubernetes manifests from $K8S_DIR (databases, backend, frontend, ai-service, kafka, kafka-ui, ingress)..."
# Apply databases first (they need to be ready before backend)
kubectl apply -f "${K8S_DIR}/mysql-deployment.yaml" \
               -f "${K8S_DIR}/mongo-deployment.yaml"
# Apply services
kubectl apply -f "${K8S_DIR}/backend-service.yaml" \
               -f "${K8S_DIR}/frontend-service.yaml" \
               -f "${K8S_DIR}/ai-service-service.yaml" \
               -f "${K8S_DIR}/kafka.yaml" \
               -f "${K8S_DIR}/kafka-ui.yaml"
# Apply deployments
kubectl apply -f "${K8S_DIR}/backend-deployment.yaml" \
               -f "${K8S_DIR}/frontend-deployment.yaml" \
               -f "${K8S_DIR}/ai-service-deployment.yaml"
# Apply ingress for ALB (after controller is ready)
if [ -f "${K8S_DIR}/ingress.yaml" ]; then
  echo "Applying ingress for ALB..."
  # Wait a bit more for webhook to be ready
  sleep 20
  kubectl apply -f "${K8S_DIR}/ingress.yaml" || {
    echo "Warning: Ingress creation failed, retrying after controller is fully ready..."
    sleep 30
    kubectl apply -f "${K8S_DIR}/ingress.yaml"
  }
  
  echo "Waiting for ALB to be provisioned (this may take 2-3 minutes)..."
  for i in {1..18}; do
    ALB_URL=$(kubectl get ingress airbnb-frontend-ingress -o jsonpath='{.status.loadBalancer.ingress[0].hostname}' 2>/dev/null)
    if [ -n "$ALB_URL" ] && [ "$ALB_URL" != "" ]; then
      echo "ALB URL: http://$ALB_URL"
      break
    fi
    echo "Waiting for ALB... ($i/18)"
    sleep 10
  done
  
  if [ -z "$ALB_URL" ] || [ "$ALB_URL" == "" ]; then
    echo "ALB is still being created. Check status with: kubectl get ingress airbnb-frontend-ingress"
    echo "Or check AWS console for Load Balancers"
  fi
fi

ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REGISTRY_DEFAULT="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
ECR_REGISTRY="${ECR_REGISTRY:-$ECR_REGISTRY_DEFAULT}"
IMAGE_TAG="${TAG:-latest}"

if [[ "${SET_IMAGES:-true}" == "true" ]]; then
  echo "Updating deployments to use ${ECR_REGISTRY} with tag ${IMAGE_TAG}..."
  kubectl set image deployment/lab2-backend-deployment lab2-backend="${ECR_REGISTRY}/airbnb-backend:${IMAGE_TAG}" || echo "Warning: Could not update backend deployment image"
  kubectl set image deployment/lab2-frontend-deployment lab2-frontend="${ECR_REGISTRY}/airbnb-frontend:${IMAGE_TAG}" || echo "Warning: Could not update frontend deployment image"
  kubectl set image deployment/ai-service-deployment ai-service="${ECR_REGISTRY}/airbnb-ai-service:${IMAGE_TAG}" || echo "Warning: Could not update ai-service deployment image"
  
  echo "Triggering rollout restart to ensure pods pick up new images..."
  kubectl rollout restart deployment/lab2-backend-deployment || echo "Warning: Could not restart backend deployment"
  kubectl rollout restart deployment/lab2-frontend-deployment || echo "Warning: Could not restart frontend deployment"
  kubectl rollout restart deployment/ai-service-deployment || echo "Warning: Could not restart ai-service deployment"
  
  echo "Waiting for rollouts to complete..."
  kubectl rollout status deployment/lab2-backend-deployment --timeout=5m || echo "Warning: Backend rollout status check failed"
  kubectl rollout status deployment/lab2-frontend-deployment --timeout=5m || echo "Warning: Frontend rollout status check failed"
  kubectl rollout status deployment/ai-service-deployment --timeout=5m || echo "Warning: AI service rollout status check failed"
fi

echo "Deployment complete. Verify workloads:"
kubectl get pods
