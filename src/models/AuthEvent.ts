import mongoose from "mongoose";

const authEventSchema = new mongoose.Schema({
  userId: String,
  timestamp: Date,
  ipAddress: String,
  eventType: String,
  queryType: String,
  success: Boolean,
  attempts: Number,
  severity: String,
});

export const AuthEvent = mongoose.model("AuthEvent", authEventSchema);
