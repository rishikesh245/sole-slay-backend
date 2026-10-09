const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Subcategory = sequelize.define(
  "Subcategory",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    category_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  },
  {
    tableName: "subcategories",
    timestamps: false,
  }
);

module.exports = Subcategory;