#MongoDB Implementation for Lab2 Airbnb

## Overview

All microservices in Lab2 Airbnb use MongoDB as the primary database, replacing the SQLite/MySQL database from Lab 1.

## MongoDB Configuration

### Connection Details
- **Host**: `mongodb` (Kubernetes service name)
- **Port**: `27017`
- **Database**: `airbnb_lab2`
- **Authentication**: Username/Password (configured in secrets)
- **Connection URI**: `mongodb://airbnb_user:airbnb_password@mongodb:27017/airbnb_lab2?authSource=admin`

### Kubernetes Deployment
- **Persistent Volume**: 5Gi PVC for data persistence
- **Resource Limits**: 1Gi RAM, 1 CPU
- **Health Checks**: Configured with liveness and readiness probes

## Password Encryption

### Implementation: BCrypt
All services use **BCrypt** with 12 rounds for password hashing.

**Implementation Details**:
```python
import bcrypt

def hash_password(password):
    """Hash password using bcrypt with 12 rounds"""
    salt = bcrypt.gensalt(rounds=12)
    return bcrypt.hashpw(password.encode('utf-8'), salt).decode('utf-8')

def check_password(password, password_hash):
    """Verify password against hash"""
    return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
```

**Security Features**:
- ✅ **Salted Hashing**: Each password gets unique salt
- ✅ **Cost Factor**: 12 rounds (2^12 iterations)
- ✅ **Adaptive**: Cost factor can be increased over time
- ✅ **Rainbow Table Resistant**: Salt prevents pre-computed attacks
- ✅ **Timing Attack Resistant**: Constant-time comparison

**Services Using BCrypt**:
- Traveler Service: User registration and authentication
- Owner Service: Owner registration and authentication
- Property Service: (if needed for property owner verification)

## Session Management

### MongoDB-Backed Sessions

**Features**:
- ✅ Sessions stored in MongoDB `sessions` collection
- ✅ Automatic expiration using TTL indexes (24 hours default)
- ✅ Session data encrypted and indexed for fast lookups
- ✅ Support for multiple active sessions per user
- ✅ Session extension and renewal capabilities

**Session Schema**:
```json
{
  "_id": "uuid",
  "session_id": "uuid",
  "user_id": "user_uuid",
  "user_data": {
    "username": "string",
    "user_type": "traveler|owner",
    "preferences": {}
  },
  "created_at": "ISODate",
  "last_accessed": "ISODate",
  "expires_at": "ISODate",
  "is_active": true
}
```

**Indexes**:
- `session_id`: Unique index for fast lookups
- `expires_at`: TTL index for automatic cleanup
- `user_id`: Index for user-specific queries

**Session Manager Usage**:
```python
from session_manager import MongoDBSessionManager

# Initialize
session_mgr = MongoDBSessionManager(
    mongodb_uri="mongodb://mongodb:27017/airbnb_lab",
    session_ttl=86400  # 24 hours
)

# Create session
session_id = session_mgr.create_session(user_id, user_data)

# Retrieve session
session = session_mgr.get_session(session_id)

# Update session
session_mgr.update_session(session_id, updated_data)

# Delete session (logout)
session_mgr.delete_session(session_id)
```

## Database Schema

### Collections

#### 1. users
**Purpose**: Store user accounts (travelers and owners)

```json
{
  "_id": "uuid",
  "username": "string",
  "email": "string",
  "password_hash": "bcrypt_hash",
  "user_type": "traveler|owner",
  "first_name": "string",
  "last_name": "string",
  "phone": "string",
  "profile": {
    "about_me": "string",
    "city": "string",
    "country": "string",
    "languages": ["string"],
    "gender": "string"
  },
  "is_active": true,
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Indexes**:
- `username`: Unique
- `email`: Unique
- `user_type`: Non-unique for filtering

#### 2. listings
**Purpose**: Store property listings

```json
{
  "_id": "uuid",
  "host_id": "user_uuid",
  "title": "string",
  "description": "string",
  "property_type": "string",
  "address": {
    "street": "string",
    "city": "string",
    "state": "string",
    "country": "string",
    "zipcode": "string",
    "coordinates": {
      "lat": "float",
      "lng": "float"
    }
  },
  "price_per_night": "float",
  "max_guests": "integer",
  "bedrooms": "integer",
  "bathrooms": "integer",
  "amenities": ["string"],
  "images": ["url"],
  "is_active": true,
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Indexes**:
- `host_id`: For owner queries
- `city, country`: For location-based searches
- `price_per_night`: For price filtering
- `is_active`: For active listings

#### 3. bookings
**Purpose**: Store booking requests and confirmations

```json
{
  "_id": "uuid",
  "listing_id": "listing_uuid",
  "guest_id": "user_uuid",
  "host_id": "user_uuid",
  "check_in": "ISODate",
  "check_out": "ISODate",
  "total_price": "float",
  "status": "pending|confirmed|cancelled|completed",
  "guest_count": "integer",
  "special_requests": "string",
  "payment_status": "pending|paid|refunded",
  "cancellation_reason": "string",
  "version": "integer",
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Indexes**:
- `guest_id`: For traveler bookings
- `listing_id`: For property bookings
- `status`: For filtering by status
- `check_in, check_out`: For date range queries

#### 4. favorites
**Purpose**: Store user favorite listings

```json
{
  "_id": "uuid",
  "user_id": "user_uuid",
  "listing_id": "listing_uuid",
  "created_at": "ISODate"
}
```

**Indexes**:
- `user_id, listing_id`: Compound unique index

#### 5. user_preferences
**Purpose**: Store user preferences for recommendations

```json
{
  "_id": "uuid",
  "user_id": "user_uuid",
  "budget_range": {
    "min": "float",
    "max": "float"
  },
  "interests": ["string"],
  "mobility_needs": ["string"],
  "dietary_restrictions": ["string"],
  "preferred_property_types": ["string"],
  "preferred_amenities": ["string"],
  "created_at": "ISODate",
  "updated_at": "ISODate"
}
```

**Indexes**:
- `user_id`: Unique

#### 6. notifications
**Purpose**: Store user notifications

```json
{
  "_id": "uuid",
  "user_id": "user_uuid",
  "type": "booking_update|message|alert",
  "booking_id": "booking_uuid",
  "title": "string",
  "message": "string",
  "status": "string",
  "is_read": false,
  "read_at": "ISODate",
  "created_at": "ISODate"
}
```

**Indexes**:
- `user_id, is_read`: Compound index for unread notifications
- `created_at`: For sorting by recency

#### 7. sessions
**Purpose**: Store user sessions

```json
{
  "_id": "uuid",
  "session_id": "uuid",
  "user_id": "user_uuid",
  "user_data": {},
  "created_at": "ISODate",
  "last_accessed": "ISODate",
  "expires_at": "ISODate",
  "is_active": true
}
```

**Indexes**:
- `session_id`: Unique
- `expires_at`: TTL index (automatic expiration)
- `user_id`: For user session queries

#### 8. availability (optional)
**Purpose**: Store property availability calendar

```json
{
  "_id": "uuid",
  "listing_id": "listing_uuid",
  "date": "ISODate",
  "is_available": true,
  "price_override": "float",
  "updated_at": "ISODate"
}
```

**Indexes**:
- `listing_id, date`: Compound unique index

## Migration from Lab 1

### Changes from SQLite/MySQL to MongoDB

| Feature | Lab 1 (SQLite/MySQL) | Lab 2 (MongoDB) |
|---------|----------------------|-----------------|
| Database Type | Relational | Document-based |
| Schema | Fixed schema | Flexible schema |
| Sessions | File-based (Flask-Session) | MongoDB-backed |
| Passwords | Bcrypt (same) | Bcrypt (same) |
| Relationships | Foreign keys | Document embedding/references |
| Transactions | ACID | ACID (MongoDB 4.0+) |
| Scaling | Vertical | Horizontal sharding |
| Indexes | B-tree | B-tree + TTL + Geospatial |

### Migration Steps

1. **Schema Conversion**: 
   - SQL tables → MongoDB collections
   - Foreign keys → ObjectId references or embedding

2. **Data Type Mapping**:
   - `VARCHAR` → `string`
   - `INT` → `integer` / `long`
   - `DATETIME` → `ISODate`
   - `DECIMAL` → `double`
   - `BOOLEAN` → `boolean`

3. **Index Creation**:
   - Primary keys → `_id` (automatic)
   - Foreign keys → Indexed fields
   - Unique constraints → Unique indexes
   - TTL indexes for session expiration

4. **Query Migration**:
   - SQL JOINs → Aggregation pipelines or multiple queries
   - SQL WHERE → MongoDB find filters
   - SQL ORDER BY → MongoDB sort
   - SQL LIMIT/OFFSET → MongoDB limit/skip

## Performance Optimization

### Indexes Strategy

**Current Indexes**:
- All `_id` fields (automatic)
- `users.username` (unique)
- `users.email` (unique)
- `sessions.session_id` (unique)
- `sessions.expires_at` (TTL)
- `bookings.listing_id`
- `bookings.guest_id`
- `favorites.user_id, listing_id` (compound)

### Query Optimization

1. **Use Projections**: Only fetch needed fields
```python
db.users.find({'_id': user_id}, {'password_hash': 0})
```

2. **Compound Indexes**: For multi-field queries
```python
db.bookings.create_index([('listing_id', 1), ('status', 1)])
```

3. **Aggregation Pipelines**: For complex queries
```python
db.bookings.aggregate([
    {'$match': {'host_id': owner_id}},
    {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
])
```

4. **Connection Pooling**: Reuse connections
```python
mongo_client = MongoClient(
    MONGODB_URI,
    maxPoolSize=50,
    minPoolSize=10
)
```

### Monitoring

**Key Metrics**:
- Query execution time
- Index usage statistics
- Connection pool utilization
- Database size and growth
- Collection scan vs index scan ratio

**Tools**:
- MongoDB Atlas monitoring
- `db.currentOp()` - Current operations
- `db.collection.explain()` - Query plans
- Prometheus + Grafana integration

## Security Features

### 1. Password Security
- ✅ BCrypt with 12 rounds
- ✅ No plaintext passwords stored
- ✅ Password strength validation
- ✅ Salt generated per password

### 2. Session Security
- ✅ Session IDs are UUIDs (not sequential)
- ✅ HTTPOnly cookies (prevent XSS)
- ✅ Secure cookies in production (HTTPS only)
- ✅ SameSite cookie attribute
- ✅ Automatic session expiration (24 hours)
- ✅ Session invalidation on logout

### 3. Database Security
- ✅ Authentication enabled
- ✅ User credentials in Kubernetes secrets
- ✅ Role-based access control (RBAC)
- ✅ Network isolation (ClusterIP service)
- ✅ Encrypted connections (TLS in production)

### 4. Input Validation
- ✅ Email format validation
- ✅ Input sanitization (XSS prevention)
- ✅ Field length limits
- ✅ Type checking
- ✅ SQL injection prevention (not applicable, but covered)

## Backup and Recovery

### Backup Strategy

1. **Automated Backups**:
   - Daily full backups
   - Incremental backups every 6 hours
   - Retention: 30 days

2. **Backup Methods**:
   - `mongodump` for full database dumps
   - Persistent Volume snapshots
   - MongoDB Atlas automated backups (if using Atlas)

3. **Backup Commands**:
```bash
# Full backup
mongodump --uri="mongodb://user:pass@mongodb:27017/airbnb_lab2" \
  --out=/backups/$(date +%Y%m%d)

# Restore
mongorestore --uri="mongodb://user:pass@mongodb:27017/airbnb_lab2" \
  /backups/20251122
```

### Disaster Recovery

1. **Point-in-Time Recovery**: Using oplog replay
2. **Geographic Replication**: Multi-region replicas
3. **Automated Failover**: Replica set with automatic election

## Testing

### Unit Tests
- User authentication with encrypted passwords
- Session creation and retrieval
- Booking CRUD operations
- Kafka event publishing/consuming

### Integration Tests
- End-to-end booking flow
- Multi-service communication
- Database consistency checks
- Session expiration

### Performance Tests
- Concurrent user load (100-500 users)
- Query response times
- Connection pool efficiency
- Memory usage under load

## Troubleshooting

### Common Issues

**Issue**: Connection refused
- **Check**: MongoDB service status, network policies
- **Solution**: Verify MongoDB is running, check service DNS

**Issue**: Authentication failed
- **Check**: Credentials in secrets, MongoDB user permissions
- **Solution**: Recreate user, update secrets

**Issue**: Slow queries
- **Check**: Missing indexes, large collection scans
- **Solution**: Add indexes, optimize queries

**Issue**: Session not persisting
- **Check**: Cookie settings, session expiration
- **Solution**: Verify cookie domain, check TTL index

## References

- [MongoDB Documentation](https://docs.mongodb.com/)
- [PyMongo Documentation](https://pymongo.readthedocs.io/)
- [BCrypt Documentation](https://github.com/pyca/bcrypt)
- [Flask Session Management](https://flask.palletsprojects.com/en/2.3.x/api/#sessions)

