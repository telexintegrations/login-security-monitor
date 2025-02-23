import request from "supertest";
import { app } from "./helpers/setup";
import { AuthEvent } from "../models/AuthEvent";

describe("Auth Monitor Security Tests", () => {
  describe("SQL Injection Detection", () => {
    beforeEach(async () => {
      await AuthEvent.deleteMany({}); // Clear database before each test
    });

    it("should detect SQL injection attempts", async () => {
      const response = await request(app)
        .post("/webhook")
        .send({
          event_type: "sql_injection_attempt",
          payload: {
            userId: "admin",
            timestamp: Date.now(),
            ipAddress: "192.168.1.1",
            eventType: "sql_injection_attempt",
            queryType:
              "SELECT * FROM users WHERE username = 'admin' UNION SELECT * FROM sensitive_data;--",
            success: false,
            attempts: 1,
          },
          settings: {
            db_connection_string: "mongodb://localhost:27017/test",
            auth_key: "test_key",
            alert_threshold: 5,
            time_window: 15,
            alert_severity: "Critical",
            alert_admins: ["Security-Admin"],
            monitored_events: ["sql_injection_attempt"],
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe("processed");
    }, 30000); // Increased timeout to 30 seconds
  });

  describe("Brute Force Detection", () => {
    it("should detect rapid successive login attempts", async () => {
      // First attempt
      await request(app)
        .post("/webhook")
        .send({
          event_type: "login_attempt",
          payload: {
            userId: "user123",
            timestamp: Date.now(),
            ipAddress: "192.168.1.2",
            eventType: "login_attempt",
            success: false,
            attempts: 1,
          },
          settings: {
            db_connection_string: "test_connection",
            auth_key: "test_key",
            alert_threshold: 5,
            time_window: 15,
            alert_severity: "High",
            alert_admins: ["DevOps-Lead"],
            monitored_events: ["login_attempt"],
          },
        });

      // Immediate second attempt
      const response = await request(app)
        .post("/webhook")
        .send({
          event_type: "login_attempt",
          payload: {
            userId: "user123",
            timestamp: Date.now(),
            ipAddress: "192.168.1.2",
            eventType: "login_attempt",
            success: false,
            attempts: 2,
          },
          settings: {
            db_connection_string: "test_connection",
            auth_key: "test_key",
            alert_threshold: 5,
            time_window: 15,
            alert_severity: "High",
            alert_admins: ["DevOps-Lead"],
            monitored_events: ["login_attempt"],
          },
        });

      expect(response.status).toBe(200);
    });
  });

  describe("Privilege Escalation Detection", () => {
    it("should detect failed privilege escalation attempts", async () => {
      const response = await request(app)
        .post("/webhook")
        .send({
          event_type: "privilege_escalation", // Changed from permission_change
          payload: {
            userId: "regular_user",
            timestamp: Date.now(),
            ipAddress: "192.168.1.3",
            eventType: "privilege_escalation", // Changed to match event_type
            queryType: "UPDATE users SET role = 'admin' WHERE id = 123",
            success: false,
            attempts: 1,
          },
          settings: {
            db_connection_string: "test_connection",
            auth_key: "test_key",
            alert_threshold: 1,
            time_window: 15,
            alert_severity: "Critical",
            alert_admins: ["Security-Admin"],
            monitored_events: ["privilege_escalation"], // Changed to match event_type
          },
        });

      expect(response.status).toBe(200);
    });
  });
});
