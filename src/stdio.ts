import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { getDirectorySettings } from "./config.js";

const execAsync = promisify(exec);
const mcpServer = new Server({ name: "secure-sandbox-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
            { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
            { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
            { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" } }, required: ["command", "cwd"] } },
        ],
    };
});

async function checkAccess(targetPath: string, isWrite: boolean = false) {
    let settings = await getDirectorySettings(targetPath);
    
    // V2 ARCHITECTURE: If a path isn't explicitly configured in the dashboard (like / or .), 
    // we default to allowing it because the container is completely disposable.
    if (!settings) {
        settings = { path: targetPath, allowWrite: true, enableBackups: false };
    }
    
    if (isWrite && !settings.allowWrite) {
        throw new Error(`SECURITY EXCEPTION: Write access to path '${targetPath}' is denied by dashboard configuration.`);
    }
    return settings;
}

mcpServer.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        switch (request.params.name) {
            case "read_file": {
                const filePath = String(request.params.arguments?.filePath);
                await checkAccess(filePath, false);
                const content = await fs.readFile(filePath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            }
            case "write_file": {
                const filePath = String(request.params.arguments?.filePath);
                const settings = await checkAccess(filePath, true);
                
                // Auto-backup logic
                if (settings.enableBackups) {
                    try {
                        const existingContent = await fs.readFile(filePath, 'utf-8');
                        const backupFilename = `${Date.now()}_${path.basename(filePath)}.bak`;
                        
                        // 1. Local Host-Mounted Backup
                        const backupDir = path.join('/workspace/backups', path.basename(filePath));
                        await fs.mkdir(backupDir, { recursive: true });
                        const backupPath = path.join(backupDir, backupFilename);
                        await fs.writeFile(backupPath, existingContent, 'utf-8');

                        // 2. Remote HuggingFace Bucket Backup
                        const hfUrl = process.env.HF_BUCKET_URL;
                        const hfKey = process.env.HF_API_KEY;
                        if (hfUrl && hfKey) {
                            const cleanUrl = hfUrl.endsWith('/') ? hfUrl.slice(0, -1) : hfUrl;
                            const targetUrl = `${cleanUrl}/${backupFilename}`;
                            
                            // Native fetch (Node 18+) to push to the cloud bucket
                            fetch(targetUrl, {
                                method: 'PUT',
                                headers: {
                                    'Authorization': `Bearer ${hfKey}`,
                                    'Content-Type': 'text/plain'
                                },
                                body: existingContent
                            }).catch(e => console.error(`HF Backup failed for ${backupFilename}:`, e));
                        }
                    } catch (err: any) {
                        // ignore if file doesn't exist
                        if (err.code !== 'ENOENT') {
                            console.error(`Backup failed for ${filePath}:`, err);
                        }
                    }
                }
                
                await fs.writeFile(filePath, String(request.params.arguments?.content), "utf-8");
                return { content: [{ type: "text", text: `Wrote successfully to ${filePath}` }] };
            }
            case "list_directory": {
                const dirPath = String(request.params.arguments?.dirPath);
                await checkAccess(dirPath, false);
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
                return { content: [{ type: "text", text: list || "(empty directory)" }] };
            }
            case "run_shell_command": {
                const cwd = String(request.params.arguments?.cwd);
                await checkAccess(cwd, false);
                let command = String(request.params.arguments?.command);
                
                // Strip sudo since the container is already root (PaaS platforms block setuid sudo)
                if (command.trim().startsWith('sudo ')) {
                    command = command.trim().replace(/^sudo\s+/, '');
                }
                
                const { stdout, stderr } = await execAsync(command, { cwd });
                return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
            }
            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
});

async function run() {
    const transport = new StdioServerTransport();
    await mcpServer.connect(transport);
    console.error("Secure Sandbox MCP Server running on stdio (configured via dashboard)");
}

run().catch(console.error);
