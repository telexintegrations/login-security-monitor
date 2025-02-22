import { MongoClient } from "mongodb";
import { z } from "zod";
import logger from "./logger";
import { AuthEvent } from "../models/AuthEvent";

const EventSchema = z.object({
  eventType: z.string(),
  timestamp: z.number(),
  userId: z.string(),
  ipAddress: z.string(),
  success: z.boolean().optional(),
  attempts: z.number().optional(),
});

let client: MongoClient | null = null;

export async function connectDB() {
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error("MONGODB_URI not configured");
    }

    if (!client) {
      client = new MongoClient(process.env.MONGODB_URI);
      await client.connect();
      logger.info("✅ Connected to MongoDB");
    }
    return client;
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error);
    throw error;
  }
}

// Save new auth event
export async function saveAuthEvent(event: unknown) {
  try {
    // Validate event data
    const validatedEvent = EventSchema.parse(event);

    const client = await connectDB();
    const db = client.db();

    await db.collection("events").insertOne({
      ...validatedEvent,
      createdAt: new Date(),
    });

    logger.info("✅ Event saved to database");
  } catch (error) {
    logger.error("❌ Failed to save event:", error);
    throw new Error("Invalid event data");
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
