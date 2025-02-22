import { z } from "zod";

export const testSettings = {
  db_connection_string: "mongodb://localhost:27017/test",
  auth_key: "test_key_123",
  alert_threshold: 1,
  time_window: 0,
  alert_severity: "Critical",
  alert_admins: ["Security-Admin"],
};

export const EventSchema = z.object({
  eventType: z.string(),
  timestamp: z.number(),
  userId: z.string(),
  ipAddress: z.string(),
  success: z.boolean().optional(),
  attempts: z.number().optional(),
});

export type TestEvent = z.infer<typeof EventSchema>;

export const createTestEvent = (
  type: string,
  additionalPayload = {}
): TestEvent => ({
  eventType: type,
  timestamp: Date.now(),
  userId: `test@${type}.com`,
  ipAddress: "192.168.1.100",
  success: false,
  attempts: 1,
  ...additionalPayload,
});
