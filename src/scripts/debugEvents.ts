import axios from "axios";
import dotenv from "dotenv";
import logger from "../utils/logger";

dotenv.config();

async function debugEvents() {
  const BASE_URL = "http://localhost:3000/webhook";

  const events = [
    {
      event_type: "failed_login",
      payload: {
        userId: "test@debug.com",
        timestamp: Date.now(),
        ipAddress: "127.0.0.1",
        eventType: "failed_login",
        success: false,
        attempts: 6,
      },
    },
    {
      event_type: "unusual_pattern",
      payload: {
        userId: "user@debug.com",
        timestamp: Date.now(),
        ipAddress: "89.234.182.12",
        eventType: "unusual_pattern",
        success: false,
        pattern: "Login attempt from new country: Russia",
      },
    },
    {
      event_type: "password_change",
      payload: {
        userId: "admin@debug.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.100",
        eventType: "password_change",
        success: true,
        previousChange: "30 days ago",
      },
    },
    {
      event_type: "account_lockout",
      payload: {
        userId: "locked@debug.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.200",
        eventType: "account_lockout",
        success: true,
        attempts: 3,
        lockoutDuration: "15 minutes",
      },
    },
  ];

  for (const event of events) {
    try {
      console.log(`\n🧪 Testing ${event.event_type}...`);

      const response = await axios.post(BASE_URL, {
        ...event,
        settings: {
          db_connection_string: process.env.MONGODB_URI,
          auth_key: process.env.AUTH_KEY,
          alert_threshold: 5,
          time_window: 15,
          alert_severity: "High",
          alert_admins: ["Debug-Admin"],
          monitored_events: [
            "failed_login",
            "unusual_pattern",
            "password_change",
            "account_lockout",
            "sql_injection_attempt",
            "privilege_escalation",
          ],
        },
      });

      console.log(`✅ ${event.event_type} response:`, {
        status: response.status,
        data: response.data,
      });
    } catch (error: any) {
      console.error(`❌ ${event.event_type} failed:`, {
        message: error.message,
        response: error.response?.data,
        stack: error.stack,
      });
    }

    // Wait between requests
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }
}

console.log("🔍 Starting event debugging...");
debugEvents().catch(console.error);
