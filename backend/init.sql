-- Lab 1 Airbnb - MySQL Database Initialization
-- Distributed Systems for Data Engineering (DATA 236)

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS airbnb_lab CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Use the database
USE airbnb_lab;

-- Drop existing tables if they exist (in correct order to handle foreign keys)
DROP TABLE IF EXISTS availability;
DROP TABLE IF EXISTS user_preferences;
DROP TABLE IF EXISTS favorites;
DROP TABLE IF EXISTS bookings;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS users;

-- Create users table
CREATE TABLE users (
    id VARCHAR(36) PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    user_type ENUM('traveler', 'owner') NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    phone VARCHAR(20),
    about_me TEXT,
    city VARCHAR(50),
    country VARCHAR(50),
    languages JSON,
    gender ENUM('male', 'female', 'other', 'prefer-not-to-say'),
    profile_picture MEDIUMTEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_user_type (user_type)
);

-- Create listings table
CREATE TABLE listings (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    image_url MEDIUMTEXT,
    price_per_night DECIMAL(10,2) NOT NULL,
    location VARCHAR(200) NOT NULL,
    latitude DECIMAL(10,8),
    longitude DECIMAL(11,8),
    property_type VARCHAR(50),
    amenities JSON,
    max_guests INT DEFAULT 1,
    bedrooms INT DEFAULT 1,
    bathrooms DECIMAL(3,1) DEFAULT 1.0,
    host_id VARCHAR(36) NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Distributed systems fields
    version INT DEFAULT 1,
    replica_id VARCHAR(50),
    FOREIGN KEY (host_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_location (location),
    INDEX idx_property_type (property_type),
    INDEX idx_price (price_per_night),
    INDEX idx_host_id (host_id),
    INDEX idx_is_active (is_active)
);

-- Create bookings table
CREATE TABLE bookings (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    guest_id VARCHAR(36) NOT NULL,
    check_in DATE NOT NULL,
    check_out DATE NOT NULL,
    total_price DECIMAL(10,2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    -- Distributed systems fields
    version INT DEFAULT 1,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    FOREIGN KEY (guest_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_listing_id (listing_id),
    INDEX idx_guest_id (guest_id),
    INDEX idx_check_in (check_in),
    INDEX idx_status (status)
);

-- Create favorites table
CREATE TABLE favorites (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    listing_id VARCHAR(36) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_listing (user_id, listing_id),
    INDEX idx_user_id (user_id),
    INDEX idx_listing_id (listing_id)
);

-- Create user_preferences table
CREATE TABLE user_preferences (
    id VARCHAR(36) PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    budget_range JSON,
    interests JSON,
    mobility_needs JSON,
    dietary_restrictions JSON,
    preferred_property_types JSON,
    preferred_amenities JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_preferences (user_id),
    INDEX idx_user_id (user_id)
);

-- Create availability table
CREATE TABLE availability (
    id VARCHAR(36) PRIMARY KEY,
    listing_id VARCHAR(36) NOT NULL,
    date DATE NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    price_override DECIMAL(10, 2),
    min_nights INT DEFAULT 1,
    max_nights INT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_listing_date (listing_id, date),
    FOREIGN KEY (listing_id) REFERENCES listings(id) ON DELETE CASCADE,
    INDEX idx_listing_id (listing_id),
    INDEX idx_date (date),
    INDEX idx_is_available (is_available)
);

-- Create messages table for traveler-host communication
CREATE TABLE messages (
    id VARCHAR(36) PRIMARY KEY,
    booking_id VARCHAR(36) NOT NULL,
    sender_id VARCHAR(36) NOT NULL,
    receiver_id VARCHAR(36) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_booking_id (booking_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_created_at (created_at)
);

-- Insert demo users (passwords: 'traveler123' and 'host123' hashed with bcrypt)
INSERT INTO users (id, username, email, password_hash, user_type, first_name, last_name, city, country) VALUES
('demo-traveler-1', 'traveler', 'traveler@airbnb.com', '$2b$10$YQ.xkMDKCjBWLDl6tGXXDOKqGR.JOXqvL6VVGTRdqP.XqDGf.5FMC', 'traveler', 'John', 'Doe', 'New York', 'USA'),
('demo-host-1', 'host', 'host@airbnb.com', '$2b$10$YQ.xkMDKCjBWLDl6tGXXDOKqGR.JOXqvL6VVGTRdqP.XqDGf.5FMC', 'owner', 'Jane', 'Smith', 'Miami', 'USA');

-- Insert sample listings
INSERT INTO listings (id, title, description, price_per_night, location, latitude, longitude, property_type, amenities, max_guests, bedrooms, bathrooms, host_id) VALUES
('listing-1', 'Cozy Studio in Downtown LA', 'Beautiful studio apartment in the heart of Los Angeles with stunning city views', 115.00, 'Los Angeles, CA', 34.0522, -118.2437, 'apartment', '["WiFi", "Kitchen", "Parking", "Air Conditioning"]', 2, 1, 1.0, 'demo-host-1'),
('listing-2', 'Modern House in Burbank', 'Spacious modern house perfect for families with private backyard', 229.00, 'Burbank, CA', 34.1808, -118.3090, 'house', '["WiFi", "Kitchen", "Parking", "Pool", "Garden"]', 6, 3, 2.0, 'demo-host-1'),
('listing-3', 'Luxury Condo in Santa Monica', 'High-end condo with ocean views and modern amenities', 210.00, 'Santa Monica, CA', 34.0195, -118.4912, 'condo', '["WiFi", "Kitchen", "Parking", "Gym", "Pool"]', 4, 2, 2.0, 'demo-host-1'),
('listing-4', 'Charming Villa in Malibu', 'Stunning beachfront villa with private beach access', 450.00, 'Malibu, CA', 34.0259, -118.7798, 'villa', '["WiFi", "Kitchen", "Parking", "Pool", "Beach Access", "Hot Tub"]', 8, 4, 3.0, 'demo-host-1'),
('listing-5', 'Downtown Loft in San Francisco', 'Industrial-style loft in trendy SoMa district', 185.00, 'San Francisco, CA', 37.7749, -122.4194, 'loft', '["WiFi", "Kitchen", "Parking", "Air Conditioning", "Gym"]', 3, 1, 1.5, 'demo-host-1'),
('listing-6', 'Beach House in San Diego', 'Relaxing beach house steps away from the ocean', 275.00, 'San Diego, CA', 32.7157, -117.1611, 'house', '["WiFi", "Kitchen", "Parking", "Beach Access", "BBQ Grill"]', 6, 3, 2.0, 'demo-host-1'),
('listing-7', 'Mountain Cabin in Lake Tahoe', 'Cozy cabin with lake views and mountain access', 195.00, 'Lake Tahoe, CA', 39.0968, -120.0324, 'cabin', '["WiFi", "Kitchen", "Parking", "Fireplace", "Hot Tub"]', 4, 2, 1.5, 'demo-host-1');

-- Insert sample bookings
INSERT INTO bookings (id, listing_id, guest_id, check_in, check_out, total_price, status) VALUES
('booking-1', 'listing-1', 'demo-traveler-1', '2025-10-25', '2025-10-28', 345.00, 'confirmed'),
('booking-2', 'listing-2', 'demo-traveler-1', '2025-11-01', '2025-11-05', 916.00, 'pending');

-- Insert sample user preferences
INSERT INTO user_preferences (id, user_id, budget_range, interests, preferred_property_types, preferred_amenities) VALUES
('pref-1', 'demo-traveler-1', '{"min": 100, "max": 300}', '["beach", "city", "culture"]', '["apartment", "condo"]', '["WiFi", "Kitchen", "Parking"]'),
('pref-2', 'demo-host-1', '{"min": 200, "max": 500}', '["luxury", "business"]', '["house", "villa"]', '["Pool", "Gym", "Beach Access"]');

-- Create additional indexes for better performance
CREATE INDEX idx_listings_price_location ON listings(price_per_night, location);
CREATE INDEX idx_bookings_dates ON bookings(check_in, check_out);
CREATE INDEX idx_users_active ON users(is_active, user_type);

