import "dotenv/config";
import app from "./server";
import logger from "./utils/logger";
import { connectDB } from "./utils/db";

const PORT = process.env.PORT || 3000;

// Connect to MongoDB before starting server
connectDB()
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Connected to MongoDB`);
      logger.info(
        `Server running on port ${PORT} in ${process.env.NODE_ENV} mode`
      );
      logger.info(
        `Integration spec available at: http://localhost:${PORT}/integrationspec`
      );
    });
  })
  .catch((error) => {
    logger.error("Failed to connect to MongoDB:", error);
    process.exit(1);
  });
