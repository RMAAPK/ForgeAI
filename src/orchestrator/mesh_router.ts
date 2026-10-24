import { EventEmitter } from 'events';

export type AgentRole = 'CODER' | 'AUDITOR' | 'OPS' | 'SALES' | 'SUPERVISOR';

export interface AgentTask {
    id: string;
    role: AgentRole;
    action: string;
    payload: Record<string, any>;
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    assignedAgentId?: string;
    createdAt: string;
    timeoutMs: number;
}

export interface TaskResult {
    taskId: string;
    success: boolean;
    output?: any;
    error?: string;
    durationMs: number;
    auditedBy?: string;
    auditPassed?: boolean;
}

export class MeshRouter extends EventEmitter {
    private registeredAgents: Map<string, { id: string; role: AgentRole; busy: boolean; lastSeen: number }> = new Map();
    private taskQueue: AgentTask[] = [];

    constructor() {
        super();
    }

    public registerAgent(agentId: string, role: AgentRole): void {
        this.registeredAgents.set(agentId, {
            id: agentId,
            role,
            busy: false,
            lastSeen: Date.now()
        });
        this.emit('agent:registered', { agentId, role });
    }

    public unregisterAgent(agentId: string): void {
        this.registeredAgents.delete(agentId);
        this.emit('agent:unregistered', { agentId });
    }

    public async dispatch(task: Omit<AgentTask, 'id' | 'createdAt'>): Promise<TaskResult> {
        const fullTask: AgentTask = {
            ...task,
            id: `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            createdAt: new Date().toISOString()
        };

        const availableAgent = Array.from(this.registeredAgents.values()).find(
            a => a.role === task.role && !a.busy
        );

        if (!availableAgent) {
            this.taskQueue.push(fullTask);
            this.emit('task:queued', fullTask);
            return {
                taskId: fullTask.id,
                success: false,
                error: `No idle agent found for role: ${task.role}. Queued.`,
                durationMs: 0
            };
        }

        availableAgent.busy = true;
        fullTask.assignedAgentId = availableAgent.id;

        const startTime = Date.now();
        this.emit('task:started', { task: fullTask, agentId: availableAgent.id });

        try {
            // Task execution wrapped with timeout guarantee
            const executionPromise = new Promise<any>((resolve, reject) => {
                this.emit('task:execute', {
                    task: fullTask,
                    resolve,
                    reject
                });
            });

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error(`Task ${fullTask.id} timed out after ${fullTask.timeoutMs}ms`)), fullTask.timeoutMs)
            );

            const output = await Promise.race([executionPromise, timeoutPromise]);
            availableAgent.busy = false;

            return {
                taskId: fullTask.id,
                success: true,
                output,
                durationMs: Date.now() - startTime
            };
        } catch (err: any) {
            availableAgent.busy = false;
            this.emit('task:failed', { task: fullTask, error: err.message });

            return {
                taskId: fullTask.id,
                success: false,
                error: err.message,
                durationMs: Date.now() - startTime
            };
        }
    }

    public getActiveMeshState() {
        return {
            totalAgents: this.registeredAgents.size,
            agents: Array.from(this.registeredAgents.values()),
            queuedTasks: this.taskQueue.length
        };
    }
}

