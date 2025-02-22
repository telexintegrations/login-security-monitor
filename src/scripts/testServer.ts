import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const testServer = async () => {
  const webhookUrl = process.env.TELEX_WEBHOOK_URL;

  try {
    // Test webhook with security alert
    const testPayload = {
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
        monitored_events: ["failed_login", "unusual_pattern"],
      },
    };

    const response = await axios.post(
      "http://localhost:3000/webhook",
      testPayload
    );
    console.log("Test response:", response.data);

    // Direct Telex webhook test
    const telexTest = {
      event_name: "Security Monitor Test",
      message: "Testing security monitor integration",
      status: "info",
      username: "Security Monitor",
    };

    await axios.post(webhookUrl!, telexTest);
    console.log("Direct Telex test sent");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Test failed:", {
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("Test failed:", error);
    }
  }
};

console.log("Starting integration tests...");
testServer();
