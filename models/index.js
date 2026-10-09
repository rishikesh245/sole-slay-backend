const Product = require("./Product");
const Subcategory = require("./Subcategory");
const Category = require("./Category");
const ProductImage = require("./ProductImage");
const User = require("./User");
const Order = require("./Order");
const OrderItem = require("./OrderItem");


Category.hasMany(Subcategory, {
    foreignKey: "category_id"
});

Subcategory.belongsTo(Category, {
    foreignKey: "category_id"
});

Subcategory.hasMany(Product, {
    foreignKey: "subcategory_id"
});

Product.belongsTo(Subcategory, {
    foreignKey: "subcategory_id"
});

Product.hasMany(ProductImage, {
    foreignKey: "product_id",
    as: "images",
    onDelete: "CASCADE"
});

ProductImage.belongsTo(Product, {
    foreignKey: "product_id",
    as: "product"
});

User.hasMany(Order, {
    foreignKey: "user_id"
});

Order.belongsTo(User, {
    foreignKey: "user_id"
});

Order.hasMany(OrderItem, {
    foreignKey: "order_id"
});

OrderItem.belongsTo(Order, {
    foreignKey: "order_id"
});

OrderItem.belongsTo(Product, {
    foreignKey: "product_id"
});

Product.hasMany(OrderItem, {
    foreignKey: "product_id"
});


module.exports = {
    Product,
    Subcategory,
    Category,
    ProductImage,
    User,
    Order,
    OrderItem
};