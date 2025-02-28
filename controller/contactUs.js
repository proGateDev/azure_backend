const contactUsModel = require("../model/contactUs");

// Create a new SOS log
module.exports = {
    contactUs: async (req, res) => {
        try {
            const { name, email, phone, message, interest } = req.body;

            // Basic validation
            if (!name || !email || !message || !interest) {
                return res.status(400).json({ error: "All required fields must be filled" });
            }

            // Save the form data
            const newQuery = new contactUsModel({ name, email, phone, message, interest });
            await newQuery.save();

            res.status(201).json({ message: "Query submitted successfully" });
        } catch (err) {
            console.error("Error saving query:", err);
            res.status(500).json({ error: "Server error" });
        }
    },
}
