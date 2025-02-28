const mongoose = require("mongoose");
//===================================

const notificationSchema = new mongoose.Schema({
    userId: { type: String, required: true },  
    message: { type: String, required: true }, 
    isRead: { type: Boolean, default: false },  
    createdAt: { type: Date, default: Date.now },
    markedReadAt: { type: Date, default: Date.now }
  });
  

  // Update updatedAt field before saving
  notificationSchema.pre('save', function (next) {
  // console.log('======= MONGOOSE middleware ------>');

  this.createdAt = Date.now();
  this.markedReadAt = Date.now();
  next();
});

  const notificationModel = mongoose.model('notification', notificationSchema);
module.exports = notificationModel;
