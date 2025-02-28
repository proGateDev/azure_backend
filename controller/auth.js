const userModel = require("../user/models/profile");
const memberModel = require('../member/models/profile'); // Import the User model
const adminModel = require('../admin/models/profile'); // Import the User model
const jwt = require('jsonwebtoken');
const bcrypt = require("bcryptjs");
const { checkEncryptedPassword } = require('../util/auth');
const channelModel = require("../model/channels");
const clientURL = require("../constant/endpoint");

const sendMail = require("../service/sgMail");


//==================================================
const generateToken = (id, type) => {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not set in environment variables.");
    throw new Error("Internal server error. Missing environment configuration.");
  }

  return jwt.sign({ userId: id, type }, process.env.JWT_SECRET, { expiresIn: '7d' });
};

const sendErrorResponse = (res, status, message) => {
  return res.status(status).json({ status, message });
}

const handleUserLogin = async (email, password, res) => {
  const user = await userModel.findOne({ email });

  if (!user) {
    return sendErrorResponse(res, 404, "User not found");
  }

  if (!user.isSubscribed) {
    
    return sendErrorResponse(res, 401, "Your free trial has expired.");
  }
  if (!user.isApproved) {
    
    return sendErrorResponse(res, 401, "User is not verified. Please verify your email.");
  }

  const isPasswordValid = await checkEncryptedPassword(password, user.password);
  if (!isPasswordValid) {
    return sendErrorResponse(res, 401, "Invalid password.");
  }

  const token = generateToken(user._id, "user");

  return res.status(200).json({
    status: 200,
    type: "user",
    message: "User authenticated successfully.",
    token,
  });
}

const handleMemberLogin = async (email, password, res) => {
  const member = await memberModel.findOne({ email });

  if (!member) {
    return null; // Allow fallback to user logic
  }

  const isPasswordValid = await checkEncryptedPassword(password, member.password);
  if (!isPasswordValid) {
    return sendErrorResponse(res, 401, "Invalid password.");
  }
  console.log('member.isApproved', member.isApproved);

  if (!member.isApproved) {
    return sendErrorResponse(res, 401, "Member is not verified. Please verify your email.");
  }

  const token = generateToken(member._id, "member");

  return res.status(200).json({
    status: 200,
    type: "member",
    message: "Member authenticated successfully.",
    token,
  });
}
//==================================================


module.exports = {

  //   signup: async (req, res) => {
  //     try {
  //         console.log("--------  started User signup ----------");

  //         const { name, email, password, mobile, fcmToken } = req.body;

  //         // Validate input
  //         if (!name) {
  //             return res.status(400).json({
  //                 status: 400,
  //                 message: "Name is required"
  //             });
  //         }

  //         if (!email) {
  //             return res.status(400).json({
  //                 status: 400,
  //                 message: "Email is required"
  //             });
  //         }

  //         if (!password) {
  //             return res.status(400).json({
  //                 status: 400,
  //                 message: "Password is required"
  //             });
  //         }

  //         // Validate password complexity
  //         const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
  //         if (!passwordRegex.test(password)) {
  //             return res.status(400).json({
  //                 status: 400,
  //                 message: "Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character"
  //             });
  //         }

  //         if (!mobile) {
  //             return res.status(400).json({
  //                 status: 400,
  //                 message: "Mobile number is required"
  //             });
  //         }

  //         // Check if the user already exists
  //         const existingUser = await userModel.findOne({ email });
  //         if (existingUser) {
  //             return res.status(409).json({
  //                 status: 409,
  //                 message: "User already registered"
  //             });
  //         }

  //         // Hash the password before saving
  //         const hashedPassword = await bcrypt.hash(password, 10);

  //         // Create a new user
  //         const newUser = new userModel({
  //             name,
  //             email,
  //             fcmToken,
  //             mobile,
  //             password: hashedPassword,
  //             createdBy: "system", // or replace with appropriate user ID if needed
  //             updatedBy: "system",
  //         });

  //         // Save the user to the database
  //         await newUser.save();

  //         // Generate a JWT token with 2 hours expiry
  //         const token = jwt.sign(
  //             { userId: newUser._id },
  //             process.env.JWT_SECRET,
  //             { expiresIn: '360m' } // Token expires in 2 hours
  //         );

  //         // Create default channels
  //         const defaultChannels = [
  //             { name: `Friends_${newUser?._id}`, description: 'Laughter, memories, connection' },
  //             { name: `Family_${newUser?._id}`, description: 'Love, support, togetherness' },
  //             { name: `Work_${newUser?._id}`, description: 'Collaboration, productivity, success' },
  //         ];
  //         const channelPromises = defaultChannels.map(channel => {
  //             return new channelModel({
  //                 ...channel,
  //                 createdBy: newUser?._id,
  //                 createdByModel: 'User',
  //             }).save();
  //         });

  //         await Promise.all(channelPromises);

  //         // Send response with the token
  //         res.status(201).json({
  //             status: 201,
  //             message: "User registered successfully",
  //             token,
  //         });

  //     } catch (error) {
  //         console.error("Error during user signup:", error);
  //         res.status(500).json({ error: "Internal Server Error" });
  //     }
  // },


  // login: async (req, res) => {
  //   try {
  //     console.log("--------  started User login ----------");

  //     const { email, password } = req.body;

  //     if (!email) {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Email is required"
  //       });
  //     }

  //     if (!password) {
  //       return res.status(400).json({
  //         status: 400,
  //         message: "Password is required"
  //       });
  //     }

  //     // Find the user by email
  //     const user = await userModel.findOne({ email });
  //     console.log(' user ---- ?', user);
  //     // if (!user) {
  //     //   return res.status(404).json({
  //     //     status: 404,
  //     //     message: "User not found"
  //     //   });
  //     // }

  //     try {
  //       // Check if user exists
  //       if (!user) {
  //         return res.status(404).json({
  //           status: 404,
  //           message: "User not found",
  //         });
  //       }

  //       // Check subscription status
  //       if (user.isSubscribed === false) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Your free trial has expired.",
  //         });
  //       }

  //       // Validate password
  //       const isPasswordValid = await checkEncryptedPassword(password, user.password);
  //       if (!isPasswordValid) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Invalid password.",
  //         });
  //       }

  //       // Ensure JWT_SECRET is set
  //       if (!process.env.JWT_SECRET) {
  //         console.error("JWT_SECRET is not set in environment variables.");
  //         return res.status(500).json({
  //           status: 500,
  //           message: "Internal server error. Please contact support.",
  //         });
  //       }

  //       // Generate JWT token
  //       const token = jwt.sign(
  //         { userId: user._id },
  //         process.env.JWT_SECRET,
  //         { expiresIn: '360m' }
  //       );

  //       console.log('Login token:', token);

  //       // Send success response with token
  //       return res.status(200).json({
  //         status: 200,
  //         type: "user",
  //         message: "User authenticated successfully.",
  //         token,
  //       });

  //     } catch (error) {
  //       console.error("Error during login:", error);

  //     }


  //     // If not found in User, check in the Member collection
  //     const member = await memberModel.findOne({ email });
  //     console.log(email, member);
  //     console.log('verified ?', member?.isApproved);

  //     if (member) {
  //       const isPasswordValid = await checkEncryptedPassword(password, member?.password);
  //       if (!isPasswordValid) {
  //         return res.status(401).json({
  //           status: 401,
  //           message: "Invalid password"
  //         });
  //       }

  //       if (!member?.isApproved) {
  //         return res.status(401).json({
  //           status: 401,
  //           error: "User is not verified",
  //           message: "Member need to verify the email"
  //         });
  //       }

  //       const token = jwt.sign({ userId: member._id }, process.env.JWT_SECRET, { expiresIn: '360m' });

  //       // Send response with the token
  //       return res.status(200).json({
  //         status: 200,
  //         message: "Member authenticated successfully",
  //         type: "member",
  //         token
  //       });
  //     }

  //     // If neither a user nor member is found
  //     return res.status(401).json({
  //       status: 401,
  //       message: "User is not registered with DigiCare"
  //     });

  //   } catch (error) {
  //     res.status(500).json({ error: error });
  //   }
  // },




  signup: async (req, res) => {
    try {

      let adminUserId = req.userId
      let adminUserDetails = await adminModel.findOne({ _id: adminUserId })
      console.log("--------  started User signup ----------", adminUserId, adminUserDetails);

      const { name, email, password, mobile, fcmToken } = req.body;

      // Validate input
      if (!name) return res.status(400).json({ status: 400, message: "Name is required" });
      if (!email) return res.status(400).json({ status: 400, message: "Email is required" });
      if (!password) return res.status(400).json({ status: 400, message: "Password is required" });

      // Validate password complexity
      const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&#])[A-Za-z\d@$!%*?&#]{8,}$/;
      if (!passwordRegex.test(password)) {
        return res.status(400).json({
          status: 400,
          message: "Password must contain at least 8 characters, including one uppercase letter, one lowercase letter, one number, and one special character"
        });
      }

      if (!mobile) return res.status(400).json({ status: 400, message: "Mobile number is required" });

      // Check if the user already exists
      const existingUser = await userModel.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ status: 409, message: "User already registered" });
      }

      // Hash the password before saving
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create a new user
      const newUser = new userModel({
        name,
        email,
        fcmToken,
        mobile,
        password: hashedPassword,
        createdBy: "system",
        updatedBy: "system",
      });

      await newUser.save();

      // Generate a JWT token for authentication (2 hours expiry)
      const token = jwt.sign({ userId: newUser._id }, process.env.JWT_SECRET, { expiresIn: '360m' });

      // Generate email verification token
      const verificationToken = jwt.sign(
        {
          email: newUser.email,
          userId: newUser._id,
          name: newUser.name,
          superAdminName: adminUserDetails?.name,
        },
        process.env.JWT_SECRET,
        { expiresIn: "360m" }
      );

      const verificationLink = `${clientURL}/user-verify-email?token=${verificationToken}`;

      // Email data
      const messageData = {
        from: { email: "<nischal@progatetechnology.com>", name: "DigiCare4U" },
        to: newUser.email,
        subject: "Welcome to DigiCare4u! Please Verify Your Email",
        html: `
                <div style="max-width: 600px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; font-family: Arial, sans-serif; color: #333;">
                    <div style="background-color: #4CAF50; padding: 20px; text-align: center;">
                        <h1 style="color: white; margin: 0;">DigiCare4u</h1>
                        <p style="color: #f0f0f0;">Your well-being, our priority.</p>
                    </div>
                    <div style="padding: 20px;">
                        <h2 style="color: #4CAF50;">Welcome, ${newUser.name}!</h2>
                        <p>Thank you for joining DigiCare4u! To get started, please verify your email address by clicking the button below:</p>
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

      // Send email (uncomment when ready)
      await sendMail(messageData);

      console.log('Verification link:', verificationLink);

      // Create default channels for the user
      const defaultChannels = [
        { name: `Friends_${newUser._id}`, description: 'Laughter, memories, connection' },
        { name: `Family_${newUser._id}`, description: 'Love, support, togetherness' },
        { name: `Work_${newUser._id}`, description: 'Collaboration, productivity, success' },
      ];

      await Promise.all(
        defaultChannels.map(channel =>
          new channelModel({
            ...channel,
            createdBy: newUser._id,
            createdByModel: 'User',
          }).save()
        )
      );

      // Send response
      res.status(201).json({
        status: 201,
        message: "User registered successfully. Please verify your email.",
        token,
        verificationToken,
      });

    } catch (error) {
      console.error("Error during user signup:", error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  },






  // const jwt = require('jsonwebtoken');
  // const userModel = require('../models/userModel');
  // const memberModel = require('../models/memberModel');
  // const { checkEncryptedPassword } = require('../utils/passwordUtils');


  login: async (req, res) => {
    try {
      console.log("-------- Started User login ----------");

      const { email, password } = req.body;

      if (!email || !password) {
        return sendErrorResponse(res, 400, "Email and password are required.");
      }

      // First, try logging in as a member
      const memberResponse = await handleMemberLogin(email, password, res);
      if (memberResponse) return memberResponse;

      // If no member is found, try logging in as a user
      await handleUserLogin(email, password, res);

    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  },
  handleFcmToken: async (req, res) => {
    try {
      console.log("-------- Started handleFcmToken ----------");

      const { email, password } = req.body;

      if (!email || !password) {
        return sendErrorResponse(res, 400, "Email and password are required.");
      }

      // Check if the user is a member
      const member = await memberModel.findOne({ email });
      if (member && (await checkEncryptedPassword(password, member.password))) {
        req.userId = member._id;
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: member._id,
          fcmToken: member.fcmToken,
          type: "member",
        });
      }

      // Check if the user is a user
      const user = await userModel.findOne({ email });
      if (user && (await checkEncryptedPassword(password, user.password))) {
        req.userId = user._id;
        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: user._id,
          fcmToken: user.fcmToken,

          type: "user",
        });
      }

      // If no user or member is found
      return sendErrorResponse(res, 401, "Invalid email or password.");
    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  },
  handleFcmTokenUpdate: async (req, res) => {
    try {
      console.log("-------- Started handleFcmToken ----------");

      const { email, password, fcmToken } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          status: 400,
          message: "Email and password are required.",
        });
      }

      if (!fcmToken) {
        return res.status(400).json({
          status: 400,
          message: "FCM token is required.",
        });
      }

      // Check if the user is a member
      const member = await memberModel.findOne({ email });
      if (member && (await checkEncryptedPassword(password, member.password))) {
        // Update the FCM token if it's different
        if (member.fcmToken !== fcmToken) {
          member.fcmToken = fcmToken;
          await member.save();
          console.log("Member FCM token updated");
        }

        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: member._id,
          fcmToken: member.fcmToken,
          type: "member",
        });
      }

      // Check if the user is a user
      const user = await userModel.findOne({ email });
      if (user && (await checkEncryptedPassword(password, user.password))) {
        // Update the FCM token if it's different
        if (user.fcmToken !== fcmToken) {
          user.fcmToken = fcmToken;
          await user.save();
          console.log("User FCM token updated");
        }

        return res.status(200).json({
          status: 200,
          message: "Login successful.",
          userId: user._id,
          fcmToken: user.fcmToken,
          type: "user",
        });
      }

      // If no user or member is found
      return res.status(401).json({
        status: 401,
        message: "Invalid email or password.",
      });
    } catch (error) {
      console.error("Error during login:", error.message);
      return res.status(500).json({
        status: 500,
        message: "An unexpected error occurred. Please try again later.",
      });
    }
  }


}













