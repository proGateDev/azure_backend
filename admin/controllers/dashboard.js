const userModel = require("../../user/models/profile");
const model = require("../models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {

  getInsight: async (req, res) => {
    try {
      const today = new Date();

      // Get start of the current week (Monday 00:00:00)
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay() + 1); // Adjust to Monday
      startOfWeek.setHours(0, 0, 0, 0);

      // Get start of last week (Monday 00:00:00)
      const startOfLastWeek = new Date(startOfWeek);
      startOfLastWeek.setDate(startOfWeek.getDate() - 7);

      // Get start of the current month (1st day 00:00:00)
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

      // Get start of last month (1st day of the previous month 00:00:00)
      const startOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

      // Get end of last month (last day of the previous month)
      const endOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);

      // Define subscription price (Assuming $10 per user)
      const subscriptionPrice = 10;

      // Fetch counts for the required timeframes
      const [
        currentWeekCount,
        lastWeekCount,
        currentMonthCount,
        lastMonthCount,
        totalUsers,
        currentSubscribedUsers,
        lastWeekSubscribedUsers,
        lastMonthSubscribedUsers,
        geoFencedUsers,
        nonGeoFencedUsers,
        lastWeekGeoFencedUsers,
        lastMonthGeoFencedUsers,
        inactiveUsers
      ] = await Promise.all([
        userModel.countDocuments({ createdAt: { $gte: startOfWeek } }), // Users this week
        userModel.countDocuments({ createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }), // Users last week
        userModel.countDocuments({ createdAt: { $gte: startOfMonth } }), // Users this month
        userModel.countDocuments({ createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }), // Users last month
        userModel.countDocuments(), // Total users
        userModel.countDocuments({ isSubscribed: true }), // Total subscribed users
        userModel.countDocuments({ isSubscribed: true, createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }), // Last week's subscribed users
        userModel.countDocuments({ isSubscribed: true, createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }), // Last month's subscribed users
        userModel.countDocuments({ "geoFenced.coordinates": { $ne: [] } }), // Users using GeoFence
        userModel.countDocuments({ "geoFenced.coordinates": { $size: 0 } }), // Users NOT using GeoFence
        userModel.countDocuments({ geoFenced: { $ne: "" }, createdAt: { $gte: startOfLastWeek, $lt: startOfWeek } }), // Last week GeoFenced users
        userModel.countDocuments({ geoFenced: { $ne: "" }, createdAt: { $gte: startOfLastMonth, $lt: startOfMonth } }), // Last month GeoFenced users
        userModel.countDocuments({ isDeleted: true })
      ]);

      // Function to calculate percentage change safely
      const calculatePercentageChange = (current, previous) => {
        if (previous === 0) return current === 0 ? "0%" : "New"; // Avoid division by zero
        const change = ((current - previous) / previous) * 100;
        return `${change > 0 ? "+" : ""}${change.toFixed(2)}%`;
      };

      // Revenue calculations
      const totalRevenue = currentSubscribedUsers * subscriptionPrice;
      const lastWeekRevenue = lastWeekSubscribedUsers * subscriptionPrice;
      const lastMonthRevenue = lastMonthSubscribedUsers * subscriptionPrice;

      // User Growth (Last 7 Days)
      const userGrowth = await Promise.all(
        [...Array(7)].map(async (_, i) => {
          const day = new Date();
          day.setDate(today.getDate() - i);
          day.setHours(0, 0, 0, 0);
          const nextDay = new Date(day);
          nextDay.setDate(day.getDate() + 1);
          return {
            date: day.toISOString().split("T")[0],
            count: await userModel.countDocuments({ createdAt: { $gte: day, $lt: nextDay } })
          };
        })
      );

      const response = {
        message: "User insights fetched successfully",
        data: {
          totalUsers: {
            count: totalUsers,
            weeklyGrowth: calculatePercentageChange(currentWeekCount, lastWeekCount),
            monthlyGrowth: calculatePercentageChange(currentMonthCount, lastMonthCount),
          },
          revenue: {
            totalRevenue,
            weeklyGrowth: calculatePercentageChange(totalRevenue, lastWeekRevenue),
            monthlyGrowth: calculatePercentageChange(totalRevenue, lastMonthRevenue),
          },
          geoFencing: {
            usersUsingGeoFence: geoFencedUsers,
            usersNotUsingGeoFence: nonGeoFencedUsers,
            weeklyGrowth: calculatePercentageChange(geoFencedUsers, lastWeekGeoFencedUsers),
            monthlyGrowth: calculatePercentageChange(geoFencedUsers, lastMonthGeoFencedUsers),
          },
          inactiveUsers,
          userGrowth: userGrowth.reverse()
        }
      };

      res.status(200).json(response);
    } catch (error) {
      console.error("Error fetching user insights:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }














};
