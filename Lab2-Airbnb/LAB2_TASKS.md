# Lab 2 Implementation Tasks

**Course:** DATA 236 - Distributed Systems for Data Engineering  
**Project:** Enhanced Airbnb Prototype  
**Due Date:** November 24, 2025  

---

## 📋 Task Breakdown by Priority

### 🔴 PHASE 1: Core Infrastructure Setup (Days 1-4)

#### Task 1.1: Service Decomposition & Dockerization
**Priority:** HIGH | **Duration:** 2 days | **Points:** 5/15

**Sub-tasks:**
- [ ] **1.1.1** Analyze Lab 1 monolithic backend (`app.py`)
  - Identify endpoints for each service
  - Map database models to services
  - Document API dependencies

- [ ] **1.1.2** Create Traveler Service
  - Extract traveler-specific endpoints:
    - `/api/auth/register` (user_type='traveler')
    - `/api/auth/login`
    - `/api/auth/me`
    - `/api/bookings` (GET - traveler bookings)
    - `/api/favorites` (GET, POST, DELETE)
    - `/api/preferences` (GET, PUT)
  - Create `services/traveler-service/app.py`
  - Create `services/traveler-service/requirements.txt`
  - Create `services/traveler-service/Dockerfile`
  - Test locally with curl/Postman

- [ ] **1.1.3** Create Owner Service
  - Extract owner-specific endpoints:
    - `/api/auth/register` (user_type='owner')
    - `/api/bookings/{id}/accept`
    - `/api/bookings/{id}/cancel`
    - `/api/analytics/host/{host_id}`
    - `/api/availability/{listing_id}` (all operations)
  - Create `services/owner-service/app.py`
  - Create `services/owner-service/requirements.txt`
  - Create `services/owner-service/Dockerfile`
  - Test locally

- [ ] **1.1.4** Create Property Service
  - Extract property-specific endpoints:
    - `/api/listings` (GET - search, POST - create)
    - `/api/listings/{id}` (GET, PUT, DELETE)
    - `/api/analytics/property/{listing_id}`
  - Create `services/property-service/app.py`
  - Create `services/property-service/requirements.txt`
  - Create `services/property-service/Dockerfile`
  - Test locally

- [ ] **1.1.5** Create Booking Service
  - Extract booking-specific endpoints:
    - `/api/bookings` (POST - create booking)
    - `/api/bookings/{id}` (GET)
    - `/api/bookings` (GET - list bookings)
  - Create `services/booking-service/app.py`
  - Create `services/booking-service/requirements.txt`
  - Create `services/booking-service/Dockerfile`
  - Integrate Kafka producer
  - Test locally

- [ ] **1.1.6** Setup AI Agent Service
  - Copy from Lab 1: `ai-agent/` directory
  - Extract AI endpoints:
    - `/api/ai/itinerary`
    - `/api/ai/recommendations`
    - `/api/ai/activities`
  - Create `services/ai-agent-service/Dockerfile`
  - Update `requirements.txt`
  - Test locally

- [ ] **1.1.7** Docker Best Practices Implementation
  - Use multi-stage builds
  - Optimize layer caching
  - Minimize image sizes
  - Add .dockerignore files
  - Implement health check endpoints
  - Document environment variables
  - Create docker-compose.yml for local dev

**Deliverables:**
- 5 working Dockerfiles
- 5 containerized services
- Local docker-compose setup
- Service documentation

---

#### Task 1.2: Kubernetes Configuration
**Priority:** HIGH | **Duration:** 2 days | **Points:** 10/15

**Sub-tasks:**
- [ ] **1.2.1** Create Base Kubernetes Resources
  - Create namespace: `airbnb-app`
  - Setup directory structure:
    ```
    kubernetes/
    ├── namespace.yaml
    ├── deployments/
    ├── services/
    ├── configmaps/
    ├── secrets/
    ├── ingress/
    └── hpa/
    ```

- [ ] **1.2.2** Create Deployments for Each Service
  - `traveler-deployment.yaml`:
    - 2 replicas minimum
    - Resource limits (CPU: 500m, Memory: 512Mi)
    - Liveness probe: `/health`
    - Readiness probe: `/health`
    - Rolling update strategy
  - `owner-deployment.yaml` (similar config)
  - `property-deployment.yaml` (similar config)
  - `booking-deployment.yaml` (similar config)
  - `ai-agent-deployment.yaml` (similar config)

- [ ] **1.2.3** Create Kubernetes Services
  - `traveler-service.yaml` (ClusterIP)
  - `owner-service.yaml` (ClusterIP)
  - `property-service.yaml` (ClusterIP)
  - `booking-service.yaml` (ClusterIP)
  - `ai-agent-service.yaml` (ClusterIP)
  - Configure service discovery (DNS)

- [ ] **1.2.4** Create ConfigMaps
  - `app-config.yaml`:
    - Database URLs
    - Kafka broker URLs
    - Service endpoints
    - Feature flags
    - Log levels

- [ ] **1.2.5** Create Secrets
  - `app-secrets.yaml`:
    - MongoDB credentials
    - JWT secret keys
    - API keys (weather, AI)
    - Kafka authentication
  - Base64 encode all values
  - Use sealed secrets in production

- [ ] **1.2.6** Setup Ingress Controller
  - Install NGINX Ingress Controller
  - Create `ingress.yaml`:
    - Route `/api/traveler/*` → traveler-service
    - Route `/api/owner/*` → owner-service
    - Route `/api/properties/*` → property-service
    - Route `/api/bookings/*` → booking-service
    - Route `/api/ai/*` → ai-agent-service
  - Configure TLS/SSL

- [ ] **1.2.7** Configure Auto-Scaling
  - Create HPA for each service:
    - Min replicas: 2
    - Max replicas: 10
    - Target CPU utilization: 70%
    - Scale-up policy: add 2 pods/60s
    - Scale-down policy: remove 1 pod/120s

- [ ] **1.2.8** Test Kubernetes Deployment
  - Deploy all resources: `kubectl apply -f kubernetes/`
  - Verify pods running: `kubectl get pods -n airbnb-app`
  - Check services: `kubectl get svc -n airbnb-app`
  - Test service communication
  - Verify auto-scaling with load test
  - Document deployment process

**Deliverables:**
- Complete Kubernetes manifests
- Deployment scripts
- Service running in K8s
- Auto-scaling configured

---

### 🟠 PHASE 2: Kafka Integration (Days 5-6)

#### Task 2.1: Kafka Infrastructure Setup
**Priority:** HIGH | **Duration:** 1 day | **Points:** 4/10

**Sub-tasks:**
- [ ] **2.1.1** Deploy Kafka in Kubernetes
  - Create `kafka-setup/zookeeper-deployment.yaml`:
    - StatefulSet with 1 replica
    - PersistentVolumeClaim (10Gi)
    - Service (ClusterIP)
  - Create `kafka-setup/kafka-deployment.yaml`:
    - StatefulSet with 3 replicas
    - PersistentVolumeClaim per replica (20Gi)
    - Service (ClusterIP and Headless)
    - Configure KAFKA_ADVERTISED_LISTENERS
    - Set replication factor: 2
    - Set min.insync.replicas: 2

- [ ] **2.1.2** Create Kafka Topics
  - `booking-requests`:
    - Partitions: 3
    - Replication factor: 2
    - Retention: 7 days
  - `booking-updates`:
    - Partitions: 3
    - Replication factor: 2
    - Retention: 7 days
  - `booking-confirmations`:
    - Partitions: 3
    - Replication factor: 2
  - `booking-cancellations`:
    - Partitions: 3
    - Replication factor: 2
  - `notifications`:
    - Partitions: 5
    - Replication factor: 2

- [ ] **2.1.3** Setup Kafka Monitoring
  - Deploy Kafka Exporter
  - Configure Prometheus scraping
  - Create Grafana dashboard (optional)
  - Monitor topic lag
  - Monitor consumer group status

**Deliverables:**
- Kafka cluster running in K8s
- Topics created and configured
- Monitoring setup

---

#### Task 2.2: Implement Kafka Producers
**Priority:** HIGH | **Duration:** 0.5 day | **Points:** 3/10

**Sub-tasks:**
- [ ] **2.2.1** Add Kafka to Booking Service (Producer)
  - Install: `pip install kafka-python`
  - Create `kafka_producer.py`:
    ```python
    from kafka import KafkaProducer
    import json
    
    producer = KafkaProducer(
        bootstrap_servers=['kafka:9092'],
        value_serializer=lambda v: json.dumps(v).encode('utf-8')
    )
    ```
  - Implement `publish_booking_request(booking_data)`
  - Add to booking creation endpoint
  - Handle errors and retries
  - Log all published events

- [ ] **2.2.2** Add Kafka to Owner Service (Producer)
  - Create `kafka_producer.py`
  - Implement `publish_booking_update(booking_id, status, message)`
  - Add to accept/cancel booking endpoints
  - Implement event schemas

**Deliverables:**
- Kafka producers in services
- Event publishing working
- Error handling implemented

---

#### Task 2.3: Implement Kafka Consumers
**Priority:** HIGH | **Duration:** 0.5 day | **Points:** 3/10

**Sub-tasks:**
- [ ] **2.3.1** Create Consumer in Owner Service
  - Create `kafka_consumer.py`:
    ```python
    from kafka import KafkaConsumer
    import json
    
    consumer = KafkaConsumer(
        'booking-requests',
        bootstrap_servers=['kafka:9092'],
        group_id='owner-service-group',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
        auto_offset_reset='earliest',
        enable_auto_commit=True
    )
    ```
  - Run consumer in background thread
  - Process booking request events
  - Send notifications to owner
  - Update database with new bookings
  - Implement idempotency (avoid duplicates)

- [ ] **2.3.2** Create Consumer in Traveler Service
  - Create `kafka_consumer.py`
  - Subscribe to `booking-updates` topic
  - Process status change events
  - Update traveler's booking list
  - Send notifications to traveler

- [ ] **2.3.3** Error Handling & Dead Letter Queue
  - Implement retry logic (max 3 retries)
  - Create `booking-dlq` topic
  - Send failed messages to DLQ
  - Log failed messages for manual review

- [ ] **2.3.4** Test End-to-End Kafka Flow
  - Create test booking from traveler
  - Verify event in Kafka
  - Verify owner receives notification
  - Owner accepts booking
  - Verify traveler receives update
  - Test with multiple concurrent bookings
  - Verify message ordering

**Deliverables:**
- Kafka consumers implemented
- End-to-end event flow working
- Error handling complete

---

### 🟡 PHASE 3: MongoDB Migration (Day 7)

#### Task 3.1: MongoDB Setup in Kubernetes
**Priority:** MEDIUM | **Duration:** 0.5 day | **Points:** 2/5

**Sub-tasks:**
- [ ] **3.1.1** Deploy MongoDB in Kubernetes
  - Create `mongodb-statefulset.yaml`:
    - StatefulSet with 1 replica (3 for production)
    - PersistentVolumeClaim (50Gi)
    - Resource limits
  - Create `mongodb-service.yaml` (Headless service)
  - Create `mongodb-config.yaml` (ConfigMap)
  - Create `mongodb-secret.yaml` (credentials)
  - Initialize with authentication enabled

- [ ] **3.1.2** Setup MongoDB Database & Collections
  - Create database: `airbnb_lab`
  - Create collections:
    - `users`
    - `listings`
    - `bookings`
    - `favorites`
    - `user_preferences`
    - `availability`
    - `sessions`
  - Create indexes:
    - `users`: username (unique), email (unique)
    - `listings`: location, property_type, price_per_night
    - `bookings`: listing_id, guest_id, check_in, status
    - `sessions`: expires_at (TTL index)

**Deliverables:**
- MongoDB running in K8s
- Database and collections created
- Indexes configured

---

#### Task 3.2: Data Migration & Security
**Priority:** MEDIUM | **Duration:** 0.5 day | **Points:** 3/5

**Sub-tasks:**
- [ ] **3.2.1** Create Migration Script
  - Create `migration/migrate_to_mongodb.py`
  - Connect to Lab 1 SQLite database
  - Extract all data from tables
  - Transform to MongoDB documents
  - Handle relationships (foreign keys)
  - Insert into MongoDB collections
  - Verify data integrity

- [ ] **3.2.2** Update Services to Use MongoDB
  - Replace SQLAlchemy with PyMongo
  - Update database connection:
    ```python
    from pymongo import MongoClient
    client = MongoClient('mongodb://mongodb:27017/')
    db = client['airbnb_lab']
    ```
  - Rewrite queries for MongoDB:
    - Find, insert, update, delete operations
    - Aggregation pipelines
    - Text search
  - Update all 5 services

- [ ] **3.2.3** Implement Password Encryption
  - Use bcrypt with salt rounds = 12:
    ```python
    import bcrypt
    salt = bcrypt.gensalt(rounds=12)
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    ```
  - Update registration endpoint
  - Update login verification
  - Migrate existing passwords (rehash)

- [ ] **3.2.4** Implement Session Storage in MongoDB
  - Replace Flask-Session filesystem with MongoDB
  - Install: `pip install flask-session[mongodb]`
  - Configure session storage:
    ```python
    app.config['SESSION_TYPE'] = 'mongodb'
    app.config['SESSION_MONGODB'] = client
    app.config['SESSION_MONGODB_DB'] = 'airbnb_lab'
    app.config['SESSION_MONGODB_COLLECT'] = 'sessions'
    ```
  - Set session expiration (24 hours)
  - Test session persistence

- [ ] **3.2.5** Security Hardening
  - Implement input validation for NoSQL injection
  - Sanitize user inputs
  - Use parameterized queries
  - Enable MongoDB authentication
  - Create separate DB users for each service
  - Use read-only user for read operations
  - Encrypt connections (TLS)
  - Regular security audits

**Deliverables:**
- Data migrated to MongoDB
- Services using MongoDB
- Passwords encrypted
- Sessions in MongoDB
- Security measures implemented

---

### 🟢 PHASE 4: Redux Implementation (Days 8-9)

#### Task 4.1: Redux Store Setup
**Priority:** MEDIUM | **Duration:** 1 day | **Points:** 2/5

**Sub-tasks:**
- [ ] **4.1.1** Install Redux Dependencies
  ```bash
  cd frontend
  npm install @reduxjs/toolkit react-redux redux-persist
  npm install --save-dev @redux-devtools/extension
  ```

- [ ] **4.1.2** Create Redux Store Structure
  - Create `src/store/store.js`:
    ```javascript
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
      middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware().concat(loggerMiddleware),
    });
    ```

- [ ] **4.1.3** Wrap App with Redux Provider
  - Update `src/index.js`:
    ```javascript
    import { Provider } from 'react-redux';
    import { store } from './store/store';
    
    root.render(
      <Provider store={store}>
        <App />
      </Provider>
    );
    ```

**Deliverables:**
- Redux store configured
- Provider integrated
- DevTools enabled

---

#### Task 4.2: Implement Redux Slices
**Priority:** MEDIUM | **Duration:** 1 day | **Points:** 3/5

**Sub-tasks:**
- [ ] **4.2.1** Create Auth Slice
  - Create `src/store/slices/authSlice.js`:
    ```javascript
    import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
    
    export const loginUser = createAsyncThunk(
      'auth/login',
      async (credentials, { rejectWithValue }) => {
        // API call
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
    ```
  - Implement `registerUser` async thunk
  - Implement `updateProfile` async thunk
  - Add selectors

- [ ] **4.2.2** Create Property Slice
  - Create `src/store/slices/propertySlice.js`
  - Implement async thunks:
    - `fetchProperties(filters)`
    - `fetchPropertyDetails(id)`
    - `searchProperties(query)`
    - `createProperty(data)` (owner only)
    - `updateProperty(id, data)`
  - Add state for:
    - listings array
    - selectedProperty
    - filters
    - pagination
    - loading/error
  - Implement reducers for filter updates
  - Add selectors for filtered properties

- [ ] **4.2.3** Create Booking Slice
  - Create `src/store/slices/bookingSlice.js`
  - Implement async thunks:
    - `fetchUserBookings()`
    - `createBooking(bookingData)`
    - `updateBookingStatus(id, status)`
    - `addToFavorites(listingId)`
    - `removeFromFavorites(listingId)`
    - `fetchFavorites()`
  - Add state for:
    - userBookings array
    - favorites array
    - cart array
    - currentBooking
    - loading/error
  - Implement cart management

- [ ] **4.2.4** Implement State Persistence
  - Install: `npm install redux-persist`
  - Configure persistence:
    ```javascript
    import { persistStore, persistReducer } from 'redux-persist';
    import storage from 'redux-persist/lib/storage';
    
    const persistConfig = {
      key: 'root',
      storage,
      whitelist: ['auth', 'bookings']
    };
    ```
  - Persist auth token
  - Persist favorites
  - Persist cart

- [ ] **4.2.5** Connect Components to Redux
  - Update Login component to use Redux
  - Update Property List to use Redux
  - Update Booking components to use Redux
  - Update Favorites to use Redux
  - Replace all useState with Redux state
  - Remove prop drilling

- [ ] **4.2.6** Testing & Screenshots
  - Test auth flow (login, register, logout)
  - Test property search and filters
  - Test booking creation
  - Test favorites management
  - Capture Redux DevTools screenshots:
    - Initial state
    - After login (auth state)
    - After property search (properties state)
    - After booking creation (bookings state)
    - State diff view
    - Action history

**Deliverables:**
- All Redux slices implemented
- Components connected to Redux
- State persisting correctly
- Redux DevTools screenshots

---

### 🔵 PHASE 5: JMeter Performance Testing (Day 10)

#### Task 5.1: Create JMeter Test Plans
**Priority:** MEDIUM | **Duration:** 0.5 day | **Points:** 2/5

**Sub-tasks:**
- [ ] **5.1.1** Install JMeter
  - Download Apache JMeter 5.6+
  - Install Java JDK 11+
  - Configure JMeter environment

- [ ] **5.1.2** Create Test Plan Structure
  - Create Thread Groups for each load level:
    - 100 users
    - 200 users
    - 300 users
    - 400 users
    - 500 users
  - Configure ramp-up: 60 seconds
  - Set duration: 5 minutes
  - Add HTTP Request Defaults:
    - Server: `your-aws-domain.com`
    - Port: `80` or `443`
    - Protocol: `http` or `https`

- [ ] **5.1.3** Add Authentication Scenario
  - HTTP Request: POST `/api/auth/login`
  - JSON Body:
    ```json
    {
      "username": "${username}",
      "password": "TestPassword123"
    }
    ```
  - Extract JWT token with JSON Extractor
  - Add HTTP Cookie Manager
  - Add Header Manager (Authorization: Bearer ${token})

- [ ] **5.1.4** Add Property Search Scenario
  - HTTP Request: GET `/api/listings?page=1&per_page=10`
  - Add CSV Data Set for locations
  - Parameterize search queries
  - Add assertions (response code 200)
  - Extract property IDs

- [ ] **5.1.5** Add Booking Creation Scenario
  - HTTP Request: POST `/api/bookings`
  - JSON Body with dynamic data:
    ```json
    {
      "listing_id": "${property_id}",
      "guest_id": "${user_id}",
      "check_in": "${check_in_date}",
      "check_out": "${check_out_date}"
    }
    ```
  - Add random date generation
  - Add response assertions

- [ ] **5.1.6** Add Favorites Scenario
  - GET `/api/favorites`
  - POST `/api/favorites`
  - DELETE `/api/favorites/${listing_id}`

- [ ] **5.1.7** Add Listeners
  - Summary Report
  - Aggregate Report
  - View Results Tree
  - Response Time Graph
  - Transactions per Second
  - Active Threads Over Time
  - Backend Listener (for InfluxDB/Grafana)

- [ ] **5.1.8** Configure CSV Output
  - Save results to CSV files
  - Include all metrics
  - Separate files per load level

**Deliverables:**
- Complete JMeter test plan (.jmx)
- Test data files (CSV)
- Configuration documented

---

#### Task 5.2: Execute Tests & Analyze Results
**Priority:** MEDIUM | **Duration:** 0.5 day | **Points:** 3/5

**Sub-tasks:**
- [ ] **5.2.1** Run Performance Tests
  - Execute 100-user test:
    ```bash
    jmeter -n -t test-plan.jmx -l results/100-users.csv -e -o results/100-users-report
    ```
  - Execute 200-user test
  - Execute 300-user test
  - Execute 400-user test
  - Execute 500-user test
  - Monitor system resources during tests
  - Capture kubectl top pods output

- [ ] **5.2.2** Generate Reports
  - Generate HTML dashboard reports
  - Export graphs as images
  - Create response time comparison chart
  - Create throughput comparison chart
  - Create error rate comparison chart

- [ ] **5.2.3** Analyze Performance Metrics
  - Calculate for each load level:
    - Average response time
    - Median response time
    - 90th percentile
    - 95th percentile
    - 99th percentile
    - Min/Max response times
    - Standard deviation
    - Throughput (req/sec)
    - Error rate (%)
    - Total requests
    - Total errors

- [ ] **5.2.4** Create Performance Analysis Report
  - Create `jmeter-tests/reports/PERFORMANCE_ANALYSIS.md`
  - Include:
    - Executive summary
    - Test methodology
    - System under test configuration
    - Performance graphs
    - Metrics tables
    - Bottleneck identification:
      - Database query performance
      - Network latency
      - CPU/Memory constraints
      - Kafka message processing
      - API endpoint analysis
    - Analysis:
      - Why response times increase
      - At what point system degrades
      - Scaling effectiveness
      - Resource utilization patterns
    - Recommendations:
      - Database optimization (indexes)
      - Caching strategies (Redis)
      - Connection pooling
      - Service scaling configuration
      - Code-level optimizations
      - Infrastructure upgrades
    - Comparison with industry benchmarks

- [ ] **5.2.5** Document Findings
  - Identify top 3 bottlenecks
  - Provide specific recommendations
  - Estimate impact of optimizations
  - Create action plan for improvements

**Deliverables:**
- Test results (CSV files)
- HTML reports
- Performance graphs
- Analysis report
- Recommendations document

---

### 🟣 PHASE 6: AWS Deployment (Day 11)

#### Task 6.1: AWS Infrastructure Setup
**Priority:** HIGH | **Duration:** 0.5 day | **Points:** N/A (Required)

**Sub-tasks:**
- [ ] **6.1.1** Setup AWS Account
  - Create/use existing AWS account
  - Configure AWS CLI
  - Set up IAM users and roles
  - Configure billing alerts

- [ ] **6.1.2** Create EKS Cluster
  - Create VPC for EKS
  - Create EKS cluster:
    ```bash
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
    ```
  - Configure kubectl for EKS
  - Verify cluster: `kubectl get nodes`

- [ ] **6.1.3** Setup Container Registry
  - Create ECR repositories for each service:
    ```bash
    aws ecr create-repository --repository-name traveler-service
    aws ecr create-repository --repository-name owner-service
    aws ecr create-repository --repository-name property-service
    aws ecr create-repository --repository-name booking-service
    aws ecr create-repository --repository-name ai-agent-service
    aws ecr create-repository --repository-name frontend
    ```
  - Configure Docker authentication
  - Push images to ECR

**Deliverables:**
- EKS cluster running
- ECR repositories created
- Images pushed to ECR

---

#### Task 6.2: Deploy to AWS
**Priority:** HIGH | **Duration:** 0.5 day | **Points:** N/A (Required)

**Sub-tasks:**
- [ ] **6.2.1** Update K8s Manifests for AWS
  - Update image references to ECR URIs
  - Configure AWS-specific ingress
  - Setup EBS for persistent volumes
  - Configure security groups

- [ ] **6.2.2** Deploy Services to EKS
  - Deploy MongoDB with EBS volumes
  - Deploy Kafka cluster
  - Deploy microservices
  - Deploy frontend
  - Configure AWS Load Balancer
  - Setup DNS (Route 53)

- [ ] **6.2.3** Configure Monitoring
  - Setup CloudWatch for EKS
  - Configure log aggregation
  - Setup CloudWatch alarms
  - Configure auto-scaling groups

- [ ] **6.2.4** Security Configuration
  - Configure security groups
  - Setup IAM roles for pods
  - Enable encryption at rest
  - Configure network policies
  - Setup AWS Secrets Manager

- [ ] **6.2.5** Testing & Screenshots
  - Test all endpoints via AWS domain
  - Verify auto-scaling
  - Test high availability
  - Capture screenshots:
    - EC2 instances
    - EKS cluster overview
    - Load balancer
    - CloudWatch metrics
    - Running services
    - Application in browser

**Deliverables:**
- Services deployed on AWS
- Load balancer configured
- Monitoring enabled
- Screenshots captured

---

### 🟤 PHASE 7: Documentation & Report (Days 12-14)

#### Task 7.1: Update Documentation
**Priority:** MEDIUM | **Duration:** 1 day | **Points:** N/A (Required)

**Sub-tasks:**
- [ ] **7.1.1** Update README.md
  - Project overview
  - Architecture diagram
  - Prerequisites
  - Local development setup
  - Docker commands
  - Kubernetes deployment
  - Kafka setup
  - MongoDB configuration
  - Redux implementation
  - Testing instructions
  - AWS deployment
  - Troubleshooting

- [ ] **7.1.2** Create DEPLOYMENT_GUIDE.md
  - Step-by-step AWS deployment
  - EKS cluster setup
  - Service deployment order
  - Configuration management
  - Monitoring setup
  - Backup strategies
  - Disaster recovery
  - Cost optimization

- [ ] **7.1.3** Create API_DOCUMENTATION.md
  - Document all endpoints
  - Request/response examples
  - Authentication flows
  - Error codes
  - Rate limiting
  - Postman collection

- [ ] **7.1.4** Create ARCHITECTURE.md
  - System architecture diagram
  - Component descriptions
  - Data flow diagrams
  - Event-driven architecture
  - Scaling strategies
  - Security measures

**Deliverables:**
- Comprehensive documentation
- Architecture diagrams
- API documentation
- Deployment guides

---

#### Task 7.2: Write Lab Report
**Priority:** HIGH | **Duration:** 2 days | **Points:** N/A (Required)

**Sub-tasks:**
- [ ] **7.2.1** Report Structure
  - Cover page
  - Table of contents
  - Executive summary
  - 8 main sections (see requirements)
  - Conclusion
  - References
  - Appendices

- [ ] **7.2.2** Content Creation
  - Write architecture overview (2-3 pages)
  - Write Docker & K8s section (3-4 pages)
  - Write Kafka integration section (2-3 pages)
  - Write MongoDB migration section (2 pages)
  - Write Redux section (2-3 pages)
  - Write performance testing section (3-4 pages)
  - Write AWS deployment section (2-3 pages)
  - Write conclusion (1 page)

- [ ] **7.2.3** Add Visuals
  - Include architecture diagrams
  - Add sequence diagrams
  - Include screenshots (50+)
  - Add performance graphs
  - Add code snippets
  - Add tables and charts

- [ ] **7.2.4** Review & Formatting
  - Proofread entire report
  - Check grammar and spelling
  - Verify all screenshots
  - Format consistently
  - Add page numbers
  - Create table of contents
  - Export to PDF

**Deliverables:**
- Complete Lab2_Report.pdf
- All sections written
- All screenshots included
- Professional formatting

---

#### Task 7.3: Organize Submission
**Priority:** HIGH | **Duration:** 0.5 day | **Points:** N/A (Required)

**Sub-tasks:**
- [ ] **7.3.1** Organize Repository
  - Clean up unnecessary files
  - Remove test/debug code
  - Update .gitignore
  - Organize screenshots folder
  - Verify all files present

- [ ] **7.3.2** Create Submission Package
  - Verify GitHub repository
  - Check all branches merged
  - Tag release: `v2.0.0`
  - Create submission checklist
  - Verify all deliverables

- [ ] **7.3.3** Final Testing
  - Clone repo to fresh directory
  - Test Docker build from scratch
  - Test K8s deployment
  - Verify all documentation links
  - Run final smoke tests

- [ ] **7.3.4** Submit
  - Push final changes to GitHub
  - Upload report to submission portal
  - Submit GitHub repository link
  - Verify submission received

**Deliverables:**
- Clean repository
- All files organized
- Final submission complete

---

## 📊 Task Dependency Chart

```
Phase 1 (Dockerization) 
    ↓
Phase 1 (Kubernetes) 
    ↓
Phase 2 (Kafka) 
    ↓
Phase 3 (MongoDB) ← Can start after Phase 1
    ↓
Phase 4 (Redux) ← Can run parallel to Phase 2-3
    ↓
Phase 5 (JMeter) ← Requires all infrastructure complete
    ↓
Phase 6 (AWS) ← Requires Phase 1-3 complete
    ↓
Phase 7 (Documentation) ← Ongoing throughout, finalize at end
```

---

## ⏱️ Time Estimates

| Phase | Tasks | Duration | Points |
|-------|-------|----------|---------|
| Phase 1 | Dockerization + K8s | 4 days | 15 |
| Phase 2 | Kafka | 2 days | 10 |
| Phase 3 | MongoDB | 1 day | 5 |
| Phase 4 | Redux | 2 days | 5 |
| Phase 5 | JMeter | 1 day | 5 |
| Phase 6 | AWS | 1 day | Required |
| Phase 7 | Documentation | 3 days | Required |
| **Total** | **All Phases** | **14 days** | **40** |

---

## ✅ Daily Checklist

### Day 1-2: Service Decomposition
- [ ] Analyze Lab 1 codebase
- [ ] Create 5 service directories
- [ ] Implement Traveler Service
- [ ] Implement Owner Service
- [ ] Implement Property Service
- [ ] Implement Booking Service
- [ ] Setup AI Agent Service
- [ ] Create Dockerfiles for all services
- [ ] Test services locally

### Day 3-4: Kubernetes Setup
- [ ] Create K8s namespace
- [ ] Create deployments for all services
- [ ] Create services for all deployments
- [ ] Configure ConfigMaps
- [ ] Configure Secrets
- [ ] Setup Ingress
- [ ] Configure HPA
- [ ] Test deployment locally (minikube/kind)

### Day 5-6: Kafka Integration
- [ ] Deploy Kafka to K8s
- [ ] Create topics
- [ ] Implement producers
- [ ] Implement consumers
- [ ] Test event flow
- [ ] Configure monitoring

### Day 7: MongoDB Migration
- [ ] Deploy MongoDB to K8s
- [ ] Create collections and indexes
- [ ] Write migration script
- [ ] Migrate data
- [ ] Update services to use MongoDB
- [ ] Implement password encryption
- [ ] Setup session storage

### Day 8-9: Redux Implementation
- [ ] Install Redux dependencies
- [ ] Create store structure
- [ ] Implement Auth slice
- [ ] Implement Property slice
- [ ] Implement Booking slice
- [ ] Connect components
- [ ] Configure persistence
- [ ] Capture screenshots

### Day 10: JMeter Testing
- [ ] Create test plan
- [ ] Configure scenarios
- [ ] Run tests (100-500 users)
- [ ] Generate reports
- [ ] Analyze results
- [ ] Write performance report

### Day 11: AWS Deployment
- [ ] Create EKS cluster
- [ ] Create ECR repositories
- [ ] Push images to ECR
- [ ] Deploy to AWS
- [ ] Configure monitoring
- [ ] Capture screenshots

### Day 12-14: Documentation
- [ ] Update README
- [ ] Create deployment guide
- [ ] Write architecture docs
- [ ] Write lab report (15-20 pages)
- [ ] Organize repository
- [ ] Final testing
- [ ] Submit assignment

---

## 🚨 Critical Path Items

1. **Service Decomposition** - Blocking all other tasks
2. **Dockerization** - Required for K8s and AWS
3. **Kubernetes Setup** - Required for Kafka, MongoDB, AWS
4. **Kafka Integration** - Required for booking flow
5. **MongoDB Migration** - Required for production readiness
6. **AWS Deployment** - Required for submission
7. **JMeter Testing** - Requires deployed system
8. **Documentation** - Required for submission

---

## 📝 Notes & Tips

### Docker Best Practices
- Use Alpine images for smaller size
- Implement health checks
- Don't run as root user
- Use multi-stage builds
- Cache dependencies layer

### Kubernetes Tips
- Start with minikube/kind for local testing
- Use kubectl dry-run for validation
- Monitor pod logs: `kubectl logs -f <pod-name>`
- Check pod events: `kubectl describe pod <pod-name>`
- Use port-forward for debugging

### Kafka Tips
- Start with single broker for development
- Use 3 brokers for production
- Monitor consumer lag
- Implement idempotent consumers
- Test with kafkacat/kcat

### MongoDB Tips
- Create indexes before large data inserts
- Use MongoDB Compass for debugging
- Enable authentication early
- Backup regularly
- Monitor slow queries

### Redux Tips
- Use Redux DevTools
- Keep state normalized
- Avoid nested state
- Use selectors with reselect
- Handle loading states

### JMeter Tips
- Start with small thread count
- Ramp up gradually
- Save results to files
- Use assertions
- Monitor target system

### AWS Tips
- Use t3.medium for cost optimization
- Enable auto-scaling
- Setup billing alerts
- Use spot instances for non-prod
- Clean up resources after testing

---

**Last Updated:** November 21, 2025  
**Version:** 1.0  
**Status:** Ready for Implementation

