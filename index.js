
const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
require("./database");
const routes = require('./routes');

const { socketService } = require('./service/socket'); // Import the socket service

//====================================================
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
// });
//====================================================
// Use the session middleware

app.use(
  cors({
    origin: "*",
  })
);
app.use(express.json());
app.use(
  express.urlencoded({
    extended: true,
  })
);

//====================================================
const coldStartSolution = () => {
  setTimeout(() => {
    // axios.get
    console.log("-------- Cold Start -------------")
  }, 1000)
  coldStartSolution();
}
app.get("/", (req, res) => {
  res.send("<h1> DigiCare4u Server </h1>");
});
//===================================================
app.use(routes)
const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`Server started on PORT : ${PORT}`);
});

// Initialize Socket Service
socketService(server);