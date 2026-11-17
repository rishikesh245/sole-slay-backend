const cloudinary = require("../config/cloudinary");

const uploadImage = async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({
                message: "No image uploaded"
            });
        }

        const result = await new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: "sole-slay",
                    resource_type: "image",
                    allowed_formats: ["jpg", "jpeg", "png", "webp"]
                },
                (error, result) => {
                    if (error) {
                        reject(error);
                    } else {
                        resolve(result);
                    }
                }
            );

            uploadStream.end(req.file.buffer);
        });

        res.status(200).json({
            message: "Image uploaded successfully",
            imageUrl: result.secure_url,
            publicId: result.public_id
        });

    } catch (error) {
        console.error("IMAGE UPLOAD ERROR:", error);
        res.status(500).json({
            message: "Image upload failed"
        });
    }
};

const deleteImage = async (req, res) => {
    try {
        const { publicId } = req.body;

        if (!publicId || typeof publicId !== "string") {
            return res.status(400).json({
                message: "A valid publicId string is required for asset deletion"
            });
        }

        const result = await cloudinary.uploader.destroy(publicId);

        if (result.result !== "ok") {
            return res.status(400).json({
                message: "Failed to delete image from Cloudinary",
                result
            });
        }

        res.status(200).json({
            message: "Image deleted successfully",
            result
        });
    } catch (error) {
        console.error("IMAGE DELETION ERROR:", error);
        res.status(500).json({
            message: "Failed to delete image due to an internal server error"
        });
    }
};

module.exports = {
    uploadImage,
    deleteImage
};
