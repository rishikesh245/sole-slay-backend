const express = require("express");
const router = express.Router();
const multer = require("multer");

const upload = require("../middleware/uploadMiddleware");
const authMiddleware = require("../middleware/authMiddleware");
const adminMiddleware = require("../middleware/adminMiddleware");
const { uploadImage, deleteImage } = require("../controllers/uploadController");

// Safe multer wrapper for error handling
const handleUpload = (req, res, next) => {
    upload.single("image")(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === "LIMIT_FILE_SIZE") {
                return res.status(400).json({
                    message: "File too large. Maximum allowed image size is 5MB."
                });
            }
            return res.status(400).json({
                message: `Upload error: ${err.message}`
            });
        } else if (err) {
            return res.status(400).json({
                message: err.message
            });
        }
        next();
    });
};

// Admin-only protected image upload
router.post(
    "/",
    authMiddleware,
    adminMiddleware,
    handleUpload,
    uploadImage
);

// Admin-only protected image deletion / cleanup
router.delete(
    "/",
    authMiddleware,
    adminMiddleware,
    deleteImage
);

module.exports = router;
