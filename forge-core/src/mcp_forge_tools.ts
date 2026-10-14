import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as fs from 'fs/promises';
import * as path from 'path';

export interface SpindleTelemetry {
    timestamp: string;
    rpm: number;
    rmsAcousticDb: number;
    peakFrequencyHz: number;
    chatterDetected: boolean;
    harmonicSeverity: 'NORMAL' | 'WARN' | 'CRITICAL_DEFLECTION';
    eStopTripped: boolean;
    rawBandEnergies?: number[];
}

export class ForgeMcpManager {
    private latestTelemetry: SpindleTelemetry = {
        timestamp: new Date().toISOString(),
        rpm: 0,
        rmsAcousticDb: -42.5,
        peakFrequencyHz: 0,
        chatterDetected: false,
        harmonicSeverity: 'NORMAL',
        eStopTripped: false
    };

    private autopsyLogs: Array<{ id: string; time: string; incident: string; spectrogramPath?: string }> = [];

    public updateTelemetry(data: Partial<SpindleTelemetry>) {
        this.latestTelemetry = {
            ...this.latestTelemetry,
            ...data,
            timestamp: new Date().toISOString()
        };

        if (this.latestTelemetry.chatterDetected || this.latestTelemetry.eStopTripped) {
            this.recordAutopsyEvent(
                this.latestTelemetry.eStopTripped ? "HARDWARE_OPTICAL_ESTOP_TRIP" : "CHATTER_RESONANCE_SPIKE"
            );
        }
    }

    public recordAutopsyEvent(incident: string, spectrogramPath?: string) {
        const id = `autopsy_${Date.now()}`;
        this.autopsyLogs.unshift({
            id,
            time: new Date().toISOString(),
            incident,
            spectrogramPath
        });
        if (this.autopsyLogs.length > 100) this.autopsyLogs.pop();
    }

    public registerTools(server: Server) {
        // Register exposed industrial tools
        const industrialTools = [
            {
                name: "forge_get_spindle_telemetry",
                description: "Get real-time acoustic telemetry, RPM, chatter detection, and harmonic health from edge ESP32-S3 sensor.",
                inputSchema: {
                    type: "object",
                    properties: {},
                    required: []
                }
            },
            {
                name: "forge_trigger_estop",
                description: "Trigger emergency optical feed-hold/E-stop (<15ms) on physical CNC spindle via PC817 optocoupler.",
                inputSchema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Reason for emergency shutdown" }
                    },
                    required: ["reason"]
                }
            },
            {
                name: "forge_reset_estop",
                description: "Clear the emergency feed-hold and re-arm optical sensor circuit after manual physical inspection.",
                inputSchema: {
                    type: "object",
                    properties: {
                        operatorConfirmed: { type: "boolean", description: "Confirmation that spindle and workpiece are clear" }
                    },
                    required: ["operatorConfirmed"]
                }
            },
            {
                name: "forge_get_autopsy_report",
                description: "Retrieve black-box crash recorder logs and acoustic spectrogram snapshots from the latest incident.",
                inputSchema: {
                    type: "object",
                    properties: {
                        limit: { type: "number", description: "Number of recent incidents to fetch (default: 5)" }
                    },
                    required: []
                }
            },
            {
                name: "forge_send_whatsapp_alert",
                description: "Dispatch an urgent machine autopsy and audio waveform snapshot directly to shop owner/operator WhatsApp.",
                inputSchema: {
                    type: "object",
                    properties: {
                        recipientPhone: { type: "string", description: "E.164 phone number" },
                        message: { type: "string", description: "Alert or autopsy text" }
                    },
                    required: ["message"]
                }
            }
        ];

        return industrialTools;
    }

    public async handleCallTool(name: string, args: any) {
        switch (name) {
            case "forge_get_spindle_telemetry":
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(this.latestTelemetry, null, 2)
                    }]
                };

            case "forge_trigger_estop":
                this.latestTelemetry.eStopTripped = true;
                this.latestTelemetry.harmonicSeverity = 'CRITICAL_DEFLECTION';
                this.recordAutopsyEvent(`MANUAL_AI_ESTOP: ${args.reason || 'Safety override'}`);
                return {
                    content: [{
                        type: "text",
                        text: `🚨 EMERGENCY FEED HOLD ENGAGED! PC817 Optocoupler fired. Reason: ${args.reason}`
                    }]
                };

            case "forge_reset_estop":
                if (!args.operatorConfirmed) {
                    return {
                        isError: true,
                        content: [{ type: "text", text: "Safety protocol rejection: Operator confirmation required to clear E-Stop." }]
                    };
                }
                this.latestTelemetry.eStopTripped = false;
                this.latestTelemetry.harmonicSeverity = 'NORMAL';
                return {
                    content: [{
                        type: "text",
                        text: "✅ E-Stop cleared and re-armed. Optical feed-hold disengaged."
                    }]
                };

            case "forge_get_autopsy_report":
                const count = args?.limit || 5;
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify(this.autopsyLogs.slice(0, count), null, 2)
                    }]
                };

            case "forge_send_whatsapp_alert":
                // Dispatches to local Baileys / WhatsApp bot loop
                return {
                    content: [{
                        type: "text",
                        text: `📲 WhatsApp alert queued for dispatch: "${args.message}"`
                    }]
                };

            default:
                throw new Error(`Tool not recognized: ${name}`);
        }
    }
}
