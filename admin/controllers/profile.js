const model = require("../models/profile");
const superAdminCreationValidation = require("../validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {


  createAdminProfile: async (req, res) => {
    try {
      // =========== VALIDATION ==================
      const { error, value } = superAdminCreationValidation.validate(req.body);

      if (error) {
        let message = error?.details[0]?.message;
        const formattedMessage = message.replace(/"/g, '');

        return res.status(400).json({
          message: formattedMessage,
          status: 400, // Updated status to 400 for bad request
        });
      }

      // Hash the password before saving the user
      const saltRounds = 10;  // Number of salt rounds for bcrypt
      const hashedPassword = await bcrypt.hash(value.password, saltRounds);

      // Replace the plain text password with the hashed password
      value.password = hashedPassword;

      // Create a new user with the hashed password
      const user = new model(value);
      await user.save();

      // Return the newly created user (excluding the password from the response for security)
      const { password, ...userWithoutPassword } = user._doc;

      return res.status(201).json({
        'status': 201,
        'adminUser': userWithoutPassword,
        'message': 'Admin user created successfully',
      });

    } catch (error) {
      res.status(500).json({
        message: "Error creating user",
        error: error.message,
      });
    }
  },







  getAdminProfile: async (req, res) => {
    try {


      const userId = req.userId;

      // Fetch the user data from the database using the userId
      const userData = await model.findOne({ _id: userId });

      if (!userData) {
        return res.status(404).json({
          status: 404,
          message: "User not found"
        });
      }

      // Prepare and send the response
      const jsonResponse = {
        status:200,
        message: "User found successfully",
        user: userData,
      };

      res.status(200).json(jsonResponse);
    } catch (error) {
      console.error("Error fetching user data:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },

  updateAdminProfile: async (req, res) => {
    try {
      const userId = req?.userId;

      // Check if userId is provided
      if (!userId) {
        return res.status(400).json({
          status: 400,
          message: "AdminId is required"
        });
      }

      // Extract the fields to be updated from the request body
      const updateFields = req.body;
      delete updateFields.userId;  // Remove userId from the fields to update

      // Find the admin profile by userId and update the relevant fields
      const updatedUser = await model.findOneAndUpdate(
        { _id: userId },          // Filter by userId (_id is default in MongoDB)
        { $set: updateFields },   // Update the fields dynamically
        { new: true }             // Return the updated document
      );

      // Check if the user was found and updated
      if (!updatedUser) {
        return res.status(404).json({ message: "Admin profile not found" });
      }

      // Send the updated profile back as the response
      res.status(200).json({
        message: "Admin profile updated successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error updating admin profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },




  deleteAdminProfile: async (req, res) => {
    try {

      const userId = req?.body?.userId;
      console.log('--- userId   ----', userId);
      if (!userId) {
        return res.status(300).json({
          status: 300,
          message: "AdminId is required"
        });
      }


      // Find the admin profile by userId and update the isDeleted field
      const updatedUser = await model.findOneAndUpdate(
        { _id: userId },              // Filter by userId (_id is default in MongoDB)
        { isDeleted: 'true' },        // Set isDeleted to 'true'
        { new: true }                 // Return the updated document
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "Admin profile not found" });
      }

      res.status(200).json({
        message: "Admin profile deleted successfully",
        user: updatedUser
      });
    } catch (error) {
      console.error("Error deleting admin profile:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },



  getAllAdminProfiles: async (req, res) => {
    try {
      const data = await model.find({});
      console.log("-------- data ----------", data);
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



};
