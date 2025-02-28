const axios = require('axios');

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'YOUR_GOOGLE_MAPS_API_KEY'; // Replace with your actual API key

// Middleware to calculate distance between two locations
const calculateDistance = async (req, res, next) => {
    const { currentLocation, assignedLocation } = req.body;

    // Validate the input
    if (!currentLocation || !assignedLocation) {
        return res.status(400).json({ message: 'Both current and assigned locations are required.' });
    }

    const { lat: currentLat, lng: currentLng } = currentLocation;
    const { lat: assignedLat, lng: assignedLng } = assignedLocation;

    // Call Google Maps Directions API
    try {
        const response = await axios.get('https://maps.googleapis.com/maps/api/directions/json', {
            params: {
                origin: `${currentLat},${currentLng}`,
                destination: `${assignedLat},${assignedLng}`,
                key: GOOGLE_MAPS_API_KEY,
                mode: 'driving', // Change as needed (driving, walking, etc.)
            },
        });

        if (response.data.status === 'OK') {
            const distance = response.data.routes[0].legs[0].distance.text;
            const duration = response.data.routes[0].legs[0].duration.text;

            // Attach distance and duration to the request object
            req.distanceInfo = {
                distance,
                duration,
                message: 'Distance and duration calculated successfully.',
            };
            next(); // Proceed to the next middleware or route handler
        } else {
            return res.status(500).json({ message: 'Failed to calculate distance.', error: response.data.status });
        }
    } catch (error) {
        console.error('Error fetching directions:', error);
        return res.status(500).json({ message: 'Error fetching directions from Google Maps API.', error: error.message });
    }
};

module.exports = calculateDistance;
