const logger = require('./logger');

const generateOTP = () => {
  // Generate a 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  logger.info('Generated new OTP:', { 
    otp,
    length: otp.length,
    type: typeof otp
  });
  return otp;
};

module.exports = {
  generateOTP
}; 