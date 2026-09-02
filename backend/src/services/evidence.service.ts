import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { logger } from '../utils/logger';
import { ErrorHandler } from '../utils/errorHandler';

export class EvidenceService {
    private readonly uploadDir: string;
    private readonly errorHandler: ErrorHandler;

    constructor() {
        this.uploadDir = path.join(__dirname, '../../uploads');
        this.errorHandler = new ErrorHandler();
        this.ensureUploadDirectory();
    }

    private ensureUploadDirectory(): void {
        if (!fs.existsSync(this.uploadDir)) {
            fs.mkdirSync(this.uploadDir, { recursive: true });
        }
    }

    private generateFilename(examId: string, userId: string, type: 'screenshot' | 'audio'): string {
        const timestamp = Date.now();
        const randomString = crypto.randomBytes(8).toString('hex');
        return `${examId}_${userId}_${type}_${timestamp}_${randomString}.${type === 'screenshot' ? 'png' : 'webm'}`;
    }

    private getFileUrl(filename: string): string {
        return `/uploads/${filename}`;
    }

    public async storeScreenshot(examId: string, userId: string, imageData: Buffer): Promise<string> {
        try {
            const filename = this.generateFilename(examId, userId, 'screenshot');
            const filePath = path.join(this.uploadDir, filename);
            
            // Encrypt the image data
            const { encryptedData, iv, authTag } = this.encryptData(imageData);
            
            // Store encrypted data
            fs.writeFileSync(filePath, JSON.stringify({
                data: encryptedData.toString('base64'),
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64')
            }));

            return this.getFileUrl(filename);
        } catch (error) {
            this.errorHandler.handleError(error, 'EvidenceService.storeScreenshot');
            throw error;
        }
    }

    public async storeAudioClip(examId: string, userId: string, audioData: Buffer): Promise<string> {
        try {
            const filename = this.generateFilename(examId, userId, 'audio');
            const filePath = path.join(this.uploadDir, filename);
            
            // Encrypt the audio data
            const { encryptedData, iv, authTag } = this.encryptData(audioData);
            
            // Store encrypted data
            fs.writeFileSync(filePath, JSON.stringify({
                data: encryptedData.toString('base64'),
                iv: iv.toString('base64'),
                authTag: authTag.toString('base64')
            }));

            return this.getFileUrl(filename);
        } catch (error) {
            this.errorHandler.handleError(error, 'EvidenceService.storeAudioClip');
            throw error;
        }
    }

    public async retrieveEvidence(url: string): Promise<Buffer> {
        try {
            const filename = path.basename(url);
            const filePath = path.join(this.uploadDir, filename);
            
            if (!fs.existsSync(filePath)) {
                throw new Error('Evidence file not found');
            }

            const fileData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            const encryptedData = Buffer.from(fileData.data, 'base64');
            const iv = Buffer.from(fileData.iv, 'base64');
            const authTag = Buffer.from(fileData.authTag, 'base64');

            return this.decryptData(encryptedData, iv, authTag);
        } catch (error) {
            this.errorHandler.handleError(error, 'EvidenceService.retrieveEvidence');
            throw error;
        }
    }

    private encryptData(data: Buffer): { encryptedData: Buffer; iv: Buffer; authTag: Buffer } {
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
        const iv = crypto.randomBytes(12);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        
        const encryptedData = Buffer.concat([
            cipher.update(data),
            cipher.final()
        ]);
        
        const authTag = cipher.getAuthTag();
        
        return { encryptedData, iv, authTag };
    }

    private decryptData(encryptedData: Buffer, iv: Buffer, authTag: Buffer): Buffer {
        const key = crypto.scryptSync(process.env.JWT_SECRET || 'default-secret', 'salt', 32);
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(authTag);
        
        return Buffer.concat([
            decipher.update(encryptedData),
            decipher.final()
        ]);
    }

    public generateHash(data: Buffer): string {
        return crypto.createHash('sha256').update(data).digest('hex');
    }
} 