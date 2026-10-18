import mongoose from 'mongoose';

const connectDB = async () => {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) {
    console.warn('⚠️  MONGO_URI not set, trying in-memory fallback if available or localhost');
  }
  try {
    const conn = await mongoose.connect(mongoUri || 'mongodb://localhost:27017/quizsphere', {
      autoIndex: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    console.log('ℹ️  Attempting to continue without DB for development (API will return errors until DB is configured)');
    // Don't exit in dev, allow server to run for frontend dev
    if (process.env.NODE_ENV === 'production') {
      process.exit(1);
    }
    return null;
  }
};

export default connectDB;
