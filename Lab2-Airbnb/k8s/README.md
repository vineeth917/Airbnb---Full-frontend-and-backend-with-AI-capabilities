# Kubernetes Deployment Guide for Lab2 Airbnb

This directory contains all Kubernetes configuration files for deploying the Lab2 Airbnb microservices application.

## Prerequisites

1. **Kubernetes Cluster**: Ensure you have access to a Kubernetes cluster (local via Minikube/Kind/Docker Desktop, or cloud-based like EKS, GKE, AKS)
2. **kubectl**: Install and configure kubectl to interact with your cluster
3. **Docker Images**: Build and push all Docker images to a registry accessible by your cluster

## Quick Start

### 1. Verify Kubernetes Cluster

```bash
# Check cluster status
kubectl cluster-info

# Check nodes
kubectl get nodes
```

### 2. Deploy All Resources

Apply all Kubernetes manifests in the correct order:

```bash
# Step 1: Create namespace
kubectl apply -f namespace.yaml

# Step 2: Create ConfigMaps and Secrets
kubectl apply -f configmap.yaml
kubectl apply -f secrets.yaml

# Step 3: Deploy MongoDB
kubectl apply -f mongodb-deployment.yaml

# Step 4: Deploy Zookeeper and Kafka
kubectl apply -f zookeeper-deployment.yaml
kubectl apply -f kafka-deployment.yaml

# Wait for Kafka and MongoDB to be ready
kubectl wait --for=condition=ready pod -l app=mongodb -n airbnb-lab2 --timeout=120s
kubectl wait --for=condition=ready pod -l app=kafka -n airbnb-lab2 --timeout=120s

# Step 5: Deploy Microservices
kubectl apply -f traveler-service-deployment.yaml
kubectl apply -f owner-service-deployment.yaml
kubectl apply -f property-service-deployment.yaml
kubectl apply -f booking-service-deployment.yaml
kubectl apply -f ai-agent-service-deployment.yaml

# Step 6: Deploy Ingress
kubectl apply -f ingress.yaml
```

### 3. Verify Deployment

```bash
# Check all pods in the namespace
kubectl get pods -n airbnb-lab2

# Check services
kubectl get svc -n airbnb-lab2

# Check deployments
kubectl get deployments -n airbnb-lab2

# Check HPA (Horizontal Pod Autoscalers)
kubectl get hpa -n airbnb-lab2

# Check ingress
kubectl get ingress -n airbnb-lab2
```

## Architecture Overview

### Services

| Service | Port | Replicas | Description |
|---------|------|----------|-------------|
| traveler-service | 5001 | 2-5 (auto-scaled) | User authentication, preferences, favorites |
| owner-service | 5002 | 2-5 (auto-scaled) | Owner management, host analytics |
| property-service | 5003 | 2-5 (auto-scaled) | Property listings and management |
| booking-service | 5004 | 2-5 (auto-scaled) | Booking management and Kafka integration |
| ai-agent-service | 8000 | 1 | AI-powered recommendations |
| mongodb | 27017 | 1 | Database |
| kafka | 9092 | 1 | Message broker |
| zookeeper | 2181 | 1 | Kafka coordination |

### Auto-Scaling Configuration

All microservices are configured with Horizontal Pod Autoscaler (HPA):
- **Min Replicas**: 2
- **Max Replicas**: 5
- **CPU Target**: 70%
- **Memory Target**: 80%

### Resource Limits

Each service has defined resource requests and limits:
- **Requests**: 256Mi memory, 250m CPU
- **Limits**: 512Mi memory, 500m CPU

## Accessing Services

### Local Development (Minikube/Docker Desktop)

```bash
# Add to /etc/hosts
echo "127.0.0.1 airbnb-lab2.local" | sudo tee -a /etc/hosts

# Access services via Ingress
curl http://airbnb-lab2.local/api/traveler/health
curl http://airbnb-lab2.local/api/property/health
```

### Port Forwarding (Alternative)

```bash
# Forward traveler-service
kubectl port-forward -n airbnb-lab2 svc/traveler-service 5001:5001

# Forward booking-service
kubectl port-forward -n airbnb-lab2 svc/booking-service 5004:5004

# Forward MongoDB (for debugging)
kubectl port-forward -n airbnb-lab2 svc/mongodb 27017:27017
```

## Monitoring and Debugging

### View Logs

```bash
# View logs for a specific service
kubectl logs -n airbnb-lab2 -l app=traveler-service --tail=100 -f

# View logs for all pods
kubectl logs -n airbnb-lab2 --all-containers=true --tail=50

# View logs for a specific pod
kubectl logs -n airbnb-lab2 <pod-name> -f
```

### Describe Resources

```bash
# Describe a pod
kubectl describe pod -n airbnb-lab2 <pod-name>

# Describe a service
kubectl describe svc -n airbnb-lab2 traveler-service

# Describe deployment
kubectl describe deployment -n airbnb-lab2 booking-service
```

### Execute Commands in Pods

```bash
# Access MongoDB shell
kubectl exec -it -n airbnb-lab2 <mongodb-pod-name> -- mongosh

# Access a service container
kubectl exec -it -n airbnb-lab2 <pod-name> -- /bin/bash
```

## Scaling

### Manual Scaling

```bash
# Scale traveler-service to 3 replicas
kubectl scale deployment traveler-service -n airbnb-lab2 --replicas=3

# Scale all services
for service in traveler-service owner-service property-service booking-service; do
  kubectl scale deployment $service -n airbnb-lab2 --replicas=3
done
```

### View HPA Status

```bash
# Watch HPA in action
kubectl get hpa -n airbnb-lab2 --watch

# Describe HPA
kubectl describe hpa traveler-service-hpa -n airbnb-lab2
```

## Updating Services

### Rolling Update

```bash
# Update image for a service
kubectl set image deployment/traveler-service -n airbnb-lab2 \
  traveler-service=lab2-airbnb-traveler-service:v2

# Check rollout status
kubectl rollout status deployment/traveler-service -n airbnb-lab2

# View rollout history
kubectl rollout history deployment/traveler-service -n airbnb-lab2
```

### Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/traveler-service -n airbnb-lab2

# Rollback to specific revision
kubectl rollout undo deployment/traveler-service -n airbnb-lab2 --to-revision=2
```

## Health Checks

All services include:
- **Liveness Probe**: Checks if the container is running
- **Readiness Probe**: Checks if the service is ready to accept traffic

```bash
# Check probe status
kubectl describe pod -n airbnb-lab2 <pod-name> | grep -A 5 "Liveness\|Readiness"
```

## Cleanup

### Delete All Resources

```bash
# Delete all resources in namespace
kubectl delete namespace airbnb-lab2

# Or delete individual resources
kubectl delete -f .
```

### Delete Specific Services

```bash
# Delete a specific service and deployment
kubectl delete -f traveler-service-deployment.yaml

# Delete ingress
kubectl delete -f ingress.yaml
```

## Troubleshooting

### Common Issues

1. **Pods not starting**
   ```bash
   # Check pod events
   kubectl describe pod -n airbnb-lab2 <pod-name>
   
   # Check logs
   kubectl logs -n airbnb-lab2 <pod-name>
   ```

2. **Service not accessible**
   ```bash
   # Check service endpoints
   kubectl get endpoints -n airbnb-lab2
   
   # Test service connectivity
   kubectl run test-pod --rm -it --image=busybox -n airbnb-lab2 -- sh
   # Inside pod: wget -O- http://traveler-service:5001/health
   ```

3. **ImagePullError**
   ```bash
   # For local images, ensure they're available
   # For Minikube: eval $(minikube docker-env)
   # For Kind: kind load docker-image lab2-airbnb-traveler-service:latest
   ```

4. **MongoDB connection issues**
   ```bash
   # Check MongoDB logs
   kubectl logs -n airbnb-lab2 -l app=mongodb
   
   # Test connection from a service
   kubectl exec -it -n airbnb-lab2 <service-pod> -- curl mongodb:27017
   ```

5. **Kafka connection issues**
   ```bash
   # Check Kafka and Zookeeper logs
   kubectl logs -n airbnb-lab2 -l app=kafka
   kubectl logs -n airbnb-lab2 -l app=zookeeper
   ```

## Production Considerations

Before deploying to production:

1. **Update Secrets**: Replace placeholder passwords and keys in `secrets.yaml`
2. **Storage**: Configure proper persistent storage for MongoDB
3. **Ingress**: Set up TLS/SSL certificates
4. **Resource Limits**: Adjust based on load testing
5. **Monitoring**: Integrate with Prometheus/Grafana
6. **Logging**: Set up centralized logging (ELK stack, CloudWatch, etc.)
7. **Backup**: Implement database backup strategy
8. **Network Policies**: Add network policies for security
9. **RBAC**: Configure proper Role-Based Access Control

## AWS Deployment Notes

For AWS EKS deployment:

1. Create EKS cluster
2. Configure AWS Load Balancer Controller for Ingress
3. Use EBS CSI driver for persistent volumes
4. Configure IAM roles for service accounts
5. Use AWS Secrets Manager for sensitive data
6. Enable CloudWatch Container Insights for monitoring

See AWS deployment documentation for detailed steps.

