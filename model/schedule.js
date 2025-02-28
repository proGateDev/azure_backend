const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user', required: true }, // Reference to user/member

  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  expectedLocation: { // Geofencing for the member during scheduled times
    latitude: { type: Number },
    longitude: { type: Number },
    radius: { type: Number, default: 100 } // Radius in meters
  },
  status: { type: String, enum: ['scheduled', 'completed', 'missed'], default: 'scheduled' },
  createdAt: { type: Date, default: Date.now }
});

const Schedule = mongoose.model('schedule', scheduleSchema);
module.exports = Schedule;
