const mongoose = require('mongoose');

const sosLogSchema = new mongoose.Schema({
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'member',
    // required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    // required: true
  },

  location: {
    latitude: {
      type: Number
      // , required: true
    },
    longitude: {
      type: Number,
      // required: true
    }
  },
  message: { type: String, default: 'SOS activated' },
  createdAt: { type: Date, default: Date.now },
  
});

const sosLogModel = mongoose.model('sosLog', sosLogSchema);
module.exports = sosLogModel;
