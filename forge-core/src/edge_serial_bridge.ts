import { EventEmitter } from 'events';
import * as fs from 'fs';

export class EdgeSerialBridge extends EventEmitter {
    private isConnected: boolean = false;
    private portPath: string = '';
    private buffer: string = '';

    constructor() {
        super();
    }

    public async autoDetectPort(): Promise<string | null> {
        const potentialPorts = ['/dev/ttyACM0', '/dev/ttyACM1', '/dev/ttyUSB0', '/dev/ttyUSB1'];
        for (const port of potentialPorts) {
            if (fs.existsSync(port)) {
                this.portPath = port;
                return port;
            }
        }
        return null;
    }

    public parseTelemetryPacket(rawLine: string) {
        // Expected format from ESP32-S3: {"rms":-22.4,"peak":6840,"chatter":1,"estop":0}
        try {
            const data = JSON.parse(rawLine.trim());
            this.emit('telemetry', {
                rmsAcousticDb: data.rms ?? -45.0,
                peakFrequencyHz: data.peak ?? 0,
                chatterDetected: Boolean(data.chatter),
                eStopTripped: Boolean(data.estop),
                harmonicSeverity: data.estop ? 'CRITICAL_DEFLECTION' : (data.chatter ? 'WARN' : 'NORMAL')
            });
        } catch {
            // Raw text log from ESP-IDF monitor
            if (rawLine.includes("CHATTER")) {
                this.emit('chatter_detected', rawLine);
            }
        }
    }
}
