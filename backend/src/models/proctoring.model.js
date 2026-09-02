const mongoose = require('mongoose');

const proctoringSchema = new mongoose.Schema({
  examId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  // Enhanced monitoring data
  faceDetection: [{
    timestamp: Date,
    confidence: Number,
    faceCount: Number,
    facePosition: {
      x: Number,
      y: Number,
      width: Number,
      height: Number
    },
    isViolation: Boolean,
    violationType: String,
    evidence: String // URL to screenshot
  }],
  eyeTracking: [{
    timestamp: Date,
    gazePoint: {
      x: Number,
      y: Number
    },
    eyeOpenness: Number,
    blinkCount: Number,
    isViolation: Boolean,
    violationType: String,
    evidence: String
  }],
  audioMonitoring: [{
    timestamp: Date,
    audioLevel: Number,
    voiceCount: Number,
    isViolation: Boolean,
    violationType: String,
    evidence: String // URL to audio clip
  }],
  screenMonitoring: [{
    timestamp: Date,
    screenshot: String, // URL to encrypted screenshot
    contentHash: String,
    isViolation: Boolean,
    violationType: String
  }],
  keyboardActivity: [{
    timestamp: Date,
    keyCount: Number,
    suspiciousPatterns: [String],
    isViolation: Boolean,
    violationType: String
  }],
  mouseActivity: [{
    timestamp: Date,
    movementCount: Number,
    suspiciousPatterns: [String],
    isViolation: Boolean,
    violationType: String
  }],
  // System monitoring
  systemMetrics: [{
    timestamp: Date,
    cpuUsage: Number,
    memoryUsage: Number,
    networkActivity: Boolean,
    runningProcesses: [String],
    isViolation: Boolean,
    violationType: String
  }],
  // Violations
  violations: [{
    type: {
      type: String,
      enum: [
        'MULTIPLE_FACES',
        'NO_FACE',
        'FACE_NOT_CENTERED',
        'EYES_CLOSED',
        'LOOKING_AWAY',
        'BACKGROUND_NOISE',
        'MULTIPLE_VOICES',
        'TAB_SWITCH',
        'WINDOW_SWITCH',
        'SCREENSHOT_ATTEMPT',
        'SCREEN_RECORDING',
        'SUSPICIOUS_KEYBOARD',
        'SUSPICIOUS_MOUSE',
        'HIGH_CPU_USAGE',
        'NETWORK_ACTIVITY',
        'UNAUTHORIZED_PROCESS'
      ],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    details: String,
    severity: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
      default: 'MEDIUM'
    },
    evidence: [String], // Array of evidence URLs
    action: {
      type: String,
      enum: ['WARNING', 'FLAG', 'TERMINATE'],
      default: 'WARNING'
    }
  }],
  // Session status
  status: {
    type: String,
    enum: ['ACTIVE', 'WARNED', 'FLAGGED', 'TERMINATED'],
    default: 'ACTIVE'
  },
  warningCount: {
    type: Number,
    default: 0
  },
  // Session timing
  sessionStart: {
    type: Date,
    required: true
  },
  sessionEnd: Date,
  // Settings
  settings: {
    faceDetection: {
      enabled: Boolean,
      minConfidence: Number,
      maxFaceCount: Number,
      positionThreshold: Number
    },
    eyeTracking: {
      enabled: Boolean,
      minEyeOpenness: Number,
      maxBlinkRate: Number,
      gazeThreshold: Number
    },
    audioMonitoring: {
      enabled: Boolean,
      maxNoiseLevel: Number,
      maxVoiceCount: Number
    },
    screenMonitoring: {
      enabled: Boolean,
      screenshotInterval: Number,
      contentAnalysis: Boolean
    },
    keyboardMonitoring: {
      enabled: Boolean,
      patternDetection: Boolean
    },
    mouseMonitoring: {
      enabled: Boolean,
      patternDetection: Boolean
    },
    systemMonitoring: {
      enabled: Boolean,
      maxCpuUsage: Number,
      maxMemoryUsage: Number,
      allowedProcesses: [String]
    }
  }
}, {
  timestamps: true
});

// Add indexes for efficient querying
proctoringSchema.index({ examId: 1, userId: 1 });
proctoringSchema.index({ 'violations.timestamp': 1 });
proctoringSchema.index({ status: 1 });

// Method to add a violation with evidence
proctoringSchema.methods.addViolation = async function(type, details, severity, evidence = []) {
  const violation = {
    type,
    timestamp: new Date(),
    details,
    severity,
    evidence,
    action: this.determineAction(severity)
  };

  this.violations.push(violation);
  this.warningCount += 1;
  
  // Update status based on violation severity and count
  if (severity === 'HIGH' || this.warningCount >= 3) {
    this.status = 'FLAGGED';
  } else if (this.warningCount >= 2) {
    this.status = 'WARNED';
  }

  await this.save();
  return violation;
};

// Method to determine action based on severity and warning count
proctoringSchema.methods.determineAction = function(severity) {
  if (severity === 'HIGH' || this.warningCount >= 3) {
    return 'TERMINATE';
  } else if (severity === 'MEDIUM' || this.warningCount >= 2) {
    return 'FLAG';
  }
  return 'WARNING';
};

// Method to terminate session
proctoringSchema.methods.terminateSession = async function(reason) {
  this.status = 'TERMINATED';
  this.sessionEnd = new Date();
  await this.addViolation('SYSTEM_ALERT', `Session terminated: ${reason}`, 'HIGH');
  await this.save();
  return this;
};

module.exports = mongoose.model('Proctoring', proctoringSchema); 