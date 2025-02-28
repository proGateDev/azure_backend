const { default: axios } = require("axios");
const memberModel = require("../../member/models/profile");
const superAdminCreationValidation = require("../../member/validation/superAdminCreation")
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
//==================================================

module.exports = {


    getLocationFromCoordinates: async (req, res) => {
        const { latitude, longitude } = req.body;
        console.log('-------- location --->', typeof (latitude), longitude);
    
        try {
            // Validate request body for latitude and longitude
            if (!(latitude && longitude)) {
                return res.status(400).json({
                    status: 400,
                    message: "Latitude and Longitude are required"
                });
            }
    
            // Find the member by their ID

    let formattedAddress = {}
            // Reverse geocode to get the address
            const response = await axios.get(
                `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${process.env.GOOGLE_MAPS_API_KEY}`
            );
    
            if (response.data.status === "OK") {
                 formattedAddress = response.data.results[0].formatted_address;
            } else {
                console.error('Error fetching address:', response);
                return res.status(500).json({ message: "Error fetching address", status: response.data.status });
            }
    
            // Save the updated member data
    
            return res.status(200).json({ 
                status : 200,
                message: "Location found  successfully",
                formattedAddress
            });
        } catch (error) {
            console.error("Error updating location:", error);
            return res.status(500).json({ message: "Server error", error });
        }
    }
    

}
