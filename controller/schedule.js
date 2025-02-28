const Schedule = require('../models/schedule');

// Create a new schedule
exports.createSchedule = async (req, res) => {
    try {
        const { memberId, startTime, endTime, latitude, longitude, radius } = req.body;
        const newSchedule = new Schedule({
            memberId,
            startTime,
            endTime,
            expectedLocation: { latitude, longitude, radius }
        });
        await newSchedule.save();
        return res.status(201).json({ message: 'Schedule created successfully', data: newSchedule });
    } catch (error) {
        return res.status(500).json({ message: 'Error creating schedule', error });
    }
};

// Get schedules for a member
exports.getSchedules = async (req, res) => {
    try {
        const { memberId } = req.params;
        const schedules = await Schedule.find({ memberId });
        return res.status(200).json({ data: schedules });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving schedules', error });
    }
};
