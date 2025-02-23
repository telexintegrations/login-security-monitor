import request from "supertest";
import { app } from "./helpers/setup";

describe("Webhook Endpoint", () => {
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
});
