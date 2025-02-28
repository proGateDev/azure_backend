const mongoose = require("mongoose");

//===================================
const userSchema = new mongoose.Schema({
  name: String,
  role: { type: String, enum: ['super-admin', 'user', 'member'], default: 'user' },
  members: { type: mongoose.Schema.Types.ObjectId, ref: 'member' }, // User who added this member
  userType: { type: String, default: 'user' },

  email: { type: String, unique: true },
  fcmToken: { type: String, default: 'null' },
  mobile: String,
  password: String,


  isApproved: { type: Boolean, default: false },

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



  // geoFenced: {
  //   type: [[Number]], // Array of coordinates for the geofence, e.g., [[longitude, latitude], [longitude, latitude]]
  //   default: [], // Empty array initially
  // },



  geoFenced: {
    type: {
      type: String, 
      enum: ['Polygon'], // GeoJSON type for polygon
      required: true,
      default: 'Polygon'
    },
    coordinates: {
      type: [[Number]], // [[longitude, latitude], [longitude, latitude]]
      required: true,
      default: []
    }
  },



  groupType: { type: mongoose.Schema.Types.ObjectId, ref: 'Channel', required: false }, // Reference to Channel schema

  // groupType: { type: String, default: 'none' },
  isSubscribed: { type: Boolean, default: true },

  isDeleted: { type: Boolean, default: false },
  createdBy: { type: String, default: "system" },
  updatedBy: { type: String, default: "system" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },




});

// Update updatedAt field before saving
userSchema.pre('save', function (next) {
  // console.log('======= MONGOOSE middleware ------>');

  this.updatedAt = Date.now();
  next();
});

const userModel = mongoose.model('user', userSchema);
module.exports = userModel;

