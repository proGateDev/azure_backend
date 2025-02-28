const mongoose = require("mongoose");

// Define user schema for members
const userSchema = new mongoose.Schema({
  name: String,
  role: { type: String, enum: ['super-admin', 'user', 'member'], default: 'member' },
  parentUser: { type: mongoose.Schema.Types.ObjectId, ref: 'user' }, // User who added this member

  email: { type: String, unique: true },
  fcmToken: { type: String, default: 'null' },

  mobile: String,
  password: String,
  userType: { type: String, default: 'member' },
  channelId: { type: String, default: 'none' }, // Changed from groupType to channelId

  // Use geospatial data type for location
  location: {
    type: {
      type: String,
      enum: ['Point'], // 'Point' for 2D sphere indexing
      required: true,
      default: 'Point'
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
      default: [0.0, 0.0]
    },
    updatedAt: { type: Date, default: Date.now },
  },

  locationStatus: {
    type: String,
    enum: ['inactive', 'active', 'sos'],
    default: 'inactive',
    required: true,
  },

  isOnline: { type: Boolean, default: false },

  punchInTime: { type: Date },
  isApproved: { type: Boolean, default: false },
  isDeleted: { type: Boolean, default: false },
  createdBy: { type: String, default: "system" },
  updatedBy: { type: String, default: "system" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

// Create a 2dsphere index for geospatial queries
userSchema.index({ location: '2dsphere' });

// Update updatedAt field before saving
userSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

const memberModel = mongoose.model('Member', userSchema);
module.exports = memberModel;
