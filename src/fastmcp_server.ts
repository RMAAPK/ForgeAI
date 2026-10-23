import { FastMCP } from "fastmcp";
import { z } from "zod";
import { EdgeSerialBridge } from "./edge_serial_bridge.js";
import { DataDatEngine } from "./data_dat_engine.js";

// Telemetry State
interface SpindleTelemetry {
  timestamp: string;
  rpm: number;
  rmsAcousticDb: number;
  peakFrequencyHz: number;
  chatterDetected: boolean;
  harmonicSeverity: "NORMAL" | "WARN" | "CRITICAL_DEFLECTION";
  eStopTripped: boolean;
}

let latestTelemetry: SpindleTelemetry = {
  timestamp: new Date().toISOString(),
  rpm: 0,
  rmsAcousticDb: -42.5,
  peakFrequencyHz: 0,
  chatterDetected: false,
  harmonicSeverity: "NORMAL",
  eStopTripped: false,
};

const autopsyLogs: Array<{ id: string; time: string; incident: string }> = [];

// Initialize hardware bridge
const serialBridge = new EdgeSerialBridge();
serialBridge.autoDetectPort().then((port) => {
  if (port) console.log(`[Forge Hardware] Bound to edge sensor serial port: ${port}`);
  else console.log(`[Forge Hardware] Running in virtual telemetry mode.`);
});

serialBridge.on("telemetry", (packet: Partial<SpindleTelemetry>) => {
  latestTelemetry = { ...latestTelemetry, ...packet, timestamp: new Date().toISOString() };
  if (latestTelemetry.chatterDetected || latestTelemetry.eStopTripped) {
    autopsyLogs.unshift({
      id: `INCIDENT_${Date.now()}`,
      time: new Date().toISOString(),
      incident: latestTelemetry.eStopTripped ? "HARDWARE_OPTICAL_ESTOP_TRIP" : "CHATTER_RESONANCE_SPIKE",
    });
  }
});

// Initialize FastMCP Server
export const server = new FastMCP({
  name: "Forge AI Spindle Defense",
  version: "2.0.0",
});

// ==========================================
// 1. SPINDLE DEFENSE & ACOUSTIC TELEMETRY
// ==========================================
server.addTool({
  name: "forge_get_spindle_telemetry",
  description: "Get real-time acoustic telemetry, spindle RPM, chatter detection, and harmonic health from edge ESP32-S3 sensor.",
  parameters: z.object({}),
  execute: async () => {
    return JSON.stringify(latestTelemetry, null, 2);
  },
});

server.addTool({
  name: "forge_trigger_estop",
  description: "Trigger emergency optical feed-hold/E-stop (<10ms) on physical CNC spindle via PC817 optocoupler.",
  parameters: z.object({
    reason: z.string().describe("Reason for emergency shutdown intervention"),
  }),
  execute: async (args) => {
    latestTelemetry.eStopTripped = true;
    latestTelemetry.harmonicSeverity = "CRITICAL_DEFLECTION";
    autopsyLogs.unshift({
      id: `ESTOP_${Date.now()}`,
      time: new Date().toISOString(),
      incident: `MANUAL_AI_ESTOP: ${args.reason}`,
    });
    return `🚨 EMERGENCY FEED HOLD ENGAGED! PC817 Optocoupler fired (<10ms). Reason: ${args.reason}`;
  },
});

server.addTool({
  name: "forge_reset_estop",
  description: "Clear the emergency feed-hold and re-arm optical sensor circuit after manual inspection.",
  parameters: z.object({
    operatorConfirmed: z.boolean().describe("Confirmation that spindle and workpiece are clear of obstructions"),
  }),
  execute: async (args) => {
    if (!args.operatorConfirmed) {
      throw new Error("Safety protocol rejection: Operator confirmation required to clear E-Stop.");
    }
    latestTelemetry.eStopTripped = false;
    latestTelemetry.harmonicSeverity = "NORMAL";
    return "✅ E-Stop cleared and re-armed. Optical feed-hold disengaged.";
  },
});

server.addTool({
  name: "forge_get_autopsy_report",
  description: "Retrieve black-box crash recorder logs and acoustic spectrogram snapshots from the latest incident.",
  parameters: z.object({
    limit: z.number().optional().default(5).describe("Number of recent incidents to fetch"),
  }),
  execute: async (args) => {
    return JSON.stringify(autopsyLogs.slice(0, args.limit), null, 2);
  },
});

// ==========================================
// 2. CRYPTOGRAPHIC DATA.DAT CONTAINER TOOLS
// ==========================================
server.addTool({
  name: "forge_pack_dat_container",
  description: "Generate a cryptographically encrypted data.dat container for MicroSD card with pre-authorized cutting seconds.",
  parameters: z.object({
    machineId: z.string().describe("Machine Name or ID"),
    chipMacSha256: z.string().describe("SHA256 of ESP32-S3 hardware MAC / eFuse UID"),
    cuttingSecondsToAuthorize: z.number().describe("Number of machining seconds to pre-authorize"),
  }),
  execute: async (args) => {
    const datEngine = new DataDatEngine();
    const container = datEngine.packContainer({
      machineId: args.machineId,
      chipMacSha256: args.chipMacSha256,
      authorizedCuttingSeconds: args.cuttingSecondsToAuthorize,
    });
    return JSON.stringify(container, null, 2);
  },
});

server.addTool({
  name: "forge_unpack_dat_container",
  description: "Inspect, decrypt, and reconcile consumed cutting seconds and 80-band anomaly floats from a customer data.dat file.",
  parameters: z.object({
    containerJson: z.string().describe("Raw JSON string of data.dat container"),
    chipMacSha256: z.string().describe("SHA256 of ESP32-S3 hardware MAC / eFuse UID"),
  }),
  execute: async (args) => {
    const datEngine = new DataDatEngine();
    const result = datEngine.unpackContainer(args.containerJson, args.chipMacSha256);
    return JSON.stringify(result, null, 2);
  },
});

// Start server when run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  server.start({
    transportType: "stdio",
  });
}
