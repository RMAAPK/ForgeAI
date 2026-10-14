export interface ReplicateAutopsyPrompt {
    spindleRpm: number;
    rmsAcousticDb: number;
    peakFrequencyHz: number;
    material?: string;
    toolDiameterMm?: number;
    userNotes?: string;
}

export class ForgeReplicateEngine {
    private apiToken: string;
    private defaultModel: string;

    constructor(apiToken = process.env.REPLICATE_API_TOKEN || "", defaultModel = "meta/meta-llama-3-70b-instruct") {
        this.apiToken = apiToken;
        this.defaultModel = defaultModel;
    }

    public setToken(token: string) {
        this.apiToken = token;
    }

    public async generateDeepAutopsy(payload: ReplicateAutopsyPrompt): Promise<string> {
        const token = this.apiToken || process.env.REPLICATE_API_TOKEN;
        if (!token) {
            return `[Forge Offline Rule Fallback]: Spindle tripped at ${payload.rmsAcousticDb} dB RMS with peak harmonic at ${payload.peakFrequencyHz} Hz. Probable high-frequency regenerative chatter. Check tool wear and feed rate.`;
        }

        const prompt = `You are Forge AI, an elite CNC machining & industrial spindle forensics expert.
Analyze this high-speed acoustic crash incident:
- Spindle RPM: ${payload.spindleRpm}
- RMS Acoustic dB: ${payload.rmsAcousticDb} dB
- Peak Chatter Frequency: ${payload.peakFrequencyHz} Hz
- Workpiece Material: ${payload.material || '6061-T6 Aluminum'}
- Tool Diameter: ${payload.toolDiameterMm || 6.35} mm
- Operator Notes: ${payload.userNotes || 'None'}

Provide a concise, 3-bullet point autopsy:
1. Root-cause mechanism (e.g. regenerative chatter, runout, chip packing, dull insert)
2. Deflection & spindle bearing impact
3. Immediate machine fix before clearing feed-hold.`;

        try {
            const response = await fetch("https://api.replicate.com/v1/predictions", {
                method: "POST",
                headers: {
                    "Authorization": `Token ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    version: "2c1608e18606fad2812020d6e6881c12aca070887e3e080d6553e6d299f1ecf1", // Llama 3 70B
                    input: {
                        prompt,
                        max_tokens: 300,
                        temperature: 0.2
                    }
                })
            });

            const data = await response.json();
            if (data?.output) {
                return Array.isArray(data.output) ? data.output.join('') : String(data.output);
            }
            return `Autopsy prediction queued on Replicate (ID: ${data.id || 'unknown'})`;
        } catch (e: any) {
            return `[Replicate Error Fallback]: ${e.message}. RMS: ${payload.rmsAcousticDb} dB, Peak: ${payload.peakFrequencyHz} Hz.`;
        }
    }
}
