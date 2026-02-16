const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: String,
  category: String,
  price: Number,
  quantity: Number,  // Ensure this exists
  images: [String],  // Ensure this is an Array [String]
  description: String,
});

const Product = mongoose.model('Product', productSchema);
module.exports = Product;