import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT || 3000;

// Security Middleware (Relaxed for God-Mode bare-metal access)
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
}));
app.use(cors({ origin: '*' }));

// ==========================================
// DUMMY OAUTH FLOW (Required by Gemini Spark)
// ==========================================
app.get('/.well-known/oauth-authorization-server', (req, res) => {
    const issuer = `https://${req.get('host')}`;
    res.json({
        issuer: issuer,
        authorization_endpoint: `${issuer}/authorize`,
        token_endpoint: `${issuer}/token`,
        response_types_supported: ["code"],
        grant_types_supported: ["authorization_code"],
        token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic", "none"],
        scopes_supported: ["mcp"]
    });
});

app.get('/.well-known/oauth-protected-resource', (req, res) => {
    const issuer = `https://${req.get('host')}`;
    res.json({
        "resource": issuer,
        "authorization_servers": [issuer],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"]
    });
});

app.get('/authorize', (req, res) => {
    const redirectUri = req.query.redirect_uri;
    const state = req.query.state;
    if (redirectUri) {
        const url = new URL(redirectUri);
        url.searchParams.set('code', 'auth_code_godmode');
        if (state) url.searchParams.set('state', state);
        res.redirect(url.toString());
    } else {
        res.status(400).send("Missing redirect_uri");
    }
});

app.post('/token', (req, res) => {
    res.setHeader('Content-Type', 'application/json;charset=UTF-8');
    res.setHeader('Cache-Control', 'no-store');
    res.json({
        access_token: "os_mcp_god_token",
        token_type: "bearer",
        expires_in: 360000,
        refresh_token: "os_mcp_god_refresh",
        scope: "mcp"
    });
});

// ==========================================
// CORE BARE-METAL MCP SERVER
// ==========================================
const mcpServer = new Server({ name: "os-mcp-baremetal", version: "1.0.0" }, { capabilities: { tools: {} } });

const bareMetalTools = [
    { name: "read_file", description: "Read a file from the host filesystem", inputSchema: { type: "object", properties: { filePath: { type: "string", description: "Absolute path to the file" } }, required: ["filePath"] } },
    { name: "write_file", description: "Write content to a file on the host filesystem", inputSchema: { type: "object", properties: { filePath: { type: "string", description: "Absolute path" }, content: { type: "string" } }, required: ["filePath", "content"] } },
    { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string", description: "Absolute path to directory" } }, required: ["dirPath"] } },
    { name: "run_shell_command", description: "Execute a raw shell/terminal command on the host OS", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Directory to run command in" } }, required: ["command", "cwd"] } },
];

mcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: bareMetalTools }));

const handleToolCall = async (request) => {
    try {
        switch (request.params.name) {
            case "read_file": {
                const filePath = String(request.params.arguments?.filePath);
                const content = await fs.readFile(filePath, "utf-8");
                return { content: [{ type: "text", text: content }] };
            }
            case "write_file": {
                const filePath = String(request.params.arguments?.filePath);
                await fs.writeFile(filePath, String(request.params.arguments?.content), "utf-8");
                return { content: [{ type: "text", text: `Wrote successfully to ${filePath}` }] };
            }
            case "list_directory": {
                const dirPath = String(request.params.arguments?.dirPath);
                const files = await fs.readdir(dirPath, { withFileTypes: true });
                const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
                return { content: [{ type: "text", text: list || "(empty directory)" }] };
            }
            case "run_shell_command": {
                const cwd = String(request.params.arguments?.cwd);
                const command = String(request.params.arguments?.command);
                const { stdout, stderr } = await execAsync(command, { cwd });
                return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
            }
            default:
                throw new Error(`Unknown tool: ${request.params.name}`);
        }
    } catch (e) {
        return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
    }
};

mcpServer.setRequestHandler(CallToolRequestSchema, handleToolCall);

// ==========================================
// STANDARD SSE TRANSPORT (For Cursor, Claude)
// ==========================================
const transports = new Map();

app.get(['/sse', '/mcp'], async (req, res) => {
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'localhost:3000';
    const absoluteMessageUrl = `${protocol}://${host}/message`;
    
    const transport = new SSEServerTransport(absoluteMessageUrl, res);
    await mcpServer.connect(transport);
    transports.set(transport.sessionId, transport);
    
    req.on('close', () => transports.delete(transport.sessionId));
});

app.post(['/message', '/mcp/message'], async (req, res) => {
    const sessionId = req.query.sessionId;
    const transport = transports.get(sessionId);
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("Session not found");
    }
});

// ==========================================
// GEMINI SPARK CUSTOM TRANSPORT (Bypass SSE)
// ==========================================
class GeminiHttpTransport {
    constructor() {
        this.pendingReqs = new Map();
        this.initialized = false;
    }
    async start() {}
    async close() {}
    async send(message) {
        if (message.id !== undefined && this.pendingReqs.has(message.id)) {
            const res = this.pendingReqs.get(message.id);
            if (!res.headersSent) res.status(200).json(message);
            this.pendingReqs.delete(message.id);
        }
    }
    handleRequest(message, res) {
        if (message.id !== undefined) this.pendingReqs.set(message.id, res);
        
        if (message.method === "initialize" && this.initialized) {
            this.send({ jsonrpc: "2.0", id: message.id, result: { protocolVersion: "2024-11-05", capabilities: { tools: {} }, serverInfo: { name: "os-mcp-baremetal", version: "1.0.0" } } });
            return;
        }
        if (message.method === "initialize") this.initialized = true;
        if (message.method === "notifications/initialized") {
            res.status(200).send();
            if (this.onmessage) this.onmessage(message);
            return;
        }
        if (this.onmessage) this.onmessage(message);
    }
}

const geminiTransport = new GeminiHttpTransport();
const geminiMcpServer = new Server({ name: "os-mcp-baremetal-gemini", version: "1.0.0" }, { capabilities: { tools: {} } });
geminiMcpServer.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: bareMetalTools }));
geminiMcpServer.setRequestHandler(CallToolRequestSchema, handleToolCall);
geminiMcpServer.connect(geminiTransport);

app.head('/gemini', (req, res) => res.status(200).send());
app.get('/gemini', (req, res) => res.status(200).send());
app.post('/gemini', (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            geminiTransport.handleRequest(JSON.parse(body), res);
        } catch (e) {
            if (!res.headersSent) res.status(400).send("Invalid JSON-RPC");
        }
    });
});

// ==========================================
// START SERVER
// ==========================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n======================================================`);
    console.log(`🔥 BARE-METAL GOD-MODE MCP SERVER RUNNING ON PORT ${PORT} 🔥`);
    console.log(`======================================================`);
    console.log(`-> Standard SSE:   http://localhost:${PORT}/sse`);
    console.log(`-> Gemini Spark:   http://localhost:${PORT}/gemini`);
    console.log(`\nWARNING: This server gives absolute control over your OS.`);
});

