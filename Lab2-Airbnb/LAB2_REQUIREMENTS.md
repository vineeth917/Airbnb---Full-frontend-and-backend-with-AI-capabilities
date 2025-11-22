# Lab 2 Requirements: Enhanced Airbnb Prototype

**Course:** DATA 236 - Distributed Systems for Data Engineering  
**Due Date:** November 24, 2025  
**Points:** 40  
**Assignment Type:** Extension of Lab 1

---

## 📋 Overview

This lab extends the Lab 1 Airbnb prototype by adding:
- Docker containerization
- Kubernetes orchestration
- Kafka for asynchronous messaging
- MongoDB database migration
- Redux state management
- AWS deployment
- JMeter performance testing

---

## 🎯 Assignment Parts

### Part 1: Docker & Kubernetes Setup (15 points)

#### 1.1 Dockerization Requirements
Containerize **5 microservices** from Lab 1:

1. **Traveler Service**
   - User authentication (login/signup)
   - Property search and viewing
   - Booking creation
   - Favorites management
   - User preferences

2. **Owner Service**
   - Owner authentication
   - Property listing management
   - Booking requests (accept/cancel)
   - Analytics dashboard
   - Availability management

3. **Property Service**
   - Property CRUD operations
   - Property search and filtering
   - Property details and amenities
   - Location-based queries

4. **Booking Service**
   - Booking creation and management
   - Status updates (pending, confirmed, cancelled)
   - Date validation
   - Price calculation

5. **Agentic AI Service**
   - Itinerary planning
   - Activity recommendations
   - Weather integration
   - Personalized suggestions

**Requirements:**
- Each service must have its own Dockerfile
- Use multi-stage builds for optimization
- Minimize image sizes
- Follow Docker best practices
- Include health check endpoints

#### 1.2 Kubernetes Orchestration Requirements

**Must Implement:**
- Deployments for all 5 services
- Services (ClusterIP, NodePort, or LoadBalancer)
- ConfigMaps for configuration management
- Secrets for sensitive data (API keys, DB credentials)
- Persistent Volume Claims (PVC) for MongoDB
- Horizontal Pod Autoscaler (HPA) for auto-scaling
- Ingress controller for routing
- Resource limits and requests
- Liveness and readiness probes
- Service discovery and communication

**Deployment Requirements:**
- Minimum 2 replicas per service for high availability
- Rolling update strategy
- Zero-downtime deployments
- Health monitoring

---

### Part 2: Kafka for Asynchronous Messaging (10 points)

#### 2.1 Kafka Infrastructure Setup

**Components Required:**
- Kafka broker(s) in Kubernetes
- Zookeeper for Kafka coordination
- Kafka topics for different event types
- Kafka Connect (optional)

**Topics to Create:**
- `booking-requests` - New booking creation events
- `booking-updates` - Status change events
- `booking-confirmations` - Owner acceptance events
- `booking-cancellations` - Cancellation events
- `notifications` - User notification events

#### 2.2 Booking Flow Implementation

**Event-Driven Architecture:**

```
┌─────────────┐         ┌──────────┐         ┌──────────────┐
│   Traveler  │ ──────→ │  Kafka   │ ──────→ │    Owner     │
│   Service   │ Publish │  Broker  │ Consume │   Service    │
│ (Producer)  │         │          │         │  (Consumer)  │
└─────────────┘         └──────────┘         └──────────────┘
       ↑                                              │
       │                Publish Status                │
       └──────────────────────────────────────────────┘
```

**Flow Steps:**
1. **Traveler creates booking** → Publishes `booking-requests` event
2. **Owner Service consumes** → Receives booking request notification
3. **Owner accepts/cancels** → Publishes `booking-updates` event
4. **Traveler Service consumes** → Updates booking status for traveler

**Event Schema Example:**
```json
{
  "event_type": "booking_created",
  "booking_id": "uuid",
  "listing_id": "uuid",
  "guest_id": "uuid",
  "host_id": "uuid",
  "check_in": "2025-12-01",
  "check_out": "2025-12-05",
  "total_price": 500.00,
  "status": "pending",
  "timestamp": "2025-11-21T10:30:00Z"
}
```

**Implementation Requirements:**
- Kafka producer in Traveler/Booking services
- Kafka consumer in Owner service
- Event serialization (JSON or Avro)
- Error handling and retry logic
- Dead letter queue for failed messages
- Message ordering guarantees
- Idempotent consumers

---

### Part 3: MongoDB Integration (5 points)

#### 3.1 Database Migration

**Current State:** SQLite/MySQL (Lab 1)  
**Target State:** MongoDB

**Migration Requirements:**

1. **Schema Design for MongoDB**
   - Users collection
   - Listings collection
   - Bookings collection
   - Favorites collection
   - UserPreferences collection
   - Availability collection
   - Sessions collection

2. **Data Models:**

```javascript
// Users Collection
{
  _id: ObjectId,
  username: String,
  email: String,
  password_hash: String (encrypted),
  user_type: String, // 'traveler' or 'owner'
  first_name: String,
  last_name: String,
  phone: String,
  profile: {
    about_me: String,
    city: String,
    country: String,
    languages: [String],
    gender: String
  },
  is_active: Boolean,
  created_at: Date,
  updated_at: Date
}

// Sessions Collection
{
  _id: String (session_id),
  user_id: ObjectId,
  data: Object,
  expires_at: Date,
  created_at: Date
}
```

#### 3.2 Security Requirements

**Password Encryption:**
- Use bcrypt with salt rounds >= 12
- Store hashed passwords only
- Implement password strength validation
- Secure session management

**Session Storage:**
- Store sessions in MongoDB (not filesystem)
- Implement session expiration
- Use encrypted session cookies
- Enable HTTPS in production

**Additional Security:**
- Input validation and sanitization
- Protection against NoSQL injection
- Rate limiting on authentication endpoints
- JWT tokens for API authentication

---

### Part 4: Redux Integration (5 points)

#### 4.1 Redux Store Setup

**State Management Structure:**

```javascript
store = {
  auth: {
    user: null,
    token: null,
    isAuthenticated: false,
    loading: false,
    error: null
  },
  properties: {
    listings: [],
    selectedProperty: null,
    filters: {},
    loading: false,
    error: null
  },
  bookings: {
    userBookings: [],
    favorites: [],
    cart: [],
    currentBooking: null,
    loading: false,
    error: null
  }
}
```

#### 4.2 Redux Implementation Requirements

**1. Authentication State:**
- `loginUser(credentials)` - Login action
- `registerUser(userData)` - Signup action
- `logoutUser()` - Logout action
- `updateProfile(updates)` - Profile update
- Store JWT tokens in Redux
- Persist auth state (localStorage or sessionStorage)

**2. Property Data State:**
- `fetchProperties(filters)` - Get listings
- `fetchPropertyDetails(id)` - Get single property
- `searchProperties(query)` - Search functionality
- `setFilters(filters)` - Update search filters
- Caching and pagination support

**3. Booking State:**
- `createBooking(bookingData)` - Create booking
- `fetchUserBookings()` - Get user bookings
- `updateBookingStatus(id, status)` - Update status
- `addToFavorites(listingId)` - Add favorite
- `removeFromFavorites(listingId)` - Remove favorite
- Shopping cart for multi-property booking

#### 4.3 Redux Middleware

**Required Middleware:**
- `redux-thunk` or `redux-saga` for async actions
- `redux-logger` (development only)
- Custom API middleware for HTTP requests
- Error handling middleware

#### 4.4 Redux DevTools Integration

**Requirements:**
- Enable Redux DevTools in development
- Capture screenshots showing:
  - State changes during login
  - Property search results in store
  - Booking creation flow
  - Favorites management

---

### Part 5: JMeter Performance Testing (5 points)

#### 5.1 Test Plan Requirements

**APIs to Test:**

1. **Authentication APIs**
   - POST `/api/auth/register`
   - POST `/api/auth/login`
   - GET `/api/auth/me`
   - POST `/api/auth/logout`

2. **Property APIs**
   - GET `/api/listings` (with pagination)
   - GET `/api/listings/{id}`
   - POST `/api/listings` (Owner only)
   - PUT `/api/listings/{id}`

3. **Booking APIs**
   - GET `/api/bookings`
   - POST `/api/bookings`
   - POST `/api/bookings/{id}/accept`
   - POST `/api/bookings/{id}/cancel`

4. **Favorites APIs**
   - GET `/api/favorites`
   - POST `/api/favorites`
   - DELETE `/api/favorites/{id}`

#### 5.2 Test Scenarios

**Concurrent User Load Testing:**
- Test with: 100, 200, 300, 400, 500 concurrent users
- Ramp-up period: 60 seconds
- Test duration: 5 minutes per load level

**Test Metrics to Capture:**
- Average response time (ms)
- Median response time
- 90th percentile response time
- 95th percentile response time
- 99th percentile response time
- Throughput (requests/second)
- Error rate (%)
- Standard deviation
- Min/Max response times

#### 5.3 Performance Analysis

**Required Deliverables:**

1. **Performance Graphs:**
   - Response time vs concurrent users
   - Throughput vs concurrent users
   - Error rate vs concurrent users

2. **Analysis Report:**
   - Identify performance bottlenecks
   - Explain why response times increase
   - Analyze at what point system degrades
   - Recommend optimizations
   - Database query performance
   - Network latency analysis
   - Resource utilization (CPU, Memory)

3. **Test Results Files:**
   - JMeter test plan (.jmx file)
   - Test result CSV files
   - HTML dashboard reports
   - Screenshots of graphs

---

## 📦 Deliverables

### 1. Code Repository Structure

```
Lab2-Airbnb/
├── services/
│   ├── traveler-service/
│   │   ├── Dockerfile
│   │   ├── requirements.txt
│   │   ├── app.py
│   │   └── ...
│   ├── owner-service/
│   │   ├── Dockerfile
│   │   └── ...
│   ├── property-service/
│   │   ├── Dockerfile
│   │   └── ...
│   ├── booking-service/
│   │   ├── Dockerfile
│   │   └── ...
│   └── ai-agent-service/
│       ├── Dockerfile
│       └── ...
├── kubernetes/
│   ├── deployments/
│   │   ├── traveler-deployment.yaml
│   │   ├── owner-deployment.yaml
│   │   ├── property-deployment.yaml
│   │   ├── booking-deployment.yaml
│   │   ├── ai-agent-deployment.yaml
│   │   ├── mongodb-deployment.yaml
│   │   └── kafka-deployment.yaml
│   ├── services/
│   │   ├── traveler-service.yaml
│   │   └── ...
│   ├── configmaps/
│   │   └── app-config.yaml
│   ├── secrets/
│   │   └── app-secrets.yaml
│   ├── ingress/
│   │   └── ingress.yaml
│   └── hpa/
│       └── autoscaling.yaml
├── kafka-setup/
│   ├── kafka-deployment.yaml
│   ├── zookeeper-deployment.yaml
│   ├── topics/
│   │   └── create-topics.yaml
│   └── producers/
│       └── booking-producer.py
├── frontend/
│   ├── src/
│   │   ├── store/
│   │   │   ├── store.js
│   │   │   ├── slices/
│   │   │   │   ├── authSlice.js
│   │   │   │   ├── propertySlice.js
│   │   │   │   └── bookingSlice.js
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
├── jmeter-tests/
│   ├── test-plan.jmx
│   ├── results/
│   │   ├── 100-users.csv
│   │   ├── 200-users.csv
│   │   ├── 300-users.csv
│   │   ├── 400-users.csv
│   │   └── 500-users.csv
│   └── reports/
│       └── performance-analysis.md
├── docker-compose.yml
├── README.md
└── DEPLOYMENT_GUIDE.md
```

### 2. Documentation Requirements

**README.md must include:**
- Project overview and architecture
- Prerequisites and dependencies
- Setup instructions (local development)
- Docker build and run commands
- Kubernetes deployment steps
- Kafka setup and testing
- MongoDB migration guide
- Redux implementation details
- JMeter testing instructions
- AWS deployment guide
- Troubleshooting section

**DEPLOYMENT_GUIDE.md must include:**
- AWS account setup
- EKS cluster creation
- kubectl configuration
- Service deployment order
- Monitoring and logging setup
- Scaling configuration
- Cost optimization tips

### 3. Screenshots Required

**Kubernetes:**
- `kubectl get pods` output
- `kubectl get services` output
- `kubectl get deployments` output
- Kubernetes dashboard

**AWS:**
- EC2 instances running
- EKS cluster overview
- Load balancer configuration
- CloudWatch metrics

**Kafka:**
- Kafka topics list
- Producer sending messages
- Consumer receiving messages
- Kafka manager UI (if used)

**Redux:**
- Redux DevTools showing state tree
- Authentication flow state changes
- Property search state updates
- Booking creation state flow

**JMeter:**
- Test plan configuration
- Response time graphs
- Throughput graphs
- Summary report tables

### 4. Report Requirements

**Lab2_Report.pdf should cover:**

1. **Architecture Overview (2-3 pages)**
   - System architecture diagram
   - Microservices breakdown
   - Communication patterns
   - Technology stack justification

2. **Docker & Kubernetes Implementation (3-4 pages)**
   - Dockerization approach
   - Kubernetes orchestration strategy
   - Service discovery mechanism
   - Scaling configuration
   - Challenges faced and solutions

3. **Kafka Integration (2-3 pages)**
   - Event-driven architecture design
   - Topic structure and partitioning
   - Producer/consumer implementation
   - Message flow diagrams
   - Benefits of asynchronous processing

4. **MongoDB Migration (2 pages)**
   - Schema design decisions
   - Migration process
   - Security implementation
   - Performance considerations

5. **Redux State Management (2-3 pages)**
   - Redux architecture
   - State structure design
   - Action and reducer implementation
   - Benefits observed
   - State management best practices

6. **Performance Testing (3-4 pages)**
   - Test methodology
   - Performance graphs and charts
   - Analysis of results
   - Bottleneck identification
   - Optimization recommendations
   - Scalability insights

7. **AWS Deployment (2-3 pages)**
   - Deployment architecture
   - Service configuration
   - Monitoring setup
   - Cost analysis
   - Production considerations

8. **Conclusion (1 page)**
   - Lessons learned
   - Challenges overcome
   - Future improvements
   - Skills gained

---

## ✅ Acceptance Criteria

### Part 1: Docker & Kubernetes (15 points)
- [ ] All 5 services have working Dockerfiles
- [ ] Docker images build successfully
- [ ] Services run in containers locally
- [ ] Kubernetes manifests for all services
- [ ] Services communicate properly in K8s
- [ ] Health checks implemented
- [ ] Auto-scaling configured
- [ ] Zero-downtime deployment works

### Part 2: Kafka (10 points)
- [ ] Kafka cluster running in Kubernetes
- [ ] Topics created correctly
- [ ] Booking events published successfully
- [ ] Owner service consumes events
- [ ] Status updates flow back to traveler
- [ ] Error handling implemented
- [ ] Message ordering maintained

### Part 3: MongoDB (5 points)
- [ ] MongoDB deployed in Kubernetes
- [ ] All collections created
- [ ] Data migrated from Lab 1
- [ ] Sessions stored in MongoDB
- [ ] Passwords encrypted with bcrypt
- [ ] No security vulnerabilities

### Part 4: Redux (5 points)
- [ ] Redux store configured
- [ ] Auth state management works
- [ ] Property data managed in Redux
- [ ] Booking state functional
- [ ] Async actions implemented
- [ ] Redux DevTools integrated
- [ ] State persists across page refreshes

### Part 5: JMeter (5 points)
- [ ] Test plan covers all critical APIs
- [ ] Tests run for all user load levels
- [ ] Results captured and documented
- [ ] Graphs generated
- [ ] Performance analysis complete
- [ ] Bottlenecks identified
- [ ] Recommendations provided

---

## 🚀 Submission Checklist

- [ ] GitHub repository updated with all code
- [ ] All Dockerfiles present and working
- [ ] Kubernetes configurations complete
- [ ] Kafka integration functional
- [ ] MongoDB fully configured
- [ ] Redux implemented in frontend
- [ ] JMeter test plans and results
- [ ] README.md comprehensive and clear
- [ ] DEPLOYMENT_GUIDE.md included
- [ ] Screenshots in `screenshots/` folder
- [ ] Lab2_Report.pdf complete
- [ ] No hardcoded credentials
- [ ] .gitignore properly configured
- [ ] Code commented and clean

---

## 📚 Technical Stack

**Backend:**
- Python 3.9+
- Flask/FastAPI
- PyMongo
- kafka-python
- bcrypt

**Frontend:**
- React 18+
- Redux Toolkit
- React-Redux
- Redux DevTools
- Axios

**Infrastructure:**
- Docker
- Kubernetes
- Apache Kafka
- Zookeeper
- MongoDB
- AWS EKS
- AWS EC2
- AWS Load Balancer

**Testing:**
- Apache JMeter
- pytest (unit tests)
- Postman

**Monitoring:**
- Prometheus (optional)
- Grafana (optional)
- Kubernetes Dashboard

---

## ⏰ Timeline Recommendation

**Day 1-2:** Dockerization and local testing  
**Day 3-4:** Kubernetes configuration and deployment  
**Day 5-6:** Kafka setup and integration  
**Day 7:** MongoDB migration  
**Day 8-9:** Redux implementation  
**Day 10:** JMeter testing  
**Day 11:** AWS deployment  
**Day 12-13:** Documentation and report  
**Day 14:** Final testing and submission  

---

## 📞 Support Resources

- Kubernetes Documentation: https://kubernetes.io/docs/
- Kafka Documentation: https://kafka.apache.org/documentation/
- MongoDB Documentation: https://docs.mongodb.com/
- Redux Documentation: https://redux.js.org/
- JMeter Documentation: https://jmeter.apache.org/usermanual/
- AWS EKS Guide: https://docs.aws.amazon.com/eks/

---

**Last Updated:** November 21, 2025  
**Version:** 1.0

