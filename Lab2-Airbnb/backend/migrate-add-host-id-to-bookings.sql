-- Migration script to add host_id column to bookings table
-- This fixes the issue where owners cannot see bookings made by travelers

USE airbnb_lab;

-- Check if host_id column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'bookings';
SET @columnname = 'host_id';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(36) NULL AFTER guest_id')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;

-- Update existing bookings to populate host_id from listings
UPDATE bookings b
INNER JOIN listings l ON b.listing_id = l.id
SET b.host_id = l.host_id
WHERE b.host_id IS NULL;

-- Add foreign key constraint if it doesn't exist
SET @fk_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS 
  WHERE CONSTRAINT_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND CONSTRAINT_NAME = 'fk_bookings_host_id');
SET @sql = IF(@fk_exists = 0, 
  'ALTER TABLE bookings ADD CONSTRAINT fk_bookings_host_id FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add index if it doesn't exist
SET @index_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS 
  WHERE TABLE_SCHEMA = @dbname 
  AND TABLE_NAME = @tablename 
  AND INDEX_NAME = 'idx_host_id');
SET @sql = IF(@index_exists = 0, 
  'ALTER TABLE bookings ADD INDEX idx_host_id (host_id)',
  'SELECT 1');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Make host_id NOT NULL after populating existing records
ALTER TABLE bookings MODIFY COLUMN host_id VARCHAR(36) NOT NULL;

-- Add special_requests column if it doesn't exist
SET @columnname = 'special_requests';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' TEXT NULL AFTER total_price')
));
PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
