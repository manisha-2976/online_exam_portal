const express = require("express");
const router = express.Router();

const {
  startSession,
    sessionHeartbeat,
      getSessionStatus,
        reconnectSession,
          updateMediaStatus,
            updateScreenStatus




} = require("../controllers/proctoringController");

// API #4 - Start Proctoring Session
router.post("/session/start", startSession);
router.post("/session/heartbeat", sessionHeartbeat);
router.get("/session/status", getSessionStatus);
router.post("/session/reconnect", reconnectSession);
router.post("/media/status", updateMediaStatus);
router.post("/screen/status", updateScreenStatus);


module.exports = router;