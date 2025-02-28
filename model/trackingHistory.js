const mongoose = require("mongoose");

// Define location history schema
const locationHistorySchema = new mongoose.Schema({
  memberId: { type: mongoose.Schema.Types.ObjectId, ref: 'member' },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'user' },

  // Use geospatial data for tracking locations
  location: {
    type: {
      type: String,
      enum: ['Point'], // 'Point' for 2D sphere indexing
      required: false,
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },

  // Add address fields to the schema
  addressDetails: {
    preferredAddress: { type: String, default: 'NOT FOUND' },
    address: { type: String, default: 'NOT FOUND' },
    locality: { type: String, default: 'NOT FOUND' },
    street: { type: String, default: 'NOT FOUND' },
    neighborhood: { type: String, default: 'NOT FOUND' },
    region: { type: String, default: 'NOT FOUND' },
    district: { type: String, default: 'NOT FOUND' },
    country: { type: String, default: 'NOT FOUND' },
    postcode: { type: String, default: 'NOT FOUND' },
    landmarks: { type: Array, default: [] },
  },

  timestamp: { type: Date, default: Date.now },





  // Type of tracking (scheduled or live)
  trackingType: {
    type: String,
    enum: ['scheduled', 'live','geo-fenced'],
    default: 'live', // Default is live tracking
  },

  // Assignment ID for scheduled tracking
  assignmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'assignment',
    default: null, // Default is null for live tracking
  },

  // Additional optional fields
  notes: { type: String, default: '' }, // For any custom information about the tracking
  isWithinGeofence: { type: Boolean, default: false },
  speed: { type: Number, default: null }, // Speed in km/h or m/s
  batteryStatus: { type: Number, min: 0, max: 100, default: null }, // Battery percentage
  accuracy: { type: Number, default: null }, // Accuracy in meters
  event: {
    type: String,
    enum: ['entry', 'exit', 'check-in', 'check-out', 'update'],
    default: 'update',
  },
  deviceId: { type: String, default: null },
  isSOS: { type: Boolean, default: false },
  trackingDuration: { type: Number, default: null }, // Duration in seconds



});

// Create a 2dsphere index for efficient geospatial queries
locationHistorySchema.index({ location: '2dsphere' });

const trackingHistoryModel = mongoose.model('trackingHistory', locationHistorySchema);
module.exports = trackingHistoryModel;
