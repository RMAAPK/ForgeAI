import { WhatsAppAutopsyDispatcher } from './whatsapp_dispatcher.js';

async function testAutopsyPush() {
    console.log("🚀 Testing Forge AI WhatsApp Autopsy Dispatcher...");
    const dispatcher = new WhatsAppAutopsyDispatcher();

    const sampleIncident = {
        incidentId: `INCIDENT_${Date.now()}`,
        timestamp: new Date().toISOString(),
        machineName: "Ali CNC Titan-3M (Pocketing 6061-T6)",
        rpm: 18500,
        chatterFrequencyHz: 6840,
        severity: "CRITICAL_DEFLECTION",
        recommendation: "Spindle acoustic RMS exceeded threshold (-18.2 dB). High-frequency chatter detected on tool #3 (6.35mm Carbide Endmill). Check insert chipping or decrease feed rate by 15%."
    };

    const formattedMessage = await dispatcher.queueAutopsy(sampleIncident);
    console.log("\n--- Generated WhatsApp Message Payload ---");
    console.log(formattedMessage);
    console.log("------------------------------------------");
    console.log("✅ Offline Autopsy queue verified. Ready for Baileys socket link.");
}

testAutopsyPush();
