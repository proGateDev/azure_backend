const mongoose = require("mongoose");

const contactUsSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String },
  message: { 
    type: String, required: true },
  interest: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});


const contactUsModel = mongoose.model('contactUs', contactUsSchema);
module.exports = contactUsModel;
