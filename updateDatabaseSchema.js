const mongoose = require('mongoose');
const userModel = require('./user/models/profile');
const memberModel = require('./member/models/profile');
const channelMemberModel = require('./model/channelsMembers');
require("dotenv").config();

mongoose.connect(process.env.DB, { useNewUrlParser: true, useUnifiedTopology: true });

async function addFieldToUsers() {
  try {
    // Update all users to have isSubscribed field set to false if not already present
    await userModel.updateMany({ geoFenced: { $exists: false } });
    console.log('Field geoFenced added to all existing users.');
  } catch (error) {
    console.error('Error updating users:', error);
  } finally {
    mongoose.connection.close();
  }
}

async function addFieldToMembers() {
  try {
    // Add isDeleted field to all existing records if not already present
    await channelMemberModel.updateMany(
      { isDeleted: { $exists: false } }, 
      { $set: { isDeleted: false } }
    );

    console.log("Field isDeleted added to all existing channel members.");
  } catch (error) {
    console.error("Error updating channel members:", error);
  } finally {
    mongoose.connection.close();
  }
}










// addFieldToMembers();
addFieldToMembers()
// addFieldToUsers()
