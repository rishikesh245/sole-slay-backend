require("dotenv").config();
require("./models");

const express = require("express");
const cors = require("cors");

const cloudinary = require("./config/cloudinary");

const sequelize = require("./config/database");
const Product = require("./models/Product");

const indexRoute = require("./routes/indexRoute");
const orderRoutes = require("./routes/orderRoutes");

const app = express();


// image upload route

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

app.use(cors());
app.use(express.json());

app.get("/api/test", (req, res) => {
  res.json({
    message: "Sole Slay Express is working"
  });
});



app.use("/api", indexRoute);
app.use("/orders", orderRoutes);

app.get("/", (req, res) => {
  res.send("Sole Slay API is running");
});


sequelize.authenticate()
  .then(() => {
    console.log("MySQL connected successfully");
    return sequelize.sync();
  })

  .then(() => {
    console.log("Database synced successfully");
  })

  .catch((error) => {
    console.log("Database connection failed:", error.message);
  });

app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});