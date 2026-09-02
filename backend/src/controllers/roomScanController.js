const startRoomScan = (req, res) => {
  const { candidateId, sessionId } = req.body;

  res.status(200).json({
    success: true,
    status: "started",
    candidateId,
    sessionId,
    message: "Room scan started successfully"
  });
};

const completeRoomScan = (req, res) => {
  const { candidateId, sessionId } = req.body;

  res.status(200).json({
    success: true,
    status: "completed",
    candidateId,
    sessionId,
    message: "Room scan completed successfully"
  });
};
const roomScanTimeout = (req, res) => {
  const { candidateId, sessionId } = req.body;

  res.status(200).json({
    success: true,
    status: "timeout",
    candidateId,
    sessionId,
    message: "Room scan timed out successfully"
  });
};
const incompleteRoomScan = (req, res) => {
  try {
    const { candidateId, sessionId } = req.body;

    if (!candidateId || !sessionId) {
      return res.status(400).json({
        success: false,
        message: "Candidate ID and Session ID are required",
      });
    }

    return res.status(200).json({
      success: true,
      status: "incomplete",
      candidateId,
      sessionId,
      message: "Room scan marked as incomplete successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to mark room scan as incomplete",
    });
  }
};
const getRoomScanStatus = (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      status: "completed",
      roomScanStatus: "completed",
      message: "Room scan status retrieved successfully",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Failed to get room scan status",
    });
  }
};
module.exports = {
  startRoomScan,
    completeRoomScan,
 roomScanTimeout,
   incompleteRoomScan,
     getRoomScanStatus,




};