const mongoose = require("mongoose");

const chatSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    message: {
        type: String,
        required: true
    },
    reactions: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        reactionType: {
            type: String,
            enum: ["like", "love", "laugh", "sad", "angry"],
            default: "like"
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    comments: [{
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User"
        },
        comment: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

const chatModel = mongoose.model('Chat', chatSchema);
module.exports = chatModel;
