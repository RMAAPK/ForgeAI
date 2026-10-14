import * as fs from "fs/promises";
import * as path from "path";
import { randomBytes } from 'crypto';

const defaultPath = process.env.VERCEL ? "/tmp/allowed_dirs.json" : "/app/config/allowed_dirs.json";
const CONFIG_PATH = process.env.CONFIG_PATH || defaultPath;

export interface DirectoryConfig {
    path: string;
    allowWrite: boolean;
    enableBackups: boolean;
}

export interface Config {
    directorySettings: DirectoryConfig[];

    apiKey: string;
}

let cachedConfig: Config | null = null;

export async function loadConfig(): Promise<Config> {
    if (cachedConfig) return cachedConfig;
    
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        const parsed = JSON.parse(data);
        
        if (!parsed.apiKey || process.env.MCP_API_KEY) {
            parsed.apiKey = process.env.MCP_API_KEY || ('mcp_' + randomBytes(16).toString('hex'));
            // Do NOT save the token back to disk per user request!
        }
        
        // Migrate old allowedDirectories string[] to new format
        if (parsed.allowedDirectories && Array.isArray(parsed.allowedDirectories) && !parsed.directorySettings) {
            parsed.directorySettings = parsed.allowedDirectories.map((d: string) => ({
                path: d,
                allowWrite: true,
                enableBackups: true
            }));
            delete parsed.allowedDirectories;
        }

        if (!parsed.directorySettings) parsed.directorySettings = [{ path: "/tmp", allowWrite: true, enableBackups: false }];
        
        
        cachedConfig = parsed;
        return parsed;
    } catch {
        const newConfig: Config = { 
            directorySettings: [{ path: "/tmp", allowWrite: true, enableBackups: false }], 
            apiKey: process.env.MCP_API_KEY || ('mcp_' + randomBytes(16).toString('hex'))
        };
        // Do NOT save newly generated config automatically
        cachedConfig = newConfig;
        return newConfig;
    }
}

export async function saveConfig(config: Config): Promise<void> {
    cachedConfig = config;
    try {
        await fs.mkdir(path.dirname(CONFIG_PATH), { recursive: true });
        await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
    } catch (err) {
        console.warn('Could not persist config to disk, but it is cached in memory:', err);
    }
}

export async function getDirectorySettings(targetPath: string): Promise<DirectoryConfig | null> {
    const config = await loadConfig();
    const resolved = path.resolve(targetPath);
    
    for (const dir of config.directorySettings) {
        const allowedDir = path.resolve(dir.path);
        if (resolved === allowedDir || resolved.startsWith(allowedDir + path.sep)) {
            return dir;
        }
    }
    return null;
}
