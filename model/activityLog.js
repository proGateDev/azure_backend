const mongoose = require('mongoose');

const activityLogSchema = new mongoose.Schema({

  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, 
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member' } ,

  action: {
    type: String,
    enum: ['login', 'location_update', 'inactive', 'active', 'logout'],
    required: true
  },
  role: { type: String, enum: ['super-admin', 'user', 'member'], default: 'member' }, 
  location: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  createdAt: { type: Date, default: Date.now }, // Time of activity
});

// Index for querying activities by user and time
activityLogSchema.index({ userId: 1, createdAt: -1 });

const ActivityLog = mongoose.model('activityLog', activityLogSchema);
module.exports = ActivityLog;
