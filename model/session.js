const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, 

  loginTime: { type: Date, required: true },
  logoutTime: { type: Date }, 
  activeDuration: { type: Number, default: 0 }, 
  createdAt: { type: Date, default: Date.now }
});

// Index to quickly query session logs
sessionSchema.index({ memberId: 1, createdAt: -1 });

const sessionModel = mongoose.model('session', sessionSchema);
module.exports = sessionModel;
