import { MongoClient } from "mongodb";
import dotenv from "dotenv";

dotenv.config();

// Check recent security events
async function checkEvents() {
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    await client.connect();
    console.log("🔌 Connected to MongoDB");

    const db = client.db("auth_monitor");
    const events = await db
      .collection("events")
      .find()
      .sort({ timestamp: -1 })
      .limit(10)
      .toArray();

    if (events.length === 0) {
      console.log("No recent events found.");
    } else {
      console.log("Recent events:", events);
    }
  } finally {
    await client.close();
  }
}

checkEvents().catch(console.error);
