/**
 * Database Models Index
 * Sequelize ORM configuration and model definitions
 */

const { Sequelize } = require('sequelize');
const bcrypt = require('bcryptjs');

// Database configuration
const sequelize = new Sequelize(
  process.env.DB_NAME || 'airbnb_lab',
  process.env.DB_USER || 'root',
  process.env.DB_PASSWORD || 'pass1234',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    dialect: 'mysql',
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
    define: {
      timestamps: true,
      underscored: false,
      freezeTableName: true
    }
  }
);

// User Model
const User = sequelize.define('User', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  username: {
    type: Sequelize.STRING(50),
    allowNull: false,
    unique: true,
    validate: {
      len: [3, 50],
      isAlphanumeric: true
    }
  },
  email: {
    type: Sequelize.STRING(100),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  password_hash: {
    type: Sequelize.STRING(255),
    allowNull: false
  },
  user_type: {
    type: Sequelize.ENUM('traveler', 'owner'),
    allowNull: false
  },
  first_name: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  last_name: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  phone: {
    type: Sequelize.STRING(20),
    allowNull: true
  },
  about_me: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  city: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  country: {
    type: Sequelize.STRING(50),
    allowNull: true
  },
  languages: {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  },
  gender: {
    type: Sequelize.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  profile_picture: {
    type: Sequelize.STRING(255),
    allowNull: true
  },
  is_active: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
}, {
  hooks: {
    beforeCreate: async (user) => {
      if (user.password_hash) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    },
    beforeUpdate: async (user) => {
      if (user.changed('password_hash')) {
        user.password_hash = await bcrypt.hash(user.password_hash, 12);
      }
    }
  }
});

// Listing Model
const Listing = sequelize.define('Listing', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  title: {
    type: Sequelize.STRING(200),
    allowNull: false
  },
  description: {
    type: Sequelize.TEXT,
    allowNull: true
  },
  price_per_night: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0,
      max: 10000
    }
  },
  location: {
    type: Sequelize.STRING(200),
    allowNull: false
  },
  latitude: {
    type: Sequelize.DECIMAL(10, 8),
    allowNull: true
  },
  longitude: {
    type: Sequelize.DECIMAL(11, 8),
    allowNull: true
  },
  property_type: {
    type: Sequelize.ENUM('apartment', 'house', 'condo', 'villa', 'studio', 'loft', 'townhouse'),
    allowNull: false
  },
  amenities: {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  },
  max_guests: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 1,
      max: 20
    }
  },
  bedrooms: {
    type: Sequelize.INTEGER,
    allowNull: false,
    defaultValue: 1,
    validate: {
      min: 0,
      max: 20
    }
  },
  bathrooms: {
    type: Sequelize.DECIMAL(3, 1),
    allowNull: false,
    defaultValue: 1.0,
    validate: {
      min: 0,
      max: 20
    }
  },
  host_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  is_active: {
    type: Sequelize.BOOLEAN,
    defaultValue: true
  }
});

// Booking Model
const Booking = sequelize.define('Booking', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  listing_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'Listing',
      key: 'id'
    }
  },
  guest_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  host_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  check_in: {
    type: Sequelize.DATEONLY,
    allowNull: false
  },
  check_out: {
    type: Sequelize.DATEONLY,
    allowNull: false
  },
  status: {
    type: Sequelize.ENUM('pending', 'confirmed', 'cancelled'),
    allowNull: false,
    defaultValue: 'pending'
  },
  total_price: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: false
  },
  special_requests: {
    type: Sequelize.TEXT,
    allowNull: true
  }
});

// Favorite Model
const Favorite = sequelize.define('Favorite', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  listing_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'Listing',
      key: 'id'
    }
  }
});

// UserPreference Model
const UserPreference = sequelize.define('UserPreference', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  user_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'User',
      key: 'id'
    }
  },
  budget_min: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true
  },
  budget_max: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true
  },
  property_types: {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  },
  amenities: {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  },
  locations: {
    type: Sequelize.JSON,
    allowNull: true,
    defaultValue: []
  }
});

// Availability Model
const Availability = sequelize.define('Availability', {
  id: {
    type: Sequelize.UUID,
    defaultValue: Sequelize.UUIDV4,
    primaryKey: true
  },
  listing_id: {
    type: Sequelize.UUID,
    allowNull: false,
    references: {
      model: 'Listing',
      key: 'id'
    }
  },
  date: {
    type: Sequelize.DATEONLY,
    allowNull: false
  },
  is_available: {
    type: Sequelize.BOOLEAN,
    allowNull: false,
    defaultValue: true
  },
  price_override: {
    type: Sequelize.DECIMAL(10, 2),
    allowNull: true
  },
  min_nights: {
    type: Sequelize.INTEGER,
    allowNull: true,
    defaultValue: 1
  },
  max_nights: {
    type: Sequelize.INTEGER,
    allowNull: true
  }
});

// Define associations
User.hasMany(Listing, { foreignKey: 'host_id', as: 'listings' });
Listing.belongsTo(User, { foreignKey: 'host_id', as: 'host' });

User.hasMany(Booking, { foreignKey: 'guest_id', as: 'guestBookings' });
User.hasMany(Booking, { foreignKey: 'host_id', as: 'hostBookings' });
Booking.belongsTo(User, { foreignKey: 'guest_id', as: 'guest' });
Booking.belongsTo(User, { foreignKey: 'host_id', as: 'host' });

Listing.hasMany(Booking, { foreignKey: 'listing_id', as: 'bookings' });
Booking.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

User.hasMany(Favorite, { foreignKey: 'user_id', as: 'favorites' });
Listing.hasMany(Favorite, { foreignKey: 'listing_id', as: 'favorites' });
Favorite.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
Favorite.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

User.hasOne(UserPreference, { foreignKey: 'user_id', as: 'preferences' });
UserPreference.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

Listing.hasMany(Availability, { foreignKey: 'listing_id', as: 'availability' });
Availability.belongsTo(Listing, { foreignKey: 'listing_id', as: 'listing' });

// Add instance methods
User.prototype.checkPassword = async function(password) {
  return await bcrypt.compare(password, this.password_hash);
};

User.prototype.toJSON = function() {
  const values = Object.assign({}, this.get());
  delete values.password_hash;
  return values;
};

module.exports = {
  sequelize,
  User,
  Listing,
  Booking,
  Favorite,
  UserPreference,
  Availability
};
