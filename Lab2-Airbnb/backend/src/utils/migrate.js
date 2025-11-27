/**
 * Database Migration Utility
 * Handles database setup and migrations
 */

const { sequelize } = require('../models');

const migrate = async () => {
  try {
    console.log('🔄 Starting database migration...');
    
    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
    
    // Sync all models
    await sequelize.sync({ alter: true });
    console.log('✅ Database models synchronized.');
    
    console.log('🎉 Database migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Run migration if this file is executed directly
if (require.main === module) {
  migrate();
}

module.exports = migrate;
