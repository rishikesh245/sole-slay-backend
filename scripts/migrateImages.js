require("dotenv").config();

const cloudinary = require("../config/cloudinary");
const path = require("path");

const { Product } = require("../models");


const imageFolder = path.join(
    __dirname,
    "..",
    "..",
    "frontend",
    "src",
    "assets",
    "image"
);


const images = [

    {
        oldName: "nike-air.jpg",
        fileName: "nike.jpg"
    },

    {
        oldName: "adidas-ultraboost.jpg",
        fileName: "adidas.webp"
    },

    {
        oldName: "puma-softride.jpg",
        fileName: "puma.webp"
    },

    {
        oldName: "reebok.avif",
        fileName: "reebok.avif"
    },

    {
        oldName: "newbalance.jpg",
        fileName: "newbalance.avif"
    },

    {
        oldName: "sparx.jpg",
        fileName: "sparx.avif"
    },

    {
        oldName: "campus.jpg",
        fileName: "campus.webp"
    },

    {
        oldName: "allensolly.jpg",
        fileName: "Allensolly.avif"
    }

];


const uploadImages = async () => {

    for (const image of images) {

        try {

            const imagePath = path.join(
                imageFolder,
                image.fileName
            );


            console.log(
                "\nUploading:",
                image.fileName
            );


            const products = await Product.findAll({
                where: {
                    image: image.oldName
                }
            });


            if (products.length === 0) {

                console.log(
                    "NO OLD PRODUCTS FOUND:",
                    image.oldName
                );

                continue;
            }


            const result = await cloudinary.uploader.upload(
                imagePath,
                {
                    folder: "sole-slay"
                }
            );


            console.log(
                "UPLOAD SUCCESS:",
                image.oldName
            );

            console.log(
                "Cloudinary URL:",
                result.secure_url
            );


            const [updatedCount] = await Product.update(
                {
                    image: result.secure_url
                },
                {
                    where: {
                        image: image.oldName
                    }
                }
            );


            console.log(
                "DATABASE UPDATED:",
                image.oldName,
                "→",
                updatedCount,
                "product(s)"
            );


        } catch (error) {

            console.error(
                "MIGRATION FAILED:",
                image.fileName
            );

            console.error(
                error.message
            );

        }

    }


    console.log("\nIMAGE MIGRATION COMPLETED");


};


uploadImages();