import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MachineCalibrationPayload {
    machineId: string;
    chipMacSha256: string;
    preAuthCuttingSeconds: number;
    consumedCuttingSeconds: number;
    anomalyWeights80Band: number[]; // 80 float coefficients
    timestamp: number;
    nonce: number;
}

export interface EncryptedContainer {
    magic: string; // 'FORGE_DAT_V2'
    version: number;
    algorithm: string; // 'aes-256-gcm'
    iv: string; // base64
    authTag: string; // base64
    encryptedData: string; // base64
}

export class DataDatEngine {
    private masterSecret: Buffer;

    constructor(masterKey = process.env.FORGE_MASTER_KEY || "FORGE_AI_RMAA_HOLDINGS_2026_AEAD_SECRET_KEY_PROD") {
        this.masterSecret = crypto.createHash('sha256').update(masterKey).digest();
    }

    /**
     * Derives a machine-unique AES-256 key bound directly to the ESP32-S3 hardware chip UID
     */
    public deriveMachineKey(chipMacSha256: string): Buffer {
        return crypto.createHmac('sha256', this.masterSecret).update(chipMacSha256).digest();
    }

    /**
     * Packages and encrypts a fresh data.dat container for the MicroSD card
     */
    public packContainer(payload: MachineCalibrationPayload): EncryptedContainer {
        const machineKey = this.deriveMachineKey(payload.chipMacSha256);
        const iv = crypto.randomBytes(12); // Standard 96-bit IV for AES-GCM
        const cipher = crypto.createCipheriv('aes-256-gcm', machineKey, iv);

        const plaintextBuffer = Buffer.from(JSON.stringify(payload), 'utf8');
        const encrypted = Buffer.concat([cipher.update(plaintextBuffer), cipher.final()]);
        const authTag = cipher.getAuthTag();

        return {
            magic: "FORGE_DAT_V2",
            version: 2,
            algorithm: "aes-256-gcm",
            iv: iv.toString('base64'),
            authTag: authTag.toString('base64'),
            encryptedData: encrypted.toString('base64')
        };
    }

    /**
     * Unpacks and verifies an uploaded data.dat container from the MicroSD card
     */
    public unpackContainer(container: EncryptedContainer, chipMacSha256: string): MachineCalibrationPayload {
        if (container.magic !== "FORGE_DAT_V2") {
            throw new Error("Invalid container format: Missing FORGE_DAT_V2 header");
        }

        const machineKey = this.deriveMachineKey(chipMacSha256);
        const iv = Buffer.from(container.iv, 'base64');
        const authTag = Buffer.from(container.authTag, 'base64');
        const decipher = crypto.createDecipheriv('aes-256-gcm', machineKey, iv);
        decipher.setAuthTag(authTag);

        const encryptedBuffer = Buffer.from(container.encryptedData, 'base64');
        const decrypted = Buffer.concat([decipher.update(encryptedBuffer), decipher.final()]);

        return JSON.parse(decrypted.toString('utf8')) as MachineCalibrationPayload;
    }

    /**
     * Generates standard default 80-band calibration weights
     */
    public static generateDefault80BandWeights(): number[] {
        const weights: number[] = [];
        // 10 bands for 1-500 Hz (Bearing / unbalance)
        for (let i = 0; i < 10; i++) weights.push(1.0);
        // 70 bands for 500-20,000 Hz (Chatter squeal / tool deflection)
        for (let i = 10; i < 80; i++) weights.push(1.25);
        return weights;
    }
}
