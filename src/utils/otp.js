const qrcode = require('qrcode');
const logger = require('./logger');

// Generate OTP
const generateOTP = () => {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.info('Generated new OTP:', { 
    otp,
    length: otp.length,
    type: typeof otp
  });
  return {
    token: otp,
    secret: otp // For backward compatibility
  };
};

// Verify OTP
const verifyOTP = (secret, token) => {
  // Clean up the input OTP
  const cleanToken = token.toString().trim();
  const cleanSecret = secret.toString().trim();
  
  logger.info('Verifying OTP:', { 
    receivedToken: cleanToken,
    storedSecret: cleanSecret,
    receivedLength: cleanToken.length,
    storedLength: cleanSecret.length
  });

  // Simple string comparison for static OTP
  const isValid = cleanSecret === cleanToken;
  
  logger.info('OTP verification result:', { 
    isValid,
    comparison: {
      exact: cleanSecret === cleanToken,
      lengthMatch: cleanSecret.length === cleanToken.length
    }
  });
  
  return isValid;
};

// Generate QR code for 2FA
const generateQRCode = async (secret) => {
  try {
    return await qrcode.toDataURL(secret);
  } catch (error) {
    logger.error('Failed to generate QR code:', error);
    return null;
  }
};

module.exports = {
  generateOTP,
  verifyOTP,
  generateQRCode
}; 