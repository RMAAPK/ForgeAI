import { SandboxRunner } from '../runtime/sandbox_runner.js';

export interface IncidentTelemetry {
    incidentId: string;
    timestamp: string;
    errorStack: string;
    affectedComponent: string;
    contextPayload: Record<string, any>;
}

export interface PostMortemAutopsy {
    incidentId: string;
    rootCauseCategory: 'SYNTAX_OR_TYPE' | 'NETWORK_TIMEOUT' | 'LOGIC_REGRESSION' | 'HARDWARE_STALL' | 'UNKNOWN';
    suggestedPatchDiff?: string;
    autoApplied: boolean;
    verificationStatus: 'PENDING' | 'PASSED' | 'FAILED';
}

export class PostMortemEngine {
    private sandbox: SandboxRunner;

    constructor() {
        this.sandbox = new SandboxRunner(30000);
    }

    public analyzeIncident(telemetry: IncidentTelemetry): PostMortemAutopsy {
        const stack = telemetry.errorStack || '';
        let category: PostMortemAutopsy['rootCauseCategory'] = 'UNKNOWN';

        if (stack.includes('TypeError') || stack.includes('SyntaxError') || stack.includes('Cannot read property')) {
            category = 'SYNTAX_OR_TYPE';
        } else if (stack.includes('ETIMEDOUT') || stack.includes('ECONNREFUSED') || stack.includes('fetch failed')) {
            category = 'NETWORK_TIMEOUT';
        } else if (stack.includes('AssertionError') || stack.includes('Failed test')) {
            category = 'LOGIC_REGRESSION';
        } else if (stack.includes('PC817') || stack.includes('E-STOP') || stack.includes('chatter')) {
            category = 'HARDWARE_STALL';
        }

        return {
            incidentId: telemetry.incidentId,
            rootCauseCategory: category,
            autoApplied: false,
            verificationStatus: 'PENDING'
        };
    }

    public async verifyPatchInSandbox(testCommand: string): Promise<boolean> {
        const report = await this.sandbox.executeSafeCommand(testCommand);
        return report.success && report.exitCode === 0;
    }
}

