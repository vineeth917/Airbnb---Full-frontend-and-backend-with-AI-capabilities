# AWS Deployment Guide - Lab2 Airbnb

## Overview

This guide provides step-by-step instructions for deploying the Lab2 Airbnb microservices application to Amazon Web Services (AWS) using Amazon EKS (Elastic Kubernetes Service).

## Architecture

### AWS Services Used

- **Amazon EKS**: Managed Kubernetes cluster
- **Amazon EC2**: Worker nodes for Kubernetes cluster
- **Amazon ECR**: Container image registry
- **Amazon EBS**: Persistent storage for MongoDB
- **Amazon VPC**: Network isolation
- **Amazon ALB**: Application Load Balancer (Ingress)
- **Amazon CloudWatch**: Monitoring and logging
- **Amazon IAM**: Identity and access management

## Prerequisites

### 1. Install AWS CLI

**macOS**:
```bash
brew install awscli
```

**Linux**:
```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
```

**Verify Installation**:
```bash
aws --version
```

### 2. Configure AWS Credentials

```bash
aws configure
```

Enter:
- AWS Access Key ID
- AWS Secret Access Key
- Default region (e.g., `us-west-2`)
- Default output format: `json`

### 3. Install eksctl

**macOS**:
```bash
brew tap weaveworks/tap
brew install weaveworks/tap/eksctl
```

**Linux**:
```bash
curl --silent --location "https://github.com/weaveworks/eksctl/releases/latest/download/eksctl_$(uname -s)_amd64.tar.gz" | tar xz -C /tmp
sudo mv /tmp/eksctl /usr/local/bin
```

**Verify**:
```bash
eksctl version
```

### 4. Install kubectl (if not already installed)

**macOS**:
```bash
brew install kubectl
```

**Linux**:
```bash
curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl"
sudo install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl
```

### 5. Install Docker (for building images)

Already installed (verified in Docker Compose step).

## Step 1: Create EKS Cluster

### Option A: Using eksctl (Recommended)

```bash
eksctl create cluster \
  --name lab2-airbnb-cluster \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed
```

This creates:
- EKS cluster named `lab2-airbnb-cluster`
- Managed node group with 3 t3.medium instances
- Auto-scaling between 2-5 nodes
- VPC with public and private subnets
- IAM roles and policies

**Estimated time**: 15-20 minutes

### Option B: Using AWS Console

1. Go to AWS Console → EKS
2. Click "Create cluster"
3. Configure:
   - **Name**: lab2-airbnb-cluster
   - **Kubernetes version**: 1.28
   - **Networking**: Create new VPC or select existing
   - **Cluster endpoint**: Public
4. Create node group:
   - **Instance type**: t3.medium
   - **Desired size**: 3 nodes
   - **Min size**: 2 nodes
   - **Max size**: 5 nodes

### Verify Cluster

```bash
# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name lab2-airbnb-cluster

# Verify connection
kubectl get nodes
```

Expected output:
```
NAME                         STATUS   ROLES    AGE   VERSION
ip-xxx-xxx-xxx-xxx.internal  Ready    <none>   5m    v1.28.x
ip-xxx-xxx-xxx-xxx.internal  Ready    <none>   5m    v1.28.x
ip-xxx-xxx-xxx-xxx.internal  Ready    <none>   5m    v1.28.x
```

## Step 2: Create Amazon ECR Repository

ECR will store Docker images for all microservices.

```bash
# Create repository for each service
services=("traveler-service" "owner-service" "property-service" "booking-service" "ai-agent-service")

for service in "${services[@]}"; do
  aws ecr create-repository \
    --repository-name lab2-airbnb/$service \
    --region us-west-2 \
    --image-scanning-configuration scanOnPush=true
done
```

**Get ECR Login**:
```bash
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin <ACCOUNT_ID>.dkr.ecr.us-west-2.amazonaws.com
```

Replace `<ACCOUNT_ID>` with your AWS account ID:
```bash
aws sts get-caller-identity --query Account --output text
```

## Step 3: Build and Push Docker Images

### Build Images

```bash
cd /Users/spartan/Documents/236/Lab/Lab2-Airbnb

# Set ECR registry URL
export AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export ECR_REGISTRY="${AWS_ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com"
export ECR_REPO="lab2-airbnb"

# Build and tag all images
docker build -t ${ECR_REGISTRY}/${ECR_REPO}/traveler-service:latest services/traveler-service/
docker build -t ${ECR_REGISTRY}/${ECR_REPO}/owner-service:latest services/owner-service/
docker build -t ${ECR_REGISTRY}/${ECR_REPO}/property-service:latest services/property-service/
docker build -t ${ECR_REGISTRY}/${ECR_REPO}/booking-service:latest services/booking-service/
docker build -t ${ECR_REGISTRY}/${ECR_REPO}/ai-agent-service:latest services/ai-agent-service/
```

### Push Images to ECR

```bash
docker push ${ECR_REGISTRY}/${ECR_REPO}/traveler-service:latest
docker push ${ECR_REGISTRY}/${ECR_REPO}/owner-service:latest
docker push ${ECR_REGISTRY}/${ECR_REPO}/property-service:latest
docker push ${ECR_REGISTRY}/${ECR_REPO}/booking-service:latest
docker push ${ECR_REGISTRY}/${ECR_REPO}/ai-agent-service:latest
```

### Verify Images

```bash
aws ecr list-images --repository-name lab2-airbnb/traveler-service --region us-west-2
```

## Step 4: Update Kubernetes Manifests for AWS

### Update Image References

Update all Kubernetes deployment files to use ECR images:

```bash
# Update traveler-service
sed -i '' "s|image: lab2-airbnb-traveler-service:latest|image: ${ECR_REGISTRY}/${ECR_REPO}/traveler-service:latest|g" k8s/traveler-service-deployment.yaml

# Update owner-service
sed -i '' "s|image: lab2-airbnb-owner-service:latest|image: ${ECR_REGISTRY}/${ECR_REPO}/owner-service:latest|g" k8s/owner-service-deployment.yaml

# Update property-service
sed -i '' "s|image: lab2-airbnb-property-service:latest|image: ${ECR_REGISTRY}/${ECR_REPO}/property-service:latest|g" k8s/property-service-deployment.yaml

# Update booking-service
sed -i '' "s|image: lab2-airbnb-booking-service:latest|image: ${ECR_REGISTRY}/${ECR_REPO}/booking-service:latest|g" k8s/booking-service-deployment.yaml

# Update ai-agent-service
sed -i '' "s|image: lab2-airbnb-ai-agent-service:latest|image: ${ECR_REGISTRY}/${ECR_REPO}/ai-agent-service:latest|g" k8s/ai-agent-service-deployment.yaml
```

### Update imagePullPolicy

```bash
# Change to Always for ECR images
find k8s/ -name "*-deployment.yaml" -exec sed -i '' 's/imagePullPolicy: IfNotPresent/imagePullPolicy: Always/g' {} +
```

## Step 5: Install AWS Load Balancer Controller

The ALB controller manages Application Load Balancers for Kubernetes Ingress.

### Install IAM OIDC Provider

```bash
eksctl utils associate-iam-oidc-provider \
  --region us-west-2 \
  --cluster lab2-airbnb-cluster \
  --approve
```

### Create IAM Policy

```bash
curl -o iam-policy.json https://raw.githubusercontent.com/kubernetes-sigs/aws-load-balancer-controller/v2.6.2/docs/install/iam_policy.json

aws iam create-policy \
  --policy-name AWSLoadBalancerControllerIAMPolicy \
  --policy-document file://iam-policy.json
```

### Create IAM Service Account

```bash
eksctl create iamserviceaccount \
  --cluster=lab2-airbnb-cluster \
  --namespace=kube-system \
  --name=aws-load-balancer-controller \
  --attach-policy-arn=arn:aws:iam::${AWS_ACCOUNT_ID}:policy/AWSLoadBalancerControllerIAMPolicy \
  --approve \
  --region=us-west-2
```

### Install AWS Load Balancer Controller

```bash
helm repo add eks https://aws.github.io/eks-charts
helm repo update

helm install aws-load-balancer-controller eks/aws-load-balancer-controller \
  -n kube-system \
  --set clusterName=lab2-airbnb-cluster \
  --set serviceAccount.create=false \
  --set serviceAccount.name=aws-load-balancer-controller \
  --set region=us-west-2 \
  --set vpcId=<VPC_ID>
```

Get VPC ID:
```bash
aws eks describe-cluster --name lab2-airbnb-cluster --query "cluster.resourcesVpcConfig.vpcId" --output text
```

## Step 6: Install EBS CSI Driver

For MongoDB persistent volumes.

```bash
eksctl create iamserviceaccount \
  --name ebs-csi-controller-sa \
  --namespace kube-system \
  --cluster lab2-airbnb-cluster \
  --attach-policy-arn arn:aws:iam::aws:policy/service-role/AmazonEBSCSIDriverPolicy \
  --approve \
  --role-only \
  --role-name AmazonEKS_EBS_CSI_DriverRole \
  --region us-west-2

# Install EBS CSI Driver add-on
aws eks create-addon \
  --cluster-name lab2-airbnb-cluster \
  --addon-name aws-ebs-csi-driver \
  --service-account-role-arn arn:aws:iam::${AWS_ACCOUNT_ID}:role/AmazonEKS_EBS_CSI_DriverRole \
  --region us-west-2
```

## Step 7: Deploy Application to EKS

```bash
cd k8s

# Apply all Kubernetes manifests
kubectl apply -f namespace.yaml
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml
kubectl apply -f mongodb-deployment.yaml
kubectl apply -f zookeeper-deployment.yaml
kubectl apply -f kafka-deployment.yaml

# Wait for infrastructure services
kubectl wait --for=condition=ready pod -l app=mongodb -n airbnb-lab2 --timeout=180s
kubectl wait --for=condition=ready pod -l app=kafka -n airbnb-lab2 --timeout=180s

# Initialize Kafka topics
kubectl apply -f kafka-init-job.yaml

# Deploy microservices
kubectl apply -f traveler-service-deployment.yaml
kubectl apply -f owner-service-deployment.yaml
kubectl apply -f property-service-deployment.yaml
kubectl apply -f booking-service-deployment.yaml
kubectl apply -f ai-agent-service-deployment.yaml

# Deploy ingress
kubectl apply -f ingress.yaml
```

### Verify Deployment

```bash
# Check all pods
kubectl get pods -n airbnb-lab2

# Check services
kubectl get svc -n airbnb-lab2

# Check ingress
kubectl get ingress -n airbnb-lab2
```

## Step 8: Configure DNS and Access Application

### Get Load Balancer DNS

```bash
kubectl get ingress -n airbnb-lab2 -o jsonpath='{.items[0].status.loadBalancer.ingress[0].hostname}'
```

Example output:
```
k8s-airbnblab-airbnbin-abc123-1234567890.us-west-2.elb.amazonaws.com
```

### Test Access

```bash
# Test traveler service
curl http://<ALB_DNS>/api/traveler/health

# Test property service
curl http://<ALB_DNS>/api/property/health
```

### Optional: Configure Custom Domain

1. Create Route 53 hosted zone
2. Add A record (Alias) pointing to ALB
3. Update Ingress with your domain

## Step 9: Configure Auto-Scaling

### Horizontal Pod Autoscaler (HPA)

Already configured in deployment manifests. Verify:

```bash
kubectl get hpa -n airbnb-lab2
```

HPA will scale pods based on CPU/memory utilization.

### Cluster Autoscaler

Enable cluster auto-scaling:

```bash
eksctl create iamserviceaccount \
  --cluster=lab2-airbnb-cluster \
  --namespace=kube-system \
  --name=cluster-autoscaler \
  --attach-policy-arn=arn:aws:iam::aws:policy/AutoScalingFullAccess \
  --approve \
  --region=us-west-2

kubectl apply -f https://raw.githubusercontent.com/kubernetes/autoscaler/master/cluster-autoscaler/cloudprovider/aws/examples/cluster-autoscaler-autodiscover.yaml

kubectl -n kube-system annotate deployment.apps/cluster-autoscaler \
  cluster-autoscaler.kubernetes.io/safe-to-evict="false"

kubectl -n kube-system set image deployment.apps/cluster-autoscaler \
  cluster-autoscaler=k8s.gcr.io/autoscaling/cluster-autoscaler:v1.28.2
```

## Step 10: Enable Monitoring

### CloudWatch Container Insights

```bash
# Install CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-serviceaccount.yaml

# Create CloudWatch namespace
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cloudwatch-namespace.yaml

# Deploy CloudWatch agent
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/cwagent/cwagent-daemonset.yaml
```

### View Metrics in CloudWatch

1. Go to AWS Console → CloudWatch
2. Navigate to Container Insights
3. Select your cluster: `lab2-airbnb-cluster`
4. View metrics for:
   - CPU utilization
   - Memory utilization
   - Network traffic
   - Pod count

## Step 11: Configure Logging

### Enable CloudWatch Logs

```bash
# Update cluster logging configuration
aws eks update-cluster-config \
  --region us-west-2 \
  --name lab2-airbnb-cluster \
  --logging '{"clusterLogging":[{"types":["api","audit","authenticator","controllerManager","scheduler"],"enabled":true}]}'
```

### Install Fluent Bit for Application Logs

```bash
kubectl apply -f https://raw.githubusercontent.com/aws-samples/amazon-cloudwatch-container-insights/latest/k8s-deployment-manifest-templates/deployment-mode/daemonset/container-insights-monitoring/fluentbit/fluent-bit.yaml
```

View logs in CloudWatch Log Groups:
- `/aws/eks/lab2-airbnb-cluster/cluster`
- `/aws/containerinsights/lab2-airbnb-cluster/application`

## Step 12: Take Screenshots for Report

### Required Screenshots

1. **EKS Cluster Overview**
   - AWS Console → EKS → Clusters → lab2-airbnb-cluster
   - Show cluster status, version, endpoint

2. **Worker Nodes**
   - Show EC2 instances running as worker nodes
   - Display instance types, statuses

3. **ECR Repositories**
   - AWS Console → ECR
   - Show all 5 service repositories with images

4. **Kubernetes Pods Running**
   ```bash
   kubectl get pods -n airbnb-lab2 -o wide
   ```
   - Take screenshot showing all pods in Running state

5. **Services and Load Balancer**
   ```bash
   kubectl get svc -n airbnb-lab2
   kubectl get ingress -n airbnb-lab2
   ```
   - Show external access URLs

6. **HPA Status**
   ```bash
   kubectl get hpa -n airbnb-lab2
   ```
   - Show auto-scaling configuration

7. **CloudWatch Metrics**
   - CPU utilization graph
   - Memory utilization graph
   - Request count graph

8. **Application Running**
   - Access application via ALB DNS
   - Show login page
   - Show property listings

9. **Kafka Event Flow**
   - Create a booking
   - Show Kafka logs processing event
   ```bash
   kubectl logs -l app=kafka -n airbnb-lab2 --tail=50
   ```

10. **Scaling Demonstration**
   - Show HPA scaling pods under load
   - Run JMeter test
   - Show pods scaling from 2 to 5

## Cost Estimation

### Monthly Cost Breakdown

- **EKS Cluster**: $73/month
- **EC2 Instances** (3 x t3.medium): ~$90/month
- **EBS Volumes** (MongoDB, 5GB): ~$0.50/month
- **Application Load Balancer**: ~$23/month
- **Data Transfer**: ~$10/month (estimated)
- **CloudWatch**: ~$5/month

**Total Estimated Cost**: ~$201/month

### Cost Optimization Tips

1. Use Spot Instances for worker nodes (50-90% savings)
2. Right-size instance types
3. Enable cluster autoscaler to scale down when not in use
4. Delete unused resources after lab completion

## Cleanup (After Assignment Submission)

**⚠️ Important**: Only run cleanup AFTER submitting the assignment!

```bash
# Delete Kubernetes resources
kubectl delete namespace airbnb-lab2

# Delete EKS cluster
eksctl delete cluster --name lab2-airbnb-cluster --region us-west-2

# Delete ECR repositories
for service in traveler-service owner-service property-service booking-service ai-agent-service; do
  aws ecr delete-repository \
    --repository-name lab2-airbnb/$service \
    --region us-west-2 \
    --force
done

# Delete IAM policies and roles (check AWS Console)
```

## Troubleshooting

### Issue: Pods stuck in ImagePullBackOff

**Solution**:
```bash
# Verify ECR login
aws ecr get-login-password --region us-west-2 | docker login --username AWS --password-stdin ${AWS_ACCOUNT_ID}.dkr.ecr.us-west-2.amazonaws.com

# Check if images exist in ECR
aws ecr list-images --repository-name lab2-airbnb/traveler-service

# Describe pod to see error
kubectl describe pod <pod-name> -n airbnb-lab2
```

### Issue: Load Balancer not created

**Solution**:
```bash
# Check ALB controller logs
kubectl logs -n kube-system deployment/aws-load-balancer-controller

# Verify IAM permissions
kubectl describe serviceaccount aws-load-balancer-controller -n kube-system
```

### Issue: Services not accessible

**Solution**:
```bash
# Check security groups
# Ensure ALB security group allows inbound traffic on port 80/443

# Check pod health
kubectl get pods -n airbnb-lab2
kubectl logs <pod-name> -n airbnb-lab2
```

## References

- [AWS EKS Documentation](https://docs.aws.amazon.com/eks/)
- [eksctl Documentation](https://eksctl.io/)
- [AWS Load Balancer Controller](https://kubernetes-sigs.github.io/aws-load-balancer-controller/)
- [Amazon ECR User Guide](https://docs.aws.amazon.com/ecr/)

