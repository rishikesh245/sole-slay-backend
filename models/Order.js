
const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const Order = sequelize.define(
    "Order",
    {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },

        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },

        name: {
            type: DataTypes.STRING,
            allowNull: false
        },

        email: {
            type: DataTypes.STRING(250),
            allowNull: false
        },

        mobile: {
            type: DataTypes.STRING(50),
            allowNull: false
        },

        address: {
            type: DataTypes.TEXT,
            allowNull: false
        },

        total_amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },

        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: "Pending"
        }
    },
    {
        tableName: "orders",
        timestamps: true
    }
);

module.exports = Order;
