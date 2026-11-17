const { Order, OrderItem, Product, ProductImage, User } = require("../models");
const sequelize = require("../config/database");

/**
 * =========================================================
 * CREATE ORDER (ACID Transaction + Pessimistic Row Locking)
 * =========================================================
 * Guarantees:
 * 1. ACID: Everything or nothing succeeds.
 * 2. Concurrency Safety: Row-level lock (`t.LOCK.UPDATE`) prevents overselling.
 * 3. Financial Integrity: Zero trust of client price/total; calculates from DB.
 * 4. Deadlock Prevention: Sorted product IDs ensure deterministic lock acquisition.
 * 5. Shoe Variant Tracking: Size is snapshot in order items.
 */
const createOrder = async (req, res) => {
  let transaction;

  try {
    const { name, email, mobile, address, items } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required to place an order." });
    }

    // 1. Basic Delivery Fields Validation
    if (!name?.trim() || !email?.trim() || !mobile?.trim() || !address?.trim()) {
      return res.status(400).json({
        message: "All delivery details (name, email, mobile, address) are required.",
      });
    }

    // 2. Validate Items Array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Your cart is empty. Please add items before checking out.",
      });
    }

    // 3. Validate Quantities & Structure
    for (const item of items) {
      const pid = Number(item.id);
      const qty = Number(item.quantity);

      if (!pid || !Number.isInteger(pid) || pid <= 0) {
        return res.status(400).json({
          message: "Invalid product ID in checkout payload.",
        });
      }

      if (!qty || !Number.isInteger(qty) || qty <= 0) {
        return res.status(400).json({
          message: `Invalid quantity for item ID ${item.id}. Quantity must be a positive integer.`,
        });
      }
    }

    // 4. Aggregate Demands per Product ID (handles same product ordered in different sizes)
    const aggregatedDemands = {};
    for (const item of items) {
      const pid = Number(item.id);
      aggregatedDemands[pid] = (aggregatedDemands[pid] || 0) + Number(item.quantity);
    }

    // 5. Sort Product IDs ascending to prevent deadlocks across concurrent transactions
    const sortedProductIds = Object.keys(aggregatedDemands)
      .map(Number)
      .sort((a, b) => a - b);

    // =======================================================
    // BEGIN DATABASE TRANSACTION
    // =======================================================
    transaction = await sequelize.transaction();

    // 6. Acquire Pessimistic Row Lock (SELECT ... FOR UPDATE)
    const lockedProducts = await Product.findAll({
      where: { id: sortedProductIds },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });

    // Verify all requested products exist
    if (lockedProducts.length !== sortedProductIds.length) {
      await transaction.rollback();
      return res.status(404).json({
        message: "One or more products in your cart are no longer available.",
      });
    }

    const productMap = new Map();
    lockedProducts.forEach((p) => productMap.set(p.id, p));

    // 7. Verify Inventory Availability Against Locked Rows
    for (const pid of sortedProductIds) {
      const product = productMap.get(pid);
      const totalDemand = aggregatedDemands[pid];

      if (product.stock < totalDemand) {
        await transaction.rollback();
        const available = Math.max(0, product.stock);
        return res.status(400).json({
          message:
            available === 0
              ? `Sorry, "${product.name}" is now completely out of stock.`
              : `Only ${available} pair(s) available for "${product.name}", but you requested ${totalDemand}.`,
        });
      }
    }

    // 8. Calculate Authoritative Prices and Build Order Items (NEVER TRUST CLIENT PRICE)
    let calculatedTotal = 0;
    const orderItemsToCreate = [];

    for (const item of items) {
      const product = productMap.get(Number(item.id));
      const authoritativePrice = Number(product.price);
      const qty = Number(item.quantity);
      const lineSubtotal = authoritativePrice * qty;

      calculatedTotal += lineSubtotal;

      orderItemsToCreate.push({
        product_id: product.id,
        product_name: product.name,
        size: String(item.size || item.selectedSize || "Standard").trim(),
        quantity: qty,
        price: authoritativePrice, // Real database price snapshot
      });
    }

    // 9. Atomically Deduct Stock from Locked Product Rows
    for (const pid of sortedProductIds) {
      const product = productMap.get(pid);
      const deductQty = aggregatedDemands[pid];

      await product.update(
        { stock: product.stock - deductQty },
        { transaction }
      );
    }

    // 10. Create Order Record with Backend-Calculated Total
    const order = await Order.create(
      {
        user_id: userId,
        name: name.trim(),
        email: email.trim(),
        mobile: mobile.trim(),
        address: address.trim(),
        total_amount: calculatedTotal.toFixed(2),
        status: "Confirmed",
      },
      { transaction }
    );

    // 11. Create OrderItem Records Linked to Order
    const populatedOrderItems = orderItemsToCreate.map((oi) => ({
      ...oi,
      order_id: order.id,
    }));

    await OrderItem.bulkCreate(populatedOrderItems, { transaction });

    // =======================================================
    // COMMIT TRANSACTION
    // =======================================================
    await transaction.commit();

    return res.status(201).json({
      message: "Order placed successfully",
      order: {
        id: order.id,
        total_amount: order.total_amount,
        status: order.status,
        created_at: order.createdAt,
        items_count: orderItemsToCreate.reduce((sum, it) => sum + it.quantity, 0),
      },
    });
  } catch (error) {
    if (transaction) {
      try {
        await transaction.rollback();
      } catch (rollbackErr) {
        console.error("TRANSACTION ROLLBACK ERROR:", rollbackErr);
      }
    }

    console.error("CREATE ORDER ERROR:", error);

    return res.status(500).json({
      message: "An unexpected error occurred while placing your order. No charges were made.",
    });
  }
};

/**
 * =========================================================
 * GET MY ORDERS (Authenticated Customer Isolation)
 * =========================================================
 */
const getMyOrders = async (req, res) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ message: "Authentication required." });
    }

    const orders = await Order.findAll({
      where: {
        user_id: userId,
      },
      order: [["id", "DESC"]],
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "name"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["image_url"],
                },
              ],
            },
          ],
        },
      ],
    });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("GET MY ORDERS ERROR:", error);
    return res.status(500).json({
      message: "Failed to fetch your orders. Please try again later.",
    });
  }
};

/**
 * =========================================================
 * GET ADMIN DASHBOARD STATS (Admin Only)
 * =========================================================
 */
const getAdminDashboardStats = async (req, res) => {
  try {
    const [productCount, orderCount, customerCount, totalSalesResult, recentOrders] =
      await Promise.all([
        Product.count(),
        Order.count(),
        User.count({ where: { role: "user" } }),
        Order.sum("total_amount"),
        Order.findAll({
          limit: 5,
          order: [["id", "DESC"]],
          include: [
            {
              model: OrderItem,
              attributes: ["id", "quantity", "price", "size", "product_name"],
            },
          ],
        }),
      ]);

    return res.status(200).json({
      productCount: productCount || 0,
      orderCount: orderCount || 0,
      customerCount: customerCount || 0,
      totalSales: Number(totalSalesResult || 0),
      recentOrders: recentOrders || [],
    });
  } catch (error) {
    console.error("GET ADMIN STATS ERROR:", error);
    return res.status(500).json({
      message: "Failed to retrieve dashboard statistics.",
    });
  }
};

/**
 * =========================================================
 * GET ALL ORDERS FOR ADMIN (Admin Only)
 * =========================================================
 */
const getAllOrdersAdmin = async (req, res) => {
  try {
    const orders = await Order.findAll({
      order: [["id", "DESC"]],
      include: [
        {
          model: OrderItem,
          include: [
            {
              model: Product,
              attributes: ["id", "name"],
              include: [
                {
                  model: ProductImage,
                  as: "images",
                  attributes: ["image_url"],
                },
              ],
            },
          ],
        },
      ],
    });

    return res.status(200).json(orders);
  } catch (error) {
    console.error("GET ALL ORDERS ADMIN ERROR:", error);
    return res.status(500).json({
      message: "Failed to retrieve customer orders.",
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getAdminDashboardStats,
  getAllOrdersAdmin,
};
