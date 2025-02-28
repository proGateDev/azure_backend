const multer = require('multer');
const path = require('path');

// Configure multer for file uploads
 const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Specify the folder to store uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`); // Unique filename with timestamp
  }
});

const uploadData = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    if (ext !== '.xls' && ext !== '.xlsx' && ext !== '.csv') {
      return cb(new Error('Only Excel or CSV files are allowed'), false);
    }
    cb(null, true);
  }
});

module.exports = uploadData