import dotenv from "dotenv";
dotenv.config();

import express from "express";
import { db } from "./db/config.js";
import { mainRouter } from "./src/api/routes.js";
import { errorHandler } from "./src/middleware/error-handler.js";
import cors from "cors";

const app = express();
const port = Number(process.env.PORT) || 3777;

// Trust the first proxy hop (required on Render / any reverse-proxy host)
// so express-rate-limit can read X-Forwarded-For correctly.
app.set('trust proxy', 1);

// Middleware
app.use(cors({
  origin: ["http://localhost:5173","https://ai-powered-forum-project.vercel.app","https://evangadi-forum.tesfaworku.com", "http://localhost:3000","https://ai-powered-forum-project-g4.onrender.com"],
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static uploads
app.use('/uploads', express.static('uploads'));


// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date() });
});

// Readiness check - verifies DB connectivity
app.get("/ready", async (req, res) => {
  try {
    const conn = await db.getConnection();
    conn.release();
    return res.json({ ready: true, db: "connected" });
  } catch (err) {
    return res
      .status(503)
      .json({ ready: false, db: "disconnected", error: err.message });
  }
});

app.use("/api", mainRouter);

app.use(errorHandler);

// Start server
const startServer = async () => {
  try {
    // Test database connection
    const connection = await db.getConnection();

    console.log("Database connection established successfully.");
    connection.release();

    app.listen(port, (err) => {
      if (err) {
        console.error("Failed to start the server:", err.message);
        process.exit(1);
      }
      console.log(`Server running on port http://localhost:${port}`);
    });
  } catch (error) {
    console.error("Failed to connect to the database. Server not started.");
    console.error(error);
    process.exit(1);
  }
};

startServer();
