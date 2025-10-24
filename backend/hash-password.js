const bcrypt = require('bcryptjs');

const password = 'traveler123';

bcrypt.hash(password, 10, (err, hash) => {
  if (err) {
    console.error('Error:', err);
  } else {
    console.log('Password:', password);
    console.log('Hash:', hash);
  }
});

