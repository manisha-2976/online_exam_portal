const express = require("express");
const router = express.Router();

const {
  faceEnroll,
  faceVerify,
  faceStatus,
} = require("../controllers/faceController");

// API #1 - Face Enrollment
router.post("/enroll", faceEnroll);

// API #2 - Face Verification
router.post("/verify", faceVerify);

// API #3 - Face Status
router.get("/status", faceStatus);

module.exports = router;