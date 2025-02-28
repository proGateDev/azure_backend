const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema({
    memberId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Member',
        required: true,
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    locationName: {
        type: String,
        required: true,
    },
    coordinates: {
        lat: {
            type: Number,
            required: true,
        },
        lng: {
            type: Number,
            required: true,
        },
    },
    time: {
        type: String,
        // default: Date.now,
    },
    assignedAt: {

        type: Date,
        default: Date.now,

    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'reached'],
        default: 'pending',
    },
    eventName: {
        type: String,
    },
    type: {
        type: String,
        enum: [ 'scheduled', 'geo-fenced', 'live'],

        default: 'scheduled',
    },

    // Optional field for tracking if the member entered or exited the assigned location
    entryTime: Date,
    exitTime: Date,
});


const assignmentModel = mongoose.model('assignment', assignmentSchema);
module.exports = assignmentModel;
