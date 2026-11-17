const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const OrderItem = sequelize.define(
    "OrderItem",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        order_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        product_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        product_name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        size: {
            type: DataTypes.STRING(20),
            allowNull: true,
            defaultValue: "Standard"
        },

        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        }
    },
    {
        tableName: "order_items",
        timestamps: false,
        indexes: [
            {
                fields: ["order_id"]
            },
            {
                fields: ["product_id"]
            }
        ]
    }
);

module.exports = OrderItem;