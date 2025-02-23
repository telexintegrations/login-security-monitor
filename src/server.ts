import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import { z } from "zod";
import integrationSpec from "./config/integration.json";
import limiter from "./middleware/rateLimiter";
import logger from "./utils/logger";
import { saveAuthEvent } from "./utils/db";

// Security event types
const eventTypeMap = {
  sql_injection_attempt: { name: "SQL Injection Attempt", emoji: "💉" },
  failed_login: { name: "Login Alert", emoji: "🚨" },
  unusual_pattern: { name: "Unusual Pattern", emoji: "🌐" },
  password_change: { name: "Password Change", emoji: "🔑" },
  privilege_escalation: { name: "Privilege Escalation", emoji: "⚡" },
  account_lockout: { name: "Account Lockout", emoji: "🔒" },
  login_attempt: { name: "Login Attempt", emoji: "🚨" },
  session_hijacking: { name: "Session Hijacking", emoji: "🕵️" },
  brute_force: { name: "Brute Force Attack", emoji: "🔨" },
  suspicious_ip: { name: "Suspicious IP Access", emoji: "🌍" },
  login_success: { name: "Successful Login", emoji: "✅" },
} as const;

type EventType = keyof typeof eventTypeMap;

// Core interfaces
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
  sessionId?: string;
  originalIP?: string;
  hijackedIP?: string;
  timeWindow?: string;
  targetEndpoint?: string;
  country?: string;
  vpnDetected?: boolean;
  threatScore?: number;
  location?: string;
  deviceInfo?: {
    browser?: string;
    os?: string;
    device?: string;
  };
}

interface AlertData {
  webhook_url: string;
  severity: string;
  event: EventType;
  details: AuthPayload;
  settings: Settings;
}

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

// Middleware setup
app.set("trust proxy", 1);
app.use(cors());
app.use(express.json());

// Skip rate limiting for health checks and test requests
app.use((req, res, next) => {
  if (req.path === "/health" || req.headers["x-test-auth"]) {
    next();
  } else {
    limiter(req, res, next);
  }
});

// Base endpoints
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Auth Monitor Service" });
});

// Health check endpoint
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
  });
});

app.get("/integrationspec", (_req, res) => {
  res.json(integrationSpec);
});

// Main webhook handler
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

function isSuspiciousActivity(payload: AuthPayload): boolean {
  return true;
}

// Alert sending
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

// Event details generation
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
    case "session_hijacking":
      return `\nHijacking Details:\n• Session ID: ${data.details.sessionId}\n• Original IP: ${data.details.originalIP}\n• Hijacked IP: ${data.details.hijackedIP}`;
    case "brute_force":
      return `\nAttack Details:\n• Attempts: ${data.details.attempts}\n• Time Window: ${data.details.timeWindow}\n• Target: ${data.details.targetEndpoint}`;
    case "suspicious_ip":
      return `\nThreat Details:\n• Country: ${data.details.country}\n• VPN Detected: ${data.details.vpnDetected}\n• Threat Score: ${data.details.threatScore}`;
    case "login_success":
      return `\nLogin Details:
• Location: ${data.details.location || "Unknown"}
• Browser: ${data.details.deviceInfo?.browser || "Unknown"}
• OS: ${data.details.deviceInfo?.os || "Unknown"}
• Device: ${data.details.deviceInfo?.device || "Unknown"}`;
    default:
      return "";
  }
}

export default app;
