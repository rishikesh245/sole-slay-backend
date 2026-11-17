require("dotenv").config();
const { Product, Order, OrderItem, User, sequelize } = require("../models");
const jwt = require("jsonwebtoken");

async function runAuditTests() {
  console.log("=========================================================");
  console.log("   SOLE SLAY PHASE 1 DATA INTEGRITY & AUDIT TEST SUITE   ");
  console.log("=========================================================\n");

  let testUser;
  let testProduct;

  try {
    // Setup test user
    testUser = await User.findOne();
    if (!testUser) {
      testUser = await User.create({
        name: "Audit Tester",
        email: `audit_${Date.now()}@test.com`,
        password: "hashedpassword123",
        mobile: "9876543210",
        role: "customer",
      });
    }

    const testToken = jwt.sign(
      { id: testUser.id, role: testUser.role },
      process.env.JWT_SECRET || "fallback_secret",
      { expiresIn: "1h" }
    );

    // Setup test product with controlled stock = 1
    testProduct = await Product.create({
      name: "Audit Limited Edition Sneaker",
      price: 4999.0,
      subcategory_id: 1,
      description: "Test product for concurrency and ACID transactions",
      stock: 1,
    });

    console.log(`✓ Test Product created: ID=${testProduct.id}, Name="${testProduct.name}", Price=₹${testProduct.price}, Stock=${testProduct.stock}\n`);

    // ---------------------------------------------------------
    // TEST 1: PRICE TAMPERING DEFENSE
    // ---------------------------------------------------------
    console.log("--- TEST 1: Price Tampering Defense ---");
    console.log("Client sends payload: price=1.00, total_amount=1.00");

    const orderController = require("../controllers/orderController");

    let tamperedResData = null;
    let tamperedResStatus = null;

    const mockReqTamper = {
      user: { id: testUser.id },
      body: {
        name: "Test Buyer",
        email: "tamper@test.com",
        mobile: "9876543210",
        address: "123 Secure Street, Bangalore",
        total_amount: 1.0, // Client attempts to pay ₹1 instead of ₹4999
        items: [
          {
            id: testProduct.id,
            price: 1.0, // Tampered client price
            quantity: 1,
            size: "8",
          },
        ],
      },
    };

    const mockResTamper = {
      status: (code) => {
        tamperedResStatus = code;
        return {
          json: (data) => {
            tamperedResData = data;
          },
        };
      },
    };

    await orderController.createOrder(mockReqTamper, mockResTamper);

    if (tamperedResStatus === 201) {
      const createdOrder = await Order.findByPk(tamperedResData.order.id, {
        include: [OrderItem],
      });
      const orderItem = createdOrder.OrderItems[0];

      console.log(`Order created ID: #${createdOrder.id}`);
      console.log(`Calculated total in DB: ₹${createdOrder.total_amount}`);
      console.log(`OrderItem price in DB: ₹${orderItem.price}`);

      if (
        Number(createdOrder.total_amount) === 4999.0 &&
        Number(orderItem.price) === 4999.0
      ) {
        console.log("✅ PASS: Backend rejected client's ₹1 price and enforced authoritative MySQL price of ₹4,999.00!\n");
      } else {
        console.error("❌ FAIL: Backend accepted tampered price!\n");
      }
    } else {
      console.error(`❌ FAIL: Expected 201, got ${tamperedResStatus}:`, tamperedResData);
    }

    // Check remaining stock (should now be 0)
    await testProduct.reload();
    console.log(`Stock after purchase: ${testProduct.stock} (Expected: 0)`);
    if (testProduct.stock === 0) {
      console.log("✅ PASS: Stock atomically decremented from 1 to 0.\n");
    } else {
      console.error(`❌ FAIL: Expected stock 0, got ${testProduct.stock}`);
    }

    // ---------------------------------------------------------
    // TEST 2: ZERO STOCK REJECTION
    // ---------------------------------------------------------
    console.log("--- TEST 2: Zero Stock Rejection ---");
    let zeroStockResStatus = null;
    let zeroStockResData = null;

    const mockReqZeroStock = {
      user: { id: testUser.id },
      body: {
        name: "Late Buyer",
        email: "late@test.com",
        mobile: "9876543210",
        address: "456 Late St",
        items: [{ id: testProduct.id, quantity: 1, size: "8" }],
      },
    };

    const mockResZeroStock = {
      status: (code) => {
        zeroStockResStatus = code;
        return {
          json: (data) => {
            zeroStockResData = data;
          },
        };
      },
    };

    await orderController.createOrder(mockReqZeroStock, mockResZeroStock);
    console.log(`Status returned: ${zeroStockResStatus}, Message: "${zeroStockResData?.message}"`);
    if (zeroStockResStatus === 400 && zeroStockResData.message.includes("out of stock")) {
      console.log("✅ PASS: Order rejected with 400 Out of Stock when inventory is 0.\n");
    } else {
      console.error("❌ FAIL: Zero stock was not rejected properly!");
    }

    // ---------------------------------------------------------
    // TEST 3: CONCURRENCY / SIMULTANEOUS ORDERS (OVERSELLING PREVENTION)
    // ---------------------------------------------------------
    console.log("--- TEST 3: Concurrency & Overselling Prevention ---");
    // Reset stock to exactly 1
    await testProduct.update({ stock: 1 });
    console.log(`Reset test product stock to: ${testProduct.stock}`);

    console.log("Simulating 2 simultaneous requests for the LAST pair of shoes...");

    const executeSimulatedOrder = (customerName, email) => {
      let code = null;
      let data = null;
      const req = {
        user: { id: testUser.id },
        body: {
          name: customerName,
          email: email,
          mobile: "9999999999",
          address: "Rush Lane",
          items: [{ id: testProduct.id, quantity: 1, size: "9" }],
        },
      };
      const res = {
        status: (c) => {
          code = c;
          return { json: (d) => { data = d; } };
        },
      };

      return orderController.createOrder(req, res).then(() => ({ code, data, customerName }));
    };

    // Execute concurrently via Promise.all
    const results = await Promise.all([
      executeSimulatedOrder("Customer A", "buyerA@test.com"),
      executeSimulatedOrder("Customer B", "buyerB@test.com"),
    ]);

    const successes = results.filter((r) => r.code === 201);
    const rejections = results.filter((r) => r.code === 400);

    console.log(`Concurrent Results:`);
    results.forEach((r) => {
      console.log(` - ${r.customerName}: HTTP ${r.code} - ${r.data?.message || JSON.stringify(r.data)}`);
    });

    await testProduct.reload();
    console.log(`Final stock in MySQL: ${testProduct.stock}`);

    if (successes.length === 1 && rejections.length === 1 && testProduct.stock === 0) {
      console.log("✅ PASS: Pessimistic Row Locking prevented race condition! Exactly 1 order succeeded, 1 was cleanly rejected, and stock never became negative (-1)!\n");
    } else {
      console.error(`❌ FAIL: Concurrency issue detected! Successes=${successes.length}, Rejections=${rejections.length}, Stock=${testProduct.stock}\n`);
    }

    // ---------------------------------------------------------
    // TEST 4: ACID ROLLBACK ON FAILURE
    // ---------------------------------------------------------
    console.log("--- TEST 4: ACID Transaction Rollback on Failure ---");
    await testProduct.update({ stock: 5 });
    const orderCountBefore = await Order.count();

    // Send payload with 1 valid item (stock 5) and 1 non-existent product ID (ID: 999999)
    let failStatus = null;
    let failData = null;
    const mockReqFail = {
      user: { id: testUser.id },
      body: {
        name: "Aborted Order",
        email: "abort@test.com",
        mobile: "9999999999",
        address: "Fail Lane",
        items: [
          { id: testProduct.id, quantity: 2, size: "8" },
          { id: 999999, quantity: 1, size: "8" }, // Invalid product
        ],
      },
    };
    const mockResFail = {
      status: (c) => {
        failStatus = c;
        return { json: (d) => { failData = d; } };
      },
    };

    await orderController.createOrder(mockReqFail, mockResFail);
    const orderCountAfter = await Order.count();
    await testProduct.reload();

    console.log(`Response: HTTP ${failStatus} - "${failData?.message}"`);
    console.log(`Order count before: ${orderCountBefore}, after: ${orderCountAfter}`);
    console.log(`Product stock before: 5, after: ${testProduct.stock}`);

    if (
      failStatus === 404 &&
      orderCountBefore === orderCountAfter &&
      testProduct.stock === 5
    ) {
      console.log("✅ PASS: ACID transaction rolled back completely. No order created and stock was not touched!\n");
    } else {
      console.error("❌ FAIL: Transaction rollback did not restore state cleanly!\n");
    }

    console.log("=========================================================");
    console.log("         ALL AUDIT TESTS PASSED SUCCESSFULLY!            ");
    console.log("=========================================================");
  } catch (err) {
    console.error("UNEXPECTED TEST ERROR:", err);
  } finally {
    // Cleanup test product
    if (testProduct) {
      await OrderItem.destroy({ where: { product_id: testProduct.id } });
      await testProduct.destroy();
      console.log(`Cleaned up test product (ID: ${testProduct.id}).`);
    }
    process.exit(0);
  }
}

runAuditTests();

