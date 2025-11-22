# Lab 2: Enhanced Airbnb Prototype with Distributed Systems

**Course:** DATA 236 - Distributed Systems for Data Engineering  
**Team:** Pair 10  
**Due Date:** November 24, 2025  
**Points:** 40  

---

## 📖 Overview

This project extends the Lab 1 Airbnb prototype by transforming it into a fully distributed microservices architecture. The system is containerized with Docker, orchestrated using Kubernetes, uses Kafka for asynchronous messaging, MongoDB for data persistence, Redux for state management, and is deployed on AWS.

### Key Enhancements
- **Microservices Architecture:** Decomposed monolithic application into 5 independent services
- **Containerization:** All services Dockerized with optimized multi-stage builds
- **Orchestration:** Kubernetes deployment with auto-scaling and self-healing
- **Event-Driven:** Kafka-based asynchronous messaging for booking workflows
- **NoSQL Database:** MongoDB with encrypted sessions and passwords
- **State Management:** Redux for predictable React state management
- **Performance Testing:** JMeter load tests for 100-500 concurrent users
- **Cloud Deployment:** Production-ready deployment on AWS EKS

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     AWS Cloud (EKS)                          │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │            Ingress (Load Balancer)                  │    │
│  └───────────────────┬────────────────────────────────┘    │
│                      │                                       │
│  ┌───────────────────┴────────────────────────────────┐    │
│  │              Kubernetes Cluster                     │    │
│  │                                                      │    │
│  │  ┌─────────┐  ┌────────┐  ┌─────────┐  ┌────────┐ │    │
│  │  │Traveler │  │ Owner  │  │Property │  │Booking │ │    │
│  │  │Service  │  │Service │  │Service  │  │Service │ │    │
│  │  └────┬────┘  └───┬────┘  └────┬────┘  └───┬────┘ │    │
│  │       │           │            │            │       │    │
│  │       └───────────┴────────────┴────────────┘       │    │
│  │                   │            │                     │    │
│  │           ┌───────┴────┐   ┌──┴──────┐             │    │
│  │           │  MongoDB   │   │  Kafka  │             │    │
│  │           └────────────┘   └─────────┘             │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│              React Frontend (Redux State)                    │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Project Structure

```
Lab2-Airbnb/
├── services/                      # Microservices
│   ├── traveler-service/         # Traveler endpoints
│   ├── owner-service/            # Owner endpoints
│   ├── property-service/         # Property CRUD
│   ├── booking-service/          # Booking management
│   └── ai-agent-service/         # AI recommendations
├── kubernetes/                    # K8s configurations
│   ├── namespace.yaml
│   ├── deployments/              # Deployment specs
│   ├── services/                 # Service specs
│   ├── configmaps/               # Configuration
│   ├── secrets/                  # Secrets (not in Git)
│   ├── ingress/                  # Ingress rules
│   └── hpa/                      # Auto-scaling
├── kafka-setup/                   # Kafka configs
│   ├── kafka-deployment.yaml
│   ├── zookeeper-deployment.yaml
│   └── topics/
├── frontend/                      # React application
│   └── src/
│       └── store/                # Redux store
│           ├── store.js
│           └── slices/
│               ├── authSlice.js
│               ├── propertySlice.js
│               └── bookingSlice.js
├── jmeter-tests/                 # Performance tests
│   ├── test-plan.jmx
│   ├── results/
│   └── reports/
├── migration/                     # MongoDB migration
│   └── migrate_to_mongodb.py
├── screenshots/                   # Screenshots for report
├── docs/                         # Additional documentation
├── docker-compose.yml            # Local development
├── README.md                     # This file
├── LAB2_REQUIREMENTS.md          # Detailed requirements
├── LAB2_TASKS.md                 # Task breakdown
├── PROJECT_OVERVIEW.md           # Architecture overview
├── SUBMISSION_CHECKLIST.md       # Submission checklist
├── QUICK_REFERENCE.md            # Command reference
└── DEPLOYMENT_GUIDE.md           # AWS deployment guide
```

---

## 🚀 Quick Start

### Prerequisites
- Docker 24+
- Kubernetes 1.28+ (minikube or kind for local)
- Python 3.9+
- Node.js 18+
- MongoDB 6.0+
- Apache Kafka 3.5+
- kubectl CLI
- AWS CLI (for AWS deployment)

### Local Development with Docker Compose

1. **Clone the repository**
```bash
git clone <repository-url>
cd Lab2-Airbnb
```

2. **Build and run services**
```bash
docker-compose up -d
```

3. **Access services**
- Traveler Service: http://localhost:5001
- Owner Service: http://localhost:5002
- Property Service: http://localhost:5003
- Booking Service: http://localhost:5004
- AI Agent Service: http://localhost:5005
- MongoDB: mongodb://localhost:27017
- Kafka: localhost:9092

### Kubernetes Deployment (Local)

1. **Start local Kubernetes cluster**
```bash
minikube start
# OR
kind create cluster --name airbnb-cluster
```

2. **Build Docker images**
```bash
cd services/traveler-service && docker build -t traveler-service:v2.0 .
cd ../owner-service && docker build -t owner-service:v2.0 .
cd ../property-service && docker build -t property-service:v2.0 .
cd ../booking-service && docker build -t booking-service:v2.0 .
cd ../ai-agent-service && docker build -t ai-agent-service:v2.0 .
```

3. **Deploy to Kubernetes**
```bash
# Create namespace
kubectl apply -f kubernetes/namespace.yaml

# Deploy MongoDB and Kafka
kubectl apply -f kubernetes/deployments/mongodb-statefulset.yaml
kubectl apply -f kafka-setup/

# Deploy microservices
kubectl apply -f kubernetes/deployments/
kubectl apply -f kubernetes/services/
kubectl apply -f kubernetes/configmaps/
kubectl apply -f kubernetes/secrets/
kubectl apply -f kubernetes/ingress/
kubectl apply -f kubernetes/hpa/

# Verify deployment
kubectl get pods -n airbnb-app
kubectl get services -n airbnb-app
```

4. **Access services via port-forward**
```bash
kubectl port-forward service/traveler-service 5001:80 -n airbnb-app
```

---

## 📋 Documentation

### Core Documents
- **[LAB2_REQUIREMENTS.md](./LAB2_REQUIREMENTS.md)** - Detailed assignment requirements and acceptance criteria
- **[LAB2_TASKS.md](./LAB2_TASKS.md)** - Complete task breakdown with sub-tasks and timeline
- **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** - System architecture and design decisions
- **[SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md)** - Pre-submission checklist
- **[QUICK_REFERENCE.md](./QUICK_REFERENCE.md)** - Command cheat sheet
- **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** - AWS deployment instructions

### Additional Resources
- **[API_DOCUMENTATION.md](./docs/API_DOCUMENTATION.md)** - API endpoints and examples
- **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** - Detailed architecture diagrams
- **[TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md)** - Common issues and solutions

---

## 🏛️ Microservices

### 1. Traveler Service (Port 5001)
**Responsibilities:**
- User authentication (travelers)
- Property search and browsing
- Booking creation
- Favorites management
- User preferences

**Endpoints:**
- `POST /api/traveler/auth/register`
- `POST /api/traveler/auth/login`
- `GET /api/traveler/bookings`
- `POST /api/traveler/favorites`
- `GET /api/traveler/preferences`

### 2. Owner Service (Port 5002)
**Responsibilities:**
- Owner authentication
- Booking management (accept/cancel)
- Property analytics
- Availability management

**Endpoints:**
- `POST /api/owner/auth/register`
- `POST /api/owner/bookings/{id}/accept`
- `POST /api/owner/bookings/{id}/cancel`
- `GET /api/owner/analytics`

### 3. Property Service (Port 5003)
**Responsibilities:**
- Property CRUD operations
- Property search and filtering
- Location-based queries

**Endpoints:**
- `GET /api/properties`
- `GET /api/properties/{id}`
- `POST /api/properties`
- `PUT /api/properties/{id}`

### 4. Booking Service (Port 5004)
**Responsibilities:**
- Booking creation
- Status management
- Price calculation

**Endpoints:**
- `POST /api/bookings`
- `GET /api/bookings/{id}`
- `GET /api/bookings/user/{user_id}`

### 5. AI Agent Service (Port 5005)
**Responsibilities:**
- Itinerary planning
- Activity recommendations
- Weather integration

**Endpoints:**
- `POST /api/ai/itinerary`
- `GET /api/ai/recommendations`
- `GET /api/ai/weather`

---

## 📨 Event-Driven Architecture (Kafka)

### Kafka Topics

| Topic Name | Purpose | Partitions | Retention |
|------------|---------|------------|-----------|
| `booking-requests` | New booking events | 3 | 7 days |
| `booking-updates` | Status changes | 3 | 7 days |
| `booking-confirmations` | Acceptance events | 3 | 7 days |
| `booking-cancellations` | Cancellation events | 3 | 7 days |
| `notifications` | User notifications | 5 | 7 days |

### Message Flow

1. **Traveler creates booking** → Booking Service publishes to `booking-requests`
2. **Owner Service consumes** → Processes booking request
3. **Owner accepts/cancels** → Publishes to `booking-updates`
4. **Traveler Service consumes** → Updates traveler's view

---

## 💾 Database (MongoDB)

### Collections
- `users` - User accounts (travelers & owners)
- `listings` - Property listings
- `bookings` - Booking records
- `favorites` - User favorites
- `user_preferences` - User preferences
- `availability` - Property availability calendar
- `sessions` - Session storage

### Security Features
- **Password Hashing:** bcrypt with 12 salt rounds
- **Session Storage:** MongoDB with TTL indexes
- **Input Validation:** NoSQL injection prevention
- **Authentication:** MongoDB user-based access control

---

## ⚛️ Frontend (React + Redux)

### Redux Store Structure
```javascript
{
  auth: {
    user, token, isAuthenticated, loading, error
  },
  properties: {
    listings, selectedProperty, filters, pagination, loading, error
  },
  bookings: {
    userBookings, favorites, cart, currentBooking, loading, error
  }
}
```

### Key Features
- Centralized state management
- Async action handling with Redux Thunk
- State persistence with localStorage
- Redux DevTools integration

---

## 🧪 Performance Testing (JMeter)

### Test Configuration
- **Load Levels:** 100, 200, 300, 400, 500 concurrent users
- **Ramp-up Period:** 60 seconds
- **Test Duration:** 5 minutes per level
- **Scenarios:** Login, Search, Booking, Favorites

### Metrics Tracked
- Average response time
- 95th percentile response time
- Throughput (requests/second)
- Error rate
- Resource utilization

### Results Location
- Test plan: `jmeter-tests/test-plan.jmx`
- Results: `jmeter-tests/results/`
- Reports: `jmeter-tests/reports/`
- Analysis: `jmeter-tests/reports/PERFORMANCE_ANALYSIS.md`

---

## ☁️ AWS Deployment

### AWS Services Used
- **EKS** - Kubernetes cluster
- **ECR** - Container registry
- **ALB** - Application Load Balancer
- **EBS** - Persistent storage
- **CloudWatch** - Monitoring and logging
- **Route53** - DNS management
- **Secrets Manager** - Secret storage

### Deployment Steps
1. Create EKS cluster
2. Create ECR repositories
3. Build and push Docker images
4. Deploy to Kubernetes
5. Configure monitoring
6. Test deployment

**See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.**

---

## 🔒 Security

### Application Security
- Password encryption (bcrypt)
- JWT token authentication
- Session management in MongoDB
- Input validation and sanitization
- HTTPS/TLS encryption
- CORS configuration

### Infrastructure Security
- Kubernetes network policies
- RBAC (Role-Based Access Control)
- AWS security groups
- Secret management (K8s Secrets)
- Image vulnerability scanning
- Principle of least privilege

---

## 📊 Monitoring & Observability

### Monitoring Stack
- **CloudWatch Container Insights** - CPU, memory, network metrics
- **CloudWatch Logs** - Centralized logging
- **Kafka Monitoring** - Topic lag, consumer groups
- **MongoDB Monitoring** - Query performance
- **Kubernetes Metrics Server** - Pod/node metrics

### Key Metrics
- Response times
- Error rates
- Request throughput
- Resource utilization
- Service health status
- Message queue lag

---

## 🧩 Development

### Adding a New Service

1. **Create service directory**
```bash
mkdir services/new-service
cd services/new-service
```

2. **Create Flask application**
```python
# app.py
from flask import Flask, jsonify

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

3. **Create Dockerfile**
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

4. **Create Kubernetes manifests**
- Deployment: `kubernetes/deployments/new-service-deployment.yaml`
- Service: `kubernetes/services/new-service-service.yaml`

5. **Deploy**
```bash
docker build -t new-service:v1.0 .
kubectl apply -f kubernetes/deployments/new-service-deployment.yaml
kubectl apply -f kubernetes/services/new-service-service.yaml
```

### Running Tests
```bash
# Unit tests
cd services/traveler-service
pytest tests/

# Integration tests
docker-compose up -d
pytest integration_tests/

# Performance tests
jmeter -n -t jmeter-tests/test-plan.jmx -l results.csv
```

---

## 🐛 Troubleshooting

### Common Issues

**Problem:** Pods stuck in `Pending` state  
**Solution:** Check resource availability and PVC binding
```bash
kubectl describe pod <pod-name> -n airbnb-app
```

**Problem:** Service not accessible  
**Solution:** Verify service endpoints and port-forward for testing
```bash
kubectl get endpoints <service-name> -n airbnb-app
kubectl port-forward service/<service-name> 8080:80 -n airbnb-app
```

**Problem:** Kafka consumer not receiving messages  
**Solution:** Check topic exists, consumer group, and offset
```bash
kubectl exec -it kafka-0 -n airbnb-app -- kafka-topics.sh --list --bootstrap-server localhost:9092
```

**Problem:** MongoDB connection timeout  
**Solution:** Verify MongoDB is running and connection string is correct
```bash
kubectl get pods -n airbnb-app | grep mongodb
kubectl logs mongodb-0 -n airbnb-app
```

**See [TROUBLESHOOTING.md](./docs/TROUBLESHOOTING.md) for more solutions.**

---

## 📚 Technology Stack

### Backend
- **Language:** Python 3.9+
- **Framework:** Flask
- **Database:** MongoDB 6.0+
- **Message Queue:** Apache Kafka 3.5+
- **Authentication:** JWT
- **Server:** Gunicorn

### Frontend
- **Library:** React 18+
- **State Management:** Redux Toolkit
- **HTTP Client:** Axios
- **Styling:** Tailwind CSS

### Infrastructure
- **Containerization:** Docker
- **Orchestration:** Kubernetes
- **Cloud:** AWS (EKS, ECR, ALB)
- **Monitoring:** CloudWatch

### Testing
- **Load Testing:** Apache JMeter
- **Unit Testing:** pytest
- **API Testing:** Postman

---

## 📝 Assignment Submission

### Deliverables
- [x] GitHub repository with all code
- [x] Dockerfiles for all 5 services
- [x] Kubernetes configuration files
- [x] Kafka integration code
- [x] MongoDB migration scripts
- [x] Redux implementation
- [x] JMeter test plans and results
- [ ] Lab2_Report.pdf (15-20 pages)
- [ ] Screenshots (50+)

### Submission Steps
1. Ensure all code is committed to GitHub
2. Tag release: `git tag v2.0.0 && git push --tags`
3. Complete [SUBMISSION_CHECKLIST.md](./SUBMISSION_CHECKLIST.md)
4. Write and submit Lab2_Report.pdf
5. Submit GitHub repository link

**Due Date:** November 24, 2025

---

## 👥 Team

**Pair 10**
- Team Member 1: [Name]
- Team Member 2: [Name]

---

## 📞 Support

### Resources
- **Kubernetes Docs:** https://kubernetes.io/docs/
- **Kafka Docs:** https://kafka.apache.org/documentation/
- **MongoDB Docs:** https://docs.mongodb.com/
- **Redux Docs:** https://redux.js.org/
- **AWS EKS:** https://docs.aws.amazon.com/eks/

### Contact
- Instructor: [Instructor Email]
- TA: [TA Email]
- Office Hours: [Schedule]

---

## 📜 License

This project is part of DATA 236 coursework and is intended for educational purposes only.

---

## 🙏 Acknowledgments

- Lab 1 foundation
- Course instructors and TAs
- AWS Educate program
- Open-source community

---

## 📈 Project Status

**Current Phase:** ✅ Planning & Documentation Complete  
**Next Phase:** 🔄 Service Decomposition & Dockerization  
**Completion:** 10% (Documentation phase complete)

**Last Updated:** November 21, 2025

---

**For detailed implementation steps, see [LAB2_TASKS.md](./LAB2_TASKS.md)**  
**For submission requirements, see [LAB2_REQUIREMENTS.md](./LAB2_REQUIREMENTS.md)**  
**For quick commands, see [QUICK_REFERENCE.md](./QUICK_REFERENCE.md)**

