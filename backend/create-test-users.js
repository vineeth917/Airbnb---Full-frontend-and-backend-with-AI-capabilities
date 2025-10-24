/**
 * Create test users for the application
 */

const { User, Listing } = require('./src/models');
const bcrypt = require('bcryptjs');

async function createTestUsers() {
  try {
    console.log('🔄 Creating test users...');

    // Create traveler user
    const traveler = await User.create({
      username: 'traveler',
      email: 'traveler@example.com',
      password_hash: await bcrypt.hash('traveler123', 12),
      user_type: 'traveler',
      first_name: 'John',
      last_name: 'Traveler',
      city: 'New York',
      country: 'USA'
    });
    console.log('✅ Traveler user created:', traveler.username);

    // Create host user
    const host = await User.create({
      username: 'host',
      email: 'host@example.com',
      password_hash: await bcrypt.hash('host123', 12),
      user_type: 'owner',
      first_name: 'Jane',
      last_name: 'Host',
      city: 'Miami',
      country: 'USA'
    });
    console.log('✅ Host user created:', host.username);

    // Create some test listings
    const listing1 = await Listing.create({
      title: 'Beautiful Downtown Apartment',
      description: 'Modern apartment in the heart of downtown with amazing city views',
      price_per_night: 150,
      location: 'New York, NY',
      property_type: 'apartment',
      max_guests: 4,
      bedrooms: 2,
      bathrooms: 1,
      host_id: host.id,
      amenities: ['WiFi', 'Kitchen', 'Parking', 'Gym']
    });

    const listing2 = await Listing.create({
      title: 'Cozy Beach House',
      description: 'Perfect beach getaway with ocean views and private access',
      price_per_night: 200,
      location: 'Miami, FL',
      property_type: 'house',
      max_guests: 6,
      bedrooms: 3,
      bathrooms: 2,
      host_id: host.id,
      amenities: ['WiFi', 'Pool', 'Beach Access', 'Kitchen']
    });

    const listing3 = await Listing.create({
      title: 'Luxury Condo',
      description: 'High-end condo with stunning city views and premium amenities',
      price_per_night: 300,
      location: 'Los Angeles, CA',
      property_type: 'condo',
      max_guests: 2,
      bedrooms: 1,
      bathrooms: 1,
      host_id: host.id,
      amenities: ['WiFi', 'Gym', 'Concierge', 'Pool']
    });

    console.log('✅ Test listings created:', listing1.title, listing2.title, listing3.title);

    console.log('\n🎉 Test data created successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Traveler: username=traveler, password=traveler123');
    console.log('Host: username=host, password=host123');

  } catch (error) {
    console.error('❌ Error creating test users:', error);
  } finally {
    process.exit(0);
  }
}

createTestUsers();
