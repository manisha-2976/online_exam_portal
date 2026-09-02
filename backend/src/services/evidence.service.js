const crypto = require('crypto');
const AWS = require('aws-sdk');
const path = require('path');
const fs = require('fs').promises;
const { promisify } = require('util');

class EvidenceService {
  constructor() {
    this.s3 = new AWS.S3({
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      region: process.env.AWS_REGION
    });

    this.encryptionKey = Buffer.from(process.env.EVIDENCE_ENCRYPTION_KEY, 'hex');
    this.ivLength = 16;
  }

  async encryptData(data) {
    const iv = crypto.randomBytes(this.ivLength);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    
    let encrypted = cipher.update(data, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    return {
      iv: iv.toString('base64'),
      encryptedData: encrypted,
      authTag: authTag.toString('base64')
    };
  }

  async decryptData(encryptedData, iv, authTag) {
    const decipher = crypto.createDecipheriv(
      'aes-256-gcm',
      this.encryptionKey,
      Buffer.from(iv, 'base64')
    );
    
    decipher.setAuthTag(Buffer.from(authTag, 'base64'));
    
    let decrypted = decipher.update(encryptedData, 'base64', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }

  async storeScreenshot(screenshotData, examId, userId) {
    try {
      // Encrypt the screenshot data
      const encrypted = await this.encryptData(screenshotData);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `screenshots/${examId}/${userId}/${timestamp}.enc`;
      
      // Upload to S3
      await this.s3.putObject({
        Bucket: process.env.AWS_EVIDENCE_BUCKET,
        Key: filename,
        Body: JSON.stringify(encrypted),
        ContentType: 'application/json'
      }).promise();
      
      return {
        url: `s3://${process.env.AWS_EVIDENCE_BUCKET}/${filename}`,
        metadata: {
          timestamp,
          examId,
          userId
        }
      };
    } catch (error) {
      console.error('Error storing screenshot:', error);
      throw error;
    }
  }

  async storeAudioClip(audioData, examId, userId) {
    try {
      // Encrypt the audio data
      const encrypted = await this.encryptData(audioData);
      
      // Generate a unique filename
      const timestamp = Date.now();
      const filename = `audio/${examId}/${userId}/${timestamp}.enc`;
      
      // Upload to S3
      await this.s3.putObject({
        Bucket: process.env.AWS_EVIDENCE_BUCKET,
        Key: filename,
        Body: JSON.stringify(encrypted),
        ContentType: 'application/json'
      }).promise();
      
      return {
        url: `s3://${process.env.AWS_EVIDENCE_BUCKET}/${filename}`,
        metadata: {
          timestamp,
          examId,
          userId
        }
      };
    } catch (error) {
      console.error('Error storing audio clip:', error);
      throw error;
    }
  }

  async retrieveEvidence(url) {
    try {
      const key = url.replace(`s3://${process.env.AWS_EVIDENCE_BUCKET}/`, '');
      
      const data = await this.s3.getObject({
        Bucket: process.env.AWS_EVIDENCE_BUCKET,
        Key: key
      }).promise();
      
      const encrypted = JSON.parse(data.Body.toString());
      return await this.decryptData(
        encrypted.encryptedData,
        encrypted.iv,
        encrypted.authTag
      );
    } catch (error) {
      console.error('Error retrieving evidence:', error);
      throw error;
    }
  }

  async generateHash(data) {
    return crypto.createHash('sha256')
      .update(data)
      .digest('hex');
  }
}

module.exports = new EvidenceService(); 