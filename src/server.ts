import "dotenv/config";
import express from "express";
import cors from "cors";
import axios from "axios";
import integrationSpec from "./config/integration.json";

interface AuthPayload {
  userId: string;
  timestamp: number;
  ipAddress: string;
  eventType: string;
  queryType?: string;
  success: boolean;
  attempts?: number;
}

interface AlertData {
  webhook_url: string;
  severity: string;
  event: string;
  details: AuthPayload;
}

// Add this interface after the existing interfaces
interface Settings {
  db_connection_string: string;
  auth_key: string;
  alert_threshold: number;
  time_window: number;
  alert_severity: string;
  alert_admins: string[];
  monitored_events: string[];
}

// Update AlertData interface
interface TelexWebhookPayload {
  event_name: string;
  message: string;
  status: "success" | "info" | "warning" | "error";
  username: string;
  metadata?: Record<string, any>;
}

const app = express();

// Enable CORS
app.use(cors());
app.use(express.json());

// Root endpoint
app.get("/", (_req, res) => {
  res.json({ status: "ok", message: "Auth Monitor Service" });
});

// Integration spec endpoint
app.get("/integrationspec", (_req, res) => {
  console.log("Serving integration spec");
  res.json(integrationSpec);
});

// Webhook endpoint to receive authentication events
app.post("/webhook", async (req, res) => {
  try {
    const { event_type, payload, settings } = req.body;

    // Validate settings
    if (!validateSettings(settings)) {
      return res.status(400).json({
        error: "Invalid settings configuration",
      });
    }

    console.log("Received webhook event:", event_type);
    console.log("Payload:", payload);

    // Only process events that are being monitored
    if (!settings.monitored_events.includes(event_type)) {
      return res.status(200).json({
        status: "skipped",
        message: "Event type not monitored",
      });
    }

    // Process the authentication event
    if (isSuspiciousActivity(payload)) {
      await sendTelexAlert({
        webhook_url: process.env.TELEX_WEBHOOK_URL!,
        severity: settings.alert_severity,
        event: event_type,
        details: payload,
      });
    }

    res.status(200).json({ status: "processed" });
  } catch (error) {
    console.error("Webhook error:", error);
    res.status(500).json({ error: "Internal server error" });
  }
});

// Extend globalThis to include lastAttempt
declare global {
  var lastAttempt: number | undefined;
}

// Helper function to detect suspicious activity
function isSuspiciousActivity(payload: AuthPayload): boolean {
  // Check for common suspicious patterns
  const suspiciousPatterns = [
    // Failed login attempts exceed threshold
    payload.eventType === "failed_login" && (payload.attempts || 0) >= 5,

    // SQL injection attempts in query
    payload.queryType?.toLowerCase().includes("union select") ||
      payload.queryType?.toLowerCase().includes("drop table"),

    // Multiple rapid login attempts
    payload.eventType === "login_attempt" &&
      payload.timestamp - (globalThis.lastAttempt || 0) < 1000, // Less than 1 second apart

    // Privilege escalation attempts
    payload.eventType === "permission_change" && !payload.success,

    // Account lockout events
    payload.eventType === "account_lockout",
  ];

  // Update last attempt timestamp
  globalThis.lastAttempt = payload.timestamp;

  // Return true if any suspicious pattern is detected
  return suspiciousPatterns.some((pattern) => pattern === true);
}

// Helper function to send alerts to Telex
async function sendTelexAlert(data: AlertData): Promise<void> {
  try {
    const telexPayload: TelexWebhookPayload = {
      event_name: `Security Alert: ${data.event}`,
      message:
        `🚨 ${data.severity} Security Incident Detected\n\n` +
        `Details:\n` +
        `• User: ${data.details.userId}\n` +
        `• IP Address: ${data.details.ipAddress}\n` +
        `• Event Type: ${data.details.eventType}\n` +
        `• Time: ${new Date(data.details.timestamp).toISOString()}\n` +
        `• Status: ${data.details.success ? "Success" : "Failed"}`,
      status: data.severity.toLowerCase() === "high" ? "error" : "warning",
      username: "Security Monitor",
      metadata: {
        attempts: data.details.attempts,
        eventType: data.details.eventType,
        ipAddress: data.details.ipAddress,
        timestamp: data.details.timestamp,
      },
    };

    await axios.post(data.webhook_url, telexPayload);
    console.log("Alert sent to Telex successfully");
  } catch (error) {
    console.error("Failed to send alert to Telex:", error);
    throw error;
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT} in ${process.env.NODE_ENV} mode`);
  console.log(
    `Integration spec available at: http://localhost:${PORT}/integrationspec`
  );
});

export default app;
