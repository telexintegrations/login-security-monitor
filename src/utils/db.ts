import { MongoClient } from "mongodb";
import logger from "./logger";
import { AuthEvent } from "../models/AuthEvent";

let client: MongoClient;

export async function connectDB() {
  try {
    client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    logger.info("Connected to MongoDB");
  } catch (error) {
    logger.error("MongoDB connection error:", error);
    throw error;
  }
}

// Save new auth event
export async function saveAuthEvent(eventData: any) {
  try {
    const db = client.db("auth_monitor");
    const result = await db.collection("events").insertOne({
      ...eventData,
      timestamp: new Date(eventData.timestamp),
      created_at: new Date(),
    });
    logger.info(`Event saved with ID: ${result.insertedId}`);
    return result;
  } catch (error) {
    logger.error("Failed to save event:", error);
    throw error;
  }
}

// Check for suspicious patterns
export async function checkSuspiciousActivity(
  userId: string,
  timeWindow: number
) {
  const recentEvents = await AuthEvent.find({
    userId,
    timestamp: { $gte: new Date(Date.now() - timeWindow * 60 * 1000) },
  });
  return recentEvents.length;
}
