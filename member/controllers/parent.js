const memberModel = require("../models/profile");
const userModel = require("../../user/models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const turf = require('@turf/turf');
const geojsonUtils = require('geojson-utils');

//==================================================

module.exports = {
  fetchMemberParent: async (req, res) => {
    try {
      const memberId = req.userId; // Assuming you get memberId from the request parameters

      // Find the member and populate the parentUser field
      const memberParentData = await memberModel.findOne({ _id: memberId }).populate('parentUser');

      if (!memberParentData) {
        return res.status(404).json({ message: "Member not found" });
      }



      res.status(200).json({
        message: "Member parent retrieved successfully",
        data: memberParentData,
      });
    } catch (error) {
      console.error("Error fetching member colleagues:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },


  isWithinGeoFenced: async (req, res) => {
    try {
      const userId = req?.userId;
      const { latitude, longitude } = req?.params;
  
      if (!latitude || !longitude) {
        return res.status(400).json({
          status: 400,
          message: "Latitude and Longitude are required",
        });
      }
  
      const memberDetails = await memberModel.findById(userId);
      if (!memberDetails) {
        return res.status(200).json({
          status: 200,
          message: "Member not found",
        });
      }
  
      const memberParentUserDetails = await userModel.findById(memberDetails?.parentUser);
      const geofenceCoordinates = memberParentUserDetails?.geoFenced?.coordinates; // Should be GeoJSON
      // console.log('Original geofenceCoordinates',  JSON.stringify(geofenceCoordinates, null, 2));
  
      if (!geofenceCoordinates || geofenceCoordinates.length === 0) {
        return res.status(200).json({
          status: 200,
          message: "No geofence defined for the parent user",
        });
      }
  
      // Convert [latitude, longitude] to [longitude, latitude]
      const correctedCoordinates = Array.isArray(geofenceCoordinates[0][0])
      ? geofenceCoordinates.map(ring =>
          ring.map(([lat, lng]) => [lng, lat])
        )
      : [geofenceCoordinates.map(([lat, lng]) => [lng, lat])];
    
      // console.log('Corrected geofenceCoordinates', JSON.stringify(correctedCoordinates, null, 2));
  
      const userPoint = {
        type: "Point",
        coordinates: [parseFloat(longitude), parseFloat(latitude)], // Correct order
      };
      // console.log('userPoint', JSON.stringify(userPoint, null, 2));
  
      const polygon = {
        type: "Polygon",
        coordinates: correctedCoordinates, // Correct format
      };
      // console.log('polygon', JSON.stringify(polygon, null, 2));
  
      const isWithin = geojsonUtils.pointInPolygon(userPoint, polygon);
      // console.log('isWithin', isWithin);
  
      return res.status(200).json({
        status: 200,
        message: `User ${isWithin ? "is" : "is not"} within the range of the parent's geo-fenced area`,
        withinRange: isWithin,
      });
    } catch (error) {
      console.error("Error in isWithinGeoFenced:", error);
      return res.status(500).json({
        status: 500,
        message: "An error occurred",
        error: error.message,
      });
    }
  }
  
  
  

};
