import dotenv from "dotenv";
import axios from "axios";
import logger from "../utils/logger";

dotenv.config();

async function runFocusedTest() {
  const BASE_URL = "http://localhost:3000/webhook";
  logger.info("🔍 Starting focused security tests...");

  const commonSettings = {
    db_connection_string: process.env.MONGODB_URI,
    auth_key: process.env.AUTH_KEY,
    alert_threshold: 1, // Set to 1 to ensure immediate triggering
    time_window: 5,    // Short window
    alert_severity: "Critical", // Match SQL injection severity
    alert_admins: ["Security-Admin", "DevOps-Lead"],
    monitored_events: ["sql_injection_attempt", "privilege_escalation", "failed_login", "unusual_pattern", "password_change", "account_lockout"]
  };

  const testEvents = [
    {
      event_type: "sql_injection_attempt",
      payload: {
        userId: "attacker@test.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.100",
        eventType: "sql_injection_attempt",
        success: false,
        attempts: 1,
        queryType: "SELECT * FROM users WHERE id = 1 OR 1=1"
      },
      settings: commonSettings
    },
    {
      event_type: "privilege_escalation",
      payload: {
        userId: "hacker@test.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.101",
        eventType: "privilege_escalation",
        success: false,
        attempts: 1,
        currentRole: "user",
        targetRole: "admin"
      },
      settings: commonSettings
    },
    {
      event_type: "unusual_pattern",
      payload: {
        userId: "suspicious@test.com",
        timestamp: Date.now(),
        ipAddress: "89.234.182.12",
        eventType: "unusual_pattern",
        success: false,
        attempts: 1,
        pattern: "Multiple login attempts from different countries"
      },
      settings: commonSettings
    },
    {
      event_type: "failed_login",
      payload: {
        userId: "bruteforce@test.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.102",
        eventType: "failed_login",
        success: false,
        attempts: 5
      },
      settings: commonSettings
    },
    {
      event_type: "password_change",
      payload: {
        userId: "compromised@test.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.103",
        eventType: "password_change",
        success: true,
        previousChange: "1 hour ago",
        attempts: 1
      },
      settings: commonSettings
    },
    {
      event_type: "account_lockout",
      payload: {
        userId: "locked@test.com",
        timestamp: Date.now(),
        ipAddress: "192.168.1.104",
        eventType: "account_lockout",
        success: true,
        attempts: 3,
        lockoutDuration: "30 minutes"
      },
      settings: commonSettings
    }
  ];

  // Send events with delay between them
  for (const event of testEvents) {
    try {
      logger.info(`\n🚀 Testing ${event.event_type}...`);
      const response = await axios.post(BASE_URL, event);
      logger.info(`✅ ${event.event_type} response:`, response.data);
      
      // Wait 2 seconds between events to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error: any) {
      logger.error(`❌ ${event.event_type} failed:`, {
        message: error.message,
        response: error.response?.data
      });
    }
  }

  logger.info("\n✨ Focused test complete");
}

logger.info("🚀 Starting focused security tests with consistent settings...");
runFocusedTest().catch(console.error);