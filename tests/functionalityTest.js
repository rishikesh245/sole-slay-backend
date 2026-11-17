const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runFunctionalityTests() {
  console.log("\n========================================================");
  console.log("   SOLE SLAY PHASE 3 FUNCTIONALITY & API AUDIT SUITE   ");
  console.log("========================================================\n");

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

  const adminToken = jwt.sign(
    { id: 1, role: "admin" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "1h" }
  );

  const customerToken = jwt.sign(
    { id: 2, role: "user" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "1h" }
  );

  // 1. Fetch Product Catalog
  let sampleProductId = null;
  try {
    const res = await fetch(`${BASE_URL}/api/products`);
    const products = await res.json();
    assert(
      res.status === 200 && Array.isArray(products) && products.length > 0,
      "Test 1: Product catalog endpoint returns live items",
      `Expected array, got status ${res.status}`
    );
    sampleProductId = products[0]?.id;
  } catch (err) {
    assert(false, "Test 1: Product catalog retrieval", err.message);
  }

  // 2. Fetch Single Product Details
  if (sampleProductId) {
    try {
      const res = await fetch(`${BASE_URL}/api/products/${sampleProductId}`);
      const product = await res.json();
      assert(
        res.status === 200 && product.id === sampleProductId && Array.isArray(product.images),
        `Test 2: Product details retrieval for Product ID #${sampleProductId}`,
        `Got status ${res.status}`
      );
    } catch (err) {
      assert(false, "Test 2: Product details retrieval", err.message);
    }
  }

  // 3. Category Filter Endpoint
  try {
    const res = await fetch(`${BASE_URL}/api/products?category=1`);
    const menProducts = await res.json();
    assert(
      res.status === 200 && Array.isArray(menProducts),
      "Test 3: Category filtering query (Men's Shoes)",
      `Got status ${res.status}`
    );
  } catch (err) {
    assert(false, "Test 3: Category filter", err.message);
  }

  // 4. Admin Dashboard Metrics API
  try {
    const res = await fetch(`${BASE_URL}/api/orders/admin/stats`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const stats = await res.json();
    assert(
      res.status === 200 &&
        typeof stats.productCount === "number" &&
        typeof stats.orderCount === "number" &&
        typeof stats.customerCount === "number" &&
        typeof stats.totalSales === "number" &&
        Array.isArray(stats.recentOrders),
      "Test 4: Admin Dashboard live stats endpoint delivers verified metrics",
      `Got stats: ${JSON.stringify(stats)}`
    );
  } catch (err) {
    assert(false, "Test 4: Admin stats endpoint", err.message);
  }

  // 5. Admin Full Orders Retrieval API
  try {
    const res = await fetch(`${BASE_URL}/api/orders/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    const orders = await res.json();
    assert(
      res.status === 200 && Array.isArray(orders),
      `Test 5: Admin retrieves all customer orders (${orders.length} orders found)`,
      `Got status ${res.status}`
    );
  } catch (err) {
    assert(false, "Test 5: Admin all orders retrieval", err.message);
  }

  // 6. Security Boundary: Customer blocked from Admin Stats
  try {
    const res = await fetch(`${BASE_URL}/api/orders/admin/stats`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    assert(
      res.status === 403,
      "Test 6: Customer blocked from accessing Admin Dashboard stats (HTTP 403)",
      `Expected 403, got ${res.status}`
    );
  } catch (err) {
    assert(false, "Test 6: Customer admin access block", err.message);
  }

  // 7. Customer Order Isolation: My Orders returns only customer's own orders
  try {
    const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
      headers: { Authorization: `Bearer ${customerToken}` }
    });
    const orders = await res.json();
    const allBelongToCustomer = orders.every(o => o.user_id === 2);
    assert(
      res.status === 200 && Array.isArray(orders) && allBelongToCustomer,
      "Test 7: Customer order history strictly isolated to authenticated user ID",
      `Orders array length: ${orders.length}`
    );
  } catch (err) {
    assert(false, "Test 7: Customer order isolation", err.message);
  }

  console.log("\n========================================================");
  console.log(`TEST RESULTS: ${passed}/${total} PASSED (${((passed / total) * 100).toFixed(0)}%)`);
  console.log("========================================================\n");

  if (passed === total) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runFunctionalityTests();

