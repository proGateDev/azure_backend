const userModel = require("../../user/models/profile");
const memberModel = require("../../member/models/profile");
const assignmentModel = require("../../model/assignment");
const trackingHistoryModel = require("../../model/trackingHistory");
const attendanceModel = require("../../member/models/attendance");
const moment = require('moment-timezone');
const adminModel = require('../../admin/models/profile'); // Import the User model
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

//==================================================

module.exports = {


  getAllUsers: async (req, res) => {
    try {
      const users = await userModel.find({}, { name: 1, _id: 1, email: 1, isSubscribed: 1 });

      // Transform isSubscribed to 'active' or 'inactive'
      const formattedUsers = users.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email,
        isSubscribed: user.isSubscribed ? "active" : "inactive",
      }));

      console.log("-------- users ----------", formattedUsers);

      res.status(200).json({
        message: "Users found successfully",
        data: formattedUsers,
        count: formattedUsers.length,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  getUserById: async (req, res) => {
    try {
      const { userId } = req.params;

      const data = await userModel.findOne({ _id: userId });
      // console.log("-------- data ----------", data);
      jsonResponse = {
        message: "user found successfully",
        data,
        count: data.length,
      };
      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },





  getUserMembers: async (req, res) => {
    try {
      const { userId } = req.params;

      const data = await memberModel.find({ parentUser: userId });
      console.log("-------- data ----------", data);
      jsonResponse = {
        message: "user found successfully",
        count: data?.length,
        members: data,
      };
      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  getUsersMemberAssignments: async (req, res) => {
    try {

      const { startDate, endDate, memberId } = req.params;
      const parentId = req?.params?.userId;
      // console.log('parentId', req.params.userId);

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const memberAssignments = await assignmentModel.find({
        memberId: memberId,
        userId: parentId,
        assignedAt: { $gte: start, $lte: end },
        type: { $ne: 'geo-fenced' },

      })

      if (!memberAssignments || memberAssignments.length === 0) {
        return res.status(200).json({ message: 'No assignments found for the given period' });
      }
      // console.log('memberAssignments', memberAssignments);

      // Prepare the member's general information
      const memberInfo = {
        id: memberId,
        totalTasks: memberAssignments.length,
        pendingTasks: memberAssignments.filter(task => task.status === 'pending').length,
        completedTasks: memberAssignments.filter(task => task.status === 'completed').length,
        imageUrl: 'https://via.placeholder.com/150', // Replace with actual member image URL
        // address: 'Gomati Nagar, Lucknow, Uttar Pradesh, 226011', // Replace with actual member address
        tasks: memberAssignments.map(task => ({
          taskId: task._id.toString(),
          eventName: task.eventName,
          locationName: task.locationName,
          status: task.status,
          location: task.coordinates,
          date: task.assignedAt.toISOString(),
          time: task.time,
          type: task.type,
        })),
      };
      // console.log('mil to ghaya ------------------');

      res.status(200).json({
        message: 'Assignments found successfully',
        member: memberInfo,
      });

    } catch (error) {
      console.error('Error fetching user assignments:', error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  },








  getUsersMemberAssignmentById: async (req, res) => {
    try {
      // console.log('------------------------- |||');

      const { assignmentId, memberId } = req.params; // Get assignmentId and memberId from request params
      // console.log("assignmentId, memberId ---", req.params, assignmentId, memberId);

      if (!memberId) {
        return res.status(400).json({ message: "Invalid memberId" });
      }

      // Fetch the assignments by assignmentId
      const memberAssignments = await assignmentModel.find({
        _id: assignmentId,
      });

      if (!memberAssignments || memberAssignments.length === 0) {
        return res.status(404).json({ message: "No assignments found" });
      }

      // Process assignments to include tracking history if status is 'completed'
      const assignmentsWithTrackingHistory = await Promise.all(
        memberAssignments.map(async (assignment) => {
          if (assignment.status === 'completed') {
            // Fetch tracking history for this assignment
            const trackingHistory = await trackingHistoryModel.find({
              assignmentId: assignment._id,
            });

            // Map tracking history to the desired format
            console.log('trackingHistory', trackingHistory[0])
            const mappedTrackingHistory = trackingHistory.map((history) => ({

              coordinates: [history.location.coordinates[0], history.location.coordinates[1]],
              locality: history?.addressDetails?.locality || "NOT FOUND",
              timestamp: history.timestamp,
            }));

            return { ...assignment.toObject(), trackingHistory: mappedTrackingHistory };
          } else {
            return assignment.toObject(); // Return assignment as is if not completed
          }
        })
      );

      // Send the response
      res.status(200).json({
        status: 200,
        message: "Assignments found successfully",

        assignments: assignmentsWithTrackingHistory,
      });
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },











  fetchUserLiveLocation: async (req, res) => {
    try {
      const userId = req.userId; // Get the user ID from the request
      const { memberId, selectedDate } = req.params; // Extract parameters from the request

      const givenDate = new Date(selectedDate);
      const nextDay = new Date(givenDate);
      nextDay.setDate(nextDay.getDate() + 1); // Calculate the next day

      // Fetch all matching records sorted by timestamp
      const liveLocation = await trackingHistoryModel
        .find({
          memberId,
          trackingType: "live",
          timestamp: {
            $gte: givenDate,
            $lt: nextDay, // Less than the start of the next day
          },
        })
        .sort({ timestamp: -1 });

      if (!liveLocation || liveLocation.length === 0) {
        return res
          .status(200)
          .json({ error: "Live location not found for this member" });
      }

      const totalRecords = liveLocation.length;

      // Always include the first and last records
      const firstRecord = liveLocation[0];
      const lastRecord = liveLocation[totalRecords - 1];

      // Get up to 48 evenly spaced intermediate records
      const interval = Math.ceil(totalRecords / 70);
      const intermediateRecords = liveLocation.filter(
        (_, index) => index % interval === 0
      );

      // Combine first, intermediate, and last records
      const importantRecords = [
        firstRecord,
        ...intermediateRecords,
        lastRecord,
      ];

      // Remove duplicates in case of overlap
      const uniqueRecords = Array.from(
        new Set(importantRecords.map((record) => record._id.toString()))
      ).map((id) =>
        importantRecords.find((record) => record._id.toString() === id)
      );

      // Filter the response to include only required fields
      const filteredLocations = uniqueRecords.map((location) => ({
        coordinates: location.location.coordinates,
        locality: location.addressDetails.preferredAddress,
        timestamp: location.timestamp,
      }));
      const groupedData = Object.values(
        uniqueRecords.reduce((acc, location) => {
          const locality = location.addressDetails.locality || 'Unknown Locality'; // Handle missing locality
          if (!acc[locality]) {
            acc[locality] = {
              locality,
              count: 0,
              firstTimestamp: location.timestamp, // Timestamp of the first record
              records: [],
            };
          }
          acc[locality].count += 1; // Increment the count
          acc[locality].records.push({
            coordinates: location.location.coordinates,
            timestamp: location.timestamp,
          });
          return acc;
        }, {})
      ).map((group) => ({
        locality: group.locality,
        count: group.count,
        timestamp: group.firstTimestamp,
      }));

      // Return the filtered live location tracking data
      res.status(200).json({
        message: "Live location fetched successfully",
        count: filteredLocations.length,
        liveLocation: filteredLocations,
        groupedData
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },








  getMemberAttendanceById: async (req, res) => {
    try {
      const { memberId, dateRange } = req.params; // Expecting MM-YYYY format

      // Validate input
      if (!memberId || !dateRange) {
        return res.status(400).json({ success: false, message: "Missing required parameters" });
      }

      // Extract month and year from dateRange
      const [month, year] = dateRange.split("-").map(Number); // Convert to numbers

      // Validate extracted values
      if (!month || !year || month < 1 || month > 12) {
        return res.status(400).json({ success: false, message: "Invalid date range format" });
      }

      // Compute the first and last day of the given month in UTC
      const start = moment.tz({ year, month: month - 1, day: 1 }, "UTC").startOf('day');
      let end = moment.tz({ year, month: month - 1 }, "UTC").endOf('month');

      const today = moment().tz("UTC").endOf('day'); // Today's end time in UTC

      // If the requested month is the current month, limit the end date to today
      if (moment().year() === year && moment().month() + 1 === month) {
        end = today;
      }

      console.log(`Fetching attendance for memberId: ${memberId}, From: ${start}, To: ${end}`);

      // Fetch attendance records within the computed date range
      const attendanceRecords = await attendanceModel.find({
        memberId,
        createdAt: { $gte: start.toDate(), $lte: end.toDate() },
      }).sort({ createdAt: 1 });

      // Create a map of existing attendance records with full details
      const attendanceMap = new Map(
        attendanceRecords.map((record) => [
          moment(record.createdAt).tz("Asia/Kolkata").format("YYYY-MM-DD"), // Format: YYYY-MM-DD in IST
          {
            status: record.status || "present",
            punchInTime: record.punchInTime ? moment(record.punchInTime).tz("Asia/Kolkata").format("HH:mm:ss") : null,
            punchOutTime: record.punchOutTime ? moment(record.punchOutTime).tz("Asia/Kolkata").format("HH:mm:ss") : null,
          },
        ])
      );

      // Generate attendance data for the full month
      const totalDays = end.date(); // Last date of the month (or today's date if current month)
      const attendanceData = [];

      for (let day = 1; day <= totalDays; day++) {
        const date = moment.tz({ year, month: month - 1, day }, "Asia/Kolkata").format("YYYY-MM-DD");

        if (attendanceMap.has(date)) {
          // If present, return full details
          attendanceData.push({ date, ...attendanceMap.get(date) });
        } else {
          // If absent, include null values for punchInTime and punchOutTime
          attendanceData.push({ date, status: "absent", punchInTime: null, punchOutTime: null });
        }
      }


      return res.status(200).json({ success: true, data: attendanceData });
    } catch (error) {
      console.error("Error fetching attendance:", error);
      return res.status(500).json({ success: false, message: "Internal server error" });
    }
  },










  getAllRecentUsers: async (req, res) => {
    try {
      console.log('started ----');
      const recentUsers = await userModel
        .find({
          isSubscribed: true,
          isDeleted: false,
          isApproved: false
        })
        .sort({ createdAt: -1 }) // Sorting by creation date (newest first)
        .select('name email createdAt'); // Exclude isSubscribed
  
      // Map data to add accountStatus field without exposing isSubscribed
      const modifiedUsers = recentUsers.map(user => ({
        ...user.toObject(), // Convert Mongoose document to plain object
        accountStatus: 'active', // Since isSubscribed is always true in the query
        emailVerified: 'inactive'
      }));
  
      console.log('modifiedUsers', modifiedUsers);
  
      return res.status(200).json({
        success: 200,
        message: "Users found successfully.",
        count: modifiedUsers.length,
        data: modifiedUsers,
      });
    } catch (error) {
      console.error('Error fetching recent users:', error);
      return res.status(500).json({
        success: false,
        message: 'Internal Server Error'
      });
    }
  },









  
  










};
