const MemberSession = require('../models/memberSession');

// Log login (start a session)
exports.logLogin = async (req, res) => {
    try {
        const { memberId } = req.body;
        const newSession = new MemberSession({
            memberId,
            loginTime: new Date(),
        });
        await newSession.save();
        return res.status(201).json({ message: 'Login session started', data: newSession });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging session', error });
    }
};

// Log logout (end a session)
exports.logLogout = async (req, res) => {
    try {
        const { memberId } = req.body;
        const session = await MemberSession.findOne({ memberId, logoutTime: null });
        if (!session) {
            return res.status(400).json({ message: 'No active session found' });
        }
        session.logoutTime = new Date();
        session.activeDuration = (session.logoutTime - session.loginTime) / (1000 * 60 * 60); // Calculate duration in hours
        await session.save();
        return res.status(200).json({ message: 'Logout session logged', data: session });
    } catch (error) {
        return res.status(500).json({ message: 'Error logging out', error });
    }
};

// Get all sessions for a member
exports.getMemberSessions = async (req, res) => {
    try {
        const { memberId } = req.params;
        const sessions = await MemberSession.find({ memberId });
        return res.status(200).json({ data: sessions });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving sessions', error });
    }
};
