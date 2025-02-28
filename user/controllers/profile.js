const userModel = require("../models/profile");
const memberModel = require("../../member/models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {

  getUserProfile: async (req, res) => {
    try {
      const userId = req.userId


      const userData = await userModel.findOne({ _id: userId });

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      const jsonResponse = {
        message: "User found successfully",
        user: userData,
      };

      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  updateUserProfile: async (req, res) => {
    try {
      const userId = req.userId; // Get the user ID from the request (assuming it's available in the request object)
      const { name, email, mobile, geoFenced, fcmToken } = req.body; // Extract the fields to be updated from the request body
  
      // Prepare the update object
      const updateData = {};
  
      // Update the user's profile fields
      if (name) updateData.name = name;
      if (email) updateData.email = email;
      if (mobile) updateData.mobile = mobile;
      if (fcmToken) updateData.fcmToken = fcmToken; // Update fcmToken
  
      // Handle geoFenced field update: Ensure the format is correct for GeoJSON Polygon
      if (geoFenced) {
        // Validate geoFenced format (array of arrays of numbers, e.g., [[longitude, latitude], [longitude, latitude], ...])
        if (Array.isArray(geoFenced) && geoFenced.every(coord => Array.isArray(coord) && coord.length === 2)) {
          updateData.geoFenced = {
            type: 'Polygon',
            coordinates: geoFenced
          };
        } else {
          return res.status(400).json({ message: 'Invalid geoFenced coordinates format' });
        }
      }
  
      // Update the user information
      const updatedUser = await userModel.findByIdAndUpdate(
        userId,
        updateData,
        { new: true, runValidators: true } // Return the updated user and run validators
      );
  
      if (!updatedUser) {
        return res.status(404).json({ message: "User not found" });
      }
  
      res.status(200).json({ message: "User updated successfully", user: updatedUser });
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Error updating user", error: error.message });
    }
  },
  






  getUserOverview: async (req, res) => {
    try {
      const userId = req.userId;
      console.log(userId);


      // Find the user data
      const userData = await userModel.findOne({ _id: userId });

      if (!userData) {
        return res.status(404).json({ message: "User not found" });
      }

      // Query the member model to get counts of active and inactive members
      const members = await memberModel.find({ parentUser: userId });
      const totalMembers = members.length;
      const activeMembers = members.filter(member => member.isActive).length; // Assuming `isActive` is the field for active status
      const inactiveMembers = totalMembers - activeMembers;
      const pendingMembers = members.filter(member => member.isApproved).length; // Assuming `isActive` is the field for active status

      const jsonResponse = {
        message: "User found successfully",
        stats: {
          totalMembers,
          activeMembers,
          inactiveMembers,
          pendingMembers
        },
      };

      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },




};
