const mongoose = require("mongoose");

const geofenceSchema = new mongoose.Schema({
  name: { type: String, required: true },
  center: {
    latitude: { type: Number, required: true },
    longitude: { type: Number, required: true },
  },
  radius: { type: Number, required: true }, // Radius in meters
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }, // Who created the geofence
  createdAt: { type: Date, default: Date.now },
});

const Geofence = mongoose.model('geofence', geofenceSchema);
module.exports = Geofence;
