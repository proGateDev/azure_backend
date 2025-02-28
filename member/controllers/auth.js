const memberModel = require("../models/profile");
const { checkEncryptedPassword } = require('../../util/auth')
const jwt = require('jsonwebtoken');
const { onMemberVerified } = require("../../service/socket");
const admin = require("firebase-admin");
const userModel = require("../../user/models/profile");
require("dotenv").config();


//==================================================
// var serviceAccount_ = require("./service-account-key.json");
const serviceAccount = JSON.parse(process.env.SERVICE_ACCOUNT_KEY);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})


module.exports = {
  login: async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email) {
        return res.status(400).json({
          status: 400,
          message: "Email is required"
        });
      }

      if (!password) {
        return res.status(400).json({
          status: 400,
          message: "Password is required"
        });
      }



      // Find the user by email
      const user = await memberModel.findOne({ email });
      // console.log(user,'---- USER --');        

      if (!user) {
        return res.status(401).json({
          status: 401,
          message: "User is not registered with DigiCare4u"
        });
      }



      if (!user.isApproved) {
        return res.status(401).json({
          status: 401,
          error: "User is not verified",
          message: "Member need to verify the email"
        });
      }

      console.log('password checking 0--0--------', password, user?.password)
      const isPasswordValid = await checkEncryptedPassword(password, user?.password);
      console.log('----- isPasswordValid  --------', isPasswordValid)

      if (!isPasswordValid) {
        return res.status(401).json({
          status: 401,
          message: "Invalid  password"
        });
      }

      // If authenticated, generate a JWT token with 1 day expiry
      const token = jwt.sign(
        { userId: user._id },
        process.env.JWT_SECRET,
        { expiresIn: '180m' } // Token expires in 1 day
      );

      // Send response with the token
      res.status(200).json({
        status: 200,
        message: "User authenticated successfully",
        token

      });

    } catch (error) {
      console.error("Error during user login:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },




  // verifyEmail: async (req, res) => {
  //   const { token } = req.query;

  //   try {
  //     // Verify the token first
  //     const decoded = jwt.verify(token, process.env.JWT_SECRET);
  //     const userId = decoded.userId;
  //     console.log(userId);

  //     // Find the user in the database
  //     const user = await memberModel.findById(userId);

  //     if (!user) {
  //       return res.status(404).json({
  //         status: 404,
  //         message: "User not found."
  //       });
  //     }

  //     // Check if the user's email is already approved
  //     if (user?.isApproved) {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Email is already verified."
  //       });
  //     }

  //     // Update user status to 'approved'
  //     await memberModel.findByIdAndUpdate(userId, { isApproved: true });

  //     res.status(200).json({
  //       status: 200,
  //       message: "Your email has been verified! You can now log in."
  //     });
  //   } catch (error) {
  //     // Handle token expiration specifically
  //     if (error.name === 'TokenExpiredError') {
  //       return res.status(401).json({
  //         status: 401,
  //         message: "Token has expired. Please request a new verification link."
  //       });
  //     }
  //     // Handle other errors
  //     console.error("Email verification error:", error);
  //     res.status(400).json({
  //       status: 400,
  //       message: "Invalid verification link.",
  //       error
  //     });
  //   }
  // },

  verifyEmail: async (req, res) => {
    console.log('------ verifyEmail API ------------>');
    try {
      const { token } = req.query;
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const memberId = decoded.userId;
      const parentUserId = decoded.parentUserId;
      console.log('------ parentUser  ------------>', token,decoded);
  
      const parentUser = await userModel.findById({ _id: parentUserId });
      
      const member = await memberModel.findById(memberId);
      
      console.log('------ member  ------------>', memberId);
      if (!member) {
        return res.status(404).send({
          status: 404,
          message: 'Member not found!',
        });
      }
  
      if (!member.isApproved) {
        member.isApproved = true;
        await member.save();
  
        const memberVerifyingMessage = {
          message: `${member?.name} has verified the account`,
          memberId: member._id,
        };
        onMemberVerified(memberVerifyingMessage);
  
        const sendNotification = async (token) => {
          try {
            await admin.messaging().send({
              token: token,
              notification: {
                title: "Verification Complete",
                body: `${member?.name} has successfully verified their account!`,
              },
            });
            console.log("Notification sent successfully!");
          } catch (error) {
            console.error("Error sending notification:", error);
          }
        };
  
        sendNotification(parentUser?.fcmToken);
        
        return res.status(200).send({
          status: 200,
          message: 'Your email has been successfully verified! You can now start using DigiCare4u.'
        });
      }
  
      return res.status(200).send({
        status: 200,
        message: 'Member already approved. You can start tracking!',
      });
  
    } catch (error) {
      console.error("Error in verifyEmail:", error);
      res.status(500).send({
        status: 500,
        message: 'Error verifying member',
      });
    }
  },
  







  resendVerificationEmail: async (req, res) => {
    const { email } = req.body; // User provides their email

    // Find the user by email
    const user = await memberModel.findOne({ email });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Generate a new verification token
    const newToken = jwt.sign(
      { email: user.email, userId: user._id },
      process.env.JWT_SECRET,
      { expiresIn: '1h' } // Token valid for 1 hour
    );

    const verificationLink = `${clientURL}/verify-email?token=${newToken}`;

    // Send the verification email
    const messageData = {
      from: '<nischal@progatetechnology.com>',
      to: user.email,
      subject: 'Resend: Please Verify Your Email',
      html: `
          <div>
              <p>Click <a href="${verificationLink}">here</a> to verify your email.</p>
          </div>
      `,
    };

    try {
      await sendMail(messageData);
      return res.status(200).json({ message: 'Verification email resent successfully.' });
    } catch (error) {
      console.error('Error sending verification email:', error);
      return res.status(500).json({ message: 'Error sending verification email.' });
    }
  }


};
