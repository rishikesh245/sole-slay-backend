const { Sequelize } = require("sequelize");
const fs = require("fs");
const path = require("path");

const caCertificate = fs.readFileSync(
  path.join(__dirname, "..", "certs", "ca.pem")
);

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  process.env.DB_PASSWORD,
  {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    dialect: "mysql",
    logging: false,
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000
    },
    dialectOptions: {
      ssl: {
        ca: caCertificate,
        rejectUnauthorized: true
      }
    }
  }
);

module.exports = sequelize;