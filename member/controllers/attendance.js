
// Punch-in for a member
const Attendance = require('../models/attendance'); // Import the attendance model
const memberModel = require('../../member/models/profile'); // Import the attendance model
const assignmentModel = require('../../model/assignment'); // Import the attendance model
const attendanceModel = require('../models/attendance');
const trackingHistoryModel = require('../../model/trackingHistory');

const moment = require('moment-timezone');

exports.markAttendance = async (req, res) => {
    try {
        const memberId = req.userId;
        const { latitude, longitude } = req.body;
        const isWithinGeofence = true;

        // Fetch member details
        const memberDetail = await memberModel.findOne({ _id: memberId });

        // Get today's date in UTC (start of day)
        const startOfTodayUTC = moment().utc().startOf('day');

        // Find assigned task
        const assignedTask = await assignmentModel.findOne({
            memberId,
            type: 'geo-fenced'
        });

        if (!assignedTask) {
            return res.status(200).json({ message: 'No assigned task found for the member.' });
        }

        const { coordinates, time } = assignedTask;
        const [startTimeStr, endTimeStr] = time.split('-');

        // Convert task times to IST
        const startTimeIST = moment.tz(startTimeStr, "HH:mm", "Asia/Kolkata");
        const endTimeIST = moment.tz(endTimeStr, "HH:mm", "Asia/Kolkata");

        // Convert IST times to UTC for comparison
        const startTimeUTC = startTimeIST.clone().tz("UTC");
        const endTimeUTC = endTimeIST.clone().tz("UTC");

        // Add grace periods
        const startGraceTimeUTC = startTimeUTC.clone().add(6, 'hours'); // 6-hour grace for punch-in
        const endGraceTimeUTC = endTimeUTC.clone().add(1, 'hour'); // 1-hour grace for punch-out

        // Get current time in UTC
        const currentTimeUTC = moment().utc();

        // Check today's attendance record
        const attendanceToday = await attendanceModel.findOne({
            memberId,
            parentId: memberDetail?.parentUser,
            createdAt: { $gte: startOfTodayUTC },
        });

        let punchInRecorded = false;
        let punchOutRecorded = false;

        if (attendanceToday) {
            // Punch-in logic
            if (isWithinGeofence && !attendanceToday.punchInTime && currentTimeUTC.isBetween(startTimeUTC, startGraceTimeUTC)) {
                punchInRecorded = true;
                await attendanceModel.findOneAndUpdate(
                    { memberId, createdAt: { $gte: startOfTodayUTC } },
                    { $set: { punchInTime: currentTimeUTC.toISOString() } }
                );
            }

            // Punch-out logic
            if (isWithinGeofence && attendanceToday.punchInTime && !attendanceToday.punchOutTime && currentTimeUTC.isBetween(endTimeUTC, endGraceTimeUTC)) {
                punchOutRecorded = true;
                await attendanceModel.findOneAndUpdate(
                    { memberId, createdAt: { $gte: startOfTodayUTC } },
                    { $set: { punchOutTime: currentTimeUTC.toISOString() } }
                );
            }
        } else {
            // Create new attendance record if punching in for the first time
            if (isWithinGeofence && currentTimeUTC.isBetween(startTimeUTC, startGraceTimeUTC)) {
                punchInRecorded = true;
                const newAttendance = new attendanceModel({
                    memberId,
                    parentId: memberDetail?.parentUser,
                    punchInTime: currentTimeUTC.toISOString(),
                });
                await newAttendance.save();
            }
        }

        // Save tracking data
        const trackingData = {
            memberId,
            location: {
                type: 'Point',
                coordinates: [latitude, longitude],
            },
            addressDetails: "", // Can add address fetching logic here
            timestamp: currentTimeUTC.toISOString(),
            trackingType: 'geo-fenced',
            isWithinGeofence,
            punchInTime: punchInRecorded ? currentTimeUTC.toISOString() : null,
            punchOutTime: punchOutRecorded ? currentTimeUTC.toISOString() : null,
        };

        const trackingHistory = new trackingHistoryModel(trackingData);
        await trackingHistory.save();

        return res.status(201).json({
            message: 'Attendance and live location updated successfully.',
            attendanceDetails: {
                punchInRecorded: {
                    punchInTime: attendanceToday?.punchInTime || (punchInRecorded ? currentTimeUTC.toISOString() : null),
                },
                punchOutRecorded: {
                    punchOutTime: attendanceToday?.punchOutTime || (punchOutRecorded ? currentTimeUTC.toISOString() : null),
                },
            }
        });
    } catch (error) {
        console.error('Error during attendance check:', error);
        return res.status(500).json({ message: 'Error during attendance check', error: error.message });
    }
};






exports.getAttendanceRecords_old = async (req, res) => {
    try {
        const { startDate, endDate } = req.params; // Extract the date range from route parameters
        const memberId = req.userId; // Extract the member ID from the authenticated user token
        console.log('startDate:', startDate, 'endDate:', endDate, 'memberId:', memberId);

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date parameters are required.' });
        }

        // Fetch the parent user (parentId) for the given memberId
        const member = await memberModel.findById(memberId).select('parentUser'); // Assuming 'parentUser' is the field name
        if (!member || !member.parentUser) {
            return res.status(404).json({ message: 'Parent user not found for the given member.' });
        }

        const parentId = member.parentUser; // Extract the parentId
        console.log('ParentId:', parentId);

        // Parse the date range for filtering
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day

        // Fetch attendance records for the given date range and parentId
        const attendanceRecords = await Attendance.find({
            memberId, // Filter by memberId
            parentId, // Match with parentId
            punchInTime: {
                $gte: start,
                $lte: end,
            },
        })
            // .populate('memberId', 'name email') // Populate member details if required
            .sort({ punchInTime: -1 }); // Sort by punch-in time, latest first

        console.log('attendanceRecords:', attendanceRecords);

        if (attendanceRecords.length === 0) {
            return res.status(404).json({ message: 'No attendance records found for the given date range.' });
        }

        return res.status(200).json({
            message: 'Attendance records retrieved successfully.',
            count: attendanceRecords.length,
            data: attendanceRecords,
        });
    } catch (error) {
        console.error('Error fetching attendance records:', error); // Log the error for debugging
        return res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
    }
};


exports.getAttendanceRecords = async (req, res) => {
    try {
        const { startDate, endDate } = req.params; // Extract the date range from route parameters
        const memberId = req.userId; // Extract the member ID from the authenticated user token
        console.log('startDate:', startDate, 'endDate:', endDate, 'memberId:', memberId);

        if (!startDate || !endDate) {
            return res.status(400).json({ message: 'Start date and end date parameters are required.' });
        }

        // Fetch the parent user (parentId) for the given memberId
        const member = await memberModel.findById(memberId).select('parentUser'); // Assuming 'parentUser' is the field name
        if (!member || !member.parentUser) {
            return res.status(404).json({ message: 'Parent user not found for the given member.' });
        }

        const parentId = member.parentUser; // Extract the parentId
        console.log('ParentId:', parentId);

        // Parse the date range for filtering
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0); // Start of the day
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999); // End of the day

        // Fetch attendance records for the given date range and parentId
        const attendanceRecords = await Attendance.find({
            memberId, // Filter by memberId
            parentId, // Match with parentId
            punchInTime: {
                $gte: start,
                $lte: end,
            },
        })
            .sort({ punchInTime: -1 }); // Sort by punch-in time, latest first

        console.log('attendanceRecords:', attendanceRecords);

        // Prepare response for each day in the date range
        const response = [];
        const currentDate = new Date(start);

        while (currentDate <= end) {
            const dateStr = currentDate.toISOString().split('T')[0]; // Format date as YYYY-MM-DD
            const recordForDate = attendanceRecords.find((record) => {
                const recordDate = new Date(record.punchInTime).toISOString().split('T')[0];
                return recordDate === dateStr;
            });

            if (recordForDate) {
                response.push({
                    date: dateStr,
                    status: 'present',
                    punchInTime: recordForDate.punchInTime,
                    punchOutTime: recordForDate.punchOutTime,
                    otherFields: recordForDate.otherFields, // Add other necessary fields
                });
            } else {
                response.push({
                    date: dateStr,
                    status: 'absent',
                });
            }

            // Move to the next day
            currentDate.setDate(currentDate.getDate() + 1);
        }

        return res.status(200).json({
            message: 'Attendance records retrieved successfully.',
            count: response.length,
            data: response,
        });
    } catch (error) {
        console.error('Error fetching attendance records:', error); // Log the error for debugging
        return res.status(500).json({ message: 'Error fetching attendance records', error: error.message });
    }
};
