require("dotenv").config();
require("./models");

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const cloudinary = require("./config/cloudinary");
const sequelize = require("./config/database");

const indexRoute = require("./routes/indexRoute");
const orderRoutes = require("./routes/orderRoutes");

const app = express();

// =========================================================
// 1. HTTP SECURITY HEADERS (Helmet)
// =========================================================
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" } // Permits Cloudinary & static asset delivery
  })
);

// =========================================================
// 2. CORS RESTRICTIONS
// =========================================================
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  process.env.FRONTEND_URL
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, internal tests)
      if (!origin) return callback(null, true);

      if (
        allowedOrigins.includes(origin) ||
        process.env.NODE_ENV !== "production"
      ) {
        return callback(null, true);
      } else {
        return callback(new Error("CORS policy violation: Access denied from this origin."));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

// =========================================================
// 3. REQUEST BODY LIMITS (Anti-DoS)
// =========================================================
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// =========================================================
// 4. HEALTH CHECKS
// =========================================================
app.get("/api/test", (req, res) => {
  res.json({
    message: "Sole Slay Express is working"
  });
});

app.get("/api/cloudinary-test", async (req, res) => {
  try {
    const result = await cloudinary.api.ping();
    res.json({
      message: "Cloudinary connected successfully",
      result: result
    });
  } catch (error) {
    console.error("CLOUDINARY ERROR:", error);
    res.status(500).json({
      message: "Cloudinary connection failed"
    });
  }
});

// =========================================================
// 5. API ROUTES
// =========================================================
app.use("/api", indexRoute);
app.use("/orders", orderRoutes); // backward-compatibility alias

app.get("/", (req, res) => {
  res.send("Sole Slay API is running");
});

// =========================================================
// 6. GLOBAL ERROR HANDLING MIDDLEWARE (Leak Prevention)
// =========================================================
app.use((err, req, res, next) => {
  console.error("GLOBAL SERVER ERROR:", err);

  if (err.message && err.message.includes("CORS")) {
    return res.status(403).json({
      message: err.message
    });
  }

  if (err.type === "entity.too.large") {
    return res.status(413).json({
      message: "Payload too large. Maximum body size is 1MB."
    });
  }

  return res.status(500).json({
    message: "An internal server error occurred"
  });
});

// =========================================================
// 7. DATABASE & SERVER INITIALIZATION
// =========================================================
sequelize.authenticate()
  .then(() => {
    console.log("MySQL connected successfully");
    return sequelize.sync();
  })
  .then(() => {
    console.log("Database synced successfully");
  })
  .catch((error) => {
    console.error("Database connection failed:", error.message);
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
