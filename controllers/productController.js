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
        res.status(500).json({
            message: "Error fetching products",
            error: error.message
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
            !price ||
            !subcategory_id
        ) {
            return res.status(400).json({
                message: "Name, price and subcategory are required"
            });
        }


        // CHECK IMAGES
        if (
            !images ||
            !Array.isArray(images) ||
            images.length < 3
        ) {
            return res.status(400).json({
                message: "At least 3 images are required"
            });
        }


        // CREATE PRODUCT
        const product = await Product.create({

            name: name,

            price: price,

            subcategory_id: subcategory_id,

            description: description,

            stock: stock

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

            message: "Failed to create product",

            error: error.message

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
        res.status(500).json({
            message: error.message
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


        // =========================================
        // UPDATE PRODUCT DETAILS
        // =========================================

        await product.update({

            name: req.body.name,

            price: req.body.price,

            subcategory_id:
                req.body.subcategory_id,

            description:
                req.body.description,

            stock:
                req.body.stock

        });


        // =========================================
        // UPDATE PRODUCT IMAGES
        // =========================================
       if (Array.isArray(req.body.images)) {

    // At least 3 images are required

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

    const imageRecords =
        req.body.images.map((imageUrl) => ({

            product_id: product.id,

            image_url: imageUrl

        }));


    // Save new images

    await ProductImage.bulkCreate(
        imageRecords
    );

}
        

        // =========================================
        // RESPONSE
        // =========================================

        const updatedProduct =
            await Product.findByPk(
                product.id,
                {
                    include: [
                        {
                            model: ProductImage,
                            as: "images"
                        }
                    ]
                }
            );


        res.status(200).json(
            updatedProduct
        );


    } catch (error) {

        console.error(
            "========== UPDATE PRODUCT ERROR =========="
        );

        console.error(error);

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "=========================================="
        );


        res.status(500).json({

            message: error.message

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

        console.error(
            "========== DELETE PRODUCT ERROR =========="
        );

        console.error(error);

        console.error(
            "MESSAGE:",
            error.message
        );

        console.error(
            "=========================================="
        );


        res.status(500).json({
            message: error.message
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