import mongoose from "mongoose";

// Lazy getter for MONGODB_URI to avoid Edge Runtime issues
// This function will only be called in Node.js runtime (API routes)
function getMongoDBUri(): string {
  if (typeof process === 'undefined' || typeof process.env === 'undefined') {
    throw new Error("MONGODB_URI is not available in Edge Runtime. This function should only be called in Node.js runtime.");
  }
  
  const uri = process.env.MONGODB_URI;
  if (!uri) {
  throw new Error(
    "Please define the MONGODB_URI environment variable inside .env.local"
  );
}

  return uri;
}

/**
 * Global is used here to maintain a cached connection across hot reloads
 * in development. This prevents connections from growing exponentially
 * during API Route usage.
 */
interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

const globalForMongoose = globalThis as typeof globalThis & {
  mongoose?: MongooseCache;
};

if (!globalForMongoose.mongoose) {
  globalForMongoose.mongoose = { conn: null, promise: null };
}

const cached: MongooseCache = globalForMongoose.mongoose;

/**
 * Connect to MongoDB Atlas using Mongoose
 * Uses connection pooling and caching for optimal performance
 * Handles reconnection automatically
 */
async function connectDB(): Promise<typeof mongoose> {
  // Check if we're in Edge Runtime - Mongoose doesn't work there
  if (typeof mongoose.connect !== "function") {
    throw new Error("Mongoose is not available in Edge Runtime. This function should only be called in Node.js runtime.");
  }

  // Check if connection is already established and ready
  // Only check readyState if mongoose.connection exists (not in Edge Runtime)
  if (cached.conn && mongoose.connection && mongoose.connection.readyState === 1) {
    // Don't log cached connection usage - it's called too frequently
    return cached.conn;
  }

  // If connection exists but is not ready, reset it
  if (cached.conn && mongoose.connection && mongoose.connection.readyState !== 1) {
    console.log("⚠️ Connection not ready, resetting...");
    cached.conn = null;
    cached.promise = null;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 30000, // Increased to 30 seconds
      connectTimeoutMS: 30000, // Connection timeout
      heartbeatFrequencyMS: 10000, // Keep connection alive
      retryWrites: true,
      retryReads: true,
    };

    // Set up connection event handlers for better error handling (only once)
    // Only set up event handlers in Node.js runtime (not Edge Runtime)
    // Check for Node.js runtime in Edge-compatible way
    let isNodeRuntime = false;
    try {
      isNodeRuntime = typeof process !== 'undefined' && 
                      typeof process.versions === 'object' && 
                      process.versions !== null &&
                      typeof process.versions.node === 'string';
    } catch {
      // Edge Runtime - process.versions not available
      isNodeRuntime = false;
    }
    
    if (isNodeRuntime && mongoose.connection && mongoose.connection.listeners) {
      if (mongoose.connection.listeners('connected').length === 0) {
        mongoose.connection.on('connected', () => {
          console.log('✅ MongoDB connected');
        });

        mongoose.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err);
          // Reset cached connection on error
          cached.conn = null;
          cached.promise = null;
        });

        mongoose.connection.on('disconnected', () => {
          console.warn('⚠️ MongoDB disconnected');
          // Reset cached connection on disconnect
          cached.conn = null;
          cached.promise = null;
        });

        // Handle process termination (only register once, only in Node.js runtime)
        // Skip in Edge Runtime - use try-catch to safely check for Node.js APIs
        try {
          if (typeof process !== 'undefined' && 
              typeof process.on === 'function' && 
              typeof process.listeners === 'function' &&
              typeof process.exit === 'function') {
          if (process.listeners('SIGINT').length === 0) {
            process.on('SIGINT', async () => {
              await mongoose.connection.close();
              console.log('MongoDB connection closed through app termination');
              process.exit(0);
            });
          }
          }
        } catch {
          // Edge Runtime - process APIs not available, skip gracefully
        }
      }
    }

    const MONGODB_URI = getMongoDBUri();
    const dbHost = MONGODB_URI.split("@")[1]?.split("/")[0] || "MongoDB Atlas";
    console.log("🔌 Creating new MongoDB connection to:", dbHost);

    cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {
      console.log("✅ Connected to MongoDB Atlas successfully");
      console.log("📊 Database:", mongoose.connection.db?.databaseName);
      console.log("🔗 Connection state:", mongoose.connection.readyState === 1 ? "Connected" : "Not connected");
      return mongoose;
    }).catch((error) => {
      // Clear promise on error so we can retry
      cached.promise = null;
      console.error("❌ Failed to connect to MongoDB:", error.message);
      throw error;
    });
  }

  try {
    cached.conn = await cached.promise;
  } catch (e) {
    cached.promise = null;
    cached.conn = null;
    console.error("❌ MongoDB connection error:", e);
    throw e;
  }

  return cached.conn;
}

export default connectDB;
