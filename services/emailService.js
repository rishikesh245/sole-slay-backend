const https = require("https");

// User-specified EmailJS Credentials
const DEFAULT_SERVICE_ID = "service_t54irft";
const DEFAULT_TEMPLATE_ID = "template_nbz6z1g";
const DEFAULT_PUBLIC_KEY = "9Y_OWI2Fr5nAFcZvF";

/**
 * Sends order confirmation email via EmailJS REST API directly from the Render Node.js backend.
 *
 * @param {Object} params
 * @param {Object} params.order - Saved order object from MySQL
 * @param {Array} params.items - Saved order items with product details
 * @param {string} params.customerName - Customer name
 * @param {string} params.customerEmail - Customer email address
 * @param {string} params.customerPhone - Customer contact number
 * @param {string} params.shippingAddress - Full delivery address
 * @returns {Promise<{success: boolean, result?: any, error?: any}>}
 */
async function sendOrderEmailBackend({
  order,
  items = [],
  customerName,
  customerEmail,
  customerPhone,
  shippingAddress,
}) {
  const serviceId =
    process.env.EMAILJS_SERVICE_ID ||
    process.env.VITE_EMAILJS_SERVICE_ID ||
    DEFAULT_SERVICE_ID;
  const templateId =
    process.env.EMAILJS_TEMPLATE_ID ||
    process.env.VITE_EMAILJS_TEMPLATE_ID ||
    DEFAULT_TEMPLATE_ID;
  const publicKey =
    process.env.EMAILJS_PUBLIC_KEY ||
    process.env.VITE_EMAILJS_PUBLIC_KEY ||
    DEFAULT_PUBLIC_KEY;

  if (!customerEmail) {
    console.warn("⚠️ [Backend EmailJS] Skipped: No customer email provided.");
    return { success: false, reason: "No email" };
  }

  // Format ordered footwear items
  const itemsSummary = (items || [])
    .map((item, index) => {
      const name = item.product_name || item.name || "Footwear";
      const size = item.size || item.selectedSize || "Standard";
      const qty = item.quantity || 1;
      const price = Number(item.price) || 0;
      return `${index + 1}. ${name} (Size: UK ${size}) x ${qty} — ₹${(price * qty).toLocaleString("en-IN")}`;
    })
    .join("\n");

  const formattedTotal = `₹${Number(order.total_amount || 0).toLocaleString("en-IN")}`;
  const orderId = order.id ? `#${order.id}` : "CONFIRMED";

  const templateParams = {
    to_name: customerName || "Shoe Lover",
    name: customerName || "Shoe Lover",
    to_email: customerEmail,
    customer_email: customerEmail,
    email: customerEmail,
    order_id: orderId,
    order_total: formattedTotal,
    total_amount: formattedTotal,
    items_summary: itemsSummary || "Luxury Footwear Items",
    order_items: itemsSummary || "Luxury Footwear Items",
    shipping_address: shippingAddress || "Standard Delivery",
    address: shippingAddress || "",
    customer_phone: customerPhone || "",
    mobile: customerPhone || "",
    order_date: new Date().toLocaleDateString("en-IN", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    store_name: "Sole Slay Footwear",
  };

  const sendRequest = (sId) => {
    return new Promise((resolve, reject) => {
      const postData = JSON.stringify({
        service_id: sId,
        template_id: templateId,
        user_id: publicKey,
        template_params: templateParams,
      });

      const req = https.request(
        {
          hostname: "api.emailjs.com",
          port: 443,
          path: "/api/v1.0/email/send",
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Content-Length": Buffer.byteLength(postData),
          },
        },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => {
            if (res.statusCode >= 200 && res.statusCode < 300) {
              resolve({ status: res.statusCode, data: body });
            } else {
              reject({ status: res.statusCode, body });
            }
          });
        }
      );

      req.on("error", (err) => reject(err));
      req.write(postData);
      req.end();
    });
  };

  try {
    let result;
    try {
      result = await sendRequest(serviceId);
    } catch (primaryErr) {
      if (
        primaryErr.body &&
        typeof primaryErr.body === "string" &&
        primaryErr.body.includes("service ID not found") &&
        serviceId !== "default_service"
      ) {
        console.warn(
          `⚠️ [Backend EmailJS] Service "${serviceId}" not found, retrying with "default_service"...`
        );
        result = await sendRequest("default_service");
      } else {
        throw primaryErr;
      }
    }

    console.log("✅ [Backend EmailJS] Order confirmation email dispatched successfully:", result);
    return { success: true, result };
  } catch (error) {
    console.error("❌ [Backend EmailJS] Email dispatch failed:", error.body || error.message);
    return { success: false, error: error.body || error.message };
  }
}

module.exports = { sendOrderEmailBackend };
