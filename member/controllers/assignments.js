const memberModel = require("../models/profile");
const userModel = require("../../user/models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const turf = require('@turf/turf');
const geojsonUtils = require('geojson-utils');
const assignmentModel = require("../../model/assignment");

//==================================================

module.exports = {
  memberHasGeoFencedSetup: async (req, res) => {
    try {
      const memberId = req.userId; // Assuming you get memberId from the request
  
      // Find the member to get parentUserId
      const member = await memberModel.findById(memberId);
      if (!member) {
        return res.status(404).json({
          message: "Member not found",
          status: 404,
        });
      }
  
      const parentUserId = member.parentUser; // Get the parent user ID
  
      // Fetch the geoFenced field from userModel
      const user = await userModel.findById(parentUserId).select("geoFenced");
      if (!user) {
        return res.status(404).json({
          message: "Parent user not found",
          status: 404,

        });
      }
  
      // Check for geo-fenced assignment
      const geoFencedAssignment = await assignmentModel.findOne({
        memberId: memberId,
        type: "geo-fenced",
      });
  
      if (!geoFencedAssignment) {
        return res.status(200).json({
          message: "No geo-fenced setup found for the member",
          status: 200,
          geoFencingSetup: false,
          geoFenced: user.geoFenced || false, // Include geoFenced field from userModel
          data: {},
        });
      }
  
      res.status(200).json({
        status: 200,
        geoFencingSetup: true,
        message: "Geo-fenced setup retrieved successfully",
        geoFenced: user.geoFenced || false, // Include geoFenced field from userModel
        data: geoFencedAssignment,
      });
    } catch (error) {
      console.error("Error fetching geo-fenced setup:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
  






};
