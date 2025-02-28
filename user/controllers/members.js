const userModel = require("../models/profile");
const memberModel = require("../../member/models/profile");
const notificationModel = require("../../model/notification");
const superAdminCreationValidation = require("../validation/superAdminCreation");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const XLSX = require("xlsx");
// const sendMail = require("../../service/email");
const sendMail = require("../../service/sgMail");
const clientURL = require("../../constant/endpoint");
const { generatePassword, encryptPassword } = require("../../util/auth");

const socketService = require("../../service/socket");
const {
  sendNotification,
  sendServerDetailToClient,
} = require("../../service/socket");
const mongoose = require("mongoose");
const trackingHistoryModel = require("../../model/trackingHistory");
const attendanceModel = require("../../member/models/attendance");
const moment = require("moment"); // For handling date calculations
const assignmentModel = require("../../model/assignment");
const channelMemberModel = require("../../model/channelsMembers");
const admin = require("firebase-admin");

//==================================================
module.exports = {
  // getUserMembers: async (req, res) => {
  //   try {
  //     const userId = req.userId;
  //     console.log('------------- getUserMembers --------',userId);

  //     const userData = await memberModel.find({ parentUser: userId });

  //     if (!userData) {
  //       return res.status(404).json({
  //         status: 404,
  //         message: "No members added yet, please add members to track them."
  //       });
  //     }

  //     res.status(200).json({
  //       status: 200,
  //       message: "Members found successfully",
  //       members: userData,
  //       count: userData.length
  //     });
  //   } catch (error) {
  //     console.error("Error fetching user data:", error);
  //     res.status(500).json({ error: "Internal Server Error" });
  //   }
  // },



  getUserMembers: async (req, res) => {
    try {
      const userId = mongoose.Types.ObjectId(req.userId); // Convert the userId to ObjectId

      // Fetch all members for the user
      const members = await memberModel.find({ parentUser: userId }, "name mobile email locationStatus channelId");

      if (!members.length) {
        return res.status(404).json({
          status: 404,
          message: "No members added yet, please add members to track them.",
        });
      }

      // Fetch the latest tracking history for each member
      const membersWithLastLocation = await Promise.all(
        members.map(async (member) => {

          console.log('member',member);
          
          const latestTracking = await trackingHistoryModel
            .findOne({ memberId: member._id })
            .sort({ timestamp: -1 }) // Sort by updatedAt in descending order
            .select("addressDetails.locality timestamp"); // Only fetch location and updatedAt fields
          let isMemberVerified = await memberModel.findOne({
            _id: member.id,
          })
          return {
            memberId: member.id,
            name: member.name,
            mobile: member.mobile,
            email: member.email,
            locationStatus: member.locationStatus,
            channelId: member.channelId,
            location: member.location,
            // lastLocation: latestTracking ? latestTracking.location : null,
            lastUpdated: latestTracking ? latestTracking?.timestamp : null,
            // lastUpdated: latestTracking ? new Date(latestTracking.timestamp).toLocaleString() : null,
            verificationStatus: isMemberVerified?.isApproved ? 'active' : "inactive",
            lastLocation: latestTracking ? latestTracking?.addressDetails?.locality : null,
          };
        })
      );

      res.status(200).json({
        status: 200,
        message: "Members found successfully",
        members: membersWithLastLocation,
        count: membersWithLastLocation.length,
      });
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  createUserMember: async (req, res) => {
    try {
      const userId = req.userId;
      let membersData = [];

      //============ AUTO uploading members ======================
      if (req.file) {
        const workbook = XLSX.readFile(req.file.path);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        membersData = XLSX.utils.sheet_to_json(worksheet);
      }
      //============ MANUAL uploading members ======================
      else if (req.body && Object.keys(req.body).length > 0) {
        // Check if req.body is not empty
        membersData = req.body;
      } else {
        return res.status(400).json({
          status: 400,
          message: "No file or member data provided",
        });
      }

      const createdMembers = [];
      const password = generatePassword();
      // const password = '1234'
      // const passwordEncrypted = await encryptPassword()
      const passwordEncrypted = await bcrypt.hash(password, 10);

      console.log("membersData", membersData);

      for (const memberData of membersData) {
        if (!memberData?.name || !memberData?.email || !memberData?.mobile) {
          return res.status(400).json({
            status: 400,
            message: "Missing required fields in data",
          });
        }

        // Send email after creating the member
        try {
          const newMember = await memberModel.create({
            ...memberData,
            parentUser: userId,
            password: passwordEncrypted,
          });
          // console.log('newMember', newMember);

          const notifyTo = await notificationModel.create({
            userId,
            message: `You have added a new member: ${memberData?.name}`,
            isRead: false,
          });

          const addingToMemberToChannel = await channelMemberModel.create({
            channelId: newMember?.channelId,
            memberId: newMember?._id,
            addedBy: newMember?.parentUser,
            addedByModel: "user",
            message: `You have added a new member: ${memberData?.name}`,
          });

          createdMembers.push(newMember);
          const parentUser = await userModel.findOne({ _id: userId });
          console.log('parentUser', userId, parentUser);

          if (newMember && notifyTo && addingToMemberToChannel) {
            const verificationToken = jwt.sign(
              {
                email: memberData?.email,
                userId: newMember?._id,
                parentUserId: userId,
                parentUserName: parentUser?.name,
                memberName: newMember?.name,
              },
              process.env.JWT_SECRET, // Secret key from your environment variables
              { expiresIn: "360m" } // Token expiration time
            );

            const verificationLink = `${clientURL}/verify-email?token=${verificationToken}`;
            const messageData = {
              from: {
                email: "<nischal@progatetechnology.com>",
                name: "DigiCare4U",
              },
              // from: '<nischal@progatetechnology.com>',
              to: memberData?.email,
              subject: "Welcome to DigiCare4u! Please Verify Your Email",
              html: `
                            <div style="max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden; font-family: Arial, sans-serif; color: #333;">
                                <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                                    <h1 style="color: white; margin: 0;">DigiCare4u</h1>
                                    <p style="color: #f0f0f0;">Your well-being, our priority.</p>
                                </div>
                                <div style="padding: 20px;">
                                    <h2 style="color: #4CAF50;">Welcome, ${memberData?.name
                }!</h2>
                                    <p>Thank you for joining DigiCare4u! To get started, please verify your email address by clicking the button below and use the password for first time login:</p>
                                    <p>Password : <strong>${password}</strong></p>
                                    <a href=${verificationLink} 
                                       style="display: inline-block; margin: 20px 0; padding: 12px 25px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; font-weight: bold;">
                                      Verify Email
                                    </a>
                                    <h3 style="color: #4CAF50;">What Can You Do with DigiCare4u?</h3>
                                    <ul style="list-style-type: disc; margin-left: 20px;">
                                      <li>📍 Monitor locations in real-time</li>
                                      <li>⚠️ Receive instant alerts in emergencies</li>
                                      <li>🤝 Stay connected with family and friends</li>
                                    </ul>
                                    <p>If you have any questions or need assistance, feel free to reach out!</p>
                                    <p style="margin-top: 20px;">Best regards,<br>The DigiCare4u Team</p>
                                </div>
                                <footer style="background-color: #f9f9f9; padding: 10px; text-align: center; font-size: 0.8em; color: #777;">
                                    <p>&copy; ${new Date().getFullYear()} DigiCare4u. All rights reserved.</p>
                                </footer>
                            </div>
                        `,
            };

            await sendMail(messageData);
            // console.log('verification link ----:', verificationLink);

            // sendNotification(userId, `You have added a new member: ${memberData?.name}`);
            // sendServerDetailToClient(` --------- server se aaya mera DOST ---------------- : ${memberData?.name}`);

            res.status(201).json({
              message: "Members imported successfully",
              members: createdMembers,
              verificationToken,
            });
          } else {
            return res.status(500).json({
              status: 500,
              message: "Error saving members to the database",
            });
          }

          // console.log(` ---------- Email sent ----------------- `,memberData.email);
        } catch (emailError) {
          console.error(
            `Failed to send email to ${memberData.email}:`,
            emailError
          );
          if (emailError.code === 11000 && emailError.keyPattern?.email) {
            console.error(`Duplicate email error for ${memberData.email}`);
            return res.status(409).json({
              status: 409,
              message: `The email address "${memberData.email}" is already in use.`,
            });
          }
        }
      }

      // res.status(201).json({
      //   message: "Members imported successfully",
      //   members: createdMembers,
      // });
    } catch (error) {
      console.error("Error importing members:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  getUserMemberById: async (req, res) => {
    try {
      const userId = req.userId; // Get the logged-in user's ID from the request
      const memberId = req?.params?.memberId; // Get the memberId from the route parameters
  
      // Find the member by ID, ensuring that it belongs to the user
      const memberData = await memberModel.findOne(
        { _id: memberId, parentUser: userId },
        { 
          _id: 1, 
          name: 1, 
          email: 1, 
          phone: 1, 
          mobile: 1, 
          isApproved: 1, 
          createdAt: 1,
          locationStatus: 1, 
        }
      );
  
      if (!memberData) {
        return res.status(404).json({
          status: 404,
          message: "Member not found or does not belong to the current user.",
        });
      }
  
      // Fetch the last recorded location from trackingHistory
      const lastLocation = await trackingHistoryModel.findOne(
        { memberId: memberId }, 
        { addressDetails: 1, createdAt: 1 }, // Select only necessary fields
        { sort: { timestamp: -1 } } // Get the most recent entry
      );
  
      res.status(200).json({
        status: 200,
        message: "Member found successfully",
        member: {
          ...memberData.toObject(), // Convert Mongoose document to a plain object
          lastLocation: lastLocation?.addressDetails?.locality || null, // Add last location if found, otherwise null
        },
      });
    } catch (error) {
      console.error("Error fetching member data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },
  
  
  deleteUserMemberById: async (req, res) => {
    try {
      const userId = req.userId; // Get the logged-in user's ID from the request
      const memberId = req?.params?.memberId; // Get the memberId from the route parameters

      // Find and update the member's isDeleted field
      const memberData = await memberModel.findOneAndUpdate(
        { _id: memberId },
        { isDeleted: true },
        { new: true }
      );

      const memberChannelData = await channelMemberModel.findOneAndUpdate(
        { memberId: memberId },
        { isDeleted: true },
        { new: true }
      );

      if (!memberData) {
        return res.status(404).json({
          status: 404,
          message: "Member not found or does not belong to the current user.",
        });
      }

      res.status(200).json({
        status: 200,
        message: "Member marked as deleted successfully",
        member: memberData,
      });
    } catch (error) {
      console.error("Error updating member data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  getUserMemberDailyTransit: async (req, res) => {
    const { memberId } = req.params;
    const { date } = req.query;

    console.log("memberId 672b1a0a2c602f29a52ca408", memberId);

    if (!memberId || !date) {
      return res.status(400).json({ error: "Member ID and date are required" });
    }

    try {
      // Parse the date and get the start and end of the day
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Query database for locations within the specified date range
      const locationsGroupedByLocality = await trackingHistoryModel.aggregate([
        // Step 1: Match entries for the given memberId and day range
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        // Step 2: Group by locality
        {
          $group: {
            _id: "$locality", // Group by locality
            // entries: { $push: "$$ROOT" }, // Include all documents in the group
            count: { $sum: 1 }, // Count the number of entries for each locality
            averageTimestamp: { $avg: { $toLong: "$timestamp" } }, // Calculate average timestamp
            locations: { $push: "$location.coordinates" }, // Include all location coordinates
          },
        },
        // Step 3: Sort the groups by count or other criteria
        {
          $sort: { count: -1 }, // Sort by count in descending order
        },
      ]);

      const resultWithDates = locationsGroupedByLocality.map((group) => ({
        ...group,
        averageTimestamp: new Date(group.averageTimestamp).toISOString(), // Convert to ISO Date string
      }));

      console.log(resultWithDates);

      let finalData = resultWithDates.filter((item) => item._id != null);

      console.log(locationsGroupedByLocality);

      res.json({
        status: 200,
        count: locationsGroupedByLocality.length,
        data: finalData,
        message: "Location found successfully",
      });
    } catch (error) {
      console.error("Error fetching locations: ", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching locations." });
    }
  },

  getUserMemberDailyTransitActivityFrequency: async (req, res) => {
    try {
      console.log("getUserMemberDailyTransitActivityFrequency");

      const memberId = req.userId;
      const { date } = req.body;

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const result = await trackingHistoryModel.aggregate([
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startDate, $lt: endDate },
          },
        },
        {
          $group: {
            _id: "$locality",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Filter out the result containing _id as null
      const filteredResult = result.filter((item) => item._id !== null);

      res.json({
        status: 200,
        data: filteredResult,
      });
    } catch (error) {
      res.status(404).json({
        status: 400,
        message: "Failed to fetch visit frequencies",
      });
    }
  },

  getUserMemberDailyTransitActivityFrequency_: async (req, res) => {
    try {
      // const memberId = req.userId;
      const { date, memberId } = req.body;
      console.log(
        "getUserMemberDailyTransitActivityFrequency_ _____________",
        memberId
      );

      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const result = await trackingHistoryModel.aggregate([
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startDate, $lt: endDate },
          },
        },
        {
          $group: {
            _id: "$locality",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Filter out the result containing _id as null
      const filteredResult = result.filter((item) => item._id !== null);

      res.json({
        status: 200,
        data: filteredResult,
      });
    } catch (error) {
      res.status(404).json({
        status: 400,
        message: "Failed to fetch visit frequencies",
      });
    }
  },

  getTodayAttendance_: async (req, res) => {
    try {
      console.log("parentId");
      const parentId = req.userId; // Assuming user info is added to the request via middleware

      // Get today's start and end time using new Date()
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0); // Set to start of the day (00:00:00)

      const endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999); // Set to end of the day (23:59:59)
      console.log(startOfDay, endOfDay);

      // Fetch all members belonging to the parent user
      const allMembers = await memberModel.find({ parentUser: parentId });

      // Fetch attendance records for today for these members based on `createdAt`
      const attendanceRecords = await attendanceModel
        .find({
          parentId,
          createdAt: { $gte: startOfDay, $lte: endOfDay },
        })
        .sort({ createdAt: 1 }); // Sort by createdAt to get records in chronological order

      // Fetch member details for attendance records
      const memberDetailsMap = new Map();

      // Query member details for all `memberId` in attendanceRecords
      const memberIds = attendanceRecords.map((record) => record.memberId);
      const members = await memberModel.find({ _id: { $in: memberIds } });

      members.forEach((member) => {
        memberDetailsMap.set(member._id.toString(), member);
      });

      // Separate members who have attended and those who haven't
      const attendedMemberIds = new Set(
        attendanceRecords.map((record) => record.memberId.toString())
      );

      const attendedMembers = attendanceRecords.map((record) => {
        const totalHours = record.totalWorkHours || 0;
        const status = record.punchOutTime ? "present" : "in-progress";
        const memberDetail = memberDetailsMap.get(record.memberId.toString());

        return {
          _id: record._id,
          memberId: record.memberId,
          name: memberDetail?.name || "Unknown",
          email: memberDetail?.email || "Unknown",
          punchInTime: record.punchInTime,
          punchOutTime: record.punchOutTime,
          totalWorkHours: totalHours,
          locationDuringPunchIn: record.locationDuringPunchIn,
          locationDuringPunchOut: record.locationDuringPunchOut,
          status,
        };
      });

      // Filter out members who have not marked attendance
      const notMarkedAttendance = allMembers
        .filter((member) => !attendedMemberIds.has(member._id.toString()))
        .map((member) => ({
          memberId: member._id,
          name: member.name,
          email: member.email,
          status: "not-marked",
        }));

      // Combine attended and not marked attendance
      const allAttendance = [...attendedMembers, ...notMarkedAttendance];

      return res.status(200).json({
        success: true,
        attendance: allAttendance,
      });
    } catch (error) {
      console.error("Error fetching today's attendance:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch attendance data.",
      });
    }
  },

  getChannelMembersAttendance: async (req, res) => {
    const { ObjectId } = require("mongoose").Types;

    try {
      const parentId = req.userId; // Assuming user info is added to the request via middleware
      const { startDate, endDate, channelId } = req.query;

      // Validate if channelId is provided
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: "Channel ID is required.",
        });
      }

      let startOfDay, endOfDay;

      // If the date range is provided, use it; otherwise, default to today's date
      if (startDate && endDate) {
        startOfDay = new Date(startDate);
        endOfDay = new Date(endDate);
      } else {
        // Default to today's date range if no date range is provided
        startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

        endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
      }

      // Fetch all members belonging to the parent user and the specified channel
      const channelMembers = await channelMemberModel
        .find({ addedBy: parentId, channelId })
        .populate("memberId");

      if (!channelMembers.length) {
        return res.status(404).json({
          success: false,
          message: "No members found for the specified channel.",
        });
      }

      // Extract member IDs for attendance query
      const memberIds = channelMembers.map((member) =>
        ObjectId(member.memberId._id)
      );

      // Fetch attendance records for the given date range for these members
      const attendanceRecords = await attendanceModel.find({
        parentId,
        memberId: { $in: memberIds },
        punchInTime: { $gte: startOfDay, $lte: endOfDay },
      });

      // Map member details for attendance records
      const memberDetailsMap = new Map();
      channelMembers.forEach((member) => {
        const { _id, name, email } = member.memberId;
        memberDetailsMap.set(_id.toString(), { name, email });
      });

      // Separate members who have attended and those who haven't
      const attendedMemberIds = new Set(
        attendanceRecords.map((record) => record.memberId.toString())
      );

      const attendedMembers = attendanceRecords.map((record) => {
        const memberDetail = memberDetailsMap.get(record.memberId.toString());

        return {
          _id: record._id,
          memberId: record.memberId,
          name: memberDetail?.name || "Unknown",
          email: memberDetail?.email || "Unknown",
          punchInTime: record.punchInTime,
          punchOutTime: record.punchOutTime,
          totalWorkHours: record.totalWorkHours || 0,
          locationDuringPunchIn: record.locationDuringPunchIn,
          locationDuringPunchOut: record.locationDuringPunchOut,
          status: record.punchOutTime ? "present" : "in-progress",
        };
      });

      const notMarkedAttendance = channelMembers
        .filter(
          (member) => !attendedMemberIds.has(member.memberId._id.toString())
        )
        .map((member) => {
          const { _id, name, email } = member.memberId;
          return {
            memberId: _id,
            name: name || "Unknown",
            email: email || "Unknown",
            status: "absent",
          };
        });

      // Combine attended and not marked attendance
      const allAttendance = [...attendedMembers, ...notMarkedAttendance];

      return res.status(200).json({
        success: true,
        count: allAttendance.length,
        attendance: allAttendance,
      });
    } catch (error) {
      console.error("Error fetching channel attendance data:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch attendance data.",
      });
    }
  },

  // getChannelMembersAttendance_new: async (req, res) => {
  //   const { ObjectId } = require('mongoose').Types;

  //   try {
  //     const parentId = req.userId; // Assuming user info is added to the request via middleware
  //     const { startDate, endDate, channelId } = req.query;

  //     // Validate if channelId is provided
  //     if (!channelId) {
  //       return res.status(400).json({
  //         success: false,
  //         message: 'Channel ID is required.',
  //       });
  //     }

  //     let startOfDay, endOfDay;

  //     // If the date range is provided, use it; otherwise, default to today's date
  //     if (startDate && endDate) {
  //       startOfDay = new Date(startDate);
  //       endOfDay = new Date(endDate);
  //     } else {
  //       // Default to today's date range if no date range is provided
  //       startOfDay = new Date();
  //       startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

  //       endOfDay = new Date();
  //       endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
  //     }

  //     // Fetch all members belonging to the parent user and the specified channel
  //     const channelMembers = await channelMemberModel
  //       .find({ addedBy: parentId, channelId })
  //       .populate('memberId');

  //     if (!channelMembers.length) {
  //       return res.status(404).json({
  //         success: false,
  //         message: 'No members found for the specified channel.',
  //       });
  //     }

  //     // Extract member IDs for attendance query
  //     const memberIds = channelMembers.map((member) => ObjectId(member.memberId._id));

  //     // Fetch attendance records for the given date range for these members
  //     const attendanceRecords = await attendanceModel.find({
  //       parentId,
  //       memberId: { $in: memberIds },
  //       punchInTime: { $gte: startOfDay, $lte: endOfDay },
  //     });

  //     // Generate an array of dates for the specified range
  //     const getDateArray = (start, end) => {
  //       const dateArray = [];
  //       let currentDate = new Date(start);
  //       while (currentDate <= end) {
  //         dateArray.push(new Date(currentDate));
  //         currentDate.setDate(currentDate.getDate() + 1);
  //       }
  //       return dateArray;
  //     };

  //     const dateArray = getDateArray(startOfDay, endOfDay);

  //     // Map member details with attendance data
  //     const result = channelMembers.map((member) => {
  //       const { _id, name, email } = member.memberId;

  //       // Filter attendance records for the current member
  //       const memberAttendance = attendanceRecords.filter(
  //         (record) => record.memberId.toString() === _id.toString()
  //       );

  //       let totalPresent = 0;
  //       let totalAbsent = 0;

  //       // Create attendance data for each date in the range
  //       const records = dateArray.map((date) => {
  //         const formattedDate = date.toISOString().split('T')[0]; // Get YYYY-MM-DD format
  //         const attendanceForDate = memberAttendance.find(
  //           (record) => new Date(record.punchInTime).toISOString().split('T')[0] === formattedDate
  //         );

  //         if (attendanceForDate) {
  //           totalPresent++;
  //         } else {
  //           totalAbsent++;
  //         }

  //         return {
  //           date: formattedDate,
  //           status: attendanceForDate ? 'present' : 'absent',
  //         };
  //       });

  //       return {
  //         memberId: _id,
  //         name: name || 'Unknown',
  //         email: email || 'Unknown',
  //         totalPresent,
  //         totalAbsent,
  //         data: records,
  //       };
  //     });

  //     return res.status(200).json({
  //       success: true,
  //       count: result.length,
  //       attendance: result,
  //     });
  //   } catch (error) {
  //     console.error('Error fetching channel attendance data:', error);
  //     return res.status(500).json({
  //       success: false,
  //       message: 'Unable to fetch attendance data.',
  //     });
  //   }
  // },

  getChannelMembersAttendance_new: async (req, res) => {
    const { ObjectId } = require("mongoose").Types;

    try {
      const parentId = req.userId; // Assuming user info is added to the request via middleware
      const { startDate, endDate, channelId } = req.query;

      // Validate if channelId is provided
      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: "Channel ID is required.",
        });
      }

      let startOfDay, endOfDay;

      // If the date range is provided, use it; otherwise, default to today's date
      if (startDate && endDate) {
        startOfDay = new Date(startDate);
        endOfDay = new Date(endDate);
      } else {
        // Default to today's date range if no date range is provided
        startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0); // Start of the day (00:00:00)

        endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999); // End of the day (23:59:59)
      }

      // Fetch all members belonging to the parent user and the specified channel
      const channelMembers = await channelMemberModel
        .find({ addedBy: parentId, channelId })
        .populate("memberId");

      if (!channelMembers.length) {
        return res.status(200).json({
          success: false,
          message: "No members found for the specified channel.",
        });
      }

      // Extract member IDs for attendance query
      const memberIds = channelMembers.map((member) =>
        ObjectId(member.memberId._id)
      );
      // console.log("memberIds", memberIds);

      // Fetch attendance records for the given date range for these members
      const attendanceRecords = await attendanceModel.find({
        parentId,
        memberId: { $in: memberIds },
        punchInTime: { $gte: startOfDay, $lte: endOfDay },
      });
      // console.log('attendanceRecords', attendanceRecords);

      // Generate an array of dates for the specified range
      const getDateArray = (start, end) => {
        const dateArray = [];
        let currentDate = new Date(start);
        while (currentDate <= end) {
          dateArray.push(new Date(currentDate));
          currentDate.setDate(currentDate.getDate() + 1);
        }
        return dateArray;
      };

      const dateArray = getDateArray(startOfDay, endOfDay);
      // console.log('dateArray', dateArray);

      // Map member details with attendance data
      const result = channelMembers.map((member) => {
        const { _id, name, email } = member.memberId;

        // Filter attendance records for the current member
        const memberAttendance = attendanceRecords.filter(
          (record) => record.memberId.toString() === _id.toString()
        );

        let totalPresent = 0;
        let totalAbsent = 0;

        // Create attendance data for each date in the range
        const records = dateArray.map((date) => {
          const formattedDate = date.toISOString().split("T")[0]; // Get YYYY-MM-DD format


          const attendanceForDate = memberAttendance.find(
            (record) => {
              // console.log(new Date(record.punchInTime).toISOString().split("T")[0] === formattedDate,new Date(record.punchInTime).toISOString().split("T")[0] ,formattedDate,);

              return (new Date(record.punchInTime).toISOString().split("T")[0] === formattedDate)
            }
          );
          const attendanceForDatePunchOut = memberAttendance.find(
            (record) =>
              new Date(record.punchOutTime))

          if (attendanceForDate) {
            totalPresent++;
          } else {
            totalAbsent++;
          }

          return {
            date: formattedDate,
            status: attendanceForDate ? "present" : "absent",
            punchIn: attendanceForDate
              ? new Date(attendanceForDate.punchInTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : null,
            punchOut: attendanceForDatePunchOut
              ? new Date(attendanceForDatePunchOut.punchOutTime).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
              : null


          };
        });

        // console.log('records', records);



        return {
          memberId: _id,
          name: name || "Unknown",
          email: email || "Unknown",
          totalPresent,
          totalAbsent,
          data: records,
        };
      });

      return res.status(200).json({
        success: true,
        count: result.length,
        // attendanceRecords,
        // memberIds
        attendance: result,
      });
    } catch (error) {
      console.error("Error fetching channel attendance data:", error);
      return res.status(500).json({
        success: false,
        message: "Unable to fetch attendance data.",
      });
    }
  },

  getChannelMembersDailyAssignments: async (req, res) => {
    try {
      const userId = req.userId; // Assuming `checkUserToken` middleware attaches the user ID
      const channelId = req.params.channelId;
      const currentDate = new Date().toISOString().split("T")[0];

      // 1. Get all members for the user

      const members = await channelMemberModel
        .find({ addedBy: userId, channelId })
        .populate("memberId");
      console.log(userId, channelId, "refp---------", members);
      // const members = await memberModel.find({parentUser: userId });

      if (!members.length) {
        return res.status(404).json({
          success: false,
          message: "No members found for the user.",
        });
      }

      // Extract member IDs
      const memberIds = members.map((member) => member._id);

      // 2. Get assignments for the current date for these members
      const assignments = await assignmentModel.find({
        memberId: { $in: memberIds },
        assignedAt: {
          $gte: new Date(`${currentDate}T00:00:00.000Z`),
          $lte: new Date(`${currentDate}T23:59:59.999Z`),
        },
      });

      // 3. Prepare the response
      const response = members.map((member) => {
        const memberAssignments = assignments.filter(
          (assignment) =>
            assignment.memberId.toString() === member._id.toString()
        );

        return {
          name: member.memberId?.name, // Assuming `Member` model has a `name` field
          totalAssignments: memberAssignments.length,
          pending: memberAssignments.filter((a) => a.status === "Pending")
            .length,
          completed: memberAssignments.filter((a) => a.status === "Completed")
            .length,
        };
      });

      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error("Error fetching daily assignments:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  },

  getChannelMembersAssignmentsByDateRange: async (req, res) => {
    try {

      const userId = req.userId;
      const { startDate, endDate, channelId } = req.body;
      console.log('-------------------- }}}------------------------>', startDate, endDate, channelId);

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          message: "Start date and end date are required.",
        });
      }

      // Parse the date range
      const startOfRange = new Date(`${startDate}`);
      const endOfRange = new Date(`${endDate}`);

      const members = await channelMemberModel
        .find({ addedBy: userId, channelId })
        .populate("memberId");

      if (!members.length) {
        return res.status(200).json({
          success: false,
          message: "No members found for the user in the specified channel.",
        });
      }

      const memberIds = members?.map((member) => member?.memberId?.id);
      // console.log("memberIds", memberIds);

      if (!memberIds || memberIds.length === 0) {
        return res.status(200).json({
          success: false,
          message: "No valid member IDs found for the specified channel.",
        });
      }

      const assignments = await assignmentModel.find({
        memberId: { $in: memberIds },
        assignedAt: {
          $gte: new Date(`${startOfRange}`),
          $lte: new Date(`${endOfRange}`),
        },
      });

      const response = members.map((member) => {
        // Filter assignments for the current member
        const memberAssignments = assignments.filter((assignment) => {
          return (
            assignment.memberId.toString() === member.memberId._id.toString()
          );
        });

        // Group assignments by status
        const pendingAssignments = memberAssignments.filter(
          (a) => a.status === "pending"
        );
        const completedAssignments = memberAssignments.filter(
          (a) => a.status === "completed"
        );

        return {
          name: member.memberId?.name || "Unknown",
          totalAssignments: memberAssignments.length,
          pending: {
            count: pendingAssignments.length,
            details: pendingAssignments,
          },
          completed: {
            count: completedAssignments.length,
            details: completedAssignments,
          },
        };
      });

      // Send the response
      return res.status(200).json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error(
        "Error fetching assignments for the specified date range:",
        error
      );
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  },

  getInvalidChannelMembers: async (req, res) => {
    try {
      const { channelId } = req.body;

      if (!channelId) {
        return res.status(400).json({
          success: false,
          message: "Channel ID is required.",
        });
      }

      // Fetch all channel members for the given channel
      const channelMembers = await channelMemberModel.find({ channelId });

      if (!channelMembers.length) {
        return res.status(404).json({
          success: false,
          message: "No members found in the specified channel.",
        });
      }

      // Extract member IDs from channel members
      const channelMemberIds = channelMembers.map((member) => member.memberId);

      // Fetch valid member IDs from the member model
      const validMembers = await memberModel.find({
        _id: { $in: channelMemberIds },
      });

      const validMemberIds = validMembers.map((member) => member._id.toString());

      // Find IDs that are in channelMemberModel but not in memberModel
      const invalidMemberIds = channelMemberIds.filter(
        (id) => !validMemberIds.includes(id.toString())
      );

      // Response
      return res.status(200).json({
        success: true,
        invalidMemberIds,
        message: invalidMemberIds.length
          ? "Invalid member IDs found."
          : "All members are valid.",
      });
    } catch (error) {
      console.error("Error fetching invalid channel members:", error);
      return res.status(500).json({
        success: false,
        message: "Server error. Please try again later.",
      });
    }
  },


  getMemberAssignmentById: async (req, res) => {
    try {
      const { assignmentId } = req.params; // Get startDate and endDate from request params

      const memberId = req?.userId;

      if (!memberId) {
        return res.status(400).json({ message: "Invalid memberId" });
      }

      // console.log('Getting assignments for member:', memberId);

      // Fetch the assignments within the date range
      const memberAssignments = await assignmentModel.find({
        _id: assignmentId,
      });

      if (!memberAssignments || memberAssignments.length === 0) {
        return res.status(404).json({ message: "No assignments found " });
      }

      res.status(200).json({
        status: 200,
        message: "Assignment found successfully",
        assignment: memberAssignments,
      });
    } catch (error) {
      console.error("Error fetching user assignments:", error);
      res.status(500).json({ error: "Internal Server Error" });
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

  sendSosToMembers: async (req, res) => {
    try {
      console.log("req.body", req.body);

      const { memberIds } = req.body;
      const userId = req.userId;
      const parentUserDetails = await userModel.findOne({ _id: userId });

      // Validate request
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "Invalid or missing memberIds" });
      }

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
          body: `${parentUserDetails?.name} Is Seding SOS To You`,
        },
        data: {
          type: "SOS",
        },
      };

      // Loop over each memberId and send SOS individually
      let successCount = 0;
      let failureCount = 0;
      const responses = [];

      for (const memberId of memberIds) {
        // Fetch FCM token for each member
        const member = await memberModel.findOne(
          { _id: memberId },
          { fcmToken: 1 }
        );

        if (member && member.fcmToken) {
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




  requestLiveLocationForSelectedMembers: async (req, res) => {
    try {
      console.log("req.body", req.body);

      const { memberIds } = req.body;
      const userId = req.userId;
      const parentUserDetails = await userModel.findOne({ _id: userId });

      // Validate request
      if (!memberIds || !Array.isArray(memberIds) || memberIds.length === 0) {
        return res.status(400).json({ error: "Invalid or missing memberIds" });
      }

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

      for (const memberId of memberIds) {
        // Fetch FCM token for each member
        const member = await memberModel.findOne(
          { _id: memberId },
          { fcmToken: 1 }
        );

        if (member && member.fcmToken) {
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



  requestLiveLocationForMemberById: async (req, res) => {
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

  getUserMemberLiveTracking: async (req, res) => {
    const { memberId } = req.params;
    const { date } = req.query;

    if (!memberId || !date) {
      return res.status(400).json({ error: "Member ID and date are required" });
    }

    try {
      // Parse the date and get the start and end of the day
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);

      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);

      // Query database for locations within the specified date range
      const locationsGroupedByLocality = await trackingHistoryModel.aggregate([
        // Step 1: Match entries for the given memberId and day range
        {
          $match: {
            memberId: mongoose.Types.ObjectId(memberId),
            timestamp: { $gte: startOfDay, $lte: endOfDay },
          },
        },
        // Step 2: Group by locality
        {
          $group: {
            _id: "$locality", // Group by locality
            // entries: { $push: "$$ROOT" }, // Include all documents in the group
            count: { $sum: 1 }, // Count the number of entries for each locality
            averageTimestamp: { $avg: { $toLong: "$timestamp" } }, // Calculate average timestamp
            locations: { $push: "$location.coordinates" }, // Include all location coordinates
          },
        },
        // Step 3: Sort the groups by count or other criteria
        {
          $sort: { count: -1 }, // Sort by count in descending order
        },
      ]);

      const resultWithDates = locationsGroupedByLocality.map((group) => ({
        ...group,
        averageTimestamp: new Date(group.averageTimestamp).toISOString(), // Convert to ISO Date string
      }));

      console.log(resultWithDates);

      let finalData = resultWithDates.filter((item) => item._id != null);

      console.log(locationsGroupedByLocality);

      res.json({
        status: 200,
        count: locationsGroupedByLocality.length,
        data: finalData,
        message: "Location found successfully",
      });
    } catch (error) {
      console.error("Error fetching locations: ", error);
      res
        .status(500)
        .json({ error: "An error occurred while fetching locations." });
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

  // fetchUserAssignmentLocation: async (req, res) => {
  //   try {

  //     const userId = req.userId; // Get the user ID from the request (assuming it's available in the request object)

  //     const { memberId ,selectedDate} = req.params; // Get the user ID from the request (assuming it's available in the request object)
  //     console.log(' selectedDate -----', selectedDate);

  //     const givenDate = new Date(selectedDate); // Replace with your desired date
  //     const nextDay = new Date(givenDate);
  //     nextDay.setDate(nextDay.getDate() + 1); // Calculate the next day
  //           const assignmentLocation = await trackingHistoryModel
  //     .find({
  //         memberId,
  //         trackingType: 'scheduled',
  //         timestamp: {
  //             $gte: givenDate,
  //             $lt: nextDay // Less than the start of the next day
  //         }
  //     })
  //     .sort({ timestamp: -1 })
  //     .populate('assignmentId');

  //     if (!assignmentLocation) {
  //       return res.status(404).json({ error: 'Assignments location not found for this member' });
  //     }

  //     // Return the live location tracking data
  //     res.status(200).json({
  //       message: 'Assignments location fetched successfully',
  //       count:assignmentLocation.length,
  //       assignmentLocation,
  //     });
  //   } catch (error) {
  //     console.error(error);
  //     res.status(500).json({ error: 'Internal server error' });
  //   }
  // }
  fetchUserAssignmentLocation: async (req, res) => {
    try {
      const userId = req.userId; // Get the user ID from the request
      const { memberId, selectedDate } = req.params; // Extract parameters from the request

      const givenDate = new Date(selectedDate);
      const nextDay = new Date(givenDate);
      nextDay.setDate(nextDay.getDate() + 1); // Calculate the next day

      // Fetch all matching assignment locations sorted by timestamp
      const assignmentLocation = await trackingHistoryModel
        .find({
          memberId,
          trackingType: "scheduled",
          timestamp: {
            $gte: givenDate,
            $lt: nextDay, // Less than the start of the next day
          },
        })
        .sort({ timestamp: -1 })
        .populate("assignmentId"); // Populate assignment details

      if (!assignmentLocation || assignmentLocation.length === 0) {
        return res
          .status(200)
          .json({ error: "Assignment locations not found for this member" });
      }

      const totalRecords = assignmentLocation.length;

      // Always include the first and last records
      const firstRecord = assignmentLocation[0];
      const lastRecord = assignmentLocation[totalRecords - 1];

      // Get up to 48 evenly spaced intermediate records
      const interval = Math.ceil(totalRecords / 48);
      const intermediateRecords = assignmentLocation.filter(
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

      // Group the coordinates by assignmentId and merge them into one assignment object
      const groupedAssignments = uniqueRecords.reduce((acc, item) => {
        const assignmentId = item.assignmentId?._id;
        if (!acc[assignmentId]) {
          acc[assignmentId] = {
            assignmentId: assignmentId,
            eventName: item?.assignmentId?.eventName,
            trackingCoordinates: [],
          };
        }
        acc[assignmentId].trackingCoordinates.push({
          coordinates: item.location.coordinates,
          locality: item?.addressDetails?.locality,
          // addressDetails: item?.addressDetails,
          timestamp: item?.timestamp
        });
        return acc;
      }, {});

      // Convert the groupedAssignments object to an array
      const assignmentDetails = Object.values(groupedAssignments).map((assignment) => ({
        assignmentId: assignment.assignmentId,
        eventName: assignment.eventName,
        trackingCoordinates: assignment.trackingCoordinates,
      }));

      // Return the assignment location data with assignment details and tracking locations
      res.status(200).json({
        message: "Assignments location fetched successfully",
        assignmentDetails,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Internal server error" });
    }
  },


  fetchUserLiveLocationInsightReport: async (req, res) => {
    try {
      const userId = req.userId; // Assuming userId is available in the request object
      const { memberId, selectedDate, locationType } = req.body; // Extract memberId and selectedDate from request params

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
        console.log("locationType", locationType);

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

  /**
   * Get the last location of all members associated with the user.
   */
  getUserMembersLastLocation: async (req, res) => {
    try {
      console.log('dsd');

      // Extract user ID from the token (assumes middleware sets req.userId)
      const userId = req.userId;

      // Find all members associated with the user
      const members = await memberModel.find({ parentUser: userId });

      // Fetch the latest location for each member from the trackingHistories model
      const memberLocations = await Promise.all(
        members.map(async (member) => {
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




















  getMemberAssignments: async (req, res) => {
    try {

      const { startDate, endDate } = req.params; // Get startDate and endDate from request params
      const memberId = req?.userId;

      // Ensure startDate and endDate are in a valid format
      const start = new Date(startDate);
      const end = new Date(endDate);
      console.log('-____ DATES _______:', startDate, endDate, start, end);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }

      // console.log('Getting assignments for member:', memberId);

      // Fetch the assignments within the date range
      const memberAssignments = await assignmentModel.find({
        memberId: memberId,
        assignedAt: { $gte: start, $lte: end }, // Filter by assignmentDate within the date range
        type: { $ne: 'daily' }, // Exclude tasks where type is 'daily'

      })
      // console.log('memberAssignments', memberId);

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






















  getUsersMemberAssignments: async (req, res) => {
    try {

      const { startDate, endDate, memberId } = req.params; // Get startDate and endDate from request params
      const parentId = req?.userId;

      // Ensure startDate and endDate are in a valid format
      const start = new Date(startDate);
      const end = new Date(endDate);
      console.log('- ||||||||||||||| _______:', startDate, endDate, start, end);

      if (isNaN(start) || isNaN(end)) {
        return res.status(400).json({ message: 'Invalid date format' });
      }
      // const memberDetails = await memberModel.findById(memberId);
      // if (!memberDetails) {
      //     return res.status(404).json({ error: 'Member not found' });
      // }

      // Fetch parent user details (optional check if member has a parent user)
      // if (!memberDetails.parentUser) {
      //     return res.status(404).json({ error: 'Parent user not found for this member' });
      // }

      // const parentUser = await userModel.findById(memberDetails.parentUser);
      // if (!parentUser || !parentUser.fcmToken) {
      //     return res.status(404).json({ error: 'Parent user or FCM token not found' });
      // }

      // console.log('Getting assignments for member:', memberId);

      // Fetch the assignments within the date range
      const memberAssignments = await assignmentModel.find({
        memberId: memberId,
        userId: parentId,
        assignedAt: { $gte: start, $lte: end }, // Filter by assignmentDate within the date range
        type: { $ne: 'daily' }, // Exclude tasks where type is 'daily'

      })
      console.log('memberAssignments', parentId, memberAssignments);

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











  getUserMembersWithoutDailyTasks: async (req, res) => {
    try {
      console.log('Fetching members without daily geo-fenced tasks');

      // Extract user ID from the token (assumes middleware sets req.userId)
      const userId = req.userId;

      // Find all members associated with the user
      const members = await memberModel.find({ parentUser: userId });
      console.log('=========== || ===================', members.length);

      // Get all member IDs
      const memberIds = members.map((member) => member._id);

      // Find all members who are assigned daily geo-fenced tasks
      const assignedMembers = await assignmentModel.find({
        memberId: { $in: memberIds },
        type: 'geo-fenced', // Filtering by the type 'daily'
      });

      // Get the member IDs that have daily tasks assigned
      const assignedMemberIds = assignedMembers.map((assignment) => assignment.memberId.toString());

      // Filter out members who are not assigned a daily geo-fenced task
      const unassignedMembers = members.filter((member) =>
        !assignedMemberIds.includes(member._id.toString())
      );

      // Return the list of unassigned members
      return res.status(200).json({
        success: 200,
        message: 'Successfully fetched members without geo-fenced tasks',
        count: unassignedMembers.length,
        data: unassignedMembers,
      });
    } catch (error) {
      console.error("Error fetching members without daily geo-fenced tasks:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to fetch members without daily geo-fenced tasks.",
      });
    }
  },



  deleteAssignmentsForMembers: async (req, res) => {
    try {

      // Extract memberIds and parentId from the request body
      const parentId = req.userId;
      // console.log('Deleting geo-fenced assignments for specified member IDs',parentId);

      // Check if memberIds is provided and is an array

      // Check if parentId is provided
      if (!parentId) {
        return res.status(200).json({
          success: false,
          message: 'Invalid parentId. Please provide the parentId.',
        });
      }

      // Iterate over memberIds and delete geo-fenced assignments

      // Find and delete assignments with type 'geo-fenced' and the specific parentId
      const result = await assignmentModel.deleteMany({

        userId: parentId,
        type: 'geo-fenced',
      });
      console.log(`Deleted geo-fenced assignments for member ID:`);



      return res.status(200).json({
        success: true,
        message: 'Processed deletion of geo-fenced assignments for the specified member IDs',


      });
    } catch (error) {
      console.error('Error deleting geo-fenced assignments for members:', error);
      return res.status(500).json({
        success: false,
        message: 'Failed to delete geo-fenced assignments for members.',
      });
    }
  },










  getUserMemberTeam: async (req, res) => {
    try {
      const { memberId } = req.params; // Get userId from URL params
      const userId = req.userId; // Get userId from URL params
      console.log(userId, memberId);

      // const userData = await memberModel.findOne({ _id: memberId });
      // if (!userData) {
      //   return res.status(404).json({ message: "User not found" });
      // }

      const members = await memberModel.find({ parentUser: userId }); // Find members linked to user

      res.status(200).json({
        message: "User and members found successfully",
        // user: userData,
        count: members.length,
        members: members,
      });
    } catch (error) {
      console.error("Error fetching user and members:", error);
      res.status(500).json({ error: "Internal Server Error" });
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













};
