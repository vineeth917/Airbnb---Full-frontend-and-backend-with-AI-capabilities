# Lab 2 Quick Reference Guide

**Quick reference for common commands and configurations used in Lab 2**

---

## 🐳 Docker Commands

### Building Images
```bash
# Build a single service
cd services/traveler-service
docker build -t traveler-service:v2.0 .

# Build all services (from root)
docker build -t traveler-service:v2.0 ./services/traveler-service
docker build -t owner-service:v2.0 ./services/owner-service
docker build -t property-service:v2.0 ./services/property-service
docker build -t booking-service:v2.0 ./services/booking-service
docker build -t ai-agent-service:v2.0 ./services/ai-agent-service
```

### Running Containers
```bash
# Run a single container
docker run -d -p 5000:5000 --name traveler traveler-service:v2.0

# Run with environment variables
docker run -d -p 5000:5000 \
  -e MONGODB_URI=mongodb://localhost:27017/airbnb \
  -e KAFKA_BOOTSTRAP_SERVERS=localhost:9092 \
  --name traveler traveler-service:v2.0

# Run with docker-compose
docker-compose up -d

# View logs
docker logs -f traveler

# Stop and remove
docker stop traveler
docker rm traveler
```

### Image Management
```bash
# List images
docker images

# Remove image
docker rmi traveler-service:v2.0

# Prune unused images
docker image prune -a

# Tag for ECR
docker tag traveler-service:v2.0 <account-id>.dkr.ecr.us-west-2.amazonaws.com/traveler-service:v2.0

# Push to ECR
docker push <account-id>.dkr.ecr.us-west-2.amazonaws.com/traveler-service:v2.0
```

---

## ☸️ Kubernetes Commands

### Cluster Management
```bash
# View cluster info
kubectl cluster-info

# View nodes
kubectl get nodes

# View all resources
kubectl get all -n airbnb-app
```

### Deployment Commands
```bash
# Create namespace
kubectl create namespace airbnb-app

# Apply configurations
kubectl apply -f kubernetes/namespace.yaml
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/secrets/
kubectl apply -f kubernetes/ingress/
kubectl apply -f kubernetes/hpa/

# Apply entire directory
kubectl apply -f kubernetes/ -R

# Delete resources
kubectl delete -f kubernetes/deployments/traveler-deployment.yaml
kubectl delete namespace airbnb-app
```

### Viewing Resources
```bash
# Get pods
kubectl get pods -n airbnb-app
kubectl get pods -n airbnb-app -o wide
kubectl get pods -n airbnb-app --watch

# Get deployments
kubectl get deployments -n airbnb-app

# Get services
kubectl get services -n airbnb-app
kubectl get svc -n airbnb-app

# Get ingress
kubectl get ingress -n airbnb-app

# Get HPA
kubectl get hpa -n airbnb-app

# Get ConfigMaps
kubectl get configmaps -n airbnb-app

# Get Secrets
kubectl get secrets -n airbnb-app
```

### Debugging
```bash
# Describe pod
kubectl describe pod <pod-name> -n airbnb-app

# View logs
kubectl logs <pod-name> -n airbnb-app
kubectl logs <pod-name> -n airbnb-app -f  # Follow
kubectl logs <pod-name> -n airbnb-app --previous  # Previous container

# Execute commands in pod
kubectl exec -it <pod-name> -n airbnb-app -- /bin/bash
kubectl exec -it <pod-name> -n airbnb-app -- python --version

# Port forwarding
kubectl port-forward <pod-name> 5000:5000 -n airbnb-app
kubectl port-forward service/traveler-service 5000:80 -n airbnb-app

# Get pod resource usage
kubectl top pods -n airbnb-app
kubectl top nodes

# Events
kubectl get events -n airbnb-app --sort-by='.lastTimestamp'
```

### Scaling
```bash
# Manual scaling
kubectl scale deployment traveler-service --replicas=5 -n airbnb-app

# Autoscale
kubectl autoscale deployment traveler-service \
  --min=2 --max=10 --cpu-percent=70 -n airbnb-app

# View HPA status
kubectl get hpa -n airbnb-app --watch
```

### Updates & Rollbacks
```bash
# Update image
kubectl set image deployment/traveler-service \
  traveler-service=<ecr-uri>/traveler-service:v2.1 \
  -n airbnb-app

# Rollout status
kubectl rollout status deployment/traveler-service -n airbnb-app

# Rollout history
kubectl rollout history deployment/traveler-service -n airbnb-app

# Rollback
kubectl rollout undo deployment/traveler-service -n airbnb-app

# Restart deployment (rolling restart)
kubectl rollout restart deployment/traveler-service -n airbnb-app
```

### ConfigMaps & Secrets
```bash
# Create ConfigMap from file
kubectl create configmap app-config \
  --from-file=config.yaml \
  -n airbnb-app

# Create Secret from literal
kubectl create secret generic app-secrets \
  --from-literal=mongodb-password=secret123 \
  --from-literal=jwt-secret=myverysecretkey \
  -n airbnb-app

# Encode base64 (for secrets)
echo -n "secret123" | base64

# Decode base64
echo "c2VjcmV0MTIz" | base64 -d

# View secret data
kubectl get secret app-secrets -n airbnb-app -o jsonpath='{.data.mongodb-password}' | base64 -d
```

---

## 📨 Kafka Commands

### Using kafka-python (in Python)
```python
# Producer
from kafka import KafkaProducer
import json

producer = KafkaProducer(
    bootstrap_servers=['localhost:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8')
)

producer.send('booking-requests', {
    'booking_id': 'abc123',
    'listing_id': 'xyz789',
    'status': 'pending'
})

producer.flush()

# Consumer
from kafka import KafkaConsumer

consumer = KafkaConsumer(
    'booking-requests',
    bootstrap_servers=['localhost:9092'],
    group_id='owner-service-group',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',
    enable_auto_commit=True
)

for message in consumer:
    print(f"Received: {message.value}")
```

### Kafka Command Line Tools
```bash
# List topics
kafka-topics.sh --list --bootstrap-server localhost:9092

# Create topic
kafka-topics.sh --create \
  --topic booking-requests \
  --bootstrap-server localhost:9092 \
  --partitions 3 \
  --replication-factor 2

# Describe topic
kafka-topics.sh --describe \
  --topic booking-requests \
  --bootstrap-server localhost:9092

# Produce message (console)
kafka-console-producer.sh \
  --topic booking-requests \
  --bootstrap-server localhost:9092

# Consume messages (console)
kafka-console-consumer.sh \
  --topic booking-requests \
  --bootstrap-server localhost:9092 \
  --from-beginning

# Consumer group info
kafka-consumer-groups.sh \
  --bootstrap-server localhost:9092 \
  --describe \
  --group owner-service-group

# Delete topic
kafka-topics.sh --delete \
  --topic booking-requests \
  --bootstrap-server localhost:9092
```

### Kafka in Kubernetes
```bash
# Get Kafka pods
kubectl get pods -n airbnb-app | grep kafka

# Kafka logs
kubectl logs kafka-0 -n airbnb-app

# Execute Kafka commands in pod
kubectl exec -it kafka-0 -n airbnb-app -- kafka-topics.sh \
  --list --bootstrap-server localhost:9092

# Port forward Kafka
kubectl port-forward kafka-0 9092:9092 -n airbnb-app
```

---

## 💾 MongoDB Commands

### MongoDB Shell Commands
```javascript
// Connect to MongoDB
mongosh "mongodb://localhost:27017"

// Switch to database
use airbnb_lab

// List collections
show collections

// Insert document
db.users.insertOne({
  username: "john_doe",
  email: "john@example.com",
  password_hash: "$2b$12$...",
  user_type: "traveler"
})

// Find documents
db.users.find({ user_type: "traveler" })
db.users.findOne({ username: "john_doe" })

// Update document
db.users.updateOne(
  { username: "john_doe" },
  { $set: { email: "newemail@example.com" } }
)

// Delete document
db.users.deleteOne({ username: "john_doe" })

// Create index
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
db.listings.createIndex({ "location.coordinates": "2dsphere" })

// View indexes
db.users.getIndexes()

// Aggregation
db.bookings.aggregate([
  { $match: { status: "confirmed" } },
  { $group: { _id: "$guest_id", total: { $sum: "$total_price" } } }
])

// Count documents
db.users.countDocuments({ user_type: "traveler" })

// Drop collection
db.users.drop()
```

### PyMongo (Python)
```python
from pymongo import MongoClient
from datetime import datetime

# Connect
client = MongoClient('mongodb://localhost:27017/')
db = client['airbnb_lab']

# Insert
user = {
    'username': 'john_doe',
    'email': 'john@example.com',
    'password_hash': 'hashed_password',
    'user_type': 'traveler',
    'created_at': datetime.utcnow()
}
db.users.insert_one(user)

# Find
user = db.users.find_one({'username': 'john_doe'})
users = list(db.users.find({'user_type': 'traveler'}))

# Update
db.users.update_one(
    {'username': 'john_doe'},
    {'$set': {'email': 'newemail@example.com'}}
)

# Delete
db.users.delete_one({'username': 'john_doe'})

# Create index
db.users.create_index('username', unique=True)
db.users.create_index([('location.coordinates', '2dsphere')])

# Aggregation
pipeline = [
    {'$match': {'status': 'confirmed'}},
    {'$group': {'_id': '$guest_id', 'total': {'$sum': '$total_price'}}}
]
results = list(db.bookings.aggregate(pipeline))
```

### MongoDB in Kubernetes
```bash
# Get MongoDB pod
kubectl get pods -n airbnb-app | grep mongodb

# Connect to MongoDB pod
kubectl exec -it mongodb-0 -n airbnb-app -- mongosh

# MongoDB logs
kubectl logs mongodb-0 -n airbnb-app

# Port forward MongoDB
kubectl port-forward mongodb-0 27017:27017 -n airbnb-app
```

---

## ⚛️ Redux Commands & Patterns

### Store Setup
```javascript
// store/store.js
import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import propertyReducer from './slices/propertySlice';
import bookingReducer from './slices/bookingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    properties: propertyReducer,
    bookings: bookingReducer,
  },
});
```

### Creating Slices
```javascript
// store/slices/authSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

export const loginUser = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await axios.post('/api/auth/login', credentials);
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response.data);
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.isAuthenticated = true;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { logout } = authSlice.actions;
export default authSlice.reducer;
```

### Using Redux in Components
```javascript
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { loginUser } from '../store/slices/authSlice';

function Login() {
  const dispatch = useDispatch();
  const { loading, error, isAuthenticated } = useSelector((state) => state.auth);
  
  const [credentials, setCredentials] = useState({
    username: '',
    password: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch(loginUser(credentials));
  };

  if (isAuthenticated) {
    return <Redirect to="/dashboard" />;
  }

  return (
    <form onSubmit={handleSubmit}>
      <input
        type="text"
        value={credentials.username}
        onChange={(e) => setCredentials({...credentials, username: e.target.value})}
      />
      <input
        type="password"
        value={credentials.password}
        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
      />
      <button type="submit" disabled={loading}>
        {loading ? 'Loading...' : 'Login'}
      </button>
      {error && <p>{error.message}</p>}
    </form>
  );
}
```

---

## 🧪 JMeter Commands

### Running JMeter
```bash
# GUI mode (for building test plan)
jmeter

# Non-GUI mode (for testing)
jmeter -n -t test-plan.jmx -l results.csv

# With HTML report
jmeter -n -t test-plan.jmx -l results.csv -e -o report/

# With specific log file
jmeter -n -t test-plan.jmx -l results.csv -j jmeter.log

# Generate report from existing results
jmeter -g results.csv -o report/
```

### Test Plan Structure
```xml
<!-- Basic HTTP Request -->
<HTTPSamplerProxy>
  <stringProp name="HTTPSampler.domain">your-domain.com</stringProp>
  <stringProp name="HTTPSampler.port">443</stringProp>
  <stringProp name="HTTPSampler.protocol">https</stringProp>
  <stringProp name="HTTPSampler.path">/api/listings</stringProp>
  <stringProp name="HTTPSampler.method">GET</stringProp>
</HTTPSamplerProxy>
```

---

## ☁️ AWS Commands

### EKS Commands
```bash
# Create EKS cluster
eksctl create cluster \
  --name airbnb-cluster \
  --version 1.28 \
  --region us-west-2 \
  --nodegroup-name standard-workers \
  --node-type t3.medium \
  --nodes 3 \
  --nodes-min 2 \
  --nodes-max 5 \
  --managed

# Update kubeconfig
aws eks update-kubeconfig --region us-west-2 --name airbnb-cluster

# List clusters
eksctl get cluster

# Delete cluster
eksctl delete cluster --name airbnb-cluster --region us-west-2
```

### ECR Commands
```bash
# Create repository
aws ecr create-repository --repository-name traveler-service --region us-west-2

# Get login token
aws ecr get-login-password --region us-west-2 | \
  docker login --username AWS --password-stdin \
  <account-id>.dkr.ecr.us-west-2.amazonaws.com

# List repositories
aws ecr describe-repositories --region us-west-2

# List images in repository
aws ecr describe-images \
  --repository-name traveler-service \
  --region us-west-2

# Delete image
aws ecr batch-delete-image \
  --repository-name traveler-service \
  --image-ids imageTag=v2.0 \
  --region us-west-2
```

### General AWS Commands
```bash
# Configure AWS CLI
aws configure

# List EC2 instances
aws ec2 describe-instances --region us-west-2

# List Load Balancers
aws elbv2 describe-load-balancers --region us-west-2

# CloudWatch logs
aws logs describe-log-groups --region us-west-2
aws logs tail /aws/eks/airbnb-cluster/cluster --follow --region us-west-2
```

---

## 🔐 Security Commands

### Password Hashing (bcrypt)
```python
import bcrypt

# Hash password
password = "MyPassword123"
salt = bcrypt.gensalt(rounds=12)
hashed = bcrypt.hashpw(password.encode('utf-8'), salt)

# Verify password
is_valid = bcrypt.checkpw(password.encode('utf-8'), hashed)
```

### JWT Tokens
```python
import jwt
from datetime import datetime, timedelta

# Create token
payload = {
    'user_id': 'user-uuid',
    'username': 'john_doe',
    'exp': datetime.utcnow() + timedelta(hours=24)
}
token = jwt.encode(payload, 'secret-key', algorithm='HS256')

# Verify token
try:
    decoded = jwt.decode(token, 'secret-key', algorithms=['HS256'])
    print(decoded)
except jwt.ExpiredSignatureError:
    print("Token expired")
except jwt.InvalidTokenError:
    print("Invalid token")
```

### Base64 Encoding (for K8s secrets)
```bash
# Encode
echo -n "my-secret-password" | base64

# Decode
echo "bXktc2VjcmV0LXBhc3N3b3Jk" | base64 -d
```

---

## 🛠️ Troubleshooting

### Docker Issues
```bash
# Container won't start
docker logs <container-name>
docker inspect <container-name>

# Port already in use
lsof -i :5000
kill -9 <PID>

# Permission denied
sudo usermod -aG docker $USER
# Logout and login again

# Clean up everything
docker system prune -a --volumes
```

### Kubernetes Issues
```bash
# Pod stuck in Pending
kubectl describe pod <pod-name> -n airbnb-app
# Check: Insufficient resources, PVC not bound, image pull errors

# Pod CrashLoopBackOff
kubectl logs <pod-name> -n airbnb-app
kubectl logs <pod-name> -n airbnb-app --previous

# Service not accessible
kubectl get endpoints <service-name> -n airbnb-app
kubectl port-forward service/<service-name> 8080:80 -n airbnb-app

# ImagePullBackOff
kubectl describe pod <pod-name> -n airbnb-app
# Check: Image name, ECR authentication, image exists

# ConfigMap/Secret not found
kubectl get configmaps -n airbnb-app
kubectl get secrets -n airbnb-app
```

### MongoDB Issues
```python
# Connection timeout
# Check: MongoDB is running, correct connection string, network policies

# Authentication failed
# Check: Username/password correct, user exists, auth enabled

# Collection not found
# Use db.list_collection_names() to verify

# Index creation failed
# Check: Duplicate keys, index already exists
```

### Kafka Issues
```bash
# Producer can't connect
# Check: Kafka is running, correct bootstrap servers, network access

# Consumer not receiving messages
# Check: Topic exists, consumer group ID, offset reset

# View consumer lag
kafka-consumer-groups.sh --bootstrap-server localhost:9092 \
  --describe --group owner-service-group
```

---

## 📚 Useful Environment Variables

### Python Services
```bash
MONGODB_URI=mongodb://mongodb:27017/airbnb_lab
KAFKA_BOOTSTRAP_SERVERS=kafka:9092
JWT_SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
JWT_EXPIRATION_HOURS=24
FLASK_ENV=production
FLASK_DEBUG=False
LOG_LEVEL=INFO
```

### React Frontend
```bash
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_ENV=development
```

---

## 🔗 Important URLs

### Local Development
- Backend API: http://localhost:5000
- Frontend: http://localhost:3000
- MongoDB: mongodb://localhost:27017
- Kafka: localhost:9092
- Kubernetes Dashboard: http://localhost:8001/api/v1/namespaces/kubernetes-dashboard/services/https:kubernetes-dashboard:/proxy/

### AWS (Example)
- Application: https://airbnb.your-domain.com
- API: https://api.airbnb.your-domain.com

---

**Last Updated:** November 21, 2025  
**Version:** 1.0

