const express = require("express");

const router = express.Router();

const productRoutes = require("./productRoutes");
const authRoutes = require("./authRoutes");
const orderRoutes = require("./orderRoutes");
const uploadRoutes = require("./uploadRoutes");


router.use("/products", productRoutes);
router.use("/auth", authRoutes);
router.use("/orders", orderRoutes);
router.use("/upload", uploadRoutes);

module.exports = router;
