const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runE2ETestSuite() {
  console.log("\n==================================================================");
  console.log("      SOLE SLAY END-TO-END AUTOMATED TEST & QUALITY SUITE         ");
  console.log("==================================================================\n");

  let passed = 0;
  let total = 0;

  function assert(condition, testName, details = "") {
    total++;
    if (condition) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
    }
  }

  const timestamp = Date.now();
  const testCustomer = {
    name: "Automation QA User",
    email: `qa_shopper_${timestamp}@example.com`,
    mobile: `98${String(timestamp).slice(-8)}`,
    password: "Password123!Safe"
  };

  let customerToken = null;
  let customerId = null;
  let sampleProduct = null;
  let createdOrderId = null;
  let adminCreatedProductId = null;

  const adminToken = jwt.sign(
    { id: 1, role: "admin" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "1h" }
  );

  // -------------------------------------------------------------------------
  // 1. CUSTOMER REGISTRATION
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testCustomer)
    });
    const body = await res.json();
    assert(
      res.status === 201 && body.userId,
      "Workflow 1: Customer Registration with format validation",
      `Status ${res.status}: ${JSON.stringify(body)}`
    );
    customerId = body.userId;
  } catch (err) {
    assert(false, "Workflow 1: Customer Registration", err.message);
  }

  // -------------------------------------------------------------------------
  // 2. CUSTOMER AUTHENTICATION & JWT GENERATION
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: testCustomer.email,
        password: testCustomer.password
      })
    });
    const body = await res.json();
    customerToken = body.token;
    assert(
      res.status === 200 && customerToken && !body.user.password,
      "Workflow 2: Customer Authentication & Secure JWT Issuance (No password leakage)",
      `Status ${res.status}: ${JSON.stringify(body)}`
    );
  } catch (err) {
    assert(false, "Workflow 2: Customer Authentication", err.message);
  }

  // -------------------------------------------------------------------------
  // 3. CATALOG BROWSING & CATEGORY FILTERING
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const products = await res.json();
    sampleProduct = products.find(p => p.stock > 0) || products[0];
    assert(
      res.status === 200 && Array.isArray(products) && products.length > 0 && sampleProduct,
      `Workflow 3: Catalog Retrieval from MySQL (${products.length} live products)`,
      `Status ${res.status}`
    );
  } catch (err) {
    assert(false, "Workflow 3: Catalog Retrieval", err.message);
  }

  // -------------------------------------------------------------------------
  // 4. PRODUCT DETAILS & VARIANT RETRIEVAL
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/products/${sampleProduct.id}`);
    const product = await res.json();
    assert(
      res.status === 200 && product.id === sampleProduct.id && Array.isArray(product.images),
      `Workflow 4: Product Variant & Details Inspection (Shoe ID #${product.id}: "${product.name}")`,
      `Status ${res.status}`
    );
  } catch (err) {
    assert(false, "Workflow 4: Product Variant Inspection", err.message);
  }

  // -------------------------------------------------------------------------
  // 5. SECURE CHECKOUT WITH PRICE TAMPERING DEFENSE & ACID TRANSACTION
  // -------------------------------------------------------------------------
  try {
    const tamperedPayload = {
      name: testCustomer.name,
      email: testCustomer.email,
      mobile: testCustomer.mobile,
      address: "100 QA Automation Way, Tech Park",
      items: [
        {
          id: sampleProduct.id,
          quantity: 1,
          size: "9",
          price: 1.00 // Client attempted to pay ₹1.00
        }
      ]
    };

    const res = await fetch(`${BASE_URL}/api/orders`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify(tamperedPayload)
    });
    const body = await res.json();
    createdOrderId = body.order?.id;
    const chargedTotal = Number(body.order?.total_amount);
    const authoritativePrice = Number(sampleProduct.price);

    assert(
      res.status === 201 && createdOrderId && chargedTotal === authoritativePrice,
      `Workflow 5: ACID Order Creation & Price Tampering Defense (Enforced MySQL price ₹${authoritativePrice.toFixed(2)} vs client ₹1.00)`,
      `Status ${res.status}: Total charged = ₹${chargedTotal}`
    );
  } catch (err) {
    assert(false, "Workflow 5: Checkout & Order Creation", err.message);
  }

  // -------------------------------------------------------------------------
  // 6. CUSTOMER ORDER HISTORY ISOLATION
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const orders = await res.json();
    const foundOrder = orders.find(o => o.id === createdOrderId);
    const allBelongToCustomer = orders.every(o => o.user_id === customerId);

    assert(
      res.status === 200 && foundOrder && allBelongToCustomer,
      `Workflow 6: Customer Order History Verification (Retrieved Order #${createdOrderId} for User #${customerId})`,
      `Status ${res.status}`
    );
  } catch (err) {
    assert(false, "Workflow 6: Order History Verification", err.message);
  }

  // -------------------------------------------------------------------------
  // 7. AUTHORIZATION PRIVILEGE BOUNDARY CHECKS
  // -------------------------------------------------------------------------
  try {
    const [createProdRes, statsRes] = await Promise.all([
      fetch(`${BASE_URL}/api/products`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${customerToken}`
        },
        body: JSON.stringify({ name: "Unauthorized Shoe", price: 100 })
      }),
      fetch(`${BASE_URL}/api/orders/admin/stats`, {
        headers: { Authorization: `Bearer ${customerToken}` }
      })
    ]);

    assert(
      createProdRes.status === 403 && statsRes.status === 403,
      "Workflow 7: Authorization Boundary strictly blocks customers from Admin endpoints (Both HTTP 403)",
      `createProd: ${createProdRes.status}, stats: ${statsRes.status}`
    );
  } catch (err) {
    assert(false, "Workflow 7: Authorization Boundary Check", err.message);
  }

  // -------------------------------------------------------------------------
  // 8. ADMIN DASHBOARD LIVE METRICS
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/orders/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stats = await res.json();
    assert(
      res.status === 200 &&
        stats.productCount > 0 &&
        stats.orderCount > 0 &&
        stats.customerCount > 0 &&
        stats.totalSales > 0,
      `Workflow 8: Admin Dashboard Statistics (${stats.productCount} products, ${stats.orderCount} orders, ₹${stats.totalSales.toLocaleString("en-IN")} sales)`,
      `Status ${res.status}`
    );
  } catch (err) {
    assert(false, "Workflow 8: Admin Dashboard Stats", err.message);
  }

  // -------------------------------------------------------------------------
  // 9. ADMIN PRODUCT LIFECYCLE: CREATE & UPDATE
  // -------------------------------------------------------------------------
  try {
    // A. Create product
    const createRes = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        name: `Automated QA Sneaker ${timestamp}`,
        price: 3499.00,
        subcategory_id: 1,
        stock: 15,
        description: "Created by automated QA engineer test suite",
        images: [
          "https://example.com/shoe1.png",
          "https://example.com/shoe2.png",
          "https://example.com/shoe3.png"
        ]
      })
    });
    const createBody = await createRes.json();
    adminCreatedProductId = createBody.product?.id;

    // B. Update product stock and price
    const updateRes = await fetch(`${BASE_URL}/api/products/${adminCreatedProductId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${adminToken}`
      },
      body: JSON.stringify({
        price: 3999.00,
        stock: 20
      })
    });
    const updateBody = await updateRes.json();

    assert(
      createRes.status === 201 &&
        updateRes.status === 200 &&
        Number(updateBody.price) === 3999.00 &&
        updateBody.stock === 20,
      `Workflow 9: Admin Product Lifecycle Create & Update (ID #${adminCreatedProductId}: Price ₹3499 -> ₹3999, Stock 15 -> 20)`,
      `Create status: ${createRes.status}, Update status: ${updateRes.status}`
    );
  } catch (err) {
    assert(false, "Workflow 9: Admin Product Create/Update", err.message);
  }

  // -------------------------------------------------------------------------
  // 10. ADMIN PRODUCT LIFECYCLE: DELETION
  // -------------------------------------------------------------------------
  try {
    const deleteRes = await fetch(`${BASE_URL}/api/products/${adminCreatedProductId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${adminToken}` }
    });

    const verifyRes = await fetch(`${BASE_URL}/api/products/${adminCreatedProductId}`);

    assert(
      deleteRes.status === 200 && verifyRes.status === 404,
      `Workflow 10: Admin Product Deletion & Cleanup (Product ID #${adminCreatedProductId} deleted and verified 404)`,
      `Delete status: ${deleteRes.status}, Verify status: ${verifyRes.status}`
    );
  } catch (err) {
    assert(false, "Workflow 10: Admin Product Deletion", err.message);
  }

  console.log("\n==================================================================");
  console.log(`E2E SUITE RESULTS: ${passed}/${total} WORKFLOWS PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log("==================================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runE2ETestSuite();

