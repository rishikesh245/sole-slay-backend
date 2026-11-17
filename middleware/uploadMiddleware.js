const multer = require("multer");

const storage = multer.memoryStorage();

const ALLOWED_MIME_TYPES = [
    "image/jpeg",
    "image/png",
    "image/webp"
];

const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error("Invalid file type. Only JPEG, PNG, and WebP images are permitted."), false);
    }
};

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: fileFilter
});

module.exports = upload;
