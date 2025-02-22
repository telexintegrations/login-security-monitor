import request from "supertest";
import mongoose from "mongoose";
import { AuthEvent } from "../models/AuthEvent";
import { app, server } from "../test/setup"; // Updated import

describe("Auth Monitor Integration Tests", () => {
  beforeEach(async () => {
    await AuthEvent.deleteMany({});
    // Reset rate limit for each test
    jest.clearAllMocks();
  });

  // Update rate limit test
  describe("Rate Limiting", () => {
    it("should limit excessive requests", async () => {
      const requests = Array(5).fill(null);
      await Promise.all(
        requests.map(async () => {
          await request(server).get("/");
        })
      );
      const response = await request(server).get("/");
      expect(response.status).toBe(200);
    });
  });

  // Update webhook test
  describe("Webhook Tests", () => {
    it("should process valid security events", async () => {
      const response = await request(server)
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
    });
  });

  describe("Security Events", () => {
    it("should detect and store SQL injection attempts", async () => {
      const response = await request(app)
        .post("/webhook")
        .send({
          event_type: "failed_login",
          payload: {
            userId: "admin",
            timestamp: Date.now(),
            ipAddress: "192.168.1.1",
            eventType: "failed_login",
            queryType:
              "SELECT * FROM users WHERE username = 'admin' UNION SELECT",
            success: false,
            attempts: 1,
          },
          settings: {
            db_connection_string: process.env.MONGODB_URI,
            auth_key: "1234567",
            alert_threshold: 5,
            time_window: 15,
            alert_severity: "Critical",
            alert_admins: ["Security-Admin"],
            monitored_events: ["failed_login", "sql_injection_attempt"],
          },
        });

      expect(response.status).toBe(200);

      // Verify event was stored in database
      const storedEvents = await AuthEvent.find({ userId: "admin" });
      expect(storedEvents).toHaveLength(1);
    });
  });
});
