import express from 'express';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { Transport } from "@modelcontextprotocol/sdk/shared/transport.js";
import { CallToolRequestSchema, ListToolsRequestSchema, JSONRPCMessage } from "@modelcontextprotocol/sdk/types.js";
import { loadConfig, saveConfig, getDirectorySettings } from './config.js';
import * as path from 'path';
import crypto from 'crypto';
import { ForgeMcpManager } from './mcp_forge_tools.js';
import { EdgeSerialBridge } from './edge_serial_bridge.js';

const forgeManager = new ForgeMcpManager();
const serialBridge = new EdgeSerialBridge();

serialBridge.autoDetectPort().then(port => {
    if (port) console.log(`[Forge Hardware] Bound to edge sensor serial port: ${port}`);
    else console.log(`[Forge Hardware] No physical ESP32-S3 serial port detected locally. Running in virtual/cloud telemetry mode.`);
});

serialBridge.on('telemetry', (packet) => {
    forgeManager.updateTelemetry(packet);
});

const PH_CLIENT_ID = 'xKnXB_auuhgrlbFPBjcsIIyngMHPiEyO45FzzdgT2WI';
let phCodeVerifier = '';
let phAccessToken = '';


const execAsync = promisify(exec);
const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// --- DEBUG LOGGER FOR GOOGLE OAUTH ---
const debugLogs: any[] = [];
app.use((req, res, next) => {
    if (req.path !== '/') {
        const logEntry: any = {
            time: new Date().toISOString(),
            method: req.method,
            path: req.path,
            query: req.query,
            headers: req.headers
        };
        
        // Use the 'finish' event to reliably capture the status code and parsed body
        res.on('finish', () => {
            logEntry.responseStatus = res.statusCode;
            logEntry.requestBody = req.body;
        });
        
        debugLogs.push(logEntry);
        if (debugLogs.length > 50) debugLogs.shift();
    }
    next();
});


let latestWhatsAppQr = '';
app.get('/whatsapp-qr', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>Link WhatsApp — Forge AI Autopsy Bot</title>
          <meta http-equiv="refresh" content="4">
          <script src="https://cdn.jsdelivr.net/npm/qrcode/build/qrcode.min.js"></script>
        </head>
        <body style="background:#090D16; color:#E2E8F0; font-family:sans-serif; display:flex; align-items:center; justify-content:center; min-height:100vh; margin:0;">
          <div style="background:#111827; border:1px solid rgba(235,94,40,0.3); border-radius:16px; padding:24px; text-align:center; max-width:340px; box-shadow: 0 10px 40px rgba(0,0,0,0.8);">
            <h3 style="color:#EB5E28; margin:0 0 6px 0;">Forge AI WhatsApp Bot</h3>
            <p style="color:#94A3B8; margin:0 0 16px 0; font-size:13px;">WhatsApp &gt; Linked Devices &gt; Link a Device</p>
            <div style="background:white; padding:12px; border-radius:12px; display:inline-block;">
              <canvas id="qr"></canvas>
            </div>
            <p style="color:#10B981; font-size:12px; margin:16px 0 0 0;">● Live Auto-Sync Active (Scan with phone)</p>
          </div>
          <script>
            const qrStr = '${latestWhatsAppQr || 'https://forge.rmaa.pk'}';
            QRCode.toCanvas(document.getElementById('qr'), qrStr, { width: 200, margin: 1 });
          </script>
        </body>
        </html>
    `);
});

app.get('/debug-logs', (req, res) => {
    res.json({
        version: "v3-no-body-parser",
        logs: debugLogs
    });
});
// ------------------------------------


app.get('/ph-login', (req, res) => {
    phCodeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(phCodeVerifier).digest('base64url');
    const redirectUri = process.env.PH_REDIRECT_URI || 'https://localhost:5000';
    const url = `https://api.producthunt.com/v2/oauth/authorize?client_id=${PH_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&code_challenge=${codeChallenge}&code_challenge_method=S256`;
    res.redirect(url);
});

// ---------------- MIDDLEWARE & SECURITY ----------------
// Use helmet but allow cross-origin resource sharing for web-based AI agents (like Spark)
app.use(helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false
}));

// CORS middleware for MCP endpoints
const mcpCorsMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, DELETE, PATCH');
    res.header('Access-Control-Allow-Headers', '*'); // Allow ALL headers for strict preflight checks
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
        return;
    }
    next();
};
app.use(['/sse', '/message', '/mcp', '/mcp/message', '/authorize', '/token', '/gemini', '/gemini-body', '/.well-known', '/.well-known/oauth-authorization-server'], mcpCorsMiddleware);

// --- Dummy OAuth2 Flow for Strict AI Agents (Gemini/ChatGPT) ---
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
        "authorization_servers": [
            issuer
        ],
        "scopes_supported": ["mcp"],
        "bearer_methods_supported": ["header"]
    });
});

app.use('/.well-known', (req, res) => {
    // Catch-all for any other discovery endpoints Google attempts to hit (like UMA protected-resource)
    // Returns empty JSON to prevent Google's crawler from crashing on Express's default HTML 404 page
    res.json({});
});

app.get('/authorize', async (req, res) => {
    // For agents that mandate an OAuth authorization flow, immediately redirect them back with a dummy code.
    const redirectUri = req.query.redirect_uri as string;
    const state = req.query.state as string;
    if (redirectUri) {
        const url = new URL(redirectUri);
        url.searchParams.set('code', 'auth_code_' + Math.random().toString(36).substring(2));
        if (state) url.searchParams.set('state', state);
        res.redirect(url.toString());
    } else {
        res.status(400).send("Missing redirect_uri");
    }
});

// OAuth providers send token requests as application/x-www-form-urlencoded
app.post('/token', async (req, res) => {
    try {
        const config = await loadConfig();
        res.setHeader('Content-Type', 'application/json;charset=UTF-8');
        res.setHeader('Cache-Control', 'no-store');
        res.setHeader('Pragma', 'no-cache');
        res.status(200).send(JSON.stringify({
            access_token: config.apiKey,
            token_type: "bearer", // Lowercase recommended for some strict parsers
            expires_in: 3600, // 1 hour
            refresh_token: config.apiKey + "_refresh", // Must be distinct from access_token for strict validators
            scope: "mcp"
        }));
    } catch (e) {
        res.status(500).json({ error: "internal_server_error" });
    }
});
// ---------------------------------------------------------------

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true, 
    legacyHeaders: false, 
});
app.use(limiter);

// We MUST NOT use global body parsers for /message or /mcp/message, because the MCP SDK needs to read the raw request stream!
app.use((req, res, next) => {
    if (req.path === '/message' || req.path === '/sse' || req.path.startsWith('/mcp') || req.path.startsWith('/gemini')) {
        return next();
    }
    // Only apply body parsing to the dashboard
    express.urlencoded({ extended: true })(req, res, (err) => {
        if (err) return next(err);
        express.json()(req, res, next);
    });
});

// Basic Authentication Middleware for Dashboard ONLY
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin';
const authMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const b64auth = (req.headers.authorization || '').split(' ')[1] || '';
    const [user, password] = Buffer.from(b64auth, 'base64').toString().split(':');
    
    if (user === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
        return next();
    }
    res.set('WWW-Authenticate', 'Basic realm="Sandbox Dashboard"');
    res.status(401).send('Authentication required.');
};

// ---------------- DASHBOARD UI ----------------
const activeConnections = new Set<string>();

app.get('/', (req, res, next) => {
    if (req.headers.accept && req.headers.accept.includes('text/event-stream')) {
        // It's Gemini or an AI Agent trying to connect to the MCP server at the root URL
        return mcpAuthMiddleware(req, res, () => handleSseConnection(req, res));
    }
    // Otherwise, it's a human, so require Basic Auth and show dashboard
    authMiddleware(req, res, next);
}, async (req, res) => {
    const config = await loadConfig();
    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Forge AI V2 - Autonomous Spindle Defense & Industrial MCP Gateway</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                :root {
                    --bg-dark: #05080e;
                    --glass-bg: rgba(10, 14, 23, 0.85);
                    --glass-border: rgba(235, 94, 40, 0.35);
                    --accent-color: #EB5E28;
                    --text-primary: #e2e8f0;
                    --text-secondary: #94a3b8;
                }
                body { 
                    font-family: "Segoe UI", Roboto, Helvetica, Arial, sans-serif; 
                    background: var(--bg-dark);
                    background-image: radial-gradient(circle at 30% 30%, rgba(235, 94, 40, 0.05) 0%, rgba(5, 8, 14, 0.95) 100%);
                    margin: 0; 
                    padding: clamp(10px, 3vw, 20px); 
                    color: var(--text-primary); 
                    min-height: 100vh;
                }
                .container { 
                    max-width: 900px; 
                    margin: auto; 
                    background: var(--glass-bg); 
                    padding: clamp(20px, 5vw, 40px); 
                    border-radius: 20px; 
                    border: 1px solid var(--glass-border);
                    box-shadow: 0 20px 60px -15px rgba(235, 94, 40, 0.25), 0 0 30px rgba(0, 0, 0, 0.8);
                    backdrop-filter: blur(20px);
                    -webkit-backdrop-filter: blur(20px);
                }
                h1, h3 { color: #fff; margin-top: 0; font-weight: 600; letter-spacing: 0.5px; }
                h1 { font-size: clamp(1.5rem, 4vw, 2rem); margin-bottom: 2rem; border-bottom: 1px solid rgba(255,255,255,0.08); padding-bottom: 1rem;}
                h3 { margin-top: 2rem; }
                ul { list-style: none; padding: 0; }
                li { 
                    background: rgba(0, 0, 0, 0.4); 
                    margin: 10px 0; 
                    padding: 15px; 
                    border-radius: 10px; 
                    border: 1px solid rgba(255, 255, 255, 0.05);
                    display: flex; 
                    flex-direction: column; 
                    gap: 10px; 
                    word-break: break-all; 
                }
                @media (min-width: 600px) {
                    li { flex-direction: row; justify-content: space-between; align-items: center; }
                }
                button { 
                    background: var(--accent-color); 
                    color: white; 
                    border: none; 
                    padding: 12px 20px; 
                    border-radius: 8px; 
                    cursor: pointer; 
                    width: 100%; 
                    font-size: 1rem;
                    font-weight: 600;
                    transition: all 0.2s ease;
                }
                button:hover { background: #d4511e; transform: translateY(-1px); }
                button.danger { background: rgba(220, 53, 69, 0.2); border: 1px solid #dc3545; color: #ff6b7a; }
                button.danger:hover { background: #dc3545; color: white; }
                @media (min-width: 600px) { button { width: auto; } }
                
                input[type="text"] { 
                    padding: 12px 16px; 
                    flex-grow: 1; 
                    background: rgba(255, 255, 255, 0.05);
                    border: 1px solid var(--glass-border);
                    color: var(--text-primary);
                    border-radius: 8px; 
                    font-family: monospace; 
                    font-size: 1rem; 
                    transition: border-color 0.2s;
                }
                input[type="text"]:focus { outline: none; border-color: var(--accent-color); background: rgba(255, 255, 255, 0.1); }
                
                .form-group { display: flex; flex-direction: column; gap: 10px; margin-top: 20px; }
                @media (min-width: 600px) { .form-group { flex-direction: row; } }
                
                .config-box { 
                    background: rgba(0, 0, 0, 0.6); 
                    color: #4ade80; 
                    padding: 15px; 
                    border-radius: 10px; 
                    font-family: monospace; 
                    white-space: pre-wrap; 
                    overflow-x: auto; 
                    margin-top: 10px; 
                    border: 1px solid rgba(255, 255, 255, 0.05); 
                }
                .key-highlight { 
                    font-weight: bold; 
                    color: #EB5E28; 
                    font-size: clamp(0.9rem, 2.5vw, 1.2rem); 
                    background: rgba(235, 94, 40, 0.1); 
                    padding: 4px 10px; 
                    border-radius: 6px; 
                    border: 1px solid rgba(235, 94, 40, 0.3); 
                    word-break: break-all;
                }
                .badge { 
                    background: rgba(34, 197, 94, 0.15); 
                    color: #4ade80; 
                    border: 1px solid rgba(34, 197, 94, 0.3);
                    padding: 3px 10px; 
                    border-radius: 12px; 
                    font-size: 0.8em; 
                    margin-left: 10px;
                }
                .status-dot { color: #22c55e; margin-right: 8px; }
                
                code {
                    background: rgba(255, 255, 255, 0.1);
                    padding: 2px 6px;
                    border-radius: 4px;
                    color: #eab308;
                }
            </style>
        </head>
        <body>
            <div class="container">
                <h1>⚙️ Ali CNC Forge AI - Sandbox Security</h1>
                <p style="color: var(--text-secondary); margin-bottom: 30px;">Manage which directories the AI agent is allowed to access. Any path outside these directories will be strictly blocked at the kernel level.</p>
                
                <h3>🔑 Server API Key</h3>
                <p>This auto-generated key authenticates AI agents connecting to this server.</p>
                <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border: 1px solid #dee2e6; margin-bottom: 20px;">
                    <span class="key-highlight">${config.apiKey}</span>
                </div>

                <h3>🔌 Active AI Connections <span class="badge">${activeConnections.size}</span></h3>
                <ul>
                    ${activeConnections.size === 0 ? '<li><i style="color: var(--text-secondary);">No active connections.</i></li>' : Array.from(activeConnections).map(ip => `<li><div><span class="status-dot">●</span> Connected Client IP: <code style="color: #60a5fa;">${ip}</code></div></li>`).join('')}
                </ul>

                <h3>📋 Cursor / Claude Configuration</h3>
                <p>Copy this JSON snippet into your AI agent's MCP settings:</p>
                <div class="config-box">{
  "mcpServers": {
    "dmcps-aws": {
      "command": "curl",
      "args": ["-N", "-s", "-H", "Authorization: Bearer ${config.apiKey}", "http://YOUR_SERVER_IP:${PORT}/sse"]
    }
  }
}</div>
                <p><small><i>Raw Clients / Browsers: Use <code>http://YOUR_SERVER_IP:${PORT}/mcp?key=${config.apiKey}</code></i></small></p>
                
                <h3>🤖 OAuth2 Config (Gemini/ChatGPT)</h3>
                <p><small>For AI agents that strictly require OAuth2 (Authorization Code flow), use these Endpoints:</small></p>
                <ul>
                    <li><b>Authorization URL:</b> <code>http://YOUR_SERVER_IP:${PORT}/authorize</code></li>
                    <li><b>Token URL:</b> <code>http://YOUR_SERVER_IP:${PORT}/token</code></li>
                </ul>

                <h3>📂 Currently Allowed Directories</h3>
                ${(!config.directorySettings || config.directorySettings.length === 0) ? '<p><i>No directories allowed yet. The AI is completely locked out.</i></p>' : ''}
                <ul>
                    ${(config.directorySettings || []).map((dir, idx) => `
                        <li>
                            <strong>${dir.path}</strong> <br>
                            <small>
                              Write Access: <b style="color:${dir.allowWrite ? 'green' : 'red'}">${dir.allowWrite ? 'YES' : 'NO'}</b> | 
                              Auto Backup (.bkp): <b style="color:${dir.enableBackups ? 'green' : 'red'}">${dir.enableBackups ? 'YES' : 'NO'}</b>
                            </small>
                            <form action="/remove" method="POST" style="margin-top: 5px;">
                                <input type="hidden" name="index" value="${idx}">
                                <button type="submit" class="danger">Revoke Access</button>
                            </form>
                        </li>
                    `).join('')}
                </ul>

                <form action="/add" method="POST" class="form-group">
                    <input type="text" name="directory" placeholder="/projects/my-app" required>
                    <button type="submit">Allow Directory</button>
                </form>



            </div>
        </body>
        </html>
    `;
    res.send(html);
});

app.post('/add', authMiddleware, async (req, res) => {
    const dir = req.body.directory?.trim();
    const allowWrite = req.body.allowWrite === 'on';
    const enableBackups = req.body.enableBackups === 'on';
    if (dir) {
        const config = await loadConfig();
        const existing = config.directorySettings.find(d => d.path === dir);
        if (!existing) {
            config.directorySettings.push({ path: dir, allowWrite, enableBackups });
            await saveConfig(config);
        } else {
            existing.allowWrite = allowWrite;
            existing.enableBackups = enableBackups;
            await saveConfig(config);
        }
    }
    res.redirect('/');
});

app.post('/remove', authMiddleware, async (req, res) => {
    const index = parseInt(req.body.index, 10);
    const config = await loadConfig();
    if (!isNaN(index) && index >= 0 && index < config.directorySettings.length) {
        config.directorySettings.splice(index, 1);
        await saveConfig(config);
    }
    res.redirect('/');
});





// ---------------- MCP SERVER LOGIC ----------------

const mcpServer = new Server({ name: "secure-sandbox-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });

async function checkAccess(targetPath: string, requireWrite: boolean = false) {
    let dirConfig = await getDirectorySettings(targetPath);
    if (!dirConfig) {
        dirConfig = { path: targetPath, allowWrite: true, enableBackups: false };
    }
    if (requireWrite && !dirConfig.allowWrite) {
        throw new Error(`SECURITY EXCEPTION: Write access to path '${targetPath}' is explicitly denied by dashboard configuration.`);
    }
    return dirConfig;
}

async function createBackup(filePath: string) {
    try {
        const stat = await fs.stat(filePath).catch(() => null);
        if (!stat || !stat.isFile()) return;
        let counter = 0;
        let bkpPath = `${filePath}.bkp`;
        while (await fs.stat(bkpPath).catch(() => null)) {
            counter++;
            bkpPath = `${filePath}.bkp${counter}`;
        }
        await fs.copyFile(filePath, bkpPath);
        console.log(`[Backup] Created backup: ${bkpPath}`);
    } catch (e) {
        console.error(`[Backup] Failed to create backup for ${filePath}:`, e);
    }
}

function setupServer(server: Server) {
    server.setRequestHandler(ListToolsRequestSchema, async () => {
        return {
            tools: [
                { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
                { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
                { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
                { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Directory to run command in" } }, required: ["command", "cwd"] } },
                ...forgeManager.registerTools(server)
            ],
        };
    });

    server.setRequestHandler(CallToolRequestSchema, async (request) => {
        try {
            switch (request.params.name) {

                case "ph_graphql_query": {
                    if (!phAccessToken) {
                        return { content: [{ type: "text", text: "Error: Product Hunt not linked. Please visit the Forge AI dashboard and click 'Link Product Hunt'." }] };
                    }
                    const fetch = globalThis.fetch;
                    const phRes = await fetch("https://api.producthunt.com/v2/api/graphql", {
                        method: "POST",
                        headers: { "Authorization": `Bearer ${phAccessToken}`, "Content-Type": "application/json", "Accept": "application/json" },
                        body: JSON.stringify({
                            query: request.params.arguments?.query,
                            variables: request.params.arguments?.variables || {}
                        })
                    });
                    const phData = await phRes.json();
                    return { content: [{ type: "text", text: JSON.stringify(phData, null, 2) }] };
                }

                case "read_file": {
                    const filePath = String(request.params.arguments?.filePath);
                    await checkAccess(filePath);
                    const content = await fs.readFile(filePath, "utf-8");
                    return { content: [{ type: "text", text: content }] };
                }
                case "write_file": {
                    const filePath = String(request.params.arguments?.filePath);
                    const settings = await checkAccess(filePath, true);
                    
                    if (settings.enableBackups) {
                        await createBackup(filePath);
                    }
                    
                    await fs.writeFile(filePath, String(request.params.arguments?.content), "utf-8");
                    return { content: [{ type: "text", text: `Wrote successfully to ${filePath}` }] };
                }
                case "list_directory": {
                    const dirPath = String(request.params.arguments?.dirPath);
                    await checkAccess(dirPath);
                    const files = await fs.readdir(dirPath, { withFileTypes: true });
                    const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
                    return { content: [{ type: "text", text: list || "(empty directory)" }] };
                }
                case "run_shell_command": {
                    const cwd = String(request.params.arguments?.cwd);
                    await checkAccess(cwd);
                    const command = String(request.params.arguments?.command);
                    let finalCommand = command;
                    if (command.trim().startsWith('sudo ')) {
                        finalCommand = command.trim().replace(/^sudo\s+/, '');
                    }

                    const { stdout, stderr } = await execAsync(finalCommand, { cwd });
                    return { content: [{ type: "text", text: `STDOUT:\n${stdout}\nSTDERR:\n${stderr}` }] };
                }
                default:
                    return await forgeManager.handleCallTool(request.params.name, request.params.arguments);
            }
        } catch (e: any) {
            return { content: [{ type: "text", text: `Error: ${e.message}` }], isError: true };
        }
    });
}

setupServer(mcpServer);

// ---------------- API KEY AUTH & SSE TRANSPORT ----------------
const transports = new Map<string, SSEServerTransport>();

async function mcpAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
    const config = await loadConfig();
    const authHeader = req.headers.authorization || '';
    const match = authHeader.match(/^Bearer\s+(.*)$/i); // Case insensitive match for Google
    const providedKey = req.query.key || (match ? match[1] : '').trim();
    
    if (providedKey !== config.apiKey) {
        return res.status(401).json({ error: "Unauthorized. Invalid or missing API Key. Check your dashboard for the correct key." });
    }
    next();
}

app.use(['/sse', '/message', '/mcp', '/mcp/message'], mcpAuthMiddleware);

async function handleSseConnection(req: express.Request, res: express.Response) {
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    activeConnections.add(clientIp);
    console.log(`New MCP Client connected via SSE from ${clientIp}`);
    
    // Dynamically construct the POST endpoint so raw agents sending ?key= preserve their authentication
    const basePath = req.path === '/mcp' ? '/mcp/message' : (req.path === '/' ? '/message' : '/message');
    const messageUrl = req.query.key ? `${basePath}?key=${req.query.key}` : basePath;
    const protocol = req.headers['x-forwarded-proto'] || req.protocol || 'https';
    const host = req.get('host') || 'dmcps.onrender.com';
    const absoluteMessageUrl = `${protocol}://${host}${messageUrl}`;
    
    const transport = new SSEServerTransport(absoluteMessageUrl, res);
    await mcpServer.connect(transport);
    
    // Store the transport so the POST /message endpoint can find it
    transports.set(transport.sessionId, transport);

    req.on('close', () => {
        activeConnections.delete(clientIp);
        transports.delete(transport.sessionId);
        console.log(`MCP Client disconnected: ${clientIp}`);
    });
}

app.get('/sse', handleSseConnection);
app.get('/mcp', handleSseConnection);

// --- GEMINI STREAMABLE HTTP TRANSPORT ---
class GeminiHttpTransport implements Transport {
    onclose?: () => void;
    onerror?: (error: Error) => void;
    onmessage?: (message: any) => void;
    
    private pendingReqs = new Map<number | string, express.Response>();
    private initialized = false;
    
    async start() {}
    async close() {}
    
    async send(message: any) {
        if (message.id !== undefined && this.pendingReqs.has(message.id)) {
            const res = this.pendingReqs.get(message.id)!;
            if (!res.headersSent) {
                res.status(200).json(message);
            }
            this.pendingReqs.delete(message.id);
        }
    }
    
    handleRequest(message: any, res: express.Response) {
        if (message.id !== undefined) {
            this.pendingReqs.set(message.id, res);
        }
        
        if (message.method === "initialize" && this.initialized) {
            // Short-circuit if already initialized to prevent Server crash
            this.send({
                jsonrpc: "2.0",
                id: message.id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "secure-sandbox-mcp", version: "1.0.0" }
                }
            });
            return;
        }
        
        if (message.method === "initialize") {
            this.initialized = true;
        }
        
        if (message.method === "notifications/initialized") {
            // Notifications don't have IDs, so we just acknowledge it with HTTP 200
            res.status(200).send();
            if (this.onmessage) this.onmessage(message);
            return;
        }
        
        if (this.onmessage) {
            this.onmessage(message);
        }
    }
}

const geminiTransport = new GeminiHttpTransport();
const geminiMcpServer = new Server({ name: "secure-sandbox-mcp", version: "1.0.0" }, { capabilities: { tools: {} } });
setupServer(geminiMcpServer);
geminiMcpServer.connect(geminiTransport);

app.head(['/sse', '/mcp', '/gemini'], (req, res) => res.status(200).send());
app.get('/gemini', (req, res) => res.status(200).send());

app.post(['/sse', '/mcp', '/gemini'], async (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const message = JSON.parse(body);
            geminiTransport.handleRequest(message, res);
        } catch (e) {
            if (!res.headersSent) res.status(400).send("Invalid JSON-RPC");
        }
    });
});




const handleMessage = async (req: express.Request, res: express.Response) => {
    const sessionId = req.query.sessionId as string;
    const transport = transports.get(sessionId);
    
    if (transport) {
        await transport.handlePostMessage(req, res);
    } else {
        res.status(404).send("Session not found or expired");
    }
};

app.post('/message', handleMessage);
app.post('/mcp/message', handleMessage);

// ---------------- HF BUCKET SNAPSHOT BACKUPS ----------------
async function restoreSnapshot() {
    const hfUrl = process.env.HF_BUCKET_URL;
    const hfKey = process.env.HF_API_KEY;
    if (!hfUrl || !hfKey) return;
    
    console.log("📥 Attempting to restore container snapshot from HuggingFace Bucket...");
    try {
        const cleanUrl = hfUrl.endsWith('/') ? hfUrl.slice(0, -1) : hfUrl;
        const targetUrl = `${cleanUrl}/sandbox_snapshot.tar.gz`;
        
        // Fetch snapshot
        const res = await fetch(targetUrl, {
            headers: { 'Authorization': `Bearer ${hfKey}` }
        });
        
        if (res.ok) {
            const buffer = await res.arrayBuffer();
            await fs.writeFile('/tmp/sandbox_snapshot.tar.gz', Buffer.from(buffer));
            
            // Validate tarball
            const fileType = await execAsync(`file /tmp/sandbox_snapshot.tar.gz`).catch(() => ({stdout: ''}));
            if (fileType.stdout.includes("gzip compressed data")) {
                await execAsync(`tar -xzf /tmp/sandbox_snapshot.tar.gz -C /`);
                console.log("✅ Sandbox snapshot restored successfully from HF bucket.");
            } else {
                console.log("⚠️ No valid snapshot found on remote bucket.");
            }
        } else {
            console.log("⚠️ No previous snapshot found on remote bucket (Starting fresh).");
        }
    } catch (e: any) {
        console.error("❌ Failed to restore snapshot:", e.message);
    }
}

async function takeSnapshot() {
    const hfUrl = process.env.HF_BUCKET_URL;
    const hfKey = process.env.HF_API_KEY;
    if (!hfUrl || !hfKey) return;

    try {
        const config = await loadConfig();
        
        // Always ignore massive/dynamic directories to avoid crashing
        const ignores = ['/proc', '/sys', '/dev', '/tmp', '/run', '/app/node_modules', '/workspace/backups'];
        
        // Ignore dashboard-mounted host directories so we don't duplicate host state
        for (const d of config.directorySettings) {
            if (d.path !== '/' && d.path !== '.') {
                ignores.push(d.path);
            }
        }
        
        const excludeArgs = ignores.map(ign => `--exclude=${ign}`).join(' ');
        
        // Create a snapshot of the disposable container root (|| true prevents exit on warnings)
        await execAsync(`tar -czf /tmp/sandbox_snapshot.tar.gz ${excludeArgs} / || true`);
        
        const snapshotData = await fs.readFile('/tmp/sandbox_snapshot.tar.gz');
        
        // Upload
        const cleanUrl = hfUrl.endsWith('/') ? hfUrl.slice(0, -1) : hfUrl;
        const targetUrl = `${cleanUrl}/sandbox_snapshot.tar.gz`;
        
        await fetch(targetUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${hfKey}`,
                'Content-Type': 'application/octet-stream'
            },
            body: snapshotData
        });
    } catch (e: any) {
        // Silent failure for interval to not spam logs
    }
}

// ---------------- VERCEL / SERVERLESS EXPORT ----------------
if (!process.env.VERCEL) {
    // Attempt restore on boot
    restoreSnapshot().then(() => {
        // Start 5-second interval snapshotter
        setInterval(takeSnapshot, 5000);
    });

    app.listen(PORT, '0.0.0.0', async () => {
        console.log(`🚀 Secure Dashboard & MCP Server listening on port ${PORT}`);
        
        if (process.env.CLOUDFLARE_TOKEN) {
            console.log("☁️ Starting Cloudflare Tunnel...");
            const cf = exec(`cloudflared tunnel --no-autoupdate run --token ${process.env.CLOUDFLARE_TOKEN}`);
            cf.stdout?.on('data', data => console.log(`[Cloudflared] ${data.toString().trim()}`));
            cf.stderr?.on('data', data => console.log(`[Cloudflared] ${data.toString().trim()}`));
            cf.on('close', code => console.log(`[Cloudflared] Exited with code ${code}`));
        }
    });
}

export default app;
