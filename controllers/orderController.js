
const { Order, OrderItem, Product, ProductImage } = require("../models");

const createOrder = async (req, res) => {

    try {

        const {
            name,
            email,
            mobile,
            address,
            total_amount,
            items
        } = req.body;


        if (
            !name ||
            !email ||
            !mobile ||
            !address ||
            !total_amount ||
            !items ||
            items.length === 0
        ) {

            return res.status(400).json({
                message: "All fields are required"
            });

        }


          for (const item of items) {

            const product = await Product.findByPk(item.id);

            if (!product) {

                return res.status(404).json({
                    message: `${item.name} not found`
                });

            }

            if (product.stock < item.quantity) {

                return res.status(400).json({
                    message:
                        `${item.name} has only ${product.stock} items left`
                });

            }
        }



        const order = await Order.create({

            user_id: req.user.id,

            name: name,
            email: email,
            mobile: mobile,
            address: address,
            total_amount: total_amount

        });


        const orderItems = items.map((item) => ({

            order_id: order.id,

            product_id: item.id,

            product_name: item.name,

            quantity: item.quantity,

            price: item.price

        }));


        await OrderItem.bulkCreate(orderItems);

          // =========================================
        // REDUCE PRODUCT STOCK
        // =========================================

        for (const item of items) {

            const product = await Product.findByPk(item.id);

            await product.update({

                stock: product.stock - item.quantity

            });

        }


        res.status(201).json({

            message: "Order placed successfully",

            order: order

        });


    } catch (error) {

        console.error("CREATE ORDER ERROR:", error);

        res.status(500).json({

            message: "Failed to create order"

        });

    }
};


const getMyOrders = async (req, res) => {
    try {

        const orders = await Order.findAll({
            where: {
                user_id: req.user.id
            },
            include: [
                {
                    model: OrderItem,
                    include: [
                        {
                            model: Product,
                            include: [
                                {
                                   model: ProductImage,
                                   as: "images" 
                                }
                            ]
                        }
                    ]
                }
            ]
        });

        res.status(200).json(orders);

    } catch (error) {

        console.error("GET MY ORDERS ERROR:", error);

        res.status(500).json({
            message: "Failed to fetch orders"
        });
    }
};


module.exports = {
    createOrder,
    getMyOrders
};

