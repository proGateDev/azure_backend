const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema({
  name: { type: String, required: true }, // Removed any unique constraints
  description: { type: String },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'createdByModel', // Specifies which model to use
  },
  createdByModel: {
    type: String,
    enum: ['User', 'Member'], // Specifies possible models to reference
    required: true,
  },
  createdAt: { type: Date, default: Date.now },
});
channelSchema.index({ name: 1, createdBy: 1 }, { unique: true });

const channelModel = mongoose.model('Channel', channelSchema);
module.exports = channelModel;
