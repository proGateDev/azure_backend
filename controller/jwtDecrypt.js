const memberModel = require('../member/models/profile'); // Import the User model
const userModel = require('../user/models/profile'); // Import the Member model

exports.getJWTDetails = async (req, res) => {
    try {
        // console.log('decoding token .....................................................');
        
        const userId = req.userId; // Extract userId from the request

        // First, check in the User collection
        const user = await userModel.findById(userId);
        if (user) {
            return res.status(200).json({
                status: 200,
                message: 'User found',
                data: user                    , // Return user ID
                userType: 'user' // Return userType as 'user'
            });
        }

        // If not found in User, check in the Member collection
        const member = await memberModel.findById(userId);
        if (member) {
            return res.status(200).json({
                status: 200,
                message: 'Member found',
                data: member , // Return member ID
                userType: 'member' // Return userType as 'member'
            });
        }

        // If not found in either collection
        return res.status(404).json({
            status: 404,
            message: 'User or Member not found'
        });

    } catch (error) {
        return res.status(500).json({ message: 'Error fetching JWT details', error });
    }
};
