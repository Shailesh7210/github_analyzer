import "dotenv/config";
import app from "./app.js";
import { testConnection } from "./config/database.js";

const PORT = process.env.PORT || 3000;

const start = async () => {
  await testConnection();

  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  });
};

start();