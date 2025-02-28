const haversine = require('haversine-distance'); // Install this package for distance calculation
const LocationLog = require('../../model/locationLog');

// Controller for LocationLog
const LocationLogController = {
    /**
     * Create a new location log
     */
    createLocationLog: async (req, res) => {
        try {
            const { userId, memberId, location, status } = req.body;

            // Fetch the last log to calculate distance
            //   const lastLog = await LocationLog.findOne({ memberId })
            //     .sort({ createdAt: -1 });

            //   let distanceTravelled = 0.0;

            //   if (lastLog) {
            //     // Calculate distance between the last location and the new one
            //     const prevLocation = {
            //       latitude: lastLog.location.latitude,
            //       longitude: lastLog.location.longitude,
            //     };
            //     const newLocation = {
            //       latitude: location.latitude,
            //       longitude: location.longitude,
            //     };

            //     distanceTravelled = haversine(prevLocation, newLocation) / 1000; // Convert meters to kilometers
            //   }

            const newLog = new LocationLog({
                userId: '675d52d68d404276e2855d95',
                memberId: "675fb200a169cfd99e1ae8a8",
                location: {
                    latitude: 0,
                    longitude: 0
                },
                status: "inactive",
                // distanceTravelled: "test",
            });

            await newLog.save();
            res.status(201).json({ message: 'Location log created successfully', log: newLog });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to create location log', error });
        }
    },

    /**
     * Get location logs for a specific member
     */
    getLocationLogsByMember: async (req, res) => {
        try {
            const { memberId } = req.params;
            const logs = await LocationLog.find({ memberId }).sort({ createdAt: -1 });
            res.status(200).json(logs);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to fetch location logs', error });
        }
    },

    /**
     * Get the latest location log for a specific member
     */
    getLatestLocationLog: async (req, res) => {
        try {
            const { memberId } = req.params;
            const latestLog = await LocationLog.findOne({ memberId }).sort({ createdAt: -1 });
            if (!latestLog) {
                return res.status(404).json({ message: 'No logs found for this member' });
            }
            res.status(200).json(latestLog);
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to fetch latest location log', error });
        }
    },

    /**
     * Delete all logs for a member (e.g., cleanup)
     */
    deleteLogsByMember: async (req, res) => {
        try {
            const { memberId } = req.params;
            const result = await LocationLog.deleteMany({ memberId });
            res.status(200).json({ message: `${result.deletedCount} logs deleted successfully` });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to delete logs', error });
        }
    },

    /**
     * Get total distance travelled by a member
     */
    getTotalDistanceByMember: async (req, res) => {
        try {
            const { memberId } = req.params;

            const logs = await LocationLog.find({ memberId });
            const totalDistance = logs.reduce((acc, log) => acc + log.distanceTravelled, 0);

            res.status(200).json({ memberId, totalDistance });
        } catch (error) {
            console.error(error);
            res.status(500).json({ message: 'Failed to calculate total distance', error });
        }
    },
};

module.exports = LocationLogController;
