const {
  Product,
  ProductImage,
  Subcategory,
  Category
} = require("../models");



const getProducts = async (req, res) => {
    try {

        const { category, subcategory } = req.query;

        const products = await Product.findAll({
            include:[
             {
                model: Subcategory,
                required: !!(category || subcategory),
                where: subcategory
                    ? { id: subcategory }
                    : undefined,

                include: {
                    model: Category,
                    required: !!category,
                    where: category
                        ? { id: category }
                        : undefined
                }
            },
            {
                model: ProductImage,
                as: "images"
            }
        ]
        });

        res.status(200).json(products);

    } catch (error) {
        console.error("GET PRODUCTS ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch products"
        });
    }
};

//create product

const createProduct = async (req, res) => {
    try {

        const {
            name,
            price,
            subcategory_id,
            description,
            stock,
            images
        } = req.body;


        // CHECK PRODUCT DETAILS
        if (
            !name ||
            typeof name !== "string" ||
            !name.trim() ||
            price === undefined ||
            price === null ||
            !subcategory_id
        ) {
            return res.status(400).json({
                message: "Name, price and subcategory are required"
            });
        }

        const numPrice = Number(price);
        if (isNaN(numPrice) || numPrice < 0) {
            return res.status(400).json({
                message: "Price must be a valid non-negative number"
            });
        }

        const numStock = Number(stock !== undefined && stock !== "" ? stock : 0);
        if (!Number.isInteger(numStock) || numStock < 0) {
            return res.status(400).json({
                message: "Stock must be a non-negative integer"
            });
        }

        const subcatId = Number(subcategory_id);
        if (!Number.isInteger(subcatId) || subcatId <= 0) {
            return res.status(400).json({
                message: "Valid subcategory ID is required"
            });
        }

        // CHECK IMAGES
        if (
            !images ||
            !Array.isArray(images) ||
            images.length < 3 ||
            !images.every(url => typeof url === "string" && url.startsWith("http"))
        ) {
            return res.status(400).json({
                message: "At least 3 valid image URLs are required"
            });
        }

        // CREATE PRODUCT
        const product = await Product.create({
            name: name.trim(),
            price: numPrice,
            subcategory_id: subcatId,
            description: description ? String(description).trim() : "",
            stock: numStock
        });

        // CREATE PRODUCT IMAGES
        const productImages = images.map((url) => ({
            product_id: product.id,
            image_url: url
        }));

        await ProductImage.bulkCreate(productImages);

        // RESPONSE
        res.status(201).json({
            message: "Product created successfully",
            product: product,
            images: productImages
        });

    } catch (error) {
        console.error("CREATE PRODUCT ERROR:", error);
        res.status(500).json({
            message: "Failed to create product"
        });
    }
};
                   //****//
                   

const getProductById = async (req, res) => {
    try {

        const product = await Product.findByPk(req.params.id, {
            include:[
             {
                model: Subcategory,
                include: {
                    model: Category
                }
            },
            {
                model: ProductImage,
                as:"images"
            }
        ]
        });

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        res.status(200).json(product);

    } catch (error) {
        console.error("GET PRODUCT BY ID ERROR:", error);
        res.status(500).json({
            message: "Failed to fetch product details"
        });
    }
};

const updateProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        const updateData = {};
        if (req.body.name !== undefined) {
            if (typeof req.body.name !== "string" || !req.body.name.trim()) {
                return res.status(400).json({ message: "Name must be non-empty text" });
            }
            updateData.name = req.body.name.trim();
        }

        if (req.body.price !== undefined) {
            const numPrice = Number(req.body.price);
            if (isNaN(numPrice) || numPrice < 0) {
                return res.status(400).json({ message: "Price must be a valid non-negative number" });
            }
            updateData.price = numPrice;
        }

        if (req.body.subcategory_id !== undefined) {
            const subcatId = Number(req.body.subcategory_id);
            if (!Number.isInteger(subcatId) || subcatId <= 0) {
                return res.status(400).json({ message: "Valid subcategory ID is required" });
            }
            updateData.subcategory_id = subcatId;
        }

        if (req.body.stock !== undefined) {
            const numStock = Number(req.body.stock);
            if (!Number.isInteger(numStock) || numStock < 0) {
                return res.status(400).json({ message: "Stock must be a non-negative integer" });
            }
            updateData.stock = numStock;
        }

        if (req.body.description !== undefined) {
            updateData.description = String(req.body.description).trim();
        }

        // =========================================
        // UPDATE PRODUCT DETAILS
        // =========================================
        await product.update(updateData);

        // =========================================
        // UPDATE PRODUCT IMAGES
        // =========================================
        if (Array.isArray(req.body.images)) {
            if (req.body.images.length < 3) {
                return res.status(400).json({
                    message: "At least 3 images are required"
                });
            }

            // Delete old images
            await ProductImage.destroy({
                where: {
                    product_id: product.id
                }
            });

            // Create new image records
            const imageRecords = req.body.images.map((imageUrl) => ({
                product_id: product.id,
                image_url: imageUrl
            }));

            await ProductImage.bulkCreate(imageRecords);
        }

        // =========================================
        // RESPONSE
        // =========================================
        const updatedProduct = await Product.findByPk(product.id, {
            include: [
                {
                    model: ProductImage,
                    as: "images"
                }
            ]
        });

        res.status(200).json(updatedProduct);

    } catch (error) {
        console.error("UPDATE PRODUCT ERROR:", error);
        res.status(500).json({
            message: "Failed to update product"
        });
    }
};

const deleteProduct = async (req, res) => {
    try {
        const product = await Product.findByPk(req.params.id);

        if (!product) {
            return res.status(404).json({
                message: "Product not found"
            });
        }

        // Delete product images first
        await ProductImage.destroy({
            where: {
                product_id: product.id
            }
        });

        // Delete product
        await product.destroy();

        res.status(200).json({
            message: "Product deleted successfully"
        });

    } catch (error) {
        console.error("DELETE PRODUCT ERROR:", error);
        res.status(500).json({
            message: "Failed to delete product"
        });
    }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct
};