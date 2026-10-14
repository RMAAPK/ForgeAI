const fs = require('fs');
const path = require('path');

const targetPath = path.join(__dirname, 'src', 'dashboard.ts');
let content = fs.readFileSync(targetPath, 'utf8');

// 1. Add Forge imports and instantiation
const importTarget = "import crypto from 'crypto';";
const importReplacement = `import crypto from 'crypto';
import { ForgeMcpManager } from './mcp_forge_tools.js';
import { EdgeSerialBridge } from './edge_serial_bridge.js';

const forgeManager = new ForgeMcpManager();
const serialBridge = new EdgeSerialBridge();

serialBridge.autoDetectPort().then(port => {
    if (port) console.log(\`[Forge Hardware] Bound to edge sensor serial port: \${port}\`);
    else console.log(\`[Forge Hardware] No physical ESP32-S3 serial port detected locally. Running in virtual/cloud telemetry mode.\`);
});

serialBridge.on('telemetry', (packet) => {
    forgeManager.updateTelemetry(packet);
});`;

content = content.replace(importTarget, importReplacement);

// 2. Expand ListToolsRequestSchema
const toolsSchemaTarget = `tools: [
                { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
                { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
                { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },

                { name: "ph_graphql_query", description: "Execute a GraphQL query against the Product Hunt V2 API. Requires the user to have linked their Product Hunt account.", inputSchema: { type: "object", properties: { query: { type: "string" }, variables: { type: "object" } }, required: ["query"] } },
                { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Directory to run command in" } }, required: ["command", "cwd"] } },
            ],`;

const toolsSchemaReplacement = `tools: [
                { name: "read_file", description: "Read a file", inputSchema: { type: "object", properties: { filePath: { type: "string" } }, required: ["filePath"] } },
                { name: "write_file", description: "Write content to a file", inputSchema: { type: "object", properties: { filePath: { type: "string" }, content: { type: "string" } }, required: ["filePath", "content"] } },
                { name: "list_directory", description: "List files and directories", inputSchema: { type: "object", properties: { dirPath: { type: "string" } }, required: ["dirPath"] } },
                { name: "run_shell_command", description: "Run a shell command", inputSchema: { type: "object", properties: { command: { type: "string" }, cwd: { type: "string", description: "Directory to run command in" } }, required: ["command", "cwd"] } },
                ...forgeManager.registerTools(server)
            ],`;

content = content.replace(toolsSchemaTarget, toolsSchemaReplacement);

// 3. Delegate CallToolRequestSchema to forgeManager
const callToolTarget = `default:
                    throw new Error(\`Unknown tool: \${request.params.name}\`);`;

const callToolReplacement = `default:
                    return await forgeManager.handleCallTool(request.params.name, request.params.arguments);`;

content = content.replace(callToolTarget, callToolReplacement);

// 4. Update Title in Dashboard HTML
content = content.replace(/DMCPS Dashboard - Ali CNC Edge/g, 'Forge AI V2 - Autonomous Spindle Defense & Industrial MCP Gateway');
content = content.replace(/DMCPS/g, 'Forge AI');

fs.writeFileSync(targetPath, content, 'utf8');
console.log("Successfully patched dashboard.ts for Forge AI V2!");
