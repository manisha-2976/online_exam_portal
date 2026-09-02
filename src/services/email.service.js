const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    logger.info('Initializing email service with SMTP configuration:', {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      secure: false
    });

    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    // Verify connection configuration
    this.transporter.verify((error, success) => {
      if (error) {
        logger.error('SMTP connection error:', {
          error: error.message,
          code: error.code,
          command: error.command
        });
      } else {
        logger.info('SMTP server is ready to send emails');
      }
    });
  }

  async sendOTPEmail(email, otp) {
    try {
      logger.info('Attempting to send OTP email:', {
        to: email,
        from: process.env.SMTP_USER,
        otp: otp
      });
      
      const mailOptions = {
        from: `"ExamFlow" <${process.env.SMTP_USER}>`,
        to: email,
        subject: 'Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Email Verification</h2>
            <p>Your OTP for email verification is:</p>
            <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
              <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
            </div>
            <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
            <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
          </div>
        `
      };

      const info = await this.transporter.sendMail(mailOptions);
      logger.info('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });
      return true;
    } catch (error) {
      logger.error('Error sending email:', {
        error: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack
      });
      return false;
    }
  }
}

module.exports = new EmailService(); 