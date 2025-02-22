import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import dotenv from "dotenv";
import logger from "../../utils/logger";

dotenv.config({ path: ".env.test" });
process.env.NODE_ENV = "test"; // Ensure we're in test mode

let mongod: MongoMemoryServer;

// Extend timeout for all tests
jest.setTimeout(30000);

beforeAll(async () => {
  try {
    // Create new instance of MongoMemoryServer
    mongod = await MongoMemoryServer.create();
    const uri = await mongod.getUri();

    // Set the URI for tests
    process.env.MONGODB_URI = uri;

    // Connect to in-memory database
    await mongoose.connect(uri);
    logger.info("✅ Connected to test database");
  } catch (error) {
    logger.error("❌ Failed to connect to test database:", error);
    throw error;
  }
});

// Clear database between tests
beforeEach(async () => {
  try {
    if (!mongoose.connection.db) {
      throw new Error("Database connection not established");
    }

    const collections = await mongoose.connection.db.collections();
    await Promise.all(
      collections.map((collection) => collection.deleteMany({}))
    );
    jest.clearAllMocks();
  } catch (error) {
    logger.error("❌ Failed to clean test database:", error);
    throw error;
  }
});

// Cleanup after all tests
afterAll(async () => {
  try {
    await mongoose.disconnect();
    await mongod.stop();
    logger.info("✅ Test database cleaned up");
  } catch (error) {
    logger.error("❌ Failed to cleanup test database:", error);
    throw error;
  }
});

// Helper to get test database
export const getTestDb = () => {
  if (!mongoose.connection || !mongoose.connection.db) {
    throw new Error("Database not initialized");
  }
  return mongoose.connection.db;
};
