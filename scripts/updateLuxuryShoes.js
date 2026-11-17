require("dotenv").config();
const path = require("path");
const cloudinary = require("../config/cloudinary");
const { Product, ProductImage } = require("../models");

const luxuryShoes = [
  { name: "puma-voltrun.png", key: "puma", label: "Puma VoltRun" },
  { name: "sole-slay-airflex.png", key: "airflex", label: "Sole Slay AirFlex" },
  { name: "airstep-classic.png", key: "airstep", label: "AirStep Classic" },
  { name: "trailblaze-pro.png", key: "trailblaze", label: "TrailBlaze Pro" },
  { name: "streetcore.png", key: "streetcore", label: "StreetCore" },
  { name: "eva-flow.png", key: "eva", label: "Eva Flow" },
  { name: "nike-motion.png", key: "nike", label: "Nike Motion+" },
  { name: "cloudrun.png", key: "cloudrun", label: "CloudRun" },
];

const imageDir = path.join(
  __dirname,
  "..",
  "..",
  "frontend",
  "src",
  "assets",
  "image",
  "luxury-shoes"
);

async function run() {
  try {
    console.log("=== STEP 1: Uploading Luxury Shoes to Cloudinary ===");
    const uploadedMap = {};

    for (const shoe of luxuryShoes) {
      const filePath = path.join(imageDir, shoe.name);
      console.log(`Uploading ${shoe.name}...`);
      const uploadRes = await cloudinary.uploader.upload(filePath, {
        folder: "sole-slay/luxury",
        public_id: shoe.name.replace(".png", ""),
        overwrite: true,
      });
      uploadedMap[shoe.name] = uploadRes.secure_url;
      console.log(`✓ Uploaded ${shoe.label}: ${uploadRes.secure_url}`);
    }

    console.log("\n=== STEP 2: Updating Database Products & Images ===");
    const products = await Product.findAll();
    console.log(`Found ${products.length} products in database.`);

    const luxuryUrlList = Object.values(uploadedMap);

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const pName = (p.name || "").toLowerCase();
      let chosenUrl = luxuryUrlList[i % luxuryUrlList.length];

      if (pName.includes("puma")) {
        chosenUrl = uploadedMap["puma-voltrun.png"];
      } else if (pName.includes("nike")) {
        chosenUrl = uploadedMap["nike-motion.png"];
      } else if (pName.includes("adidas") || pName.includes("campus")) {
        chosenUrl = uploadedMap["streetcore.png"];
      } else if (pName.includes("woodland") || pName.includes("sparx")) {
        chosenUrl = uploadedMap["trailblaze-pro.png"];
      } else if (pName.includes("bata")) {
        chosenUrl = uploadedMap["sole-slay-airflex.png"];
      } else if (pName.includes("new balance")) {
        chosenUrl = uploadedMap["cloudrun.png"];
      } else if (pName.includes("allensolly")) {
        chosenUrl = uploadedMap["airstep-classic.png"];
      } else if (pName.includes("eva") || pName.includes("women")) {
        chosenUrl = uploadedMap["eva-flow.png"];
      }

      // 1. Update product_images table
      const existingImages = await ProductImage.findAll({
        where: { product_id: p.id },
      });

      if (existingImages.length > 0) {
        await ProductImage.update(
          { image_url: chosenUrl },
          { where: { product_id: p.id } }
        );
        console.log(`Updated images for Product #${p.id} (${p.name}) -> ${chosenUrl}`);
      } else {
        await ProductImage.create({
          product_id: p.id,
          image_url: chosenUrl,
        });
        console.log(`Created image for Product #${p.id} (${p.name}) -> ${chosenUrl}`);
      }
    }

    console.log("\n=== SUCCESS: All database products updated with luxury footwear! ===");
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

run();

