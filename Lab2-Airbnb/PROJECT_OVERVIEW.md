# Lab 2 Project Overview: Enhanced Airbnb Prototype

**Course:** DATA 236 - Distributed Systems for Data Engineering  
**Team:** Pair 10  
**Due Date:** November 24, 2025  
**Total Points:** 40  

---

## 🎯 Project Summary

This project enhances the Lab 1 Airbnb prototype by transforming it from a monolithic application into a distributed microservices architecture. The enhancement includes containerization with Docker, orchestration using Kubernetes, asynchronous messaging with Kafka, database migration to MongoDB, frontend state management with Redux, and cloud deployment on AWS.

---

## 📐 System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                          AWS Cloud (EKS)                             │
│                                                                       │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │                    Ingress Controller (NGINX)                   │ │
│  │                  (Load Balancer + API Gateway)                  │ │
│  └─────────────┬──────────────────────────────────────────────────┘ │
│                │                                                      │
│  ┌─────────────┴────────────────────────────────────────────┐       │
│  │                    Kubernetes Cluster                      │       │
│  │                                                            │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐ │       │
│  │  │ Traveler │  │  Owner   │  │ Property │  │ Booking  │ │       │
│  │  │ Service  │  │ Service  │  │ Service  │  │ Service  │ │       │
│  │  │  (2-10)  │  │  (2-10)  │  │  (2-10)  │  │  (2-10)  │ │       │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘  └────┬─────┘ │       │
│  │       │             │              │              │        │       │
│  │       └─────────────┴──────────────┴──────────────┘        │       │
│  │                            │                                │       │
│  │              ┌─────────────┴─────────────┐                 │       │
│  │              │                           │                 │       │
│  │       ┌──────▼──────┐            ┌──────▼──────┐         │       │
│  │       │   MongoDB   │            │    Kafka    │         │       │
│  │       │  (StatefulSet)           │  (StatefulSet)        │       │
│  │       │   + Volumes │            │  + Zookeeper│         │       │
│  │       └─────────────┘            └─────────────┘         │       │
│  │                                                            │       │
│  └────────────────────────────────────────────────────────────┘       │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend (React + Redux)                     │
│                    (Deployed on S3 + CloudFront)                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Microservices Architecture

#### 1. Traveler Service
**Responsibilities:**
- User authentication (travelers)
- Property search and browsing
- Booking creation
- Favorites management
- User preferences
- Profile management

**Endpoints:**
- POST `/api/traveler/auth/register`
- POST `/api/traveler/auth/login`
- GET `/api/traveler/bookings`
- GET `/api/traveler/favorites`
- POST `/api/traveler/favorites`
- DELETE `/api/traveler/favorites/{id}`
- GET `/api/traveler/preferences`
- PUT `/api/traveler/preferences`

**Technology Stack:**
- Python 3.9+
- Flask
- PyMongo
- Kafka-Python (Producer)
- JWT Authentication

#### 2. Owner Service
**Responsibilities:**
- Owner authentication
- Booking management (accept/cancel)
- Property analytics
- Availability management
- Revenue tracking

**Endpoints:**
- POST `/api/owner/auth/register`
- POST `/api/owner/auth/login`
- GET `/api/owner/bookings`
- POST `/api/owner/bookings/{id}/accept`
- POST `/api/owner/bookings/{id}/cancel`
- GET `/api/owner/analytics`
- PUT `/api/owner/availability/{listing_id}`

**Technology Stack:**
- Python 3.9+
- Flask
- PyMongo
- Kafka-Python (Producer & Consumer)
- JWT Authentication

#### 3. Property Service
**Responsibilities:**
- Property CRUD operations
- Property search and filtering
- Location-based queries
- Property details and amenities
- Image management

**Endpoints:**
- GET `/api/properties`
- GET `/api/properties/{id}`
- POST `/api/properties`
- PUT `/api/properties/{id}`
- DELETE `/api/properties/{id}`
- GET `/api/properties/search`

**Technology Stack:**
- Python 3.9+
- Flask
- PyMongo
- Geospatial indexing

#### 4. Booking Service
**Responsibilities:**
- Booking creation
- Status management
- Date validation
- Price calculation
- Conflict detection
- Booking history

**Endpoints:**
- POST `/api/bookings`
- GET `/api/bookings/{id}`
- PUT `/api/bookings/{id}`
- GET `/api/bookings/user/{user_id}`

**Technology Stack:**
- Python 3.9+
- Flask
- PyMongo
- Kafka-Python (Producer)

#### 5. AI Agent Service
**Responsibilities:**
- Itinerary planning
- Activity recommendations
- Weather integration
- Personalized suggestions
- Smart search

**Endpoints:**
- POST `/api/ai/itinerary`
- GET `/api/ai/recommendations`
- GET `/api/ai/activities`
- GET `/api/ai/weather`

**Technology Stack:**
- Python 3.9+
- Flask
- OpenAI API
- Weather API

---

## 🔄 Event-Driven Architecture (Kafka)

### Message Flow Diagram

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│  Traveler   │         │  Kafka Cluster   │         │    Owner    │
│  Service    │         │                  │         │   Service   │
│             │         │  ┌────────────┐  │         │             │
│             │────────>│  │  Topic:    │  │────────>│             │
│  Creates    │ Publish │  │  booking-  │  │ Consume │  Receives   │
│  Booking    │         │  │  requests  │  │         │  Request    │
│             │         │  └────────────┘  │         │             │
└─────────────┘         │                  │         └──────┬──────┘
      ▲                 │  ┌────────────┐  │                │
      │                 │  │  Topic:    │  │                │
      │      Consume    │  │  booking-  │◄─│────────────────┘
      └─────────────────┤  │  updates   │  │    Publish
                        │  └────────────┘  │    (Accept/Cancel)
                        │                  │
                        │  ┌────────────┐  │
                        │  │  Topic:    │  │
                        │  │  notifications  │
                        │  └────────────┘  │
                        └──────────────────┘
```

### Kafka Topics

| Topic Name | Partitions | Replication | Retention | Purpose |
|------------|------------|-------------|-----------|---------|
| `booking-requests` | 3 | 2 | 7 days | New booking creation events |
| `booking-updates` | 3 | 2 | 7 days | Status change events |
| `booking-confirmations` | 3 | 2 | 7 days | Owner acceptance events |
| `booking-cancellations` | 3 | 2 | 7 days | Cancellation events |
| `notifications` | 5 | 2 | 7 days | User notification events |
| `booking-dlq` | 1 | 2 | 30 days | Dead letter queue |

### Event Schemas

**Booking Request Event:**
```json
{
  "event_type": "booking_created",
  "event_id": "uuid-v4",
  "timestamp": "2025-11-21T10:30:00Z",
  "booking_id": "booking-uuid",
  "listing_id": "listing-uuid",
  "guest_id": "user-uuid",
  "host_id": "user-uuid",
  "check_in": "2025-12-01",
  "check_out": "2025-12-05",
  "total_price": 500.00,
  "status": "pending",
  "metadata": {
    "guest_count": 2,
    "special_requests": "Late check-in"
  }
}
```

**Booking Update Event:**
```json
{
  "event_type": "booking_status_updated",
  "event_id": "uuid-v4",
  "timestamp": "2025-11-21T11:00:00Z",
  "booking_id": "booking-uuid",
  "previous_status": "pending",
  "new_status": "confirmed",
  "updated_by": "owner-uuid",
  "message": "Booking confirmed by owner"
}
```

---

## 💾 Database Architecture (MongoDB)

### Collections Schema

#### Users Collection
```javascript
{
  _id: ObjectId("..."),
  username: "john_traveler",
  email: "john@example.com",
  password_hash: "$2b$12$...", // bcrypt hashed
  user_type: "traveler", // or "owner"
  first_name: "John",
  last_name: "Doe",
  phone: "+1234567890",
  profile: {
    about_me: "Love traveling!",
    city: "San Francisco",
    country: "USA",
    languages: ["English", "Spanish"],
    gender: "male",
    profile_picture: "url"
  },
  is_active: true,
  created_at: ISODate("2025-01-15T10:00:00Z"),
  updated_at: ISODate("2025-11-20T15:30:00Z")
}
```

**Indexes:**
- `username` (unique)
- `email` (unique)
- `user_type`

#### Listings Collection
```javascript
{
  _id: ObjectId("..."),
  title: "Beautiful Beach House",
  description: "Amazing ocean view...",
  price_per_night: 150.00,
  location: {
    address: "123 Beach St, Santa Monica, CA",
    city: "Santa Monica",
    state: "CA",
    country: "USA",
    coordinates: {
      type: "Point",
      coordinates: [-118.4912, 34.0195] // [longitude, latitude]
    }
  },
  property_type: "house",
  amenities: ["wifi", "pool", "parking", "kitchen"],
  capacity: {
    max_guests: 6,
    bedrooms: 3,
    bathrooms: 2.5,
    beds: 4
  },
  host_id: ObjectId("..."),
  images: ["url1", "url2", "url3"],
  is_active: true,
  version: 1,
  created_at: ISODate("2025-01-20T12:00:00Z"),
  updated_at: ISODate("2025-11-15T09:00:00Z")
}
```

**Indexes:**
- `host_id`
- `location.coordinates` (2dsphere for geospatial)
- `property_type`
- `price_per_night`
- `location.city`, `location.state`

#### Bookings Collection
```javascript
{
  _id: ObjectId("..."),
  listing_id: ObjectId("..."),
  guest_id: ObjectId("..."),
  check_in: ISODate("2025-12-01T00:00:00Z"),
  check_out: ISODate("2025-12-05T00:00:00Z"),
  total_price: 600.00,
  status: "confirmed", // pending, confirmed, cancelled, completed
  guest_count: 2,
  special_requests: "Late check-in",
  payment_status: "paid",
  cancellation_reason: null,
  version: 1,
  created_at: ISODate("2025-11-21T10:30:00Z"),
  updated_at: ISODate("2025-11-21T11:00:00Z")
}
```

**Indexes:**
- `listing_id`
- `guest_id`
- `status`
- Compound: `listing_id`, `check_in`, `check_out`

#### Sessions Collection
```javascript
{
  _id: "session-id-uuid",
  user_id: ObjectId("..."),
  data: {
    // Flask session data
  },
  expires_at: ISODate("2025-11-22T10:30:00Z"),
  created_at: ISODate("2025-11-21T10:30:00Z")
}
```

**Indexes:**
- `expires_at` (TTL index with expireAfterSeconds: 0)
- `user_id`

---

## 🎨 Frontend Architecture (React + Redux)

### Redux Store Structure

```javascript
{
  auth: {
    user: {
      id: "user-uuid",
      username: "john_traveler",
      email: "john@example.com",
      user_type: "traveler",
      profile: { ... }
    },
    token: "jwt-token-here",
    isAuthenticated: true,
    loading: false,
    error: null
  },
  
  properties: {
    listings: [
      { id: "1", title: "Beach House", price: 150, ... },
      { id: "2", title: "Mountain Cabin", price: 120, ... }
    ],
    selectedProperty: { ... },
    filters: {
      location: "Santa Monica",
      minPrice: 0,
      maxPrice: 500,
      propertyType: "house",
      maxGuests: 4,
      amenities: ["wifi", "pool"]
    },
    pagination: {
      page: 1,
      perPage: 10,
      total: 50,
      hasNext: true
    },
    loading: false,
    error: null
  },
  
  bookings: {
    userBookings: [
      { id: "1", status: "confirmed", listing: { ... }, ... },
      { id: "2", status: "pending", listing: { ... }, ... }
    ],
    favorites: [
      { id: "listing-1", title: "Beach House", ... },
      { id: "listing-2", title: "Mountain Cabin", ... }
    ],
    cart: [],
    currentBooking: {
      listing: { ... },
      checkIn: "2025-12-01",
      checkOut: "2025-12-05",
      guestCount: 2
    },
    loading: false,
    error: null
  }
}
```

### Component Structure

```
src/
├── store/
│   ├── store.js
│   ├── slices/
│   │   ├── authSlice.js
│   │   ├── propertySlice.js
│   │   └── bookingSlice.js
│   └── middleware/
│       ├── apiMiddleware.js
│       └── loggerMiddleware.js
├── components/
│   ├── Auth/
│   │   ├── Login.js
│   │   ├── Register.js
│   │   └── Profile.js
│   ├── Properties/
│   │   ├── PropertyList.js
│   │   ├── PropertyCard.js
│   │   ├── PropertyDetails.js
│   │   └── PropertyFilters.js
│   ├── Bookings/
│   │   ├── BookingForm.js
│   │   ├── BookingList.js
│   │   └── BookingCard.js
│   └── Common/
│       ├── Header.js
│       ├── Footer.js
│       └── LoadingSpinner.js
├── pages/
│   ├── HomePage.js
│   ├── PropertyPage.js
│   ├── BookingsPage.js
│   └── DashboardPage.js
└── App.js
```

---

## 🐳 Docker Configuration

### Multi-Stage Build Example (Python Service)

```dockerfile
# Stage 1: Build
FROM python:3.9-slim as builder

WORKDIR /app
COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.9-slim

# Create non-root user
RUN useradd -m -u 1000 appuser

WORKDIR /app

# Copy dependencies from builder
COPY --from=builder /root/.local /home/appuser/.local
COPY --chown=appuser:appuser . .

# Switch to non-root user
USER appuser

# Add .local/bin to PATH
ENV PATH=/home/appuser/.local/bin:$PATH

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=40s \
  CMD python -c "import requests; requests.get('http://localhost:5000/health')"

# Expose port
EXPOSE 5000

# Run application
CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "4", "app:app"]
```

### Image Optimization Techniques
- Multi-stage builds (reduces image size by 50-70%)
- Alpine base images where possible
- Layer caching optimization
- .dockerignore for excluding unnecessary files
- Non-root user for security
- Health checks for container orchestration

---

## ☸️ Kubernetes Configuration

### Deployment Example (Traveler Service)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: traveler-service
  namespace: airbnb-app
  labels:
    app: traveler-service
    tier: backend
spec:
  replicas: 2
  selector:
    matchLabels:
      app: traveler-service
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    metadata:
      labels:
        app: traveler-service
    spec:
      containers:
      - name: traveler-service
        image: <ecr-repo>/traveler-service:v2.0.0
        imagePullPolicy: Always
        ports:
        - containerPort: 5000
          name: http
        env:
        - name: MONGODB_URI
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: mongodb_uri
        - name: KAFKA_BOOTSTRAP_SERVERS
          valueFrom:
            configMapKeyRef:
              name: app-config
              key: kafka_bootstrap_servers
        - name: JWT_SECRET_KEY
          valueFrom:
            secretKeyRef:
              name: app-secrets
              key: jwt_secret_key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health
            port: 5000
          initialDelaySeconds: 20
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 3
```

### Service Example

```yaml
apiVersion: v1
kind: Service
metadata:
  name: traveler-service
  namespace: airbnb-app
spec:
  selector:
    app: traveler-service
  ports:
  - name: http
    port: 80
    targetPort: 5000
    protocol: TCP
  type: ClusterIP
```

### HorizontalPodAutoscaler Example

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: traveler-service-hpa
  namespace: airbnb-app
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: traveler-service
  minReplicas: 2
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Pods
        value: 2
        periodSeconds: 60
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Pods
        value: 1
        periodSeconds: 120
```

---

## 🚀 AWS Deployment Architecture

### AWS Resources

```
┌─────────────────────────────────────────────────────┐
│                    AWS Account                       │
│                                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │              VPC (10.0.0.0/16)                  │ │
│  │                                                  │ │
│  │  ┌──────────────┐        ┌──────────────┐      │ │
│  │  │  Public      │        │  Public      │      │ │
│  │  │  Subnet      │        │  Subnet      │      │ │
│  │  │  us-west-2a  │        │  us-west-2b  │      │ │
│  │  └──────────────┘        └──────────────┘      │ │
│  │         │                        │              │ │
│  │  ┌──────▼──────┐        ┌───────▼──────┐      │ │
│  │  │  Private    │        │  Private     │      │ │
│  │  │  Subnet     │        │  Subnet      │      │ │
│  │  │  us-west-2a │        │  us-west-2b  │      │ │
│  │  └─────────────┘        └──────────────┘      │ │
│  │         │                        │              │ │
│  │         └────────────┬───────────┘              │ │
│  │                      │                          │ │
│  │              ┌───────▼───────┐                  │ │
│  │              │   EKS Cluster │                  │ │
│  │              │   (K8s 1.28)  │                  │ │
│  │              └───────────────┘                  │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │           Application Load Balancer              │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │      Elastic Container Registry (ECR)            │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
│  ┌──────────────────────────────────────────────────┐ │
│  │          CloudWatch (Monitoring & Logs)          │ │
│  └──────────────────────────────────────────────────┘ │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### AWS Services Used

| Service | Purpose | Configuration |
|---------|---------|---------------|
| **EKS** | Kubernetes cluster | K8s 1.28, 3 t3.medium nodes |
| **ECR** | Container registry | 6 repositories (5 services + frontend) |
| **ALB** | Load balancing | Internet-facing, HTTPS |
| **VPC** | Network isolation | 2 AZs, public/private subnets |
| **EBS** | Persistent storage | gp3 volumes for MongoDB/Kafka |
| **CloudWatch** | Monitoring & logging | Container Insights enabled |
| **Route53** | DNS management | Custom domain routing |
| **IAM** | Access control | Service accounts, roles |
| **Secrets Manager** | Secret management | API keys, credentials |

---

## 📊 Performance Testing Strategy

### JMeter Test Plan Structure

```
Test Plan: Airbnb Microservices Load Test
│
├── Thread Group: 100 Users
│   ├── Ramp-up: 60 seconds
│   ├── Duration: 5 minutes
│   └── Scenarios:
│       ├── Login Scenario
│       ├── Search Properties
│       ├── View Property Details
│       ├── Create Booking
│       └── Add to Favorites
│
├── Thread Group: 200 Users (same scenarios)
├── Thread Group: 300 Users (same scenarios)
├── Thread Group: 400 Users (same scenarios)
└── Thread Group: 500 Users (same scenarios)
```

### Performance Metrics Tracked

| Metric | Target | Critical Threshold |
|--------|--------|-------------------|
| Average Response Time | < 500ms | < 2000ms |
| 95th Percentile | < 1000ms | < 3000ms |
| Throughput | > 100 req/s | > 50 req/s |
| Error Rate | < 1% | < 5% |
| CPU Utilization | < 70% | < 90% |
| Memory Usage | < 80% | < 95% |

---

## 🔒 Security Measures

### Application Security
- **Password Hashing:** bcrypt with 12 salt rounds
- **Session Management:** Secure cookies, HTTP-only, SameSite
- **JWT Tokens:** RS256 algorithm, 24-hour expiration
- **Input Validation:** Sanitization for NoSQL injection
- **Rate Limiting:** 100 requests/minute per user
- **HTTPS:** TLS 1.3, valid certificates
- **CORS:** Restricted origins

### Infrastructure Security
- **Network Policies:** K8s network policies for service isolation
- **RBAC:** Role-based access control in K8s
- **Secrets Management:** AWS Secrets Manager, K8s Secrets
- **Image Scanning:** ECR vulnerability scanning
- **Security Groups:** AWS security groups for network access
- **Encryption:** At-rest (EBS) and in-transit (TLS)

---

## 📈 Monitoring & Observability

### Monitoring Stack
- **CloudWatch Container Insights:** CPU, memory, network
- **CloudWatch Logs:** Application and container logs
- **Kafka Monitoring:** Topic lag, consumer group status
- **MongoDB Monitoring:** Query performance, connection pool
- **K8s Metrics Server:** Pod resource usage
- **Custom Metrics:** Business metrics (bookings, searches)

### Alerting
- High error rate (> 5%)
- Slow response times (> 2s avg)
- Pod crashes/restarts
- High resource utilization (> 90%)
- Kafka consumer lag
- MongoDB connection issues

---

## 💰 Cost Estimation (AWS)

### Monthly Cost Breakdown

| Resource | Configuration | Monthly Cost (USD) |
|----------|--------------|-------------------|
| EKS Cluster | 1 cluster | $73 |
| EC2 Instances | 3 × t3.medium | $90 |
| EBS Volumes | 100GB gp3 | $8 |
| Application Load Balancer | 1 ALB | $22 |
| Data Transfer | 100GB out | $9 |
| CloudWatch | Logs + Metrics | $15 |
| ECR | 10GB storage | $1 |
| **Total** | | **~$218/month** |

**Cost Optimization Tips:**
- Use spot instances for non-production
- Enable cluster autoscaler
- Right-size node instances
- Use S3 lifecycle policies for logs
- Delete unused volumes and images

---

## 🎓 Learning Objectives

### Technical Skills Gained
1. **Microservices Architecture:** Decomposing monolithic applications
2. **Containerization:** Docker best practices and optimization
3. **Orchestration:** Kubernetes deployment and management
4. **Event-Driven Systems:** Kafka producer/consumer patterns
5. **NoSQL Databases:** MongoDB schema design and queries
6. **State Management:** Redux in React applications
7. **Performance Testing:** JMeter load testing and analysis
8. **Cloud Deployment:** AWS EKS and related services
9. **DevOps Practices:** CI/CD, monitoring, logging

### Distributed Systems Concepts
1. **Scalability:** Horizontal scaling with K8s
2. **High Availability:** Multi-replica deployments
3. **Fault Tolerance:** Self-healing, health checks
4. **Service Discovery:** K8s DNS and service mesh
5. **Load Balancing:** AWS ALB and K8s services
6. **Asynchronous Processing:** Event-driven architecture
7. **Data Consistency:** Eventual consistency with Kafka
8. **Resource Management:** CPU/memory limits and requests

---

## 📚 Technology Stack Summary

### Backend
- **Language:** Python 3.9+
- **Framework:** Flask
- **Database:** MongoDB 6.0+
- **Message Queue:** Apache Kafka 3.5+
- **Authentication:** JWT (PyJWT)
- **Password Hashing:** bcrypt
- **Database Driver:** PyMongo
- **Kafka Client:** kafka-python
- **Server:** Gunicorn

### Frontend
- **Library:** React 18+
- **State Management:** Redux Toolkit
- **HTTP Client:** Axios
- **Routing:** React Router v6
- **Styling:** Tailwind CSS
- **Build Tool:** Webpack (via Create React App)

### Infrastructure
- **Containerization:** Docker 24+
- **Orchestration:** Kubernetes 1.28+
- **Cloud Platform:** AWS
- **Container Registry:** Amazon ECR
- **Load Balancer:** AWS ALB
- **Monitoring:** CloudWatch
- **DNS:** Route53

### Testing & Tools
- **Load Testing:** Apache JMeter 5.6+
- **API Testing:** Postman
- **Version Control:** Git
- **IDE:** VS Code, PyCharm
- **CLI Tools:** kubectl, aws-cli, docker

---

## 📞 Quick Reference Links

- **Kubernetes Docs:** https://kubernetes.io/docs/
- **Kafka Docs:** https://kafka.apache.org/documentation/
- **MongoDB Docs:** https://docs.mongodb.com/
- **Redux Docs:** https://redux.js.org/
- **AWS EKS Docs:** https://docs.aws.amazon.com/eks/
- **JMeter Manual:** https://jmeter.apache.org/usermanual/
- **Docker Best Practices:** https://docs.docker.com/develop/dev-best-practices/

---

## ✅ Project Status

- [x] Requirements documented
- [x] Tasks breakdown created
- [ ] Services dockerized (0/5)
- [ ] Kubernetes configured
- [ ] Kafka integrated
- [ ] MongoDB migrated
- [ ] Redux implemented
- [ ] JMeter tests created
- [ ] AWS deployed
- [ ] Documentation complete
- [ ] Report written

**Current Phase:** Planning & Documentation  
**Next Steps:** Begin service decomposition and Dockerization

---

**Last Updated:** November 21, 2025  
**Version:** 1.0  
**Prepared by:** Pair 10

