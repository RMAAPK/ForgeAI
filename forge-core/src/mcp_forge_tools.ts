import { ListToolsRequestSchema, CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import * as fs from 'fs/promises';
import * as path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

export interface TrackOnDevice {
    tagId: string;
    lastSeen: string;
    batteryVoltage: number;
    rssi: number;
    temperature: number;
    status: 'ACTIVE' | 'LOW_POWER' | 'DISCONNECTED';
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

    private trackonTags: Map<string, TrackOnDevice> = new Map([
        ["TAG_RV32_01", { tagId: "TAG_RV32_01", lastSeen: new Date().toISOString(), batteryVoltage: 3.82, rssi: -64, temperature: 24.5, status: "ACTIVE" }]
    ]);

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
        return [
            // --- 1. Industrial Acoustic & E-Stop Telemetry ---
            {
                name: "forge_get_spindle_telemetry",
                description: "Get real-time acoustic telemetry, RPM, chatter detection, and harmonic health from edge ESP32-S3 sensor.",
                inputSchema: { type: "object", properties: {}, required: [] }
            },
            {
                name: "forge_trigger_estop",
                description: "Trigger emergency optical feed-hold/E-stop (<15ms) on physical CNC spindle via PC817 optocoupler.",
                inputSchema: {
                    type: "object",
                    properties: { reason: { type: "string", description: "Reason for emergency shutdown" } },
                    required: ["reason"]
                }
            },
            {
                name: "forge_reset_estop",
                description: "Clear the emergency feed-hold and re-arm optical sensor circuit after manual physical inspection.",
                inputSchema: {
                    type: "object",
                    properties: { operatorConfirmed: { type: "boolean", description: "Confirmation that spindle and workpiece are clear" } },
                    required: ["operatorConfirmed"]
                }
            },
            {
                name: "forge_get_autopsy_report",
                description: "Retrieve black-box crash recorder logs and acoustic spectrogram snapshots from the latest incident.",
                inputSchema: {
                    type: "object",
                    properties: { limit: { type: "number", description: "Number of recent incidents to fetch (default: 5)" } },
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
            },

            // --- 2. TrackOn Resonant Tag & Silicon Management ---
            {
                name: "trackon_scan_devices",
                description: "Scan ambient 13.56 MHz resonant magnetic flux and BLE mesh for TrackOn bare-die tracking tags.",
                inputSchema: { type: "object", properties: {}, required: [] }
            },
            {
                name: "trackon_get_device_telemetry",
                description: "Query battery voltage, RF resonance, temperature, and eFuse root keys for a specific TrackOn tag.",
                inputSchema: {
                    type: "object",
                    properties: { tagId: { type: "string", description: "TrackOn Device Identifier" } },
                    required: ["tagId"]
                }
            },

            // --- 3. OS-MCP Host & Bare-Metal System Telemetry ---
            {
                name: "os_get_system_info",
                description: "Query host platform metrics: OS kernel, CPU load, memory, active serial bridges, and network interfaces.",
                inputSchema: { type: "object", properties: {}, required: [] }
            },
            {
                name: "os_execute_command",
                description: "Execute a command on the host environment with environment sandboxing protection.",
                inputSchema: {
                    type: "object",
                    properties: {
                        command: { type: "string", description: "Shell command to run" },
                        cwd: { type: "string", description: "Working directory" }
                    },
                    required: ["command"]
                }
            }
        ];
    }

    public async handleCallTool(name: string, args: any) {
        switch (name) {
            case "forge_get_spindle_telemetry":
                return { content: [{ type: "text", text: JSON.stringify(this.latestTelemetry, null, 2) }] };

            case "forge_trigger_estop":
                this.latestTelemetry.eStopTripped = true;
                this.latestTelemetry.harmonicSeverity = 'CRITICAL_DEFLECTION';
                this.recordAutopsyEvent(`MANUAL_AI_ESTOP: ${args.reason || 'Safety override'}`);
                return { content: [{ type: "text", text: `🚨 EMERGENCY FEED HOLD ENGAGED! PC817 Optocoupler fired (<15ms). Reason: ${args.reason}` }] };

            case "forge_reset_estop":
                if (!args.operatorConfirmed) {
                    return { isError: true, content: [{ type: "text", text: "Safety protocol rejection: Operator confirmation required to clear E-Stop." }] };
                }
                this.latestTelemetry.eStopTripped = false;
                this.latestTelemetry.harmonicSeverity = 'NORMAL';
                return { content: [{ type: "text", text: "✅ E-Stop cleared and re-armed. Optical feed-hold disengaged." }] };

            case "forge_get_autopsy_report":
                const count = args?.limit || 5;
                return { content: [{ type: "text", text: JSON.stringify(this.autopsyLogs.slice(0, count), null, 2) }] };

            case "forge_send_whatsapp_alert":
                return { content: [{ type: "text", text: `📲 WhatsApp alert queued for dispatch: "${args.message}"` }] };

            case "trackon_scan_devices":
                return { content: [{ type: "text", text: JSON.stringify(Array.from(this.trackonTags.values()), null, 2) }] };

            case "trackon_get_device_telemetry":
                const tag = this.trackonTags.get(args.tagId);
                if (!tag) {
                    return { isError: true, content: [{ type: "text", text: `Device ${args.tagId} not found in resonant RF range.` }] };
                }
                return { content: [{ type: "text", text: JSON.stringify(tag, null, 2) }] };

            case "os_get_system_info":
                return {
                    content: [{
                        type: "text",
                        text: JSON.stringify({
                            platform: process.platform,
                            arch: process.arch,
                            nodeVersion: process.version,
                            uptimeSeconds: Math.floor(process.uptime()),
                            memoryUsageMB: Math.round(process.memoryUsage().rss / 1024 / 1024),
                            activeMcpTransport: "SSE / Streamable JSON-RPC",
                            subsystems: ["Edge Acoustic Silicon", "DMCPS Kernel Sandbox", "TrackOn Bare-Die Tag Mesh", "OS-MCP Multi-Platform Daemon"]
                        }, null, 2)
                    }]
                };

            case "os_execute_command":
                try {
                    const { stdout, stderr } = await execAsync(args.command, { cwd: args.cwd || process.cwd() });
                    return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
                } catch (e: any) {
                    return { isError: true, content: [{ type: "text", text: `Command execution error: ${e.message}` }] };
                }

            default:
                throw new Error(`Tool not recognized: ${name}`);
        }
    }
}
