import request from "supertest";
import { app } from "../test/setup";

describe("Database Authentication Monitoring", () => {
  it("should detect real database authentication attempts", async () => {
    const testUser = {
      username: "test_user",
      password: "wrong_password",
    };

    const response = await request(app)
      .post("/webhook")
      .send({
        event_type: "failed_login",
        payload: {
          userId: testUser.username,
          timestamp: Date.now(),
          ipAddress: "localhost",
          eventType: "failed_login",
          success: false,
          attempts: 1,
          queryType: "DB_AUTH",
        },
        settings: {
          db_connection_string: process.env.MONGODB_URI,
          auth_key: "test_key",
          alert_threshold: 1,
          time_window: 15,
          alert_severity: "High",
          alert_admins: ["DevOps-Lead"],
          monitored_events: ["failed_login"],
        },
      });

    expect(response.status).toBe(200);
  });
});
