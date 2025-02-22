import request from "supertest";
import { app } from "../test/setup";
import axios from "axios";

// Mock axios
jest.mock("axios");
const mockedAxios = axios as jest.Mocked<typeof axios>;

describe("Webhook Endpoint", () => {
  beforeEach(() => {
    // Reset axios mock before each test
    jest.clearAllMocks();
    // Mock successful Telex response
    mockedAxios.post.mockResolvedValue({
      status: 202,
      data: { status: "success" },
    });
  });

  it("should process valid security events", async () => {
    const response = await request(app)
      .post("/webhook")
      .send({
        event_type: "failed_login",
        payload: {
          userId: "test123",
          timestamp: Date.now(),
          ipAddress: "192.168.1.1",
          eventType: "failed_login",
          success: false,
          attempts: 6,
        },
        settings: {
          db_connection_string: "test_connection",
          auth_key: "test_key",
          alert_threshold: 5,
          time_window: 15,
          alert_severity: "High",
          alert_admins: ["DevOps-Lead"],
          monitored_events: ["failed_login"],
        },
      });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: "processed" });
  });

  it("should send alerts for all monitored events", async () => {
    const testEvents = [
      {
        event_type: "failed_login",
        expectedEmoji: "🔨",
        severity: "High",
      },
      {
        event_type: "unusual_pattern",
        expectedEmoji: "🌐",
        severity: "Medium",
      },
      {
        event_type: "password_change",
        expectedEmoji: "🔑",
        severity: "Low",
      },
      {
        event_type: "account_lockout",
        expectedEmoji: "🔒",
        severity: "High",
      },
    ];

    for (const event of testEvents) {
      const response = await request(app)
        .post("/webhook")
        .send({
          event_type: event.event_type,
          payload: {
            userId: "test123",
            timestamp: Date.now(),
            ipAddress: "192.168.1.1",
            eventType: event.event_type,
            success: false,
            attempts: 6,
          },
          settings: {
            db_connection_string: "test_connection",
            auth_key: "test_key",
            alert_threshold: 5,
            time_window: 15,
            alert_severity: event.severity,
            alert_admins: ["DevOps-Lead"],
            monitored_events: [event.event_type],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "processed" });

      // Verify Telex alert was sent with correct emoji and severity
      expect(mockedAxios.post).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          event_name: expect.stringContaining(event.expectedEmoji),
          status:
            event.severity.toLowerCase() === "critical" ? "error" : "warning",
        }),
        expect.any(Object)
      );
    }
  });

  // Add test for webhook URL validation
  it("should fail if TELEX_WEBHOOK_URL is not configured", async () => {
    const originalEnv = process.env.TELEX_WEBHOOK_URL;
    process.env.TELEX_WEBHOOK_URL = "";

    const response = await request(app)
      .post("/webhook")
      .send({
        event_type: "failed_login",
        payload: {
          userId: "test123",
          timestamp: Date.now(),
          ipAddress: "192.168.1.1",
          eventType: "failed_login",
          success: false,
          attempts: 6,
        },
        settings: {
          monitored_events: ["failed_login"],
        },
      });

    expect(response.status).toBe(500);
    expect(response.body.error).toBe("Internal server error");

    process.env.TELEX_WEBHOOK_URL = originalEnv;
  });
});
