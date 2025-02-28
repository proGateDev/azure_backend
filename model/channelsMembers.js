const mongoose = require("mongoose");

const channelMemberSchema = new mongoose.Schema({
  channelId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Channel',
    required: true
  },
  memberId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Member',
    required: true
  },
  role: {
    type: String,
    enum: ['user', 'member', 'admin'],
    default: 'member'
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: 'addedByModel', // Dynamic reference
    required: true
  },
  addedByModel: {
    type: String,
    enum: ['user', 'member', 'admin'],
    required: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  },
  isDeleted: { type: Boolean, default: false },

});

// Ensure no duplicate channel-member pair
channelMemberSchema.index({ channelId: 1, memberId: 1 }, { unique: true });

const channelMemberModel = mongoose.model('ChannelMember', channelMemberSchema);
module.exports = channelMemberModel;
