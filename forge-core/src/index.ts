import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { exec } from "child_process";
import { promisify } from "util";
import * as fs from "fs/promises";
import * as path from "path";

const execAsync = promisify(exec);

// This directory is mounted via Docker Compose.
// The container has NO access to the host's root.
const WORKSPACE_DIR = process.env.WORKSPACE_DIR || "/workspace";

/**
 * Validates and resolves paths to ensure they stay within the authorized workspace.
 * Prevents directory traversal attacks (e.g., ../../../etc/passwd).
 */
function getSafePath(targetPath: string): string {
  const normalized = path.normalize(targetPath);
  const resolved = path.resolve(WORKSPACE_DIR, normalized);
  if (!resolved.startsWith(WORKSPACE_DIR)) {
    throw new Error("Security Error: Access denied. Path is outside the authorized workspace.");
  }
  return resolved;
}

const server = new Server(
  {
    name: "secure-sandbox-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Expose restricted tools to the AI Agent
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "read_file",
        description: "Read a file from the isolated workspace",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "File path relative to the workspace root",
            },
          },
          required: ["filePath"],
        },
      },
      {
        name: "write_file",
        description: "Write content to a file in the isolated workspace",
        inputSchema: {
          type: "object",
          properties: {
            filePath: {
              type: "string",
              description: "File path relative to the workspace root",
            },
            content: {
              type: "string",
              description: "Content to write to the file",
            },
          },
          required: ["filePath", "content"],
        },
      },
      {
        name: "list_directory",
        description: "List files and directories in a workspace path",
        inputSchema: {
          type: "object",
          properties: {
            dirPath: {
              type: "string",
              description: "Directory path relative to the workspace root (use '.' for root)",
            },
          },
          required: ["dirPath"],
        },
      },
      {
        name: "run_shell_command",
        description: "Run a shell command securely within the isolated container",
        inputSchema: {
          type: "object",
          properties: {
            command: {
              type: "string",
              description: "The shell command to execute",
            },
          },
          required: ["command"],
        },
      },
    ],
  };
});

// Handle execution of the tools
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  switch (request.params.name) {
    case "read_file": {
      const filePath = getSafePath(String(request.params.arguments?.filePath));
      try {
        const content = await fs.readFile(filePath, "utf-8");
        return { content: [{ type: "text", text: content }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error reading file: ${e.message}` }], isError: true };
      }
    }
    
    case "write_file": {
      const filePath = getSafePath(String(request.params.arguments?.filePath));
      const content = String(request.params.arguments?.content);
      try {
        await fs.writeFile(filePath, content, "utf-8");
        return { content: [{ type: "text", text: `Successfully wrote to ${request.params.arguments?.filePath}` }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error writing file: ${e.message}` }], isError: true };
      }
    }
    
    case "list_directory": {
      const dirPath = getSafePath(String(request.params.arguments?.dirPath));
      try {
        const files = await fs.readdir(dirPath, { withFileTypes: true });
        const list = files.map(f => `${f.isDirectory() ? '[DIR]' : '[FILE]'} ${f.name}`).join('\n');
        return { content: [{ type: "text", text: list || "(empty directory)" }] };
      } catch (e: any) {
        return { content: [{ type: "text", text: `Error listing directory: ${e.message}` }], isError: true };
      }
    }
    
    case "run_shell_command": {
      const command = String(request.params.arguments?.command);
      try {
        // Execute command specifically bound to the WORKSPACE_DIR
        const { stdout, stderr } = await execAsync(command, { cwd: WORKSPACE_DIR });
        let result = "";
        if (stdout) result += `STDOUT:\n${stdout}\n`;
        if (stderr) result += `STDERR:\n${stderr}\n`;
        return { content: [{ type: "text", text: result || "Command executed successfully with no output." }] };
      } catch (e: any) {
        const errorMsg = `Execution Error: ${e.message}\n${e.stdout ? `STDOUT: ${e.stdout}` : ''}\n${e.stderr ? `STDERR: ${e.stderr}` : ''}`;
        return { content: [{ type: "text", text: errorMsg }], isError: true };
      }
    }
    
    default:
      throw new Error(`Unknown tool: ${request.params.name}`);
  }
});

async function run() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Secure Sandbox MCP Server running on stdio");
}

run().catch((error) => {
  console.error("Fatal error running server:", error);
  process.exit(1);
});

