const sosLogModel = require('../model/sosLog');
const { axios } = require("axios");
const { updateLocation } = require('../service/socket');


module.exports = {
    geoCode: async (req, res) => {
        try {
            console.log('000000 Started ------->', req.body);

            const { latitude, longitude } = req.body;

            // Call the Google Geocoding API
            const googleMapsPlatformAPIKey = process.env.GOOGLE_MAPS_API_KEY; // Set your API key in environment variables
            const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${latitude},${longitude}&key=${googleMapsPlatformAPIKey}`;
            console.log(' ------ geocodeUrl  ------->', geocodeUrl);

            const response = await axios.get(geocodeUrl);
            console.log('000000  response  ------->', response);


            if (response.data.status !== 'OK') {
                return res.status(400).json({ message: 'Error with Geocoding API', error: response.data.status });
            }

            // Extract address components
            const addressComponents = response.data.results[0].address_components;
            const locality = addressComponents.find(component => component.types.includes("locality"))?.long_name || '';
            const city = addressComponents.find(component => component.types.includes("administrative_area_level_2"))?.long_name || '';
            const state = addressComponents.find(component => component.types.includes("administrative_area_level_1"))?.long_name || '';
            const country = addressComponents.find(component => component.types.includes("country"))?.long_name || '';

            // Create a new SOS log
            const newSOS = new sosLogModel({
                memberId,
                location: { latitude, longitude },
                message: "SOS activated",
                address: { locality, city, state, country } // Save the extracted address
            });

            await newSOS.save();
            return res.status(201).json({ message: 'SOS logged successfully', data: newSOS });
        } catch (error) {
            console.log('error-->', error);
            return res.status(500).json({ message: 'Error logging SOS', error });
        }
    },
    updateLocationSocket: async (req, res) => {
        updateLocation(req.body);

    }
}
