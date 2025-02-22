import { describe, it, expect, beforeEach } from "@jest/globals";
import request from "supertest";
import app from "../server";
import { createTestEvent, testSettings } from "./helpers/testUtils";
import { mockAxios } from "./mocks/axios";

describe("Auth Monitor Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const testCases = [
    {
      name: "SQL Injection",
      type: "sql_injection_attempt",
      payload: { queryType: "SELECT * FROM users WHERE id = 1 OR 1=1" },
    },
    {
      name: "Session Hijacking",
      type: "session_hijacking",
      payload: {
        sessionId: "sess_123",
        originalIP: "192.168.1.100",
        hijackedIP: "45.227.253.120",
      },
    },
    {
      name: "Brute Force",
      type: "brute_force",
      payload: {
        attempts: 20,
        timeWindow: "5 minutes",
        targetEndpoint: "/api/login",
      },
    },
    {
      name: "Suspicious IP",
      type: "suspicious_ip",
      payload: {
        country: "Unknown",
        vpnDetected: true,
        threatScore: 85,
      },
    },
  ];

  testCases.forEach(({ name, type, payload }) => {
    it(`should detect ${name}`, async () => {
      const event = createTestEvent(type, payload);

      mockAxios.post.mockImplementationOnce(() =>
        Promise.resolve({
          status: 200,
          data: { status: "success" },
          headers: { "Content-Type": "application/json" },
          config: {
            headers: { "Content-Type": "application/json" },
            method: "POST",
            url: "test-url",
          },
          statusText: "OK",
        })
      );

      const response = await request(app)
        .post("/webhook")
        .set("x-test-auth", "true") // Add test auth header
        .send({
          event_type: type,
          payload: event,
          settings: testSettings,
        });

      expect(response.status).toBe(200);
      expect(response.body).toEqual({ status: "processed" });
      expect(mockAxios.post).toHaveBeenCalled();
    }, 30000);
  });

  describe("Error Handling", () => {
    it("should handle missing webhook URL", async () => {
      const originalUrl = process.env.TELEX_WEBHOOK_URL;
      process.env.TELEX_WEBHOOK_URL = "";

      const response = await request(app)
        .post("/webhook")
        .set("x-test-auth", "true")
        .send(createTestEvent("sql_injection_attempt"));

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty(
        "error",
        "Webhook URL not configured"
      );

      process.env.TELEX_WEBHOOK_URL = originalUrl;
    });

    it("should validate required fields", async () => {
      const response = await request(app)
        .post("/webhook")
        .set("x-test-auth", "true")
        .send({});

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("error", "Missing required fields");
    });
  });

  // Simplified rate limit test
  it("should handle rate limits", async () => {
    const event = createTestEvent("sql_injection_attempt");

    // First request should succeed
    await request(app).post("/webhook").send(event).expect(200);

    // Second request should be rate limited
    await request(app).post("/webhook").send(event).expect(429);
  });
});
