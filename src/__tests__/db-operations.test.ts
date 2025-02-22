import { describe, it, expect } from "@jest/globals";
import mongoose from "mongoose";
import { saveAuthEvent } from "../utils/db";
import { createTestEvent } from "./helpers/testUtils";

describe("Database Operations", () => {
  it("should save auth events to database", async () => {
    const event = createTestEvent("sql_injection_attempt");
    await saveAuthEvent(event);

    const savedEvent = await mongoose.connection
      .collection("events")
      .findOne({ eventType: "sql_injection_attempt" });

    expect(savedEvent).toBeTruthy();
    expect(savedEvent?.eventType).toBe("sql_injection_attempt");
  }, 30000);

  it("should handle invalid events", async () => {
    const invalidEvent = {};
    await expect(saveAuthEvent(invalidEvent)).rejects.toThrow(
      "Invalid event data"
    );
  }, 30000);
});
