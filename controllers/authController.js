const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { Op } = require("sequelize");
const { User } = require("../models");

// RFC-compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
// Mobile regex: 10 to 15 digits
const MOBILE_REGEX = /^\d{10,15}$/;

/**
 * =========================================================
 * REGISTER USER
 * =========================================================
 * - Validates input types and constraints strictly
 * - Hashes password using bcrypt with 10 salt rounds
 * - Prevents duplicate registrations
 * - Never returns password or internal database errors
 */
const registerUser = async (req, res) => {
    try {
        const { name, email, mobile, password } = req.body;

        // 1. Validate Name
        if (!name || typeof name !== "string" || !name.trim()) {
            return res.status(400).json({
                message: "Name is required and must be valid text"
            });
        }
        if (name.trim().length > 100) {
            return res.status(400).json({
                message: "Name cannot exceed 100 characters"
            });
        }

        // 2. Validate Password
        if (!password || typeof password !== "string") {
            return res.status(400).json({
                message: "Password is required"
            });
        }
        if (password.length < 8) {
            return res.status(400).json({
                message: "Password must be at least 8 characters long"
            });
        }
        if (password.length > 128) {
            return res.status(400).json({
                message: "Password cannot exceed 128 characters"
            });
        }

        // 3. Ensure at least one contact method
        if (!email && !mobile) {
            return res.status(400).json({
                message: "Email or mobile number is required"
            });
        }

        // 4. Validate and sanitize Email
        let sanitizedEmail = null;
        if (email) {
            if (typeof email !== "string" || !EMAIL_REGEX.test(email.trim())) {
                return res.status(400).json({
                    message: "Invalid email address format"
                });
            }
            sanitizedEmail = email.trim().toLowerCase();

            const existingEmail = await User.findOne({
                where: { email: sanitizedEmail }
            });

            if (existingEmail) {
                return res.status(400).json({
                    message: "Email is already registered"
                });
            }
        }

        // 5. Validate and sanitize Mobile
        let sanitizedMobile = null;
        if (mobile) {
            const mobileStr = String(mobile).trim();
            if (!MOBILE_REGEX.test(mobileStr)) {
                return res.status(400).json({
                    message: "Invalid mobile number. Must be between 10 and 15 digits"
                });
            }
            sanitizedMobile = mobileStr;

            const existingMobile = await User.findOne({
                where: { mobile: sanitizedMobile }
            });

            if (existingMobile) {
                return res.status(400).json({
                    message: "Mobile number is already registered"
                });
            }
        }

        // 6. Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // 7. Create user
        const user = await User.create({
            name: name.trim(),
            email: sanitizedEmail,
            mobile: sanitizedMobile,
            password: hashedPassword,
            role: "user"
        });

        return res.status(201).json({
            message: "User registered successfully",
            userId: user.id
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);
        return res.status(500).json({
            message: "Registration failed due to an internal server error"
        });
    }
};

/**
 * =========================================================
 * LOGIN USER
 * =========================================================
 * - Accepts email or mobile
 * - Constant-time comparison via bcrypt
 * - Safe generic authentication error messages
 * - Issues signed JWT containing { id, role }
 */
const loginUser = async (req, res) => {
    try {
        const { identifier, password } = req.body;

        if (!identifier || typeof identifier !== "string" || !identifier.trim() ||
            !password || typeof password !== "string") {
            return res.status(400).json({
                message: "Email/mobile and password are required"
            });
        }

        const cleanIdentifier = identifier.trim();

        // Find user by normalized email or mobile
        const user = await User.findOne({
            where: {
                [Op.or]: [
                    { email: cleanIdentifier.toLowerCase() },
                    { mobile: cleanIdentifier }
                ]
            }
        });

        // Constant generic failure response to avoid account enumeration
        if (!user) {
            return res.status(401).json({
                message: "Invalid email/mobile or password"
            });
        }

        const passwordMatch = await bcrypt.compare(password, user.password);

        if (!passwordMatch) {
            return res.status(401).json({
                message: "Invalid email/mobile or password"
            });
        }

        // Issue token
        const token = jwt.sign(
            {
                id: user.id,
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "1d"
            }
        );

        return res.status(200).json({
            message: "Login successful",
            token: token,
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                mobile: user.mobile,
                role: user.role
            }
        });

    } catch (error) {
        console.error("LOGIN ERROR:", error);
        return res.status(500).json({
            message: "Login failed due to an internal server error"
        });
    }
};

module.exports = {
    registerUser,
    loginUser
};
