const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");

const { registerUser, loginUser } = require("../controllers/authController");

// Login Rate Limiter: Max 10 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many login attempts. Please try again after 15 minutes."
    }
});

// Registration Rate Limiter: Max 10 registrations per hour per IP
const registerLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    max: 10,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        message: "Too many accounts created from this IP. Please try again later."
    }
});

router.post("/register", registerLimiter, registerUser);
router.post("/login", loginLimiter, loginUser);

module.exports = router;
