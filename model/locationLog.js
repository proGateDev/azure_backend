const mongoose = require('mongoose');

const locationLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, 
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member' } ,

  location: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'sos'],
    default: 'active'
  },
  distanceTravelled: { type: Number, default: 0.0 }, // Track distance between previous and new location
  createdAt: { type: Date, default: Date.now },
});

// Index for querying location logs by member and time
locationLogSchema.index({ memberId: 1, createdAt: -1 });

const LocationLog = mongoose.model('locationLog', locationLogSchema);
module.exports = LocationLog;
