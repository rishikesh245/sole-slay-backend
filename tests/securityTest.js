const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runSecurityTests() {
  console.log("\n========================================================");
  console.log("   SOLE SLAY PHASE 2 SECURITY & DEFENSE AUDIT SUITE    ");
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

  // Generate tokens for testing
  const customerToken = jwt.sign(
    { id: 9991, role: "user" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "1h" }
  );

  const adminToken = jwt.sign(
    { id: 1, role: "admin" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "1h" }
  );

  const expiredToken = jwt.sign(
    { id: 9992, role: "user" },
    process.env.JWT_SECRET || "default_test_secret",
    { expiresIn: "-1s" } // already expired
  );

  // -------------------------------------------------------------------------
  // TEST 1: Unauthenticated Image Upload (Expect 401)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST"
    });
    const body = await res.json();
    assert(
      res.status === 401,
      "Test 1: Unauthenticated Image Upload blocked",
      `Expected status 401, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 1: Unauthenticated Image Upload", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 2: Customer Attempting Image Upload (Expect 403 Forbidden)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${customerToken}`
      }
    });
    const body = await res.json();
    assert(
      res.status === 403,
      "Test 2: Customer Attempting Image Upload blocked with 403 Forbidden",
      `Expected status 403, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 2: Customer Image Upload blocked", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 3: Customer Attempting Product Creation (Expect 403 Forbidden)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/products`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        name: "Hacker Sneaker",
        price: 999,
        subcategory_id: 1,
        stock: 10,
        images: ["https://example.com/1.jpg", "https://example.com/2.jpg", "https://example.com/3.jpg"]
      })
    });
    const body = await res.json();
    assert(
      res.status === 403,
      "Test 3: Customer Attempting Admin Product Creation blocked with 403",
      `Expected status 403, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 3: Customer Product Creation blocked", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 4: Invalid / Tampered JWT (Expect 401)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
      headers: {
        Authorization: "Bearer completely.invalid.and.tampered.token"
      }
    });
    const body = await res.json();
    assert(
      res.status === 401,
      "Test 4: Tampered JWT signature rejected with 401",
      `Expected status 401, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 4: Tampered JWT rejection", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 5: Expired JWT (Expect 401 Session Expired)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/orders/my-orders`, {
      headers: {
        Authorization: `Bearer ${expiredToken}`
      }
    });
    const body = await res.json();
    assert(
      res.status === 401 && body.message && body.message.toLowerCase().includes("expired"),
      "Test 5: Expired JWT cleanly rejected with 401 Session Expired",
      `Expected 401 expired message, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 5: Expired JWT handling", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 6: Unsupported File Type Upload (Expect 400 Invalid File Type)
  // -------------------------------------------------------------------------
  try {
    const boundary = "----WebKitFormBoundaryTest12345";
    const payload = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="malicious.sh"\r\n` +
      `Content-Type: application/x-sh\r\n\r\n` +
      `#!/bin/bash\r\necho "exploit"\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: payload
    });
    const body = await res.json();
    assert(
      res.status === 400 && body.message && body.message.includes("Invalid file type"),
      "Test 6: Unsupported MIME-type (shell script) rejected with 400",
      `Expected 400 invalid file type, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 6: Unsupported file type upload", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 7: Oversized File Upload (>5MB) (Expect 400 File too large)
  // -------------------------------------------------------------------------
  try {
    const boundary = "----WebKitFormBoundaryBigFile";
    const hugeBuffer = "A".repeat(6 * 1024 * 1024); // 6MB dummy content
    const payload = 
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="image"; filename="huge.jpg"\r\n` +
      `Content-Type: image/jpeg\r\n\r\n` +
      hugeBuffer + `\r\n` +
      `--${boundary}--\r\n`;

    const res = await fetch(`${BASE_URL}/api/upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${adminToken}`,
        "Content-Type": `multipart/form-data; boundary=${boundary}`
      },
      body: payload
    });
    const body = await res.json();
    assert(
      res.status === 400 && body.message && body.message.includes("File too large"),
      "Test 7: Oversized File (>5MB) rejected with 400 File too large",
      `Expected 400 File too large, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 7: Oversized file upload", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 8: SQL Injection / Malicious Login Payload (Expect 401, not 500)
  // -------------------------------------------------------------------------
  try {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "' OR '1'='1' --",
        password: "randomPassword123!"
      })
    });
    const body = await res.json();
    assert(
      res.status === 401 && body.message === "Invalid email/mobile or password",
      "Test 8: SQL Injection payload safely rejected without leaking SQL errors",
      `Expected 401 safe response, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 8: SQL injection payload handling", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 9: Body Size Limit (>1MB JSON payload) (Expect 413 Payload Too Large)
  // -------------------------------------------------------------------------
  try {
    const hugeJson = {
      identifier: "test@example.com",
      password: "A".repeat(1.5 * 1024 * 1024) // 1.5MB string
    };

    const res = await fetch(`${BASE_URL}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(hugeJson)
    });
    const body = await res.json();
    assert(
      res.status === 413,
      "Test 9: JSON payload exceeding 1MB rejected with 413 Payload Too Large",
      `Expected 413, got ${res.status} (${JSON.stringify(body)})`
    );
  } catch (err) {
    assert(false, "Test 9: Payload size limit", err.message);
  }

  // -------------------------------------------------------------------------
  // TEST 10: Rate Limiting Enforcement on Login (Expect 429)
  // -------------------------------------------------------------------------
  try {
    let rateLimited = false;
    let attempts = 0;

    // Send up to 12 rapid login attempts (limit is set to 10)
    for (let i = 0; i < 12; i++) {
      attempts++;
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: `test_rate_limit_${Date.now()}@example.com`,
          password: "wrongPassword!"
        })
      });

      if (res.status === 429) {
        rateLimited = true;
        break;
      }
    }

    assert(
      rateLimited,
      `Test 10: Rate limiter triggered 429 Too Many Requests after ${attempts} attempts`,
      `Failed to trigger rate limit (attempts: ${attempts})`
    );
  } catch (err) {
    assert(false, "Test 10: Rate limiting test", err.message);
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

runSecurityTests();

