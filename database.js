const mongoose = require("mongoose");
require("dotenv").config();
//===========================
mongoose.set('strictQuery', false)
const db = mongoose.connect(process.env.DB, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => {

    console.log("-------------  --------------", process.env.DB)
    console.log("------------- Database got connected --------------")
})
module.exports = db;
