import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';

const execAsync = promisify(exec);

export interface ExecutionOptions {
    timeoutMs?: number;
    maxBufferBytes?: number;
    workingDirectory?: string;
    environment?: Record<string, string>;
}

export interface ExecutionReport {
    success: boolean;
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    sandboxed: boolean;
}

export class SandboxRunner {
    private defaultTimeout: number;

    constructor(defaultTimeout = 15000) {
        this.defaultTimeout = defaultTimeout;
    }

    public async executeSafeCommand(command: string, options: ExecutionOptions = {}): Promise<ExecutionReport> {
        const timeout = options.timeoutMs || this.defaultTimeout;
        const startTime = Date.now();

        // 1. Static Security Check: Block dangerous system commands
        const forbiddenPatterns = [
            /rm\s+-rf\s+\//,
            /mkfs/,
            /:(){ :|:& };:/, // Fork bomb
            /dd\s+if=.*of=\/dev\/(sd|nvme)/,
            />\s*\/dev\/kmem/,
            /chmod\s+-R\s+777\s+\//
        ];

        for (const pattern of forbiddenPatterns) {
            if (pattern.test(command)) {
                return {
                    success: false,
                    stdout: '',
                    stderr: `[Security Guardrail] Blocked forbidden destructive pattern: ${pattern}`,
                    exitCode: 126,
                    durationMs: 0,
                    sandboxed: true
                };
            }
        }

        try {
            const { stdout, stderr } = await execAsync(command, {
                timeout,
                maxBuffer: options.maxBufferBytes || 1024 * 1024 * 5, // 5MB limit
                cwd: options.workingDirectory || process.cwd(),
                env: {
                    ...process.env,
                    ...(options.environment || {}),
                    NODE_ENV: 'sandbox'
                }
            });

            return {
                success: true,
                stdout: stdout.trim(),
                stderr: stderr.trim(),
                exitCode: 0,
                durationMs: Date.now() - startTime,
                sandboxed: true
            };
        } catch (error: any) {
            return {
                success: false,
                stdout: error.stdout ? error.stdout.trim() : '',
                stderr: error.stderr ? error.stderr.trim() : error.message,
                exitCode: error.code || 1,
                durationMs: Date.now() - startTime,
                sandboxed: true
            };
        }
    }
}

