const nodemailer = require('nodemailer');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    logger.info('Initializing email service');
    this.initializeTransporter();
  }

  async initializeTransporter() {
    try {
      // Create Gmail transporter with recommended settings
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS // This should be an App Password, not your regular Gmail password
        },
        tls: {
          rejectUnauthorized: false
        },
        debug: true // Enable debug logs
      });

      // Test the connection
      try {
        await this.transporter.verify();
        logger.info('SMTP connection verified successfully', {
          user: process.env.SMTP_USER,
          host: 'smtp.gmail.com'
        });
      } catch (verifyError) {
        throw new Error(`SMTP verification failed: ${verifyError.message}`);
      }
    } catch (error) {
      logger.error('Failed to initialize email service:', {
        error: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack,
        config: {
          host: 'smtp.gmail.com',
          port: 587,
          user: process.env.SMTP_USER
        }
      });
      this.transporter = null;
      // Rethrow the error to be handled by the calling function
      throw new Error(`Email service initialization failed: ${error.message}`);
    }
  }

  async sendOTPEmail(email, otp) {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        await this.initializeTransporter(); // Try to reinitialize if not available
      }

      if (!this.transporter) {
        throw new Error('Email service is not initialized');
      }

      logger.info('Preparing to send OTP email', {
        to: email,
        from: process.env.SMTP_USER
      });

      // Prepare email content
      const mailOptions = {
        from: {
          name: 'ExamFlow',
          address: process.env.SMTP_USER
        },
        to: email,
        subject: 'ExamFlow - Your Email Verification OTP',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
            <div style="background-color: #ffffff; padding: 20px; border-radius: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
              <h2 style="color: #333; text-align: center; margin-bottom: 20px;">Email Verification</h2>
              <p style="color: #666;">Hello,</p>
              <p style="color: #666;">Your OTP for email verification is:</p>
              <div style="background-color: #f5f5f5; padding: 20px; border-radius: 5px; text-align: center; margin: 20px 0;">
                <h1 style="color: #4CAF50; font-size: 32px; letter-spacing: 5px; margin: 0; font-family: monospace;">${otp}</h1>
              </div>
              <p style="color: #666; font-size: 14px;">This OTP will expire in 10 minutes.</p>
              <p style="color: #666; font-size: 14px;">If you didn't request this OTP, please ignore this email.</p>
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; text-align: center;">
                <p style="color: #999; font-size: 12px;">This is an automated message, please do not reply.</p>
              </div>
            </div>
          </div>
        `
      };

      // Attempt to send email
      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        messageId: info.messageId,
        response: info.response,
        to: email,
        accepted: info.accepted,
        rejected: info.rejected
      });

      return true;
    } catch (error) {
      logger.error('Failed to send email', {
        error: error.message,
        code: error.code,
        command: error.command,
        stack: error.stack,
        to: email,
        errorName: error.name,
        errorStack: error.stack
      });

      // Attempt to reinitialize transporter on certain errors
      if (error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT' || error.code === 'ESOCKET') {
        logger.info('Attempting to reinitialize email service due to connection error');
        try {
          await this.initializeTransporter();
        } catch (reinitError) {
          logger.error('Failed to reinitialize email service', {
            error: reinitError.message
          });
        }
      }

      return false;
    }
  }
}

// Create and export a single instance
const emailService = new EmailService();
module.exports = emailService; 