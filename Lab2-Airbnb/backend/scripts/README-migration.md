# MySQL to MongoDB Migration Script

This script migrates data from local MySQL database to local MongoDB.

## Prerequisites

1. MySQL and MongoDB containers must be running locally (via Docker Compose)
2. MySQL should have data in the `airbnb_lab` database
3. Node.js dependencies installed (`npm install`)

## Usage

### Run the migration:

```bash
cd backend
npm run migrate:sql-to-mongo
```

Or directly:

```bash
cd backend
node scripts/migrate-sql-to-mongo.js
```

### With custom MongoDB URI:

```bash
MONGO_URI=mongodb://localhost:27017 npm run migrate:sql-to-mongo
```

## What it migrates

The script migrates the following tables from MySQL to MongoDB collections:

- `users` → `users` collection
- `listings` → `listings` collection
- `bookings` → `bookings` collection
- `favorites` → `favorites` collection
- `user_preferences` → `user_preferences` collection
- `availability` → `availability` collection
- `messages` → `messages` collection

## Data Transformations

The script automatically handles:

- **Date conversions**: MySQL DATE/DATETIME strings → MongoDB Date objects
- **JSON parsing**: MySQL JSON columns → MongoDB arrays/objects
- **Type conversions**: 
  - DECIMAL → Number (float)
  - BOOLEAN (TINYINT) → Boolean
  - INT → Number
- **Field name preservation**: All field names remain the same

## Indexes

The script automatically creates indexes for better query performance:

- **users**: username (unique), email (unique), user_type, is_active
- **listings**: host_id, location, property_type, price_per_night, is_active
- **bookings**: listing_id, guest_id, host_id, status, check_in, check_out
- **favorites**: user_id, listing_id, unique(user_id, listing_id)
- **user_preferences**: user_id (unique)
- **availability**: listing_id, date, is_available, unique(listing_id, date)
- **messages**: booking_id, sender_id, receiver_id, created_at

## Database Configuration

Default values (can be overridden with environment variables):

- **MySQL**: 
  - Host: `localhost`
  - Port: `3306`
  - Database: `airbnb_lab`
  - User: `root`
  - Password: `pass1234`

- **MongoDB**:
  - URI: `mongodb://localhost:27017`
  - Database: `airbnb_lab`

## Environment Variables

- `DB_HOST` - MySQL host (default: localhost)
- `DB_USER` - MySQL user (default: root)
- `DB_PASSWORD` - MySQL password (default: pass1234)
- `DB_NAME` - MySQL database name (default: airbnb_lab)
- `DB_PORT` - MySQL port (default: 3306)
- `MONGO_URI` - MongoDB connection URI (default: mongodb://localhost:27017)
- `MONGO_MIGRATION_DB_NAME` - MongoDB database name (default: airbnb_lab)

## Notes

- The script **clears existing data** in MongoDB collections before inserting new data
- If you want to preserve existing data, comment out the `deleteMany` call in the `migrateTable` function
- The script handles errors gracefully and provides detailed progress information
- Foreign key relationships are preserved through ID references (MongoDB doesn't enforce foreign keys)

## Verification

After migration, verify the data:

```bash
# Connect to MongoDB
docker exec -it airbnb-mongo mongosh airbnb_lab

# Check document counts
db.users.countDocuments()
db.listings.countDocuments()
db.bookings.countDocuments()

# View sample documents
db.users.findOne()
db.listings.findOne()
db.bookings.findOne()
```

