import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const testServer = async () => {
  const webhookUrl = process.env.TELEX_WEBHOOK_URL;

  if (!webhookUrl) {
    console.error(
      "Error: TELEX_WEBHOOK_URL not found in environment variables"
    );
    process.exit(1);
  }

  try {
    // First test: Direct Telex webhook test
    console.log("🔍 Testing direct Telex webhook...");
    const telexTest = {
      event_name: "Security Monitor Test",
      message: "✅ Testing security monitor integration",
      status: "info",
      username: "Security Monitor",
    };

    await axios.post(webhookUrl, telexTest);
    console.log("✅ Direct Telex test successful");

    // Second test: Security alert through integration
    console.log("\n🔍 Testing security alert integration...");
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
    console.log("✅ Integration test response:", response.data);

    // Third test: Check integration spec
    console.log("\n🔍 Checking integration spec...");
    const specResponse = await axios.get(
      "http://localhost:3000/integrationspec"
    );
    console.log("✅ Integration spec available");

    console.log("\n✅ All tests completed successfully!");
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("❌ Test failed:", {
        endpoint: error.config?.url,
        status: error.response?.status,
        data: error.response?.data,
        message: error.message,
      });
    } else {
      console.error("❌ Test failed:", error);
    }
    process.exit(1);
  }
};

console.log("🚀 Starting integration tests...");
testServer();
