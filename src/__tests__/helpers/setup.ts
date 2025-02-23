import { beforeEach, beforeAll, afterAll } from "@jest/globals";
import dotenv from "dotenv";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import app from "../../server";

dotenv.config({ path: ".env.test" });

let mongo: MongoMemoryServer;
let server: any;

beforeAll(async () => {
  try {
    process.env.NODE_ENV = "test";
    mongo = await MongoMemoryServer.create();
    const mongoUri = mongo.getUri();
    await mongoose.connect(mongoUri);
    if (mongoose.connection.db) {
      await mongoose.connection.db
        .collection("auth_events")
        .createIndex({ userId: 1 });
    }
    server = app.listen(0);
  } catch (error) {
    console.error("Test setup failed:", error);
    process.exit(1);
  }
});

beforeEach(async () => {
  if (!mongoose.connection.db) return;
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map((collection) => collection.deleteMany({})));
  jest.clearAllMocks();
});

afterAll(async () => {
  if (server) await new Promise((resolve) => server.close(resolve));
  if (mongoose.connection.readyState !== 0) {
    await mongoose.connection.close();
  }
  if (mongo) {
    await mongo.stop();
  }
});

export { server, app };
