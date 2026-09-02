const express = require("express");

const router = express.Router();

const {
  captureEvidence,
    initiateEvidenceUpload,
      completeEvidenceUpload,
       getEvidenceById,


} = require("../controllers/evidenceController");

// Capture Evidence
router.post("/capture", captureEvidence);
router.post("/upload/initiate", initiateEvidenceUpload);
router.post("/upload/complete", completeEvidenceUpload);
router.get("/:evidenceId", getEvidenceById);

module.exports = router;