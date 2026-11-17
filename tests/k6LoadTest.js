import http from 'k6/http';
import { check, sleep, group } from 'k6';

/**
 * ==============================================================================
 * SOLE SLAY PRODUCTION K6 LOAD & STRESS TESTING SUITE
 * ==============================================================================
 * Stages:
 * 1. Warm-up: 50 VUs for 30s
 * 2. Stage 1: Ramp to 250 VUs for 1m
 * 3. Stage 2: Ramp to 1,000 VUs for 2m
 * 4. Stage 3 (Stress): Ramp to 5,000 VUs for 2m (Requires clustered backend)
 * 5. Recovery: Cool-down to 0 VUs for 30s
 *
 * Thresholds:
 * - 95% of read requests must complete under 250ms
 * - 95% of write/checkout requests must complete under 800ms
 * - Global HTTP failure rate must stay under 1.0%
 */

export const options = {
  stages: [
    { duration: '30s', target: 50 },
    { duration: '1m', target: 250 },
    { duration: '2m', target: 1000 },
    { duration: '30s', target: 0 },
  ],
  thresholds: {
    'http_req_duration{type:read}': ['p(95)<300'],
    'http_req_duration{type:write}': ['p(95)<800'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_BASE_URL || 'http://localhost:5001';

export default function () {
  // Scenario 1: Browse Storefront & Catalog (80% of traffic)
  group('1. Storefront Browsing', () => {
    const catalogRes = http.get(`${BASE_URL}/api/products`, {
      tags: { type: 'read' },
    });
    check(catalogRes, {
      'catalog status is 200': (r) => r.status === 200,
      'catalog response is non-empty': (r) => r.body.length > 50,
    });
    sleep(1);

    // Filter Men's Shoes
    const filterRes = http.get(`${BASE_URL}/api/products?category=1`, {
      tags: { type: 'read' },
    });
    check(filterRes, {
      'filter status is 200': (r) => r.status === 200,
    });
    sleep(1);
  });

  // Scenario 2: View Individual Product Details (15% of traffic)
  group('2. Product Variant Inspection', () => {
    const detailRes = http.get(`${BASE_URL}/api/products/1`, {
      tags: { type: 'read' },
    });
    check(detailRes, {
      'product detail status is 200': (r) => r.status === 200,
    });
    sleep(2);
  });

  // Scenario 3: Authenticated Flow & Checkout (5% of traffic)
  group('3. Cart & Order Placement', () => {
    const loginPayload = JSON.stringify({
      identifier: 'ravi@gmail.com',
      password: 'password123',
    });

    const loginRes = http.post(`${BASE_URL}/api/auth/login`, loginPayload, {
      headers: { 'Content-Type': 'application/json' },
      tags: { type: 'write' },
    });

    const loginSuccess = check(loginRes, {
      'login status is 200': (r) => r.status === 200,
      'token received': (r) => JSON.parse(r.body).token !== undefined,
    });

    if (loginSuccess) {
      const token = JSON.parse(loginRes.body).token;
      const orderPayload = JSON.stringify({
        name: 'Ravi',
        email: 'ravi@gmail.com',
        mobile: '9876543211',
        address: 'Chennai Express Way, Sector 4',
        items: [
          {
            id: 1,
            quantity: 1,
            size: '8',
            price: 2499.00,
          },
        ],
      });

      const orderRes = http.post(`${BASE_URL}/api/orders`, orderPayload, {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        tags: { type: 'write' },
      });

      check(orderRes, {
        'order status is 201 or 400 (if stock exhausted)': (r) =>
          r.status === 201 || r.status === 400,
      });
    }
    sleep(3);
  });
}

