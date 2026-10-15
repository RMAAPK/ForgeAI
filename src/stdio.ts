import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";
import { getDirectorySettings } from "./config.js";
import { ForgeMcpManager } from "./mcp_forge_tools.js";

const execAsync = promisify(exec);
const mcpServer = new Server({ name: "forgeai-mcp", version: "2.0.0" }, { capabilities: { tools: {} } });
const forgeManager = new ForgeMcpManager();

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            { name: "read_file", description: "Read a file from the workspace", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
            { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
            { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
            { name: "run_shell_command", description: "Run a shell command inside sandbox", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string" } }, required: ["command", "cwd"] } },
            ...forgeManager.registerTools(mcpServer)
        ],
    };
});

async function checkAccess(targetPath: string, isWrite: boolean = false) {
    let settings = await getDirectorySettings(targetPath);
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
                await checkAccess(filePath, true);
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
                const command = String(request.params.arguments?.command);
                const { stdout, stderr } = await execAsync(command, { cwd });
                return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
            }
            default:
                return await forgeManager.handleCallTool(request.params.name, request.params.arguments);
        }
    } catch (e: any) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
});

const transport = new StdioServerTransport();
await mcpServer.connect(transport);
