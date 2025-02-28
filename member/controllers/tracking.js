const memberModel = require("../models/profile");
const trackingHistoryModel = require('../../model/trackingHistory'); // Update with the correct path
const getAddressFromCoordinates = require("../../service/geoCode");
const { default: mongoose } = require("mongoose");

//==================================================

module.exports = {

    updateMemberLocation: async (req, res) => {
        try {
            const memberId = req.userId;
            const { latitude, longitude } = req.body;
            console.log('locatin ----------memberId ', latitude, longitude, memberId);

            // Update the member's location
            const updatedMember = await memberModel.findByIdAndUpdate(
                memberId,
                {
                    location: {
                        type: 'Point',
                        coordinates: [longitude, latitude],
                    },
                    locationStatus: 'active',
                },
                { new: true }
            );

            // Save to tracking history
            const newLocationHistory = new trackingHistoryModel({
                memberId,
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude],
                },
            });
            await newLocationHistory.save();

            res.status(200).json({ message: 'Location updated successfully', member: updatedMember });
        } catch (error) {
            res.status(500).json({ message: 'Error updating location', error: error.message });
        }
    },

    // postMemberLocation: async (req, res) => {
    //     try {
    //         const memberId = req.userId; // Get the member ID from the request
    //         const { latitude, longitude } = req.body; // Extract latitude and longitude from the request body
    //         console.log('Location ---------- Member ID:', memberId, 'Latitude:', latitude, 'Longitude:', longitude);

    //         // Create a new location entry in the tracking history
    //         const newLocationHistory = new trackingHistoryModel({
    //             memberId, // Associate the location with the member ID
    //             location: {
    //                 type: 'Point',
    //                 coordinates: [longitude, latitude], // Store coordinates as [longitude, latitude]
    //             },
    //             locationStatus: 'active', // You can add this if it's part of your schema
    //         });

    //         // Save the new location history to the database
    //         await newLocationHistory.save();

    //         res.status(201).json({ message: 'Location posted successfully', location: newLocationHistory });
    //     } catch (error) {
    //         res.status(500).json({ message: 'Error posting location', error: error.message });
    //     }
    // },





    postMemberLocation: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { latitude, longitude } = req.body; // Extract latitude and longitude from the request body
            console.log('Location ---------- Member ID:', memberId, 'Latitude:', latitude, 'Longitude:', longitude);

            // Get formatted address from coordinates
            const addressDetails = await getAddressFromCoordinates(latitude, longitude);

            // Create a new location entry in the tracking history
            const newLocationHistory = new trackingHistoryModel({
                memberId, // Associate the location with the member ID
                location: {
                    type: 'Point',
                    coordinates: [longitude, latitude], // Store coordinates as [longitude, latitude]
                },
                // Add address details to the tracking history
                formattedAddress: addressDetails.formattedAddress,
                locality: addressDetails.locality,
                sublocality: addressDetails.sublocality,
                region: addressDetails.region,
                country: addressDetails.country,
                postalCode: addressDetails.postalCode,
                landmarks: addressDetails.landmarks,
                timestamp: new Date() // Optional: Use the current date and time
            });

            // Save the new location history to the database
            await newLocationHistory.save();

            res.status(201).json({
                message: 'Location posted successfully',
                location: newLocationHistory,
            });
        } catch (error) {
            res.status(500).json({ message: 'Error posting location', error: error.message });
        }
    },
    getMemberLocationsRecords: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { interval } = req.query; // Get the interval from the query parameters




            // Fetch the member's tracking history sorted by timestamp
            const trackingHistory = await trackingHistoryModel
                .find({
                    memberId,
                    timestamp: { $gte: new Date(interval) },
                    trackingType: { $nin: ['geo-fenced', 'scheduled'] }, // Exclude multiple tracking types

                })
                .sort({ timestamp: -1 })
                .populate('assignmentId'); // Ensure this is correctly populated
            console.log('trackingHistory', trackingHistory.length);

            if (!trackingHistory || trackingHistory.length === 0) {
                return res.status(200).json({ message: "No locations found for this member" });
            }

            // Remove duplicates based on locality and keep the most recent record for each locality
            const localityMap = {};

            trackingHistory.forEach((location) => {
                const locality = location?.addressDetails?.locality || location?.addressDetails?.address || location?.addressDetails?.preferredAddress || 'Unknown Locality';
                // console.log(locality, 'location')
                // If the locality hasn't been recorded yet or the current record is more recent
                if (!localityMap[locality] || location.timestamp > localityMap[locality].timestamp) {
                    localityMap[locality] = location; // Keep the latest record for the locality
                }
            });

            // Convert the localityMap to an array and add the count
            const filteredLocations = Object.values(localityMap).map((location) => {
                return {
                    locality: location?.addressDetails?.locality || location?.addressDetails?.address || location?.addressDetails?.preferredAddress || 'Unknown Locality',
                    timestamp: location.timestamp,
                    trackingType: location.trackingType,
                    count: trackingHistory.filter(item => item.addressDetails.locality === location.addressDetails.locality).length,
                    assignmentName: location.trackingType === 'scheduled' ? location.assignmentId.eventName || 'No assignment name' : undefined
                };
            });

            // Return the filtered locations with count for locality
            res.status(200).json({
                message: "Locations fetched successfully",
                count: filteredLocations.length, // Return the array with only one record per locality
                filteredLocations
            });
        } catch (error) {
            console.error("Error fetching locations:", error);
            res.status(500).json({ message: "Error fetching locations", error: error.message });
        }
    },





    getMemberLocationsRecordsForMap: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { interval } = req.query; // Get the interval from the query parameters
            // console.log('dateLimit---------------------------------------------------', interval);

            // Fetch the member's tracking history sorted by timestamp
            const trackingHistory = await trackingHistoryModel
                .find({
                    memberId,
                    timestamp: { $gte: new Date(interval) },
                })
                .sort({ timestamp: -1 })
                .populate('assignmentId'); // Ensure this is correctly populated

            if (!trackingHistory || trackingHistory.length === 0) {
                return res.status(200).json({ message: "No locations found for this member" });
            }

            // Remove duplicates based on locality and keep the most recent record for each locality
            const localityMap = {};

            trackingHistory.forEach((location) => {
                const locality = location.addressDetails.locality || 'Unknown Locality';

                // If the locality hasn't been recorded yet or the current record is more recent
                if (!localityMap[locality] || location.timestamp > localityMap[locality].timestamp) {
                    localityMap[locality] = location; // Keep the latest record for the locality
                }
            });

            // Convert the localityMap to an array and add the count and coordinates
            const filteredLocations = Object.values(localityMap).map((location) => {
                const coordinates = location.location.coordinates || {}; // Assuming coordinates are stored here
                // console.log('location.location.coordinates', location.location.coordinates);

                return {
                    locality: location.addressDetails.locality,
                    timestamp: location.timestamp,
                    trackingType: location.trackingType,
                    count: trackingHistory.filter(item => item.addressDetails.locality === location.addressDetails.locality).length,
                    assignmentName: location.trackingType === 'scheduled' ? location.assignmentId.eventName || 'No assignment name' : undefined,
                    coordinates: {
                        latitude: coordinates[0] || null,  // Include latitude if available, otherwise null
                        longitude: coordinates[1] || null // Include longitude if available, otherwise null
                    }
                };
            });

            // Return the filtered locations with count and coordinates
            res.status(200).json({
                message: "Locations fetched successfully",
                count: filteredLocations.length, // Return the array with only one record per locality
                mapData: filteredLocations,
            });
        } catch (error) {
            console.error("Error fetching locations:", error);
            res.status(500).json({ message: "Error fetching locations", error: error.message });
        }
    },




    fetchMemberLiveLocationInsightReport: async (req, res) => {
        try {
            const memberId = req.userId; // Assuming userId is available in the request object
            const { selectedDate, locationType } = req.body; // Extract memberId and selectedDate from request params

            console.log("Selected Date:", selectedDate);

            // Parse the given date and calculate the next day
            const givenDate = new Date(selectedDate);
            const nextDay = new Date(givenDate);
            nextDay.setDate(nextDay.getDate() + 1);
            const memberDetails = await memberModel.findOne({ _id: memberId });
            // Fetch live location data from the database
            const liveLocation = await trackingHistoryModel
                .find({
                    memberId,
                    trackingType: "live",
                    timestamp: {
                        $gte: givenDate, // Greater than or equal to the given date
                        $lt: nextDay, // Less than the start of the next day
                    },
                })
                .sort({ timestamp: -1 }); // Sort in descending order by timestamp

            const downloadReportData = liveLocation.map((item) => {
                const formattedTimestamp = new Intl.DateTimeFormat("en-US", {
                    year: "numeric",
                    month: "long",
                    day: "2-digit",
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                }).format(new Date(item.timestamp));
                return {
                    address: item.addressDetails.address,
                    locality: item.addressDetails.locality,
                    street: item.addressDetails.street,
                    neighborhood: item.addressDetails.neighborhood,
                    region: item.addressDetails.region,
                    district: item.addressDetails.district,
                    country: item.addressDetails.country,
                    timestamp: formattedTimestamp,
                };
            });

            // Handle case where no live location data is found
            if (!liveLocation || liveLocation.length === 0) {
                return res
                    .status(200)
                    .json({ error: "Live location not found for this member" });
            }

            const counts = liveLocation.reduce((acc, location) => {
                // Check based on locationType
                console.log("locationType", locationType);

                if (locationType === "locality") {
                    // Use locality if locationType is 'locality'
                    const locality = location.addressDetails?.locality || "Unknown"; // Default to 'Unknown' if locality is missing
                    acc[locality] = (acc[locality] || 0) + 1;
                } else if (locationType === "district") {
                    // Use district if locationType is 'district'
                    const district = location.addressDetails?.district || "Unknown"; // Default to 'Unknown' if district is missing
                    acc[district] = (acc[district] || 0) + 1;
                } else if (locationType === "street") {
                    // Use district if locationType is 'district'
                    const district = location.addressDetails?.street || "Unknown"; // Default to 'Unknown' if district is missing
                    acc[district] = (acc[district] || 0) + 1;
                } else if (locationType === "neighborhood") {
                    // Use district if locationType is 'district'
                    const district = location.addressDetails?.neighborhood || "Unknown"; // Default to 'Unknown' if district is missing
                    acc[district] = (acc[district] || 0) + 1;
                }

                return acc;
            }, {});

            const totalCount = liveLocation.length;

            const pieChartData = Object.entries(counts).map(([country, count]) => ({
                name: country,
                count, // Include the frequency of this country
                percentage: ((count / totalCount) * 100).toFixed(2), // Convert count to percentage
                color: `#${Math.floor(Math.random() * 16777215).toString(16)}`, // Random color
                legendFontColor: "#333",
                legendFontSize: 14,
            }));

            // Return the live location tracking data along with pie chart data
            res.status(200).json({
                message: "Live location fetched successfully",
                pieChartData,
                downloadReportData,
            });
        } catch (error) {
            console.error("Error fetching live location:", error);
            res.status(500).json({ error: "Internal server error" });
        }
    },








    getMemberLiveTrackingRecords: async (req, res) => {
        try {
            const memberId = req.userId; // Get the member ID from the request
            const { interval } = req.query; // Get the interval from the query parameters
            console.log('interval', interval, memberId, new Date(interval));
            const startOfDay = new Date(interval);
            startOfDay.setHours(0, 0, 0, 0); // Set time to 00:00:00

            const endOfDay = new Date(interval);
            endOfDay.setHours(23, 59, 59, 999); // Set time to 23:59:59


            // Aggregation for filtered locations
            const trackingHistory = await trackingHistoryModel.aggregate([
                {
                    $match: {
                        memberId: new mongoose.Types.ObjectId(memberId), // Convert to ObjectId
                        timestamp: { $gte: startOfDay, $lte: endOfDay },
                        trackingType: { $nin: ['geo-fenced', 'scheduled'] }
                    }
                },
                { $sort: { timestamp: -1 } }, // Sort by most recent first
                {
                    $group: {
                        _id: "$addressDetails.locality", // Group by locality
                        latestRecord: { $first: "$$ROOT" }, // Keep the most recent record per locality
                        count: { $sum: 1 } // Count occurrences
                    }
                },
                {
                    $lookup: {
                        from: "assignments", // The name of the collection storing assignment details
                        localField: "latestRecord.assignmentId",
                        foreignField: "_id",
                        as: "assignment"
                    }
                },
                {
                    $project: {
                        _id: 0,
                        locality: "$_id",
                        timestamp: "$latestRecord.timestamp",
                        trackingType: "$latestRecord.trackingType",
                        count: 1,
                        assignmentName: {
                            $cond: {
                                if: { $eq: ["$latestRecord.trackingType", "scheduled"] },
                                then: { $arrayElemAt: ["$assignment.eventName", 0] },
                                else: null
                            }
                        }
                    }
                }
            ]);

            // Fetch the latest 50 tracking records for trackingRoute (with both date & time)
            const trackingRoute = await trackingHistoryModel.aggregate([
                {
                    $match: {
                        memberId: new mongoose.Types.ObjectId(memberId),
                        timestamp: { $gte: startOfDay, $lte: endOfDay },
                        trackingType: { $nin: ['geo-fenced', 'scheduled'] }
                    }
                },
                { $sort: { timestamp: -1 } }, // Sort by most recent first
                // { $limit: 50 }, // Limit to the latest 50 records
                {
                    $project: {
                        _id: 0,
                        date: { $dateToString: { format: "%Y-%m-%d", date: "$timestamp" } }, // Date (YYYY-MM-DD)
                        time: { $dateToString: { format: "%H:%M:%S", date: "$timestamp" } }, // Time (HH:MM:SS)
                        // lat: "$location.coordinates.1", // Assuming GeoJSON format [lng, lat]
                        // lng: "$location.coordinates.0",
                        location: "$addressDetails.address",
                        // address: "$addressDetails.address",
                        coordinates: "$location.coordinates"
                    }
                }
            ]);

            if (!trackingHistory.length && !trackingRoute.length) {
                return res.status(200).json({ message: "No locations found for this member" });
            }

            res.status(200).json({
                message: "Locations fetched successfully",
                count: trackingHistory.length,
                liveTrackingListData: trackingHistory,
                liveTrackingCoordinates: trackingRoute // Separate field for the latest 50 records
            });

        } catch (error) {
            console.error("Error fetching locations:", error);
            res.status(500).json({ message: "Error fetching locations", error: error.message });
        }
    },




}
