# Kafka Architecture for Lab2 Airbnb

## Overview

This document describes the Kafka-based asynchronous messaging architecture implemented for the Lab2 Airbnb microservices application.

## Event-Driven Architecture

### Message Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         BOOKING FLOW                                │
└─────────────────────────────────────────────────────────────────────┘

  TRAVELER                 BOOKING              KAFKA                OWNER
  SERVICE                  SERVICE             BROKER              SERVICE
     │                        │                    │                   │
     │   1. POST /bookings    │                    │                   │
     ├───────────────────────>│                    │                   │
     │                        │                    │                   │
     │                        │ 2. Create Booking  │                   │
     │                        │    in MongoDB      │                   │
     │                        │                    │                   │
     │                        │ 3. Publish Event   │                   │
     │                        │  "booking-requests"│                   │
     │                        ├───────────────────>│                   │
     │  201 Created           │                    │                   │
     │<───────────────────────┤                    │                   │
     │                        │                    │ 4. Consume Event  │
     │                        │                    │<──────────────────┤
     │                        │                    │                   │
     │                        │                    │ 5. Owner Reviews  │
     │                        │                    │   Booking Request │
     │                        │                    │                   │
     │                        │                    │ 6. Accept/Cancel  │
     │                        │                    │   Decision        │
     │                        │                    │                   │
     │                        │ 7. Publish Update  │                   │
     │                        │  "booking-updates" │                   │
     │                        │<───────────────────┼───────────────────┤
     │                        │                    │                   │
     │ 8. Consume Update      │                    │                   │
     │   Create Notification  │                    │                   │
     │<───────────────────────┼────────────────────┤                   │
     │                        │                    │                   │
     │ 9. GET /notifications  │                    │                   │
     │                        │                    │                   │
```

## Kafka Topics

### 1. booking-requests
**Purpose**: Published when a traveler creates a new booking request  
**Producer**: Booking Service  
**Consumer**: Owner Service  
**Partitions**: 3  
**Replication Factor**: 1  
**Retention**: 7 days (604800000 ms)

**Event Schema**:
```json
{
  "event_type": "booking_created",
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "booking_id": "uuid",
  "listing_id": "uuid",
  "guest_id": "uuid",
  "host_id": "uuid",
  "check_in": "ISO8601 date",
  "check_out": "ISO8601 date",
  "total_price": "float",
  "status": "pending",
  "metadata": {
    "guest_count": "integer",
    "special_requests": "string"
  }
}
```

### 2. booking-updates
**Purpose**: Published when an owner accepts/cancels a booking  
**Producer**: Owner Service  
**Consumer**: Traveler Service  
**Partitions**: 3  
**Replication Factor**: 1  
**Retention**: 7 days

**Event Schema**:
```json
{
  "event_type": "booking_status_updated",
  "event_id": "uuid",
  "timestamp": "ISO8601",
  "booking_id": "uuid",
  "new_status": "confirmed|cancelled",
  "message": "string",
  "updated_by": "owner_id"
}
```

### 3. booking-confirmations (Future Use)
**Purpose**: Separate topic for booking confirmations  
**Producer**: Owner Service  
**Consumer**: Booking Service, Payment Service (future)

### 4. booking-cancellations (Future Use)
**Purpose**: Separate topic for booking cancellations  
**Producer**: Owner Service, Traveler Service  
**Consumer**: Booking Service, Refund Service (future)

### 5. user-notifications
**Purpose**: General user notifications  
**Producer**: All Services  
**Consumer**: Notification Service (future)

## Service Responsibilities

### Booking Service (Producer)
**Role**: Creates bookings and publishes booking request events

**Responsibilities**:
- Validate booking request
- Check date availability
- Create booking in MongoDB with status "pending"
- Publish `booking_created` event to `booking-requests` topic
- Handle acknowledgments and retries

**Code Location**: `/services/booking-service/app.py`

**Key Functions**:
```python
def publish_booking_request(booking_data):
    """Publish booking request event to Kafka"""
    event = {
        'event_type': 'booking_created',
        'booking_id': booking_data['_id'],
        # ... other fields
    }
    kafka_producer.send('booking-requests', value=event)
    kafka_producer.flush()
```

### Owner Service (Consumer & Producer)
**Role**: Consumes booking requests and publishes status updates

**Responsibilities**:
- Listen to `booking-requests` topic
- Notify owners of new booking requests
- Provide API for owners to accept/cancel bookings
- Update booking status in MongoDB
- Publish `booking_status_updated` event to `booking-updates` topic

**Code Location**: `/services/owner-service/app.py`

**Key Functions**:
```python
def start_kafka_consumer():
    """Start Kafka consumer for booking requests"""
    consumer = KafkaConsumer('booking-requests', ...)
    for message in consumer:
        process_booking_request(message.value)

def publish_booking_update(booking_id, status, message):
    """Publish booking status update"""
    event = {
        'event_type': 'booking_status_updated',
        'booking_id': booking_id,
        'new_status': status,
        'message': message
    }
    kafka_producer.send('booking-updates', value=event)
```

### Traveler Service (Consumer)
**Role**: Consumes booking status updates and notifies travelers

**Responsibilities**:
- Listen to `booking-updates` topic
- Create notifications in MongoDB for travelers
- Provide API for travelers to view notifications
- Mark notifications as read

**Code Location**: `/services/traveler-service/app.py`

**Key Functions**:
```python
def start_kafka_consumer():
    """Start Kafka consumer for booking updates"""
    consumer = KafkaConsumer('booking-updates', ...)
    for message in consumer:
        create_notification_for_traveler(message.value)
```

## Configuration

### Kafka Producer Configuration
```python
kafka_producer = KafkaProducer(
    bootstrap_servers=['kafka:9092'],
    value_serializer=lambda v: json.dumps(v).encode('utf-8'),
    acks='all',  # Wait for all in-sync replicas
    retries=3,   # Retry up to 3 times
    max_in_flight_requests_per_connection=1  # Guarantee ordering
)
```

### Kafka Consumer Configuration
```python
kafka_consumer = KafkaConsumer(
    'topic-name',
    bootstrap_servers=['kafka:9092'],
    group_id='service-group-id',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    auto_offset_reset='earliest',  # Start from beginning if no offset
    enable_auto_commit=True,       # Auto-commit offsets
    auto_commit_interval_ms=5000   # Commit every 5 seconds
)
```

## Error Handling

### Producer Error Handling
1. **Network Failures**: Retries configured (max 3)
2. **Serialization Errors**: Logged and reported
3. **Acknowledgment Timeouts**: Logged with booking ID for manual review
4. **Fallback**: Store events in MongoDB for later replay

### Consumer Error Handling
1. **Deserialization Errors**: Skip message, log error
2. **Processing Errors**: Log error, commit offset to avoid infinite loop
3. **Database Errors**: Retry logic with exponential backoff
4. **Dead Letter Queue**: Future implementation for failed messages

## Monitoring

### Key Metrics to Monitor
1. **Producer Metrics**:
   - Messages sent per second
   - Send failures
   - Average latency
   - Buffer utilization

2. **Consumer Metrics**:
   - Messages consumed per second
   - Consumer lag (offset difference)
   - Processing time per message
   - Failed message count

3. **Topic Metrics**:
   - Message count per topic
   - Partition distribution
   - Retention utilization

### Logging
All Kafka operations are logged with:
- Timestamp
- Service name
- Event type
- Booking ID (if applicable)
- Success/failure status
- Error messages (if applicable)

## Testing Kafka Flow

### 1. Create a Booking (Traveler)
```bash
curl -X POST http://localhost:5004/api/bookings \
  -H "Authorization: Bearer $TRAVELER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "listing_id": "listing-123",
    "check_in": "2025-12-01",
    "check_out": "2025-12-05",
    "guest_count": 2
  }'
```

### 2. Check Kafka Topic
```bash
# Exec into Kafka container
kubectl exec -it kafka-pod -n airbnb-lab2 -- bash

# Consume from booking-requests topic
kafka-console-consumer --bootstrap-server localhost:9092 \
  --topic booking-requests --from-beginning
```

### 3. Accept Booking (Owner)
```bash
curl -X POST http://localhost:5002/api/bookings/{booking_id}/accept \
  -H "Authorization: Bearer $OWNER_TOKEN"
```

### 4. Check Traveler Notifications
```bash
curl http://localhost:5001/api/notifications \
  -H "Authorization: Bearer $TRAVELER_TOKEN"
```

## Scalability Considerations

### Partitioning Strategy
- **3 partitions per topic**: Allows 3 concurrent consumers
- **Partition Key**: Use `booking_id` or `listing_id` for consistent routing
- **Future scaling**: Can increase partitions as load grows

### Consumer Groups
- Each microservice has its own consumer group
- Multiple instances of same service share consumer group (load balancing)
- Ensures each event is processed once per service

### Performance Optimization
1. **Batch Processing**: Process multiple events in batches
2. **Async Processing**: Use threading for non-blocking operations
3. **Connection Pooling**: Reuse Kafka connections
4. **Caching**: Cache frequently accessed data

## Security

### Current Implementation
- **In-cluster communication**: All Kafka traffic within Kubernetes cluster
- **No authentication**: Development environment only
- **Topic ACLs**: Not configured (all services can access all topics)

### Production Recommendations
1. **Enable SASL/SCRAM authentication**
2. **Use TLS for encryption in transit**
3. **Implement topic-level ACLs**
4. **Use separate credentials per service**
5. **Enable audit logging**

## Future Enhancements

### Planned Features
1. **Dead Letter Queue**: For failed message processing
2. **Event Sourcing**: Store all events for replay capability
3. **Schema Registry**: Validate event schemas
4. **Kafka Streams**: Real-time analytics on booking events
5. **Notification Service**: Dedicated microservice for notifications
6. **Payment Integration**: Payment processing via Kafka events
7. **CDC (Change Data Capture)**: Sync MongoDB changes to Kafka

## Troubleshooting

### Common Issues

**Issue**: Consumer not receiving messages
- **Check**: Consumer group ID, offset position, topic name
- **Solution**: Reset offset, check Kafka logs

**Issue**: Producer send failures
- **Check**: Kafka broker availability, network connectivity
- **Solution**: Verify Kafka service, check firewall rules

**Issue**: High consumer lag
- **Check**: Consumer processing time, message rate
- **Solution**: Scale consumers, optimize processing logic

**Issue**: Messages out of order
- **Check**: Partition count, `max_in_flight_requests`
- **Solution**: Set `max_in_flight_requests_per_connection=1`

## References

- [Kafka Documentation](https://kafka.apache.org/documentation/)
- [kafka-python Library](https://kafka-python.readthedocs.io/)
- [Microservices Event-Driven Architecture](https://microservices.io/patterns/data/event-driven-architecture.html)

