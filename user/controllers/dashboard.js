const userModel = require("../models/profile");
const model = require("../../admin/models/profile");
const superAdminCreationValidation = require("../../admin/validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const memberModel = require("../../member/models/profile");
const assignmentModel = require("../../model/assignment");
const haversine = require("haversine-distance");
const dayjs = require("dayjs");
const trackingHistoryModel = require("../../model/trackingHistory");
const moment = require("moment");

//==================================================

module.exports = {



  getInsight: async (req, res) => {
    try {
      // Fetch total members for the logged-in user
      const totalMembers = await memberModel.countDocuments({ parentUser: req.userId });
  
      // Fetch total assignments for the logged-in user
      const totalAssignments = await assignmentModel.countDocuments({ userId: req.userId });
  
      // Fetch total geo-fenced members for the logged-in user
      const totalGeoFencedMembers = await assignmentModel.countDocuments({ userId: req.userId, type: "geo-fenced" });
  
      // Get date range for the last 7 days
      const pastWeekStart = moment().subtract(6, "days").startOf("day").toDate();
  
      // Fetch all assignments for the last week
      const assignments = await assignmentModel.find({
        userId: req.userId,
        createdAt: { $gte: pastWeekStart }
      });
  
      // Fetch all completed tasks for the last week
      const completedTasks = await assignmentModel.find({
        userId: req.userId,
        status: "pending",
        assignedAt: { $gte: pastWeekStart }
      });
  
      // Prepare structured chart data
      const chartData = {
        barChart: [],
        lineChart: []
      };
  
      // Initialize date-wise counters
      const assignmentCount = {};
      const completedTaskCount = {};
  
      for (let i = 6; i >= 0; i--) {
        const dateKey = moment().subtract(i, "days").format("YYYY-MM-DD");
        assignmentCount[dateKey] = 0;
        completedTaskCount[dateKey] = 0;
      }
  
      // Count total assignments per day
      assignments.forEach(a => {
        const dateKey = moment(a.createdAt).format("YYYY-MM-DD");
        if (assignmentCount[dateKey] !== undefined) {
          assignmentCount[dateKey]++;
        }
      });
  
      // Count total completed tasks per day
      completedTasks.forEach(task => {
        const dateKey = moment(task.assignedAt).format("YYYY-MM-DD");
        if (completedTaskCount[dateKey] !== undefined) {
          completedTaskCount[dateKey]++;
        }
      });
  
      // Format data for charts
      for (const date in assignmentCount) {
        chartData.barChart.push({ date, totalAssignments: assignmentCount[date] });
        chartData.lineChart.push({ date, completedTasks: completedTaskCount[date] });
      }
  
      res.status(200).json({
        message: "User insights fetched successfully",
        totalMembers,
        totalAssignments,
        totalGeoFencedMembers,
        chartData
      });
  
    } catch (error) {
      console.error("Error fetching user insights:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
  
}