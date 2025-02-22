import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import integrationSpec from "./config/integration.json";
import { limiter } from "./middleware/rateLimiter";
import logger from "./utils/logger";
import { saveAuthEvent } from "./utils/db";

// Simplified event type mapping
const eventTypeMap = {
  sql_injection_attempt: { name: "SQL Injection Attempt", emoji: "💉" },
  failed_login: { name: "Login Alert", emoji: "🚨" },
  unusual_pattern: { name: "Unusual Pattern", emoji: "🌐" },
  password_change: { name: "Password Change", emoji: "🔑" },
  privilege_escalation: { name: "Privilege Escalation", emoji: "⚡" },
  account_lockout: { name: "Account Lockout", emoji: "🔒" },
  login_attempt: { name: "Login Attempt", emoji: "🚨" },
} as const;

type EventType = keyof typeof eventTypeMap;

// Update interfaces
interface AuthPayload {
  userId: string;
  timestamp: number;
  ipAddress: string;
  eventType: string;
  queryType?: string;
  success: boolean;
  attempts?: number;
  pattern?: string;
  previousChange?: string;
  currentRole?: string;
  targetRole?: string;
  lockoutDuration?: string;
}

interface AlertData {
  webhook_url: string;
  severity: string;
  event: EventType;
  details: AuthPayload;
  settings: Settings;
}

// Add after the existing interfaces
interface Settings {
  db_connection_string: string;
  auth_key: string;
  alert_threshold: number;
  time_window: number;
  alert_severity: string;
  alert_admins: string[];
  monitored_events: string[];
}

const app = express();

// Add this line before other middleware
app.set("trust proxy", 1);

// Enable CORS
app.use(cors());
app.use(express.json());

// Apply rate limiter
app.use(limiter);

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Auth Monitor Service" });
});

// Integration spec endpoint
app.get("/integrationspec", (_req, res) => {
  console.log("Serving integration spec");
  res.json(integrationSpec);
});

// Update the webhook handler
app.post("/webhook", async (req, res) => {
  try {
    const { event_type, payload, settings } = req.body;

    // Validate request body
    if (!event_type || !payload || !settings) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["event_type", "payload", "settings"],
      });
    }

    logger.info("📥 Received webhook request:", {
      event_type,
      payload,
      settings,
    });

    const webhookUrl = process.env.TELEX_WEBHOOK_URL;
    if (!webhookUrl) {
      logger.error("TELEX_WEBHOOK_URL not configured");
      return res.status(500).json({
        error: "Webhook URL not configured",
        setup_required: true,
      });
    }

    // Validate event type
    if (!settings.monitored_events.includes(event_type)) {
      logger.info(`Event type ${event_type} is not monitored`);
      return res.status(200).json({ status: "skipped" });
    }

    // Save to database
    await saveAuthEvent({
      ...payload,
      severity: settings.alert_severity,
    });

    // Check if it's a suspicious activity
    if (isSuspiciousActivity(payload)) {
      const eventInfo = eventTypeMap[event_type as EventType];
      if (!eventInfo) {
        logger.warn(`Unknown event type: ${event_type}`);
        return res.status(400).json({ error: "Unknown event type" });
      }

      await sendTelexAlert({
        webhook_url: webhookUrl,
        severity: settings.alert_severity,
        event: event_type as EventType,
        details: payload,
        settings: settings,
      });
    }

    res.status(200).json({ status: "processed" });
  } catch (error) {
    logger.error("❌ Error processing webhook:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Extend globalThis to include lastAttempt
declare global {
  var lastAttempt: number | undefined;
}

// Helper function to detect suspicious activity
function isSuspiciousActivity(payload: AuthPayload): boolean {
  // Always treat these events as suspicious
   return true

  //  const alwaysSuspicious = [
  //   "sql_injection_attempt",
  //   "privilege_escalation",
  //   "unusual_pattern",
  //   "account_lockout",
  // ];

  // if (alwaysSuspicious.includes(payload.eventType)) {
  //   return true;
  // }

  // // Check for specific conditions
  // const suspiciousPatterns = [
  //   // Failed login attempts exceed threshold
  //   payload.eventType === "failed_login" && (payload.attempts || 0) >= 5,

  //   // Multiple rapid login attempts
  //   payload.eventType === "login_attempt" &&
  //     payload.timestamp - (globalThis.lastAttempt || 0) < 1000,

  //   // Password changes
  //   payload.eventType === "password_change" &&
  //     payload.previousChange !== undefined,
  // ];

  // // Update last attempt timestamp
  // globalThis.lastAttempt = payload.timestamp;

  // return suspiciousPatterns.some((pattern) => pattern === true);
}

// Update sendTelexAlert function
async function sendTelexAlert(data: AlertData): Promise<void> {
  try {
    const eventInfo = eventTypeMap[data.event];
    const telexPayload = {
      event_name: `${eventInfo.emoji} ${eventInfo.name}`,
      message: [
        `${eventInfo.emoji} ${data.severity} Security Incident Detected\n`,
        `Details:`,
        `• User: ${data.details.userId}`,
        `• IP Address: ${data.details.ipAddress}`,
        `• Event Type: ${data.details.eventType}`,
        `• Time: ${new Date(data.details.timestamp).toISOString()}`,
        `• Status: ${data.details.success ? "Success" : "Failed"}`,
        generateEventDetails(data),
        `\nAlert Level: ${data.severity}`,
        `Notified Admins: ${data.settings.alert_admins.join(", ")}`,
      ].join("\n"),
      status: data.severity.toLowerCase() === "critical" ? "error" : "warning",
      username: "Security Monitor",
    };

    logger.info(`🚀 Sending ${data.event} alert to Telex`);
    const response = await axios.post(data.webhook_url, telexPayload, {
      headers: { "Content-Type": "application/json" },
      timeout: 5000,
    });

    if (response.status === 202) {
      logger.info(`✅ ${data.event} alert sent successfully:`, response.data);
    } else {
      throw new Error(`Unexpected response status: ${response.status}`);
    }
  } catch (error) {
    logger.error(`❌ Failed to send ${data.event} alert:`, error);
    throw error;
  }
}

// Helper function to generate event-specific details
function generateEventDetails(data: AlertData): string {
  switch (data.event) {
    case "sql_injection_attempt":
      return data.details.queryType
        ? `\nMalicious Query Details:\n${data.details.queryType}`
        : "";
    case "failed_login":
      return `\nBrute Force Details:\n• Total Attempts: ${data.details.attempts}\n• Alert Threshold: ${data.settings.alert_threshold}\n• Time Window: ${data.settings.time_window} minutes`;
    case "unusual_pattern":
      return data.details.pattern
        ? `\nPattern Details:\n${data.details.pattern}`
        : "";
    case "password_change":
      return data.details.previousChange
        ? `\nChange History:\n• Previous Change: ${data.details.previousChange}`
        : "";
    case "privilege_escalation":
      return `\nEscalation Details:\n• Current Role: ${data.details.currentRole}\n• Attempted Role: ${data.details.targetRole}`;
    case "account_lockout":
      return `\nLockout Details:\n• Duration: ${data.details.lockoutDuration}\n• Failed Attempts: ${data.details.attempts}`;
    default:
      return "";
  }
}

// Add this function to validate settings
function validateSettings(settings: Settings): boolean {
  return !!(
    settings &&
    settings.db_connection_string &&
    settings.auth_key &&
    typeof settings.alert_threshold === "number" &&
    typeof settings.time_window === "number" &&
    settings.alert_severity &&
    Array.isArray(settings.alert_admins) &&
    Array.isArray(settings.monitored_events)
  );
}

export default app;
