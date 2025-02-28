const trackingHistoryModel = require("../../model/trackingHistory");
const userModel = require("../../user/models/profile");
const memberModel = require("../models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const admin = require("firebase-admin");
const assignmentModel = require("../../model/assignment");

//==================================================

module.exports = {
  getMemberSubUsers: async (req, res) => {
    try {
      const memberId = req.userId; // Assuming you get memberId from the request

      // Step 1: Find the member and populate the parentUser field
      const memberData = await memberModel.findOne({ _id: memberId }).populate("parentUser");

      if (!memberData) {
        return res.status(404).json({ message: "Member not found" });
      }

      const { channelId } = memberData;

      // Step 2: Find all team members in the same channel
      const team = await memberModel.find({ channelId }, "name mobile locationStatus");

      if (!team.length) {
        return res.status(404).json({ message: "No team members found" });
      }

      // Step 3: Fetch the latest tracking history for each team member
      const teamWithLastLocation = await Promise.all(
        team?.map(async (member) => {
          const latestTracking = await trackingHistoryModel
            .findOne({ memberId: member?._id })
            .sort({ timestamp: -1 }) // Sort by updatedAt in descending order
            .select("addressDetails.locality timestamp"); // Only fetch location and updatedAt fields

          console.log('latestTracking', latestTracking);



          return {
            id: member.id,
            name: member.name,
            mobile: member.mobile,
            locationStatus: member.locationStatus,
            lastUpdated: latestTracking ? latestTracking?.timestamp : null,
            lastLocation: latestTracking ? latestTracking?.addressDetails?.locality : null,
          };
        })
      );

      // Step 4: Respond with the processed data
      res.status(200).json({
        message: "Team members retrieved successfully",
        team: teamWithLastLocation,
        count: teamWithLastLocation.length,
      });
    } catch (error) {
      console.error("Error fetching member colleagues:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },




  getMembersTeamLastLocation: async (req, res) => {
    try {

      // Extract user ID from the token (assumes middleware sets req.userId)
      const memberId = req.userId;

      // Find all members associated with the user
      const membersDetails = await memberModel.findOne({ id: memberId });
      const membersParentDetail = await userModel.findOne({ id: membersDetails?.parentUser });
      console.log('---- chala -',);

      const members = await memberModel.find({ parentUser: membersParentDetail?.id });
      // Fetch the latest location for each member from the trackingHistories model
      // console.log('members',members);
      const memberLocations = await Promise.all(
        members?.map(async (member) => {
          // Find the latest tracking record for the member
          const latestTracking = await trackingHistoryModel
            .findOne({ memberId: member._id })
            .sort({ timestamp: -1 }); // Sort by createdAt descending to get the latest
          // console.log("latestTracking", latestTracking.addressDetails.locality);

          return {
            memberId: member._id,
            name: member.name,
            lastLocation: latestTracking ? latestTracking.location : null, // Ensure location exists in schema
            time: latestTracking ? latestTracking.timestamp : null,
            location: latestTracking?.addressDetails?.locality,
          };
        })
      );



      let memberLocations_new = memberLocations.filter(
        (x) => x?.lastLocation != null
      );
      return res.status(200).json({
        success: true,
        data: memberLocations_new,
      });
    } catch (error) {
      console.error("Error fetching members' last locations:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch members' last locations.",
      });
    }
  },




  getMemberSubUsersById: async (req, res) => {
    try {
      // Extract the teamMemberId from the request parameters
      const { teamMemberId } = req.params; // Assuming teamMemberId is passed as a URL parameter (e.g. /member/:teamMemberId)

      if (!teamMemberId) {
        return res.status(400).json({
          success: false,
          message: 'teamMemberId is required.',
        });
      }

      // Find the member by their teamMemberId
      const member = await memberModel.findById(teamMemberId);

      if (!member) {
        return res.status(404).json({
          success: false,
          message: 'Member not found.',
        });
      }

      // Return the member details
      return res.status(200).json({
        success: true,
        message: 'Member found successfully.',
        data: member,
      });
    } catch (error) {
      console.error('Error fetching member by ID:', error);
      return res.status(500).json({
        success: false,
        message: 'An error occurred while fetching the member.',
      });
    }
  },









  sendSosToMemberById: async (req, res) => {
    try {
      console.log("  sendSosToMemberById ---------");

      const { memberId } = req.params;
      const userId = req.userId;
      const memberDetails = await memberModel.findOne({ _id: memberId });
      const parentUserDetails = await userModel.findOne({ _id: userId });



      // Prepare the FCM message payload
      // {
      //   "to": "<FCM_TOKEN>",
      //   "data": {
      //     "action": "startTracking"
      //   },
      //   "priority": "high", // Necessary for immediate background processing
      //   "content_available": true
      // }

      const payload = {
        notification: {
          title: "SOS Alert",
          body: `${parentUserDetails?.name} Is Sending SOS To You`,

        },
        android: {
          notification: {
            sound: "sos"
          }
        },

        data: {
          type: "SOS",
        }
      };

      // Loop over each memberId and send SOS individually
      let successCount = 0;
      let failureCount = 0;
      const responses = [];



      if (memberDetails && memberDetails.fcmToken) {
        try {
          // Send notification to the member
          const response = await admin.messaging().send({
            token: memberDetails.fcmToken,
            ...payload,
          });

          // Increment success count
          successCount++;
          responses.push({ memberId, success: true, response });
        } catch (error) {
          // Increment failure count
          failureCount++;
          responses.push({ memberId, success: false, error: error.message });
        }
      } else {
        failureCount++;
        responses.push({
          memberId,
          success: false,
          error: "No valid FCM token",
        });
      }


      return res.status(200).json({
        message: `SOS sent to ${successCount} members. ${failureCount} failed.`,
        details: responses,
      });
    } catch (error) {
      console.error("Error sending SOS:", error);
      return res.status(500).json({
        error: "Failed to send SOS notification",
        details: error.message,
      });
    }
  },




  requestLiveLocationForTeamMemberById: async (req, res) => {
    try {
      console.log("requestLiveLocationForMemberById -----");

      const { memberId } = req.params;
      const userId = req.userId;
      const memberDetails = await memberModel.findOne({ _id: memberId });

      const parentUserDetails = await userModel.findOne({ _id: userId });

      // Validate request

      // Prepare the FCM message payload
      // {
      //   "to": "<FCM_TOKEN>",
      //   "data": {
      //     "action": "startTracking"
      //   },
      //   "priority": "high", // Necessary for immediate background processing
      //   "content_available": true
      // }

      const payload = {
        notification: {
          title: "Live Location",
          body: `${parentUserDetails?.name} Is Requesting Your Live Location .`,
        },
        data: {
          type: "LiveLocationSharing",
        },
      };

      // Loop over each memberId and send SOS individually
      let successCount = 0;
      let failureCount = 0;
      const responses = [];

      // Fetch FCM token for each member
      const member = await memberModel.findOne(
        { _id: memberId },
        { fcmToken: 1 }
      );

      if (memberDetails && memberDetails.fcmToken) {
        try {
          // Send notification to the member
          const response = await admin.messaging().send({
            token: member.fcmToken,
            ...payload,
          });

          // Increment success count
          successCount++;
          responses.push({ memberId, success: true, response });
        } catch (error) {
          // Increment failure count
          failureCount++;
          responses.push({ memberId, success: false, error: error.message });
        }
      } else {
        failureCount++;
        responses.push({
          memberId,
          success: false,
          error: "No valid FCM token",
        });
      }


      return res.status(200).json({
        message: `Requested Live Location to ${successCount} members. ${failureCount} failed.`,
        details: responses,
      });
    } catch (error) {
      console.error("Error sending requesting location:", error);
      return res.status(500).json({
        error: "Failed to request location notification",
        details: error.message,
      });
    }
  },





  fetchTeamMemberLiveLocationInsightReport: async (req, res) => {
    try {
      // const mem = req.userId; // Assuming userId is available in the request object
      const { selectedDate, locationType } = req.body; // Extract memberId and selectedDate from request params
      let { memberId } = req.body; // Extract memberId and selectedDate from request params
      // console.log('memberId', memberId);
      if (memberId === 'null') { memberId = req?.userId }

      console.log("Selected Date:", selectedDate);

      // Parse the given date and calculate the next day
      const givenDate = new Date(selectedDate);
      const nextDay = new Date(givenDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const memberDetails = await memberModel.findOne({ _id: memberId });
      // Fetch live location data from the database
      const liveLocation = await trackingHistoryModel
        .find({
          memberId,
          trackingType: "live",
          timestamp: {
            $gte: givenDate, // Greater than or equal to the given date
            $lt: nextDay, // Less than the start of the next day
          },
        })
        .sort({ timestamp: -1 }); // Sort in descending order by timestamp

      const downloadReportData = liveLocation.map((item) => {
        const formattedTimestamp = new Intl.DateTimeFormat("en-US", {
          year: "numeric",
          month: "long",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }).format(new Date(item.timestamp));
        return {
          address: item.addressDetails.address,
          locality: item.addressDetails.locality,
          street: item.addressDetails.street,
          neighborhood: item.addressDetails.neighborhood,
          region: item.addressDetails.region,
          district: item.addressDetails.district,
          country: item.addressDetails.country,
          timestamp: formattedTimestamp,
        };
      });

      // Handle case where no live location data is found
      if (!liveLocation || liveLocation.length === 0) {
        return res
          .status(200)
          .json({ error: "Live location not found for this member" });
      }

      const counts = liveLocation.reduce((acc, location) => {
        // Check based on locationType
        // console.log("locationType", locationType);

        if (locationType === "locality") {
          // Use locality if locationType is 'locality'
          const locality = location.addressDetails?.locality || "Unknown"; // Default to 'Unknown' if locality is missing
          acc[locality] = (acc[locality] || 0) + 1;
        } else if (locationType === "district") {
          // Use district if locationType is 'district'
          const district = location.addressDetails?.district || "Unknown"; // Default to 'Unknown' if district is missing
          acc[district] = (acc[district] || 0) + 1;
        } else if (locationType === "street") {
          // Use district if locationType is 'district'
          const district = location.addressDetails?.street || "Unknown"; // Default to 'Unknown' if district is missing
          acc[district] = (acc[district] || 0) + 1;
        } else if (locationType === "neighborhood") {
          // Use district if locationType is 'district'
          const district = location.addressDetails?.neighborhood || "Unknown"; // Default to 'Unknown' if district is missing
          acc[district] = (acc[district] || 0) + 1;
        }

        return acc;
      }, {});

      const totalCount = liveLocation.length;

      const pieChartData = Object.entries(counts).map(([country, count]) => ({
        name: country,
        count, // Include the frequency of this country
        percentage: ((count / totalCount) * 100).toFixed(2), // Convert count to percentage
        color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
        legendFontColor: "#333",
        legendFontSize: 14,
      }));

      // Return the live location tracking data along with pie chart data
      res.status(200).json({
        message: "Live location fetched successfully",
        pieChartData,
        downloadReportData,
      });
    } catch (error) {
      console.error("Error fetching live location:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  },








  getMemberTeamAssignments: async (req, res) => {
    try {
      console.log('- getMemberTeamAssignments ------------->>>');

      const { startDate, endDate, } = req.params; // Get startDate and endDate from request params

      let { teamMemberId } = req.params; // Extract memberId and selectedDate from request params
      // console.log('memberId', memberId);
      if (teamMemberId === 'null') { teamMemberId = req?.userId }
      console.log('- teamMemberId:', teamMemberId);


      const memberDetail = await memberModel.findOne({ _id: teamMemberId });
      const parentId = memberDetail?.parentUser;

      const start = new Date(startDate);
      const end = new Date(endDate);

      // console.log('- ||||||||||||||| _______:',memberDetail.parentUser);
      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      const memberAssignments = await assignmentModel.find({
        memberId: teamMemberId,
        userId: parentId,
        assignedAt: { $gte: start, $lte: end }, // Filter by assignmentDate within the date range
        type: { $ne: 'geo-fenced' }, // Exclude tasks where type is 'daily'

      })
      console.log('memberAssignments', parentId, memberAssignments);

      if (!memberAssignments || memberAssignments.length === 0) {
        return res.status(200).json({ message: 'No assignments found for the given period' });
      }
      // console.log('memberAssignments', memberAssignments);

      // Prepare the member's general information
      const memberInfo = {
        id: teamMemberId,
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

};
