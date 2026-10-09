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
                    folder: "sole-slay"
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
            imageUrl: result.secure_url
        });

    } catch (error) {

        console.error("IMAGE UPLOAD ERROR:", error);

        res.status(500).json({
            message: "Image upload failed"
        });
    }
};

module.exports = {
    uploadImage
};