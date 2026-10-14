# 🛡️ Forge AI V2 - Autonomous Acoustic CNC Spindle Defense & Industrial MCP Gateway

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Platform: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![MCP Server: Industrial SSE](https://img.shields.io/badge/MCP_Server-Industrial%20v2.0-emerald.svg)](forge-core/)
[![Status: Production](https://img.shields.io/badge/Release-V2%20Fused-orange.svg)]()

Forge AI V2 is an industrial-grade, offline-first acoustic telemetry, CNC spindle defense, and AI execution gateway. Built for high-noise manufacturing floors and machine shops, it detects tool deflection, chatter resonance, and imminent tool breakage in under **15 milliseconds** using high-speed frequency partitioning on edge silicon.

With **Forge AI V2**, the entire DMCPS secured sandbox and MCP gateway is natively fused directly into Forge AI, allowing AI agents (like Google Gemini, Claude, Cursor, and mobile clients) to directly monitor spindle acoustics, review crash autopsies, and trigger emergency feed-holds while isolating all code execution within kernel-level sandboxes.

---

## 🌟 Key Pillars of the V2 Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    PHYSICAL CNC MACHINE CELL                           │
 │                                                                        │
 │  [Spindle Micro-Acoustics]                                             │
 │             │                                                          │
 │             ▼ (I2S DMA Ping-Pong Ring Buffer, 48 kHz / 24-bit)         │
 │   [ESP32-S3 Dual-Core DSP Engine]                                      │
 │      ├── Core 0: Continuous 48 kHz I2S DMA Audio Ingestion             │
 │      └── Core 1: Radix-2 Real FFT + 80-Band Partition Accumulator      │
 │             │                                                          │
 │             ├──► [Optocoupler E-Stop] (< 15ms Hardware Feed Hold)      │
 │             └──► [Encrypted MicroSD Outbox / Local USB Serial Bridge]  │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                     FORGE AI V2 CORE DAEMON                            │
 │                                                                        │
 │  ├── 1. Edge Serial Hardware Bridge (Auto-detects /dev/ttyACM* / USB*) │
 │  ├── 2. Black-Box Autopsy Engine (Offline DuckDB Store-and-Forward)    │
 │  ├── 3. Multi-Channel Dispatcher (Instant WhatsApp / Telegram Alerts)  │
 │  ├── 4. Military-Grade Execution Sandbox (Dropped Linux Capabilities)  │
 │  └── 5. Universal Industrial MCP Gateway (SSE & Stdio Transports)      │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                ┌─────────────────────┴─────────────────────┐
                ▼                                           ▼
      [Gemini / Claude / Cursor]                 [Shop Owner WhatsApp]
      (Real-time Spindle Control)                (Instant Crash Autopsy)
```

---

## 🛠️ Industrial MCP Tools Exposed

When connected via SSE (`/sse`) or Gemini Stream (`/gemini`), Forge AI V2 exposes both real-time machine telemetry and hardened sandboxed filesystem tools:

| Tool Name | Type | Description |
| :--- | :--- | :--- |
| `forge_get_spindle_telemetry` | **Telemetry** | Returns real-time RPM, acoustic RMS dB, peak frequencies, and harmonic health status. |
| `forge_trigger_estop` | **Safety Control** | Fires the physical PC817 optocoupler circuit in `< 15ms` to engage CNC feed-hold. |
| `forge_reset_estop` | **Safety Control** | Clears the feed-hold and re-arms optical sensors after operator physical confirmation. |
| `forge_get_autopsy_report` | **Black-Box** | Retrieves rolling 30-second crash recorder logs and acoustic spectrogram snapshots. |
| `forge_send_whatsapp_alert` | **Dispatch** | Sends instant high-priority autopsy reports and waveforms to shop floor operators. |
| `read_file` | **Sandbox** | Read content strictly inside whitelisted directories with path-traversal blocking. |
| `write_file` | **Sandbox** | Write content safely with automated timestamped backup creation (`.bkp`). |
| `list_directory` | **Sandbox** | Safely explore workspace directories. |
| `run_shell_command` | **Sandbox** | Execute shell commands strictly restricted by dropped Linux kernel capabilities. |

---

## 🚀 Deployment Modes

### 1. Cloud Gateway (AWS EC2 / Render / Google Cloud Run)
- Fully containerized under Docker with dropped capabilities (`cap_drop: ALL`).
- Exposes port `3000` behind Caddy reverse proxy with automatic SSL and Cloudflare Tunnels.
- Accessible by Gemini on mobile and remote LLMs via Bearer API authentication.

### 2. Offline Machine Shop (Edge Workstation / Raspberry Pi)
- Operates 100% offline without requiring internet connection or cloud subscriptions.
- Detects the ESP32-S3 over USB Serial, saves black-box audio logs to local disk, and exposes local web dashboard on `http://localhost:3000`.
- Automatically drains the autopsy queue and pushes WhatsApp reports when an operator connects to the local network or hot-spots.

---

## 📦 Getting Started

### Local Setup
```bash
cd forge-core
npm install
npm run build
npm start
```
Access the dashboard at `http://localhost:3000` to whitelist directories and generate API keys.

### Connect an AI Agent (Claude / Cursor / Antigravity)
Add Forge AI V2 to your `mcpServers` configuration:
```json
{
  "mcpServers": {
    "forgeai": {
      "url": "http://16.176.42.41:3000/sse",
      "headers": {
        "Authorization": "Bearer YOUR_FORGE_API_KEY"
      }
    }
  }
}
```

---

## 🔒 Enterprise License
Forge AI V2 is licensed under the **Business Source License 1.1 (BSL-1.1)**. Free for non-commercial inspection, educational, and testing use. Enterprise and commercial multi-machine deployments require a commercial license from RMAA.
