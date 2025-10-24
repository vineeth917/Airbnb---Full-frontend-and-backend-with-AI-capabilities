const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

async function fixPasswords() {
  const connection = await mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'pass1234',
    database: 'airbnb_lab'
  });

  try {
    // Generate new hashes
    const travelerHash = await bcrypt.hash('traveler123', 10);
    const hostHash = await bcrypt.hash('host123', 10);

    console.log('Traveler hash:', travelerHash);
    console.log('Host hash:', hostHash);

    // Update traveler
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [travelerHash, 'traveler']
    );
    console.log('Updated traveler password');

    // Update host
    await connection.execute(
      'UPDATE users SET password_hash = ? WHERE username = ?',
      [hostHash, 'host']
    );
    console.log('Updated host password');

    // Verify
    const [users] = await connection.execute(
      'SELECT username, LEFT(password_hash, 20) as password_prefix FROM users'
    );
    console.log('Updated users:', users);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await connection.end();
  }
}

fixPasswords();
