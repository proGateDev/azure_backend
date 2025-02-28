const mongoose = require("mongoose");

//===================================
const adminSchema = new mongoose.Schema({
  name: String,
  email: { type: String, unique: true }, 
  password: String,
  mobile: String,
  // admin-specific fields
});

const Admin = mongoose.model('admin', adminSchema);
module.exports = Admin;
