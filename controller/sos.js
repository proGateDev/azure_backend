const sosLogModel = require('../model/sosLog');

// Create a new SOS log
exports.createSOSLog = async (req, res) => {
    try {
        console.log('000000 Started ------->');
        
        const { memberId, latitude, longitude } = req.body;
        const newSOS = new sosLogModel({
            memberId,
            location: { latitude, longitude },
            message: "SOS activated"
        });
        await newSOS.save();
        return res.status(201).json({ message: 'SOS logged successfully', data: newSOS });
    } catch (error) {
        console.log('error-->',error);
        
        return res.status(500).json({ message: 'Error logging SOS', error });
    }
};

// Get all SOS logs for a member
exports.getSOSLogs = async (req, res) => {
    try {
        const { memberId } = req.params;
        const sosLogs = await sosLogModel.find({ memberId });
        return res.status(200).json({ data: sosLogs });
    } catch (error) {
        return res.status(500).json({ message: 'Error retrieving SOS logs', error });
    }
};
