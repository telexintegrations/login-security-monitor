import axios from "axios";
import dotenv from "dotenv";
import { MongoClient } from "mongodb";

dotenv.config();

async function testPipeline() {
  console.log("🔄 Testing full notification pipeline...");

  const testEvents = [
    {
      event_type: "unusual_pattern",
      payload: {
        userId: "user@pattern.com",
        timestamp: Date.now(),
        ipAddress: "89.234.182.12",
        eventType: "unusual_pattern",
        success: false,
        pattern: "Login attempt from new country: Russia",
        attempts: 1,
      },
      settings: {
        db_connection_string: process.env.MONGODB_URI,
        auth_key: process.env.AUTH_KEY,
        alert_threshold: 1,
        time_window: 15,
        alert_severity: "Medium",
        alert_admins: ["Security-Admin", "DevOps-Lead"],
        monitored_events: ["unusual_pattern"],
      },
    },
    {
      event_type: "password_change",
      payload: {
        userId: "finance@secure.com",
        timestamp: Date.now(),
        ipAddress: "10.0.0.50",
        eventType: "password_change",
        success: true,
        previousChange: "30 days ago",
        attempts: 1,
      },
      settings: {
        db_connection_string: process.env.MONGODB_URI,
        auth_key: process.env.AUTH_KEY,
        alert_threshold: 1,
        time_window: 15,
        alert_severity: "Low",
        alert_admins: ["System-Admin"],
        monitored_events: ["password_change"],
      },
    },
    {
      event_type: "account_lockout",
      payload: {
        userId: "locked@secure.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.75",
        eventType: "account_lockout",
        success: true,
        attempts: 3,
        lockoutDuration: "30 minutes",
      },
      settings: {
        db_connection_string: process.env.MONGODB_URI,
        auth_key: process.env.AUTH_KEY,
        alert_threshold: 3,
        time_window: 15,
        alert_severity: "High",
        alert_admins: ["DevOps-Lead", "System-Admin"],
        monitored_events: ["account_lockout"],
      },
    },
  ];

  // 1. Check MongoDB connection
  const client = new MongoClient(process.env.MONGODB_URI!);
  try {
    await client.connect();
    console.log("✅ MongoDB connection successful");

    // Clear previous test events
    await client
      .db("auth_monitor")
      .collection("events")
      .deleteMany({
        userId: { $in: ["test@pipeline.com", "attacker@test.com"] },
      });
    console.log("🧹 Cleared previous test events");
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error);
    return;
  }

  // 2. Verify Telex webhook
  try {
    if (!process.env.TELEX_WEBHOOK_URL) {
      throw new Error("TELEX_WEBHOOK_URL is not configured");
    }
    console.log("✅ Telex webhook URL is configured");
  } catch (error) {
    console.error(
      "❌ Telex webhook error:",
      error instanceof Error ? error.message : String(error)
    );
    return;
  }

  // 3. Send test events
  for (const testEvent of testEvents) {
    try {
      console.log(`\n🚀 Sending ${testEvent.event_type} event...`);

      // Add debug logging
      console.log("Event payload:", JSON.stringify(testEvent, null, 2));

      const response = await axios.post(
        "http://localhost:3000/webhook",
        testEvent,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 5000,
        }
      );

      console.log(`✅ ${testEvent.event_type} event sent:`, response.data);
      console.log(`Response status: ${response.status}`);

      // Wait longer between requests (3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 3000));
    } catch (error: any) {
      console.error(`❌ ${testEvent.event_type} event failed:`, {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status,
      });
    }
  }

  // 4. Verify events in database
  try {
    const events = await client
      .db("auth_monitor")
      .collection("events")
      .find({
        userId: { $in: ["test@pipeline.com", "attacker@test.com"] },
      })
      .toArray();

    console.log(`\n📊 Found ${events.length} test events in database:`);
    events.forEach((event) => {
      console.log(
        `• ${event.eventType}: ${new Date(event.timestamp).toISOString()}`
      );
    });
  } catch (error) {
    console.error("❌ Failed to verify events:", error);
  } finally {
    await client.close();
    console.log("\n🔌 Database connection closed");
  }
}

console.log("🚀 Starting pipeline test...");
testPipeline().catch(console.error);
