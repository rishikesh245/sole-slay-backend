const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Product = sequelize.define(
  "Product",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false
    },

    price: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false
    },

    subcategory_id: {
      type: DataTypes.INTEGER,
      allowNull: false
    },

    description: {
      type: DataTypes.TEXT
    },

    stock: {
      type: DataTypes.INTEGER,
      defaultValue: 0
    }
  },
  {
    tableName: "products",
    timestamps: false
  }
);

module.exports = Product;