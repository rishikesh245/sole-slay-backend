const { DataTypes } = require("sequelize");
const sequelize = require("../config/database");

const User = sequelize.define(
    "User",
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

        email: {
            type: DataTypes.STRING(250),
            unique: true,
            allowNull: true
        },

        mobile: {
            type: DataTypes.STRING(50),
            unique: true,
            allowNull: true
        },

        password: {
            type: DataTypes.STRING(200),
            allowNull: false
        },

        role: {
             type: DataTypes.STRING,
             allowNull: false,
             defaultValue: "user"
        }
    },
    {
        tableName: "users",
        timestamps: false
    }
);

module.exports = User;