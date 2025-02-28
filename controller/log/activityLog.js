const ActivityLog = require('../models/activityLog');

// Log an activity
exports.logActivity = async (req, res) => {
    try {
        const { userId, action, role, latitude, longitude } = req.body;
        const newActivityLog = new ActivityLog({
            userId,
            action,
            role,
            location: { latitude, longitude },
        });
        await newActivityLog.save();
        return res.status(201).json({ message: 'Activity logged', data: newActivityLog });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging activity', error });
    }
};

// Get activity logs for a member/user
exports.getActivityLogs = async (req, res) => {
    try {
        const { memberId } = req.params;
        const activityLogs = await ActivityLog.find({ userId: memberId }).sort({ createdAt: -1 });
        return res.status(200).json({ data: activityLogs });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving activity logs', error });
    }
};
