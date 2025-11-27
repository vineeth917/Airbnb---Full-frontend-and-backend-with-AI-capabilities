#!/usr/bin/env node
/**
 * Migration Script: MySQL to MongoDB
 * Migrates data from local MySQL database to local MongoDB
 */

require('dotenv').config();
const mysql = require('mysql2/promise');
const { MongoClient } = require('mongodb');

// MySQL configuration (local)
const MYSQL_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'pass1234',
  database: process.env.DB_NAME || 'airbnb_lab',
  port: parseInt(process.env.DB_PORT || '3306', 10)
};

// MongoDB configuration (local)
// Use localhost when running outside Docker, mongo when inside Docker
const MONGO_URI = process.env.MONGO_URI?.includes('mongo:') 
  ? 'mongodb://localhost:27017'  // Override Docker hostname for local execution
  : (process.env.MONGO_URI || 'mongodb://localhost:27017');
const MONGO_DB_NAME = process.env.MONGO_MIGRATION_DB_NAME || 'airbnb_lab';

// Tables to migrate (in order to handle foreign key dependencies)
const TABLES_TO_MIGRATE = [
  'users',
  'listings',
  'bookings',
  'favorites',
  'user_preferences',
  'availability',
  'messages'
];

/**
 * Convert MySQL row to MongoDB document
 * Handles data type conversions and JSON parsing
 */
function convertRowToDocument(row, tableName) {
  const doc = { ...row };
  
  // Convert date strings to Date objects
  if (doc.created_at && typeof doc.created_at === 'string') {
    doc.created_at = new Date(doc.created_at);
  }
  if (doc.updated_at && typeof doc.updated_at === 'string') {
    doc.updated_at = new Date(doc.updated_at);
  }
  if (doc.date && typeof doc.date === 'string') {
    doc.date = new Date(doc.date);
  }
  if (doc.check_in && typeof doc.check_in === 'string') {
    doc.check_in = new Date(doc.check_in);
  }
  if (doc.check_out && typeof doc.check_out === 'string') {
    doc.check_out = new Date(doc.check_out);
  }
  
  // Parse JSON fields
  if (doc.amenities && typeof doc.amenities === 'string') {
    try {
      doc.amenities = JSON.parse(doc.amenities);
    } catch (e) {
      console.warn(`Warning: Could not parse amenities JSON for ${tableName}:${doc.id}`);
      doc.amenities = [];
    }
  }
  
  if (doc.languages && typeof doc.languages === 'string') {
    try {
      doc.languages = JSON.parse(doc.languages);
    } catch (e) {
      doc.languages = [];
    }
  }
  
  // Parse JSON fields in user_preferences
  if (tableName === 'user_preferences') {
    ['budget_range', 'interests', 'mobility_needs', 'dietary_restrictions', 
     'preferred_property_types', 'preferred_amenities'].forEach(field => {
      if (doc[field] && typeof doc[field] === 'string') {
        try {
          doc[field] = JSON.parse(doc[field]);
        } catch (e) {
          doc[field] = null;
        }
      }
    });
  }
  
  // Convert DECIMAL to Number
  if (doc.price_per_night !== undefined && doc.price_per_night !== null) {
    doc.price_per_night = parseFloat(doc.price_per_night);
  }
  if (doc.total_price !== undefined && doc.total_price !== null) {
    doc.total_price = parseFloat(doc.total_price);
  }
  if (doc.price_override !== undefined && doc.price_override !== null) {
    doc.price_override = parseFloat(doc.price_override);
  }
  if (doc.latitude !== undefined && doc.latitude !== null) {
    doc.latitude = parseFloat(doc.latitude);
  }
  if (doc.longitude !== undefined && doc.longitude !== null) {
    doc.longitude = parseFloat(doc.longitude);
  }
  if (doc.bathrooms !== undefined && doc.bathrooms !== null) {
    doc.bathrooms = parseFloat(doc.bathrooms);
  }
  
  // Convert BOOLEAN (TINYINT) to boolean
  if (doc.is_active !== undefined && doc.is_active !== null) {
    doc.is_active = Boolean(doc.is_active);
  }
  if (doc.is_available !== undefined && doc.is_available !== null) {
    doc.is_available = Boolean(doc.is_available);
  }
  if (doc.is_read !== undefined && doc.is_read !== null) {
    doc.is_read = Boolean(doc.is_read);
  }
  
  // Convert INT to Number
  if (doc.max_guests !== undefined && doc.max_guests !== null) {
    doc.max_guests = parseInt(doc.max_guests, 10);
  }
  if (doc.bedrooms !== undefined && doc.bedrooms !== null) {
    doc.bedrooms = parseInt(doc.bedrooms, 10);
  }
  if (doc.min_nights !== undefined && doc.min_nights !== null) {
    doc.min_nights = parseInt(doc.min_nights, 10);
  }
  if (doc.max_nights !== undefined && doc.max_nights !== null) {
    doc.max_nights = parseInt(doc.max_nights, 10);
  }
  if (doc.version !== undefined && doc.version !== null) {
    doc.version = parseInt(doc.version, 10);
  }
  
  return doc;
}

/**
 * Migrate a single table from MySQL to MongoDB
 */
async function migrateTable(mysqlConn, mongoDb, tableName) {
  console.log(`\n📦 Migrating table: ${tableName}`);
  
  try {
    // Fetch all rows from MySQL
    const [rows] = await mysqlConn.query(`SELECT * FROM ${tableName}`);
    console.log(`   Found ${rows.length} records in MySQL`);
    
    if (rows.length === 0) {
      console.log(`   ⚠️  No data to migrate for ${tableName}`);
      return { table: tableName, count: 0 };
    }
    
    // Convert rows to MongoDB documents
    const documents = rows.map(row => convertRowToDocument(row, tableName));
    
    // Get MongoDB collection (use same name as table)
    const collection = mongoDb.collection(tableName);
    
    // Clear existing data (optional - comment out if you want to keep existing data)
    const deleteResult = await collection.deleteMany({});
    console.log(`   🗑️  Cleared ${deleteResult.deletedCount} existing documents`);
    
    // Insert documents into MongoDB
    if (documents.length > 0) {
      const insertResult = await collection.insertMany(documents, { ordered: false });
      console.log(`   ✅ Inserted ${insertResult.insertedCount} documents into MongoDB`);
      
      // Create indexes for better query performance
      await createIndexes(collection, tableName);
      
      return { table: tableName, count: insertResult.insertedCount };
    }
    
    return { table: tableName, count: 0 };
  } catch (error) {
    console.error(`   ❌ Error migrating ${tableName}:`, error.message);
    throw error;
  }
}

/**
 * Create indexes for MongoDB collections
 */
async function createIndexes(collection, tableName) {
  try {
    const indexes = [];
    
    switch (tableName) {
      case 'users':
        indexes.push({ key: { username: 1 }, unique: true });
        indexes.push({ key: { email: 1 }, unique: true });
        indexes.push({ key: { user_type: 1 } });
        indexes.push({ key: { is_active: 1 } });
        break;
        
      case 'listings':
        indexes.push({ key: { host_id: 1 } });
        indexes.push({ key: { location: 1 } });
        indexes.push({ key: { property_type: 1 } });
        indexes.push({ key: { price_per_night: 1 } });
        indexes.push({ key: { is_active: 1 } });
        indexes.push({ key: { host_id: 1, is_active: 1 } });
        break;
        
      case 'bookings':
        indexes.push({ key: { listing_id: 1 } });
        indexes.push({ key: { guest_id: 1 } });
        indexes.push({ key: { host_id: 1 } });
        indexes.push({ key: { status: 1 } });
        indexes.push({ key: { check_in: 1 } });
        indexes.push({ key: { check_out: 1 } });
        indexes.push({ key: { listing_id: 1, status: 1 } });
        break;
        
      case 'favorites':
        indexes.push({ key: { user_id: 1 } });
        indexes.push({ key: { listing_id: 1 } });
        indexes.push({ key: { user_id: 1, listing_id: 1 }, unique: true });
        break;
        
      case 'user_preferences':
        indexes.push({ key: { user_id: 1 }, unique: true });
        break;
        
      case 'availability':
        indexes.push({ key: { listing_id: 1 } });
        indexes.push({ key: { date: 1 } });
        indexes.push({ key: { is_available: 1 } });
        indexes.push({ key: { listing_id: 1, date: 1 }, unique: true });
        break;
        
      case 'messages':
        indexes.push({ key: { booking_id: 1 } });
        indexes.push({ key: { sender_id: 1 } });
        indexes.push({ key: { receiver_id: 1 } });
        indexes.push({ key: { created_at: 1 } });
        break;
    }
    
    for (const index of indexes) {
      try {
        await collection.createIndex(index.key, { unique: index.unique || false });
      } catch (e) {
        // Index might already exist, that's okay
        if (!e.message.includes('already exists')) {
          console.warn(`   ⚠️  Could not create index on ${tableName}:`, e.message);
        }
      }
    }
    
    console.log(`   📇 Created ${indexes.length} indexes`);
  } catch (error) {
    console.warn(`   ⚠️  Error creating indexes for ${tableName}:`, error.message);
  }
}

/**
 * Main migration function
 */
async function main() {
  let mysqlConn = null;
  let mongoClient = null;
  
  try {
    console.log('🚀 Starting MySQL to MongoDB Migration');
    console.log('=' .repeat(50));
    console.log(`MySQL: ${MYSQL_CONFIG.host}:${MYSQL_CONFIG.port}/${MYSQL_CONFIG.database}`);
    console.log(`MongoDB: ${MONGO_URI}/${MONGO_DB_NAME}`);
    console.log('=' .repeat(50));
    
    // Connect to MySQL
    console.log('\n📡 Connecting to MySQL...');
    mysqlConn = await mysql.createConnection(MYSQL_CONFIG);
    console.log('✅ Connected to MySQL');
    
    // Connect to MongoDB
    console.log('\n📡 Connecting to MongoDB...');
    mongoClient = new MongoClient(MONGO_URI);
    await mongoClient.connect();
    console.log('✅ Connected to MongoDB');
    
    const mongoDb = mongoClient.db(MONGO_DB_NAME);
    
    // Verify MySQL tables exist
    console.log('\n🔍 Verifying MySQL tables...');
    const [tables] = await mysqlConn.query(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ?",
      [MYSQL_CONFIG.database]
    );
    const existingTables = tables.map(t => t.TABLE_NAME.toLowerCase());
    
    const tablesToMigrate = TABLES_TO_MIGRATE.filter(table => 
      existingTables.includes(table.toLowerCase())
    );
    
    if (tablesToMigrate.length === 0) {
      console.error('❌ No tables found to migrate!');
      process.exit(1);
    }
    
    console.log(`✅ Found ${tablesToMigrate.length} tables to migrate: ${tablesToMigrate.join(', ')}`);
    
    // Migrate each table
    const results = [];
    for (const tableName of tablesToMigrate) {
      const result = await migrateTable(mysqlConn, mongoDb, tableName);
      results.push(result);
    }
    
    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 Migration Summary');
    console.log('='.repeat(50));
    results.forEach(({ table, count }) => {
      console.log(`   ${table}: ${count} documents`);
    });
    const total = results.reduce((sum, r) => sum + r.count, 0);
    console.log(`\n   Total: ${total} documents migrated`);
    console.log('='.repeat(50));
    console.log('✅ Migration completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  } finally {
    // Close connections
    if (mysqlConn) {
      await mysqlConn.end();
      console.log('\n🔌 MySQL connection closed');
    }
    if (mongoClient) {
      await mongoClient.close();
      console.log('🔌 MongoDB connection closed');
    }
  }
}

// Run migration
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { main, migrateTable, convertRowToDocument };

