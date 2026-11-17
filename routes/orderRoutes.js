const express = require("express");
const router = express.Router();

const {
  createOrder,
  getMyOrders,
  getAdminDashboardStats,
  getAllOrdersAdmin
} = require("../controllers/orderController");

const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");

// Customer Order Endpoints
router.post("/", authMiddleware, createOrder);
router.get("/my-orders", authMiddleware, getMyOrders);

// Admin-Only Order Endpoints
router.get("/admin/stats", authMiddleware, adminMiddleware, getAdminDashboardStats);
router.get("/admin/all", authMiddleware, adminMiddleware, getAllOrdersAdmin);

module.exports = router;
