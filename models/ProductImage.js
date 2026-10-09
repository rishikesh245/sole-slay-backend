const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const ProductImage = sequelize.define(
    "ProductImage",
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },

        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        image_url: {
            type: DataTypes.TEXT,
            allowNull: false
        }
    },
    {
        tableName: "product_images",
        timestamps: false
    }
);

module.exports = ProductImage;