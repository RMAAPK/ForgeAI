# 🛡️ Forge AI V2 - Autonomous Acoustic CNC Spindle Defense & Industrial MCP Gateway

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Platform: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![MCP Server: Industrial SSE](https://img.shields.io/badge/MCP_Server-Industrial%20v2.0-emerald.svg)](forge-core/)
[![Status: Production](https://img.shields.io/badge/Release-V2%20Fused-orange.svg)]()
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.thealidev/dmcps-success)](https://registry.modelcontextprotocol.io/)

**🔥 THE CONTINUATION & COMPLETE EVOLUTION OF DMCPS INTO FORGE AI!**  
Forge AI V2 merges the world-class execution sandboxing, PaaS hypervisor bypass, and multi-cloud resilience of **DMCPS** with **Forge AI's** sub-15ms edge acoustic silicon defense. Built for high-noise manufacturing floors and machine shops, it detects tool deflection, chatter resonance, and imminent tool breakage in under **15 milliseconds** using high-speed frequency partitioning on edge silicon.

<p align="center">
  <a href="https://render.com/deploy?repo=https://github.com/RMAAPK/ForgeAI">
    <img src="https://render.com/images/deploy-to-render-button.svg" alt="Deploy to Render">
  </a>
  &nbsp;&nbsp;
  <a href="https://railway.app/template?gh_repo=RMAAPK/ForgeAI">
    <img src="https://railway.app/button.svg" alt="Deploy on Railway">
  </a>
  &nbsp;&nbsp;
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FRMAAPK%2FForgeAI">
    <img src="https://vercel.com/button" alt="Deploy with Vercel">
  </a>
</p>

<p align="center">
  <a href="https://www.producthunt.com/products/dmcps/reviews/new?utm_source=badge-product_review&utm_medium=badge&utm_source=badge-dmcps" target="_blank">
    <img src="https://api.producthunt.com/widgets/embed-image/v1/product_review.svg?product_id=1333432&theme=neutral" alt="Forge AI / DMCPS Product Hunt" style="width: 250px; height: 54px;" width="250" height="54" />
  </a>
</p>

---

## 🌟 The V2 Architecture & Core Pillars

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
 │  ├── 4. Matrix Protocol Bridge (Mautrix Puppet Integration)            │
 │  ├── 5. Replicate BYOK Engine (Llama-3-70B Deep Crash Forensics)       │
 │  ├── 6. Military-Grade Execution Sandbox (Dropped Linux Capabilities)  │
 │  └── 7. Universal Industrial MCP Gateway (SSE & Stdio Transports)      │
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

## 🛡️ Key Security & Sandboxing Features (From DMCPS)

- **Root Without Risk (Absolute Root Illusion):** The AI is assigned a direct `root` user within the disposable container, tricking it into feeling absolute freedom without any "Permission denied" frustrations, keeping it from getting stuck in looping errors while kernel protections (`cap_drop: ALL`) prevent any host compromise.
- **PaaS Hypervisor Bypass via Node:** Runs cleanly within serverless containers, using JS interceptors to filter commands, allowing package installs (`apk add`) seamlessly on Render without triggering `no-new-privileges` crashes.
- **Strict Whitelisting:** The AI cannot read, write, or execute commands outside of directories explicitly whitelisted via the web dashboard. (Directory traversal attempts like `../` are mathematically blocked).
- **Hardened Security Dashboard:**
  - Protected by customizable environment credentials (`ADMIN_USERNAME` and `ADMIN_PASSWORD`).
  - Implements **Rate Limiting** to prevent brute-force login attacks.
  - Hardened with **Helmet** (CSP, HSTS, XSS protection, anti-sniffing).
- **Auto-Generated API Keys:** Connect to your MCP server using a dynamically generated Bearer token to ensure only authorized agents can execute tools on your server.
- **Pre-installed AI Toolkit:** Foundational tools (`git`, `python3`, `curl`, `bash`, `make`, `jq`) are pre-baked into the image so the AI is immediately ready to work.

---

## 🚀 Getting Started

### 1. Configure Environment
Copy the example environment file:
```bash
cp .env.example .env
```
Populate `.env` with your credentials:
```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=your_password
REPLICATE_API_TOKEN=r8_your_token_here
```

### 2. Local Setup
```bash
npm install
npm run build
npm start
```
Navigate to the mobile-friendly dashboard: 👉 **http://localhost:3000/**  
Log in with your configured `ADMIN_USERNAME` and `ADMIN_PASSWORD`.

### 3. Connect an AI Agent (Gemini / Claude Desktop / Cursor)
Point your MCP-compatible client to the live SSE endpoint:
👉 **https://forge.rmaa.pk/sse** (or **http://localhost:3000/sse**)

Add to your `mcpServers` configuration:
```json
{
  "mcpServers": {
    "forgeai": {
      "url": "https://forge.rmaa.pk/sse",
      "headers": {
        "Authorization": "Bearer mcp_your_token_here"
      }
    }
  }
}
```

---

## 🌍 Cloud Deployments (Backend)

Forge AI V2 is a persistent backend service pre-configured for 1-click deployments on modern cloud platforms:

- **Render:** 1-click deploy reading `render.yaml`. Runs live on your custom domain (e.g. `https://forge.rmaa.pk`).
- **Google Cloud Run:** Fully automated serverless container builds via `cloudbuild.yaml`.
- **Railway:** Built automatically via `railway.toml` and Nixpacks.
- **AWS EC2:** Runs backed by Caddy reverse proxy on port 3000 with dropped capabilities (`cap_drop: ALL`).
- **Vercel:** Supported via `vercel.json` for testing and edge function exploration.

---

## 🔒 Enterprise License
Forge AI V2 is licensed under the **Business Source License 1.1 (BSL-1.1)**. Free for non-commercial inspection, educational, and testing use. Enterprise and commercial multi-machine deployments require a commercial license from RMAA.
