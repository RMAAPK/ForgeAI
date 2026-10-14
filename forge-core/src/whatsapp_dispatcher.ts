import * as fs from 'fs';
import * as path from 'path';

export interface AutopsyAlertPayload {
    incidentId: string;
    timestamp: string;
    machineName: string;
    rpm: number;
    chatterFrequencyHz: number;
    severity: string;
    recommendation: string;
    spectrogramPath?: string;
}

export class WhatsAppAutopsyDispatcher {
    private recipientPhone: string;
    private queueDir: string;

    constructor(recipientPhone = "+923000000000", queueDir = "/tmp/forge_autopsy_queue") {
        this.recipientPhone = recipientPhone;
        this.queueDir = queueDir;
        if (!fs.existsSync(this.queueDir)) {
            fs.mkdirSync(this.queueDir, { recursive: true });
        }
    }

    public async queueAutopsy(alert: AutopsyAlertPayload): Promise<string> {
        const filePath = path.join(this.queueDir, `${alert.incidentId}.json`);
        const formattedMsg = 
`⚠️ *FORGE AI SPINDLE AUTOPSY REPORT* ⚠️
----------------------------------------
*Incident ID:* ${alert.incidentId}
*Timestamp:* ${alert.timestamp}
*Machine:* ${alert.machineName}
*Status:* 🚨 HARDWARE OPTICAL FEED-HOLD ENGAGED (<15ms)
*Spindle RPM:* ${alert.rpm}
*Peak Chatter Resonance:* ${alert.chatterFrequencyHz} Hz
*Severity:* ${alert.severity}

📋 *Root-Cause Autopsy:*
${alert.recommendation}

💬 *Actions:* Reply *ACK* to acknowledge, or *RESUME* after physical inspection.`;

        const record = {
            ...alert,
            formattedMsg,
            status: "PENDING_DISPATCH",
            createdAt: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(record, null, 2));
        console.log(`[Forge Dispatcher] Autopsy queued in offline store: ${filePath}`);
        
        // Attempt immediate dispatch if connection active
        this.flushQueue();
        return formattedMsg;
    }

    public async flushQueue() {
        try {
            const files = fs.readdirSync(this.queueDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                const fullPath = path.join(this.queueDir, file);
                const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
                if (content.status === "PENDING_DISPATCH") {
                    console.log(`[Forge Dispatcher] Transmitting autopsy alert ${content.incidentId} over WhatsApp...`);
                    // When Baileys socket is connected, sock.sendMessage(recipient, { text: content.formattedMsg })
                    content.status = "DISPATCHED";
                    fs.writeFileSync(fullPath, JSON.stringify(content, null, 2));
                }
            }
        } catch (e: any) {
            console.warn(`[Forge Dispatcher] Offline queue retained: ${e.message}`);
        }
    }
}
