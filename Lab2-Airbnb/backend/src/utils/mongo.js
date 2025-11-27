const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const MONGO_DB_NAME = process.env.MONGO_DB_NAME || 'airbnb_auth';

// Single client promise reused for session store and token storage
const clientPromise = new MongoClient(MONGO_URI, {
  serverSelectionTimeoutMS: 5000
}).connect();

let tokenCollectionPromise;

/**
 * Lazily obtain the JWT token collection with TTL + uniqueness indexes.
 */
const getTokenCollection = async () => {
  if (!tokenCollectionPromise) {
    tokenCollectionPromise = (async () => {
      const client = await clientPromise;
      const db = client.db(MONGO_DB_NAME);
      const collection = db.collection('jwt_tokens');
      await collection.createIndex({ jti: 1 }, { unique: true });
      await collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
      return collection;
    })();
  }
  return tokenCollectionPromise;
};

module.exports = {
  clientPromise,
  MONGO_DB_NAME,
  getTokenCollection
};
