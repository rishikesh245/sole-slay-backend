const autocannon = require("autocannon");
const jwt = require("jsonwebtoken");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const PORT = process.env.PORT || 5001;
const BASE_URL = `http://localhost:${PORT}`;

async function runBenchmark(name, opts) {
  console.log(`\n>>> STARTING BENCHMARK: ${name}`);
  console.log(`    Target: ${opts.url}`);
  console.log(`    Connections: ${opts.connections} | Duration: ${opts.duration}s | Method: ${opts.method || "GET"}`);

  return new Promise((resolve) => {
    autocannon(opts, (err, results) => {
      if (err) {
        console.error("Benchmark error:", err);
        return resolve(null);
      }
      console.log(`--- [RESULTS: ${name}] ---`);
      console.log(`Requests/sec:  Avg = ${results.requests.average} | Total = ${results.requests.total}`);
      console.log(`Latency (ms):  p50 = ${results.latency.p50} | p90 = ${results.latency.p90} | p95 = ${results.latency.p95} | p99 = ${results.latency.p99} | Max = ${results.latency.max}`);
      console.log(`Throughput:    ${(results.throughput.average / 1024 / 1024).toFixed(2)} MB/s`);
      console.log(`Status 2xx:    ${results["2xx"] || 0} | Non-2xx: ${results.non2xx || 0} | Timeouts: ${results.timeouts || 0} | Errors: ${results.errors || 0}`);
      resolve(results);
    });
  });
}

async function runAllBenchmarks() {
  console.log("==================================================================");
  console.log("   SOLE SLAY PHASE 5 EMPIRICAL BENCHMARK & LOAD TESTING HARNESS  ");
  console.log("==================================================================");

  // 1. Light Concurrency (10 Virtual Users) - Baseline Read Latency
  const lightRead = await runBenchmark("Baseline Catalog Read (10 Connections)", {
    url: `${BASE_URL}/api/products`,
    connections: 10,
    duration: 3,
    method: "GET"
  });

  // 2. Moderate Concurrency (50 Virtual Users) - Catalog Browsing Under Load
  const modRead = await runBenchmark("Catalog Read Under Load (50 Connections)", {
    url: `${BASE_URL}/api/products`,
    connections: 50,
    duration: 3,
    method: "GET"
  });

  // 3. High Concurrency (100 Virtual Users) - Peak Read Concurrency
  const highRead = await runBenchmark("Peak Read Concurrency (100 Connections)", {
    url: `${BASE_URL}/api/products`,
    connections: 100,
    duration: 3,
    method: "GET"
  });

  // 4. Product Details Query (Single Product Join) (50 Connections)
  const detailRead = await runBenchmark("Single Product Details Query (50 Connections)", {
    url: `${BASE_URL}/api/products/1`,
    connections: 50,
    duration: 3,
    method: "GET"
  });

  // 5. Stress Concurrency (250 Virtual Users) - Testing Saturation Point
  const stressRead = await runBenchmark("Stress Test (250 Connections - Saturation Check)", {
    url: `${BASE_URL}/api/products`,
    connections: 250,
    duration: 3,
    method: "GET"
  });

  console.log("\n==================================================================");
  console.log("                     BENCHMARK SUMMARY TABLE                      ");
  console.log("==================================================================");
  console.log("Stage                        | Concurrency | Req/Sec   | Latency p50 | Latency p95 | Timeouts");
  console.log("-----------------------------+-------------+-----------+-------------+-------------+---------");
  
  const benchmarks = [
    { title: "Baseline Read (10 Conn)", res: lightRead },
    { title: "Read Under Load (50 Conn)", res: modRead },
    { title: "Peak Read (100 Conn)", res: highRead },
    { title: "Product Detail (50 Conn)", res: detailRead },
    { title: "Stress Saturation (250 Conn)", res: stressRead },
  ];

  benchmarks.forEach((b) => {
    const r = b.res;
    if (r) {
      const name = b.title.padEnd(28).slice(0, 28);
      const conn = String(r.connections).padStart(11);
      const rps = String(Math.round(r.requests.average)).padStart(9);
      const p50 = (r.latency.p50 + "ms").padStart(11);
      const p95 = (r.latency.p90 + "ms").padStart(11);
      const to = String(r.timeouts).padStart(7);
      console.log(`${name} | ${conn} | ${rps} | ${p50} | ${p95} | ${to}`);
    }
  });

  console.log("==================================================================\n");
}

runAllBenchmarks();
