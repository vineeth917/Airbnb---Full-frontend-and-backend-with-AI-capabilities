# JMeter Performance Testing Guide - Lab2 Airbnb

## Overview

This directory contains Apache JMeter test plans for performance testing the Lab2 Airbnb microservices application. The tests measure response times, throughput, and error rates under various concurrent user loads.

## Test Plan Overview

### File: `airbnb-performance-test.jmx`

**Test Scenarios**:
1. **Authentication Tests**: User login and JWT token generation
2. **Property Search Tests**: Property listing and search queries
3. **Booking Tests**: Booking creation and retrieval

**Load Levels**: 100, 200, 300, 400, 500 concurrent users

## Prerequisites

### 1. Install Apache JMeter

**macOS** (Homebrew):
```bash
brew install jmeter
```

**Linux** (Ubuntu/Debian):
```bash
wget https://downloads.apache.org/jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xzf apache-jmeter-5.6.3.tgz
sudo mv apache-jmeter-5.6.3 /opt/jmeter
echo 'export PATH=$PATH:/opt/jmeter/bin' >> ~/.bashrc
source ~/.bashrc
```

**Windows**:
1. Download from [https://jmeter.apache.org/download_jmeter.cgi](https://jmeter.apache.org/download_jmeter.cgi)
2. Extract to `C:\jmeter`
3. Add `C:\jmeter\bin` to PATH

### 2. Verify Installation

```bash
jmeter --version
```

Expected output:
```
Apache JMeter 5.6.3
Copyright (c) 1998-2024 The Apache Software Foundation
```

### 3. Start Services

Ensure all microservices are running:

**Option A: Docker Compose** (Local testing)
```bash
cd /Users/spartan/Documents/236/Lab/Lab2-Airbnb
docker-compose up -d
```

**Option B: Kubernetes** (For production-like testing)
```bash
cd k8s
./deploy-all.sh
```

## Running Tests

### Method 1: GUI Mode (For Test Development)

**Start JMeter GUI**:
```bash
jmeter
```

**Load Test Plan**:
1. File → Open
2. Navigate to `jmeter/airbnb-performance-test.jmx`
3. Review test plan structure
4. Click the green "Start" button

**View Results**:
- Summary Report: Shows aggregate statistics
- Graph Results: Visual performance graphs
- View Results Tree: Individual request/response details

### Method 2: CLI Mode (For Actual Performance Testing)

CLI mode is recommended for actual performance testing as it uses less resources.

**Basic Run**:
```bash
jmeter -n -t airbnb-performance-test.jmx -l results/test-results.jtl
```

**With HTML Report**:
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -l results/test-results.jtl \
  -e -o results/html-report
```

**Custom Thread Count**:
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -l results/test-results-100.jtl \
  -JTHREADS=100 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -e -o results/html-report-100
```

### Method 3: Run All Tests (100-500 users)

**Use the provided script**:
```bash
cd jmeter
chmod +x run-all-tests.sh
./run-all-tests.sh
```

This will run tests for 100, 200, 300, 400, and 500 concurrent users and generate reports.

## Test Execution Plan

### Test 1: 100 Concurrent Users
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -JTHREADS=100 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -l results/results-100users.jtl \
  -e -o results/report-100users
```

### Test 2: 200 Concurrent Users
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -JTHREADS=200 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -l results/results-200users.jtl \
  -e -o results/report-200users
```

### Test 3: 300 Concurrent Users
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -JTHREADS=300 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -l results/results-300users.jtl \
  -e -o results/report-300users
```

### Test 4: 400 Concurrent Users
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -JTHREADS=400 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -l results/results-400users.jtl \
  -e -o results/report-400users
```

### Test 5: 500 Concurrent Users
```bash
jmeter -n -t airbnb-performance-test.jmx \
  -JTHREADS=500 \
  -JRAMP_UP=60 \
  -JLOOP_COUNT=10 \
  -l results/results-500users.jtl \
  -e -o results/report-500users
```

## Test Plan Details

### 1. Authentication Test

**Endpoint**: `POST /api/auth/login`  
**Port**: 5001 (Traveler Service)  
**Purpose**: Test user authentication and JWT token generation

**Request Body**:
```json
{
  "username": "testuser${threadNum}",
  "password": "TestPass123"
}
```

**Expected Response**: 200 OK with JWT token

**Metrics Collected**:
- Average response time
- 90th, 95th, 99th percentile response times
- Throughput (requests/second)
- Error rate

### 2. Property Search Test

**Endpoint 1**: `GET /api/listings`  
**Endpoint 2**: `GET /api/listings?location=NYC&guests=2`  
**Port**: 5003 (Property Service)  
**Purpose**: Test property listing and filtering

**Expected Response**: 200 OK with property list

**Metrics Collected**:
- Average response time
- Throughput
- Data transfer rate
- Error rate

### 3. Booking Creation Test

**Endpoint**: `POST /api/bookings`  
**Port**: 5004 (Booking Service)  
**Purpose**: Test booking creation and Kafka event publishing

**Request Body**:
```json
{
  "listing_id": "test-listing-${UUID}",
  "check_in": "2025-12-01",
  "check_out": "2025-12-05",
  "guest_count": 2,
  "special_requests": "Performance test booking"
}
```

**Expected Response**: 201 Created

**Metrics Collected**:
- Average response time
- Kafka publish latency
- Throughput
- Error rate

## Key Metrics to Analyze

### 1. Response Time
- **Average**: Mean response time across all requests
- **Median**: 50th percentile response time
- **90th Percentile**: 90% of requests completed within this time
- **95th Percentile**: 95% of requests completed within this time
- **99th Percentile**: 99% of requests completed within this time

**Acceptable Thresholds**:
- Authentication: < 200ms average
- Property Search: < 500ms average
- Booking Creation: < 1000ms average (due to Kafka)

### 2. Throughput
- **Definition**: Requests processed per second
- **Formula**: Total Requests / Total Time (seconds)

**Target Throughput**:
- 100 users: > 50 requests/sec
- 200 users: > 90 requests/sec
- 300 users: > 120 requests/sec
- 400 users: > 150 requests/sec
- 500 users: > 180 requests/sec

### 3. Error Rate
- **Definition**: Percentage of failed requests
- **Formula**: (Failed Requests / Total Requests) * 100

**Acceptable Error Rate**: < 1%

### 4. Concurrent Users
- **Definition**: Number of simultaneous active users
- **Test Levels**: 100, 200, 300, 400, 500

## Analyzing Results

### HTML Report

JMeter generates a comprehensive HTML report with:
1. **Dashboard**: Overview of all metrics
2. **Statistics Table**: Detailed per-request metrics
3. **Error Table**: List of errors encountered
4. **Response Time Graphs**: Visual representation of latencies
5. **Throughput Graph**: Requests/second over time
6. **Response Time Percentiles**: 50th, 90th, 95th, 99th percentiles

**Open Report**:
```bash
open results/html-report-100/index.html  # macOS
firefox results/html-report-100/index.html  # Linux
start results/html-report-100/index.html  # Windows
```

### CSV Results

JMeter generates `.jtl` files which can be analyzed using:

**View in Excel/Google Sheets**:
```bash
open results/results-100users.jtl
```

**Command-Line Analysis**:
```bash
# Average response time
awk -F, '{sum+=$2; count++} END {print "Avg Response Time:", sum/count, "ms"}' results/results-100users.jtl

# Count errors
grep "false" results/results-100users.jtl | wc -l
```

## Performance Analysis Report Template

### Test Summary

| Users | Avg Response Time (ms) | 90th %ile (ms) | 95th %ile (ms) | Throughput (req/s) | Error % |
|-------|------------------------|----------------|----------------|--------------------| --------|
| 100   | X                      | X              | X              | X                  | X       |
| 200   | X                      | X              | X              | X                  | X       |
| 300   | X                      | X              | X              | X                  | X       |
| 400   | X                      | X              | X              | X                  | X       |
| 500   | X                      | X              | X              | X                  | X       |

### Observations

1. **Response Time Trend**:
   - At 100 users: Response times are optimal
   - At 200-300 users: Slight degradation
   - At 400-500 users: [Describe behavior]

2. **Bottlenecks Identified**:
   - [Service/Component]: [Issue description]
   - [Database/Kafka]: [Issue description]

3. **Error Analysis**:
   - Error types encountered
   - Frequency of errors
   - Correlation with load

4. **Recommendations**:
   - Increase replica count for [service]
   - Add caching for [endpoint]
   - Optimize database queries for [operation]
   - Scale Kafka partitions

## Screenshots for Report

### Required Screenshots

1. **JMeter Test Plan Structure**
   - Tree view showing thread groups and samplers
   - Variables configuration

2. **Summary Report (for each load level)**
   - Table showing all metrics
   - Highlight key performance indicators

3. **Graph Results**
   - Response time over time graph
   - Throughput over time graph

4. **Response Time Percentiles**
   - Graph showing 50th, 90th, 95th, 99th percentiles
   - For all 5 load levels

5. **Error Rate Comparison**
   - Bar chart comparing error rates across load levels

6. **Throughput Comparison**
   - Line graph showing throughput vs. concurrent users

## Troubleshooting

### Common Issues

**Issue**: Connection refused
- **Cause**: Services not running
- **Solution**: Start Docker Compose or Kubernetes

**Issue**: High error rate
- **Cause**: Too many concurrent connections
- **Solution**: Increase connection pool size, scale services

**Issue**: Slow response times
- **Cause**: Database bottleneck, insufficient resources
- **Solution**: Add indexes, scale MongoDB, increase replicas

**Issue**: Out of memory errors
- **Cause**: JMeter using too much heap
- **Solution**: Increase JMeter heap size:
```bash
export HEAP="-Xms1g -Xmx4g"
jmeter -n -t airbnb-performance-test.jmx ...
```

### Monitoring During Tests

**Monitor Kubernetes pods**:
```bash
watch -n 1 kubectl get pods -n airbnb-lab2
```

**Monitor pod resources**:
```bash
kubectl top pods -n airbnb-lab2
```

**Monitor service logs**:
```bash
kubectl logs -f -l app=booking-service -n airbnb-lab2
```

**Monitor MongoDB**:
```bash
kubectl exec -it <mongodb-pod> -n airbnb-lab2 -- mongosh
# Inside mongo shell:
db.currentOp()
db.serverStatus()
```

**Monitor Kafka**:
```bash
kubectl exec -it <kafka-pod> -n airbnb-lab2 -- bash
kafka-consumer-groups --bootstrap-server localhost:9092 --describe --all-groups
```

## Best Practices

### 1. Test Preparation
- ✅ Ensure all services are healthy before testing
- ✅ Clear MongoDB collections if needed
- ✅ Warm up services with small load first
- ✅ Monitor system resources (CPU, memory, network)

### 2. Test Execution
- ✅ Run tests during off-peak hours (if testing prod)
- ✅ Use CLI mode for actual performance tests
- ✅ Run each test multiple times for consistency
- ✅ Allow cool-down period between tests

### 3. Result Analysis
- ✅ Compare results across different load levels
- ✅ Identify performance degradation points
- ✅ Document all bottlenecks
- ✅ Create actionable recommendations

### 4. Reporting
- ✅ Include graphs and tables
- ✅ Provide context for results
- ✅ Explain anomalies
- ✅ Suggest optimizations

## Additional Resources

- [JMeter User Manual](https://jmeter.apache.org/usermanual/index.html)
- [JMeter Best Practices](https://jmeter.apache.org/usermanual/best-practices.html)
- [Performance Testing Guide](https://jmeter.apache.org/usermanual/component_reference.html)

## Clean Up

After testing, stop services and clean up results:

```bash
# Stop Docker Compose
docker-compose down

# Or stop Kubernetes
kubectl delete namespace airbnb-lab2

# Clean up results (optional)
rm -rf results/*.jtl results/html-report-*
```

## Submission Checklist

For Lab 2 submission, ensure you include:

- ✅ JMeter test plan file (`.jmx`)
- ✅ Test results for all 5 load levels (`.jtl` files)
- ✅ HTML reports for all 5 load levels
- ✅ Screenshots of:
  - Test plan structure
  - Summary reports (all 5 levels)
  - Response time graphs
  - Throughput comparison chart
  - Error rate analysis
- ✅ Performance analysis document (this README)
- ✅ Graph with average time vs. concurrent users
- ✅ Analysis of bottlenecks and recommendations

