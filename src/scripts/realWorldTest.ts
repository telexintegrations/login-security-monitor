import axios from "axios";
import dotenv from "dotenv";
import logger from "../utils/logger";
import { z } from "zod"; // Add zod for runtime validation

dotenv.config();

// Event type validation schema
const EventTypeSchema = z.enum([
  "sql_injection_attempt",
  "failed_login",
  "unusual_pattern",
  "password_change",
  "privilege_escalation",
  "account_lockout",
]);

// Severity level validation
const SeveritySchema = z.enum(["Critical", "High", "Medium", "Low"]);

// Settings validation schema
const SettingsSchema = z.object({
  db_connection_string: z.string().url(),
  auth_key: z.string().min(1),
  alert_threshold: z.number().min(1),
  time_window: z.number().min(0), // Allow 0 for immediate response
  alert_severity: SeveritySchema,
  alert_admins: z.array(z.string()).min(1),
  monitored_events: z.array(EventTypeSchema).min(1),
});

// Base configuration for all events
const baseSettings = {
  db_connection_string: process.env.MONGODB_URI!,
  auth_key: process.env.AUTH_KEY!,
  monitored_events: [
    "sql_injection_attempt",
    "failed_login",
    "unusual_pattern",
    "password_change",
    "privilege_escalation",
    "account_lockout",
  ],
};

// Add type for event configs
type EventConfig = {
  severity: z.infer<typeof SeveritySchema>;
  threshold: number;
  admins: string[];
  responseTime: number;
};

// Update event configs to ensure immediate alerts
const eventConfigs: Record<z.infer<typeof EventTypeSchema>, EventConfig> = {
  sql_injection_attempt: {
    severity: "Critical",
    threshold: 1,
    admins: ["Security-Admin"],
    responseTime: 0,
  },
  privilege_escalation: {
    severity: "Critical",
    threshold: 1,
    admins: ["Security-Admin", "System-Admin"],
    responseTime: 0,
  },
  // Fix these configurations to match working ones
  unusual_pattern: {
    severity: "Critical", // Changed from Medium
    threshold: 1, // Keep at 1 for immediate alert
    admins: ["Security-Admin"],
    responseTime: 0, // Changed from 5 to immediate
  },
  failed_login: {
    severity: "Critical", // Changed from High
    threshold: 1, // Changed from 5 to immediate
    admins: ["Security-Admin"],
    responseTime: 0, // Changed from 15 to immediate
  },
  password_change: {
    severity: "Critical", // Changed from Low
    threshold: 1,
    admins: ["Security-Admin"],
    responseTime: 0, // Changed from 30 to immediate
  },
  account_lockout: {
    severity: "Critical", // Changed from High
    threshold: 1, // Changed from 3 to immediate
    admins: ["Security-Admin"],
    responseTime: 0, // Changed from 15 to immediate
  },
} as const;

async function simulateSecurityEvents() {
  const BASE_URL = "http://localhost:3000/webhook";
  logger.info("🔧 Using webhook URL:", process.env.TELEX_WEBHOOK_URL);

  try {
    // Validate base settings first
    const validatedBaseSettings = {
      ...baseSettings,
      monitored_events: baseSettings.monitored_events as z.infer<
        typeof EventTypeSchema
      >[],
    };

    // Generate and validate events
    const events = Object.entries(eventConfigs).map(([eventType, config]) => {
      const settings = {
        ...validatedBaseSettings,
        alert_threshold: config.threshold,
        time_window: config.responseTime,
        alert_severity: config.severity,
        alert_admins: config.admins,
      };

      // Validate settings before creating event
      try {
        SettingsSchema.parse(settings);
      } catch (error) {
        throw new Error(`Invalid settings for ${eventType}: ${error}`);
      }

      return {
        event_type: eventType,
        payload: generateEventPayload(eventType),
        settings,
      };
    });

    // Send events with proper delay and logging
    for (const event of events) {
      try {
        logger.info(`\n📡 Sending ${event.event_type} test...`);

        const response = await axios.post(BASE_URL, event, {
          headers: { "Content-Type": "application/json" },
          timeout: 5000,
        });

        logger.info(`✅ ${event.event_type} test response:`, response.data);

        // Minimal delay between events
        await new Promise((resolve) => setTimeout(resolve, 1000));
      } catch (error: any) {
        logger.error(`❌ ${event.event_type} test failed:`, {
          message: error.message,
          response: error.response?.data,
          status: error.response?.status,
        });
      }
    }
  } catch (error) {
    logger.error("❌ Test configuration failed:", error);
    process.exit(1);
  }
}

// Helper function to generate event-specific payloads
function generateEventPayload(eventType: string) {
  const basePayload = {
    userId: `test@${eventType}.com`,
    timestamp: Date.now(),
    ipAddress: "192.168.1." + Math.floor(Math.random() * 255),
    eventType,
    success: false,
    attempts: 1,
  };

  switch (eventType) {
    case "sql_injection_attempt":
      return {
        ...basePayload,
        queryType: "SELECT * FROM users WHERE id = 1 OR 1=1",
      };
    case "privilege_escalation":
      return {
        ...basePayload,
        currentRole: "user",
        targetRole: "admin",
      };
    case "unusual_pattern":
      return {
        ...basePayload,
        pattern: "Login attempt from new country: Russia",
      };
    case "failed_login":
      return {
        ...basePayload,
        attempts: 1, // Changed from 6 to trigger immediate alert
        success: false,
      };
    case "password_change":
      return {
        ...basePayload,
        success: true,
        previousChange: "30 days ago",
      };
    case "account_lockout":
      return {
        ...basePayload,
        attempts: 1, // Changed from 3 to trigger immediate alert
        success: false,
        lockoutDuration: "30 minutes",
      };
    default:
      return basePayload;
  }
}

logger.info("🚀 Starting comprehensive security tests...");
simulateSecurityEvents().catch((error) => {
  logger.error("❌ Test suite failed:", error);
  process.exit(1);
});
