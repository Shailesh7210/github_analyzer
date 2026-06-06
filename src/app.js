import express from "express";
import helmet from "helmet";
import cors from "cors";
import morgan from "morgan";
import rateLimiter from "./middleware/rateLimiter.js";
import errorHandler from "./middleware/errorHandler.js";
import healthRoute from "./routes/healthRoute.js";
import profileRoutes from "./routes/profileRoutes.js";
import statsRoutes from "./routes/statsRoutes.js";

const app = express();

// Security & utility middleware
app.use(helmet());
app.use(cors());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(rateLimiter);

// Routes
app.use("/health", healthRoute);
app.use("/api", profileRoutes);
app.use("/api", statsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    status: "error",
    message: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Global error handler
app.use(errorHandler);

export default app;