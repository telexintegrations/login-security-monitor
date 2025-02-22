import dotenv from 'dotenv';
import { MongoClient } from 'mongodb';
import axios from 'axios';
import logger from '../utils/logger';

dotenv.config();

async function verifySetup() {
  logger.info("🔍 Verifying setup...");
  
  // Check environment variables
  const requiredEnvVars = ['TELEX_WEBHOOK_URL', 'MONGODB_URI'];
  const missingVars = requiredEnvVars.filter(v => !process.env[v]);
  
  if (missingVars.length > 0) {
    logger.error("❌ Missing environment variables:", missingVars);
    return false;
  }
  
  // Test MongoDB connection
  try {
    const client = new MongoClient(process.env.MONGODB_URI!);
    await client.connect();
    logger.info("✅ MongoDB connection successful");
    await client.close();
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error);
    return false;
  }
  
  // Test Telex webhook
  try {
    const response = await axios.get(process.env.TELEX_WEBHOOK_URL!);
    logger.info("✅ Telex webhook accessible");
  } catch (error) {
    logger.error("❌ Telex webhook error:", error);
    return false;
  }
  
  logger.info("✅ Setup verification complete");
  return true;
}

// Run verification
verifySetup().then(success => {
  if (!success) {
    process.exit(1);
  }
});