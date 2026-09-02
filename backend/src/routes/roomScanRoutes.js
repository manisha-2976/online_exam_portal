const express = require("express");
const router = express.Router();

const {
  startRoomScan,
        completeRoomScan,
        roomScanTimeout,
          incompleteRoomScan,
            getRoomScanStatus,




} = require("../controllers/roomScanController");

router.post("/start", startRoomScan);
router.post("/complete", completeRoomScan);
router.post("/timeout", roomScanTimeout);
router.post("/incomplete", incompleteRoomScan);
router.get("/status", getRoomScanStatus);

module.exports = router;