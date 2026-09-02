const mongoose = require('mongoose');

const proctoringSchema = new mongoose.Schema({
  exam: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Exam',
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  session: {
    type: String,
    required: true
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  // Face detection logs
  faceDetection: [{
    timestamp: {
      type: Date,
      required: true
    },
    confidence: {
      type: Number,
      required: true
    },
    faceCount: {
      type: Number,
      required: true
    },
    isViolation: {
      type: Boolean,
      default: false
    },
    violationType: {
      type: String,
      enum: ['multiple_faces', 'no_face', 'face_not_centered']
    }
  }],
  // Eye tracking logs
  eyeTracking: [{
    timestamp: {
      type: Date,
      required: true
    },
    gazePoint: {
      x: Number,
      y: Number
    },
    eyeOpenness: {
      type: Number,
      required: true
    },
    isViolation: {
      type: Boolean,
      default: false
    },
    violationType: {
      type: String,
      enum: ['eyes_closed', 'looking_away', 'multiple_people']
    }
  }],
  // Audio monitoring logs
  audioMonitoring: [{
    timestamp: {
      type: Date,
      required: true
    },
    audioLevel: {
      type: Number,
      required: true
    },
    isViolation: {
      type: Boolean,
      default: false
    },
    violationType: {
      type: String,
      enum: ['noise_detected', 'multiple_voices']
    }
  }],
  // Browser tab monitoring
  tabSwitching: [{
    timestamp: {
      type: Date,
      required: true
    },
    tabTitle: String,
    url: String,
    isViolation: {
      type: Boolean,
      default: false
    }
  }],
  // System monitoring
  systemMonitoring: [{
    timestamp: {
      type: Date,
      required: true
    },
    cpuUsage: Number,
    memoryUsage: Number,
    networkActivity: {
      type: Boolean,
      default: false
    },
    isViolation: {
      type: Boolean,
      default: false
    }
  }],
  // Violation summary
  violations: [{
    type: {
      type: String,
      enum: ['face', 'eye', 'audio', 'tab', 'system'],
      required: true
    },
    timestamp: {
      type: Date,
      required: true
    },
    details: String,
    severity: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true
    },
    action: {
      type: String,
      enum: ['warning', 'flag', 'terminate'],
      required: true
    }
  }],
  // Session status
  status: {
    type: String,
    enum: ['active', 'completed', 'terminated', 'flagged'],
    default: 'active'
  },
  // Proctoring settings used
  settings: {
    faceDetectionEnabled: {
      type: Boolean,
      default: true
    },
    eyeTrackingEnabled: {
      type: Boolean,
      default: true
    },
    audioMonitoringEnabled: {
      type: Boolean,
      default: true
    },
    tabSwitchingEnabled: {
      type: Boolean,
      default: true
    },
    systemMonitoringEnabled: {
      type: Boolean,
      default: true
    },
    violationThresholds: {
      face: Number,
      eye: Number,
      audio: Number,
      tab: Number,
      system: Number
    }
  }
}, {
  timestamps: true
});

// Method to add a violation
proctoringSchema.methods.addViolation = function(type, details, severity, action) {
  this.violations.push({
    type,
    timestamp: new Date(),
    details,
    severity,
    action
  });

  // Update session status based on violation severity
  if (severity === 'high' || this.violations.length >= 3) {
    this.status = 'flagged';
  }

  return this.save();
};

// Method to end session
proctoringSchema.methods.endSession = function() {
  this.endTime = new Date();
  this.status = 'completed';
  return this.save();
};

// Method to terminate session
proctoringSchema.methods.terminateSession = function(reason) {
  this.endTime = new Date();
  this.status = 'terminated';
  return this.addViolation('system', reason, 'high', 'terminate');
};

// Method to get violation summary
proctoringSchema.methods.getViolationSummary = function() {
  const summary = {
    total: this.violations.length,
    byType: {},
    bySeverity: {
      low: 0,
      medium: 0,
      high: 0
    }
  };

  this.violations.forEach(violation => {
    // Count by type
    summary.byType[violation.type] = (summary.byType[violation.type] || 0) + 1;
    // Count by severity
    summary.bySeverity[violation.severity]++;
  });

  return summary;
};

const Proctoring = mongoose.model('Proctoring', proctoringSchema);

module.exports = Proctoring; 