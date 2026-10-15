# 🛡️ Forge AI V2 - Autonomous Acoustic CNC Spindle Defense & Industrial MCP Gateway

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Platform: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![MCP Server: Industrial SSE](https://img.shields.io/badge/MCP_Server-Industrial%20v2.0-emerald.svg)](forge-core/)
[![Status: Production](https://img.shields.io/badge/Release-V2%20Fused-orange.svg)]()
[![MCP Registry](https://img.shields.io/badge/MCP_Registry-io.github.thealidev/dmcps-success)](https://registry.modelcontextprotocol.io/)
[![TITAN-2M Verified](https://img.shields.io/badge/TITAN--2M-Verified%20(6074cf11)-green.svg)](credentials/)
[![TITAN-3M Verified](https://img.shields.io/badge/TITAN--3M-Verified%20(6fe6283d)-green.svg)](credentials/)
[![PSEB Engineering](https://img.shields.io/badge/PSEB%20Gov-Registered%20(FL21%2FPSEB%2F2026%2F25254)-blue.svg)](credentials/)

**🔥 THE COMPLETE UNIFIED INDUSTRIAL PHYSICAL-AI ECOSYSTEM**  
Forge AI V2 natively unifies:
1. **Forge AI Edge:** Sub-15ms acoustic silicon spindle defense and regenerative chatter detection.
2. **DMCPS Core:** Military-grade execution sandbox, hypervisor bypass, and multi-cloud PaaS deployment.
3. **TrackOn Silicon & RF Mesh:** Bare-die RV32EC custom silicon, flexible 13.56 MHz resonant coils, and Apple/Google Find My mesh integration.
4. **OS-MCP Daemon Matrix:** Bare-metal operating system automation daemons across Android, iOS, Windows, Mac, and Linux.

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
  &nbsp;&nbsp;
  <a href="https://www.producthunt.com/products/trackon?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-trackon" target="_blank" rel="noopener noreferrer">
    <img alt="TrackOn - The 10mm open-source silicon tracking tag. | Product Hunt" width="250" height="54" src="https://api.producthunt.com/widgets/embed-image/v1/featured.svg?post_id=1269412&theme=neutral&t=1791122010420">
  </a>
</p>

---

## 🏛️ Verified Engineering Credentials & Certifications

Forge AI is built on verifiable, certified aerospace and industrial machining standards:
- **TITAN-2M Certified (Aerospace CAD/CAM Machining):** Verification ID `6074cf11`
- **TITAN-3M Certified (High-Speed Multi-Axis Toolpath Dynamics):** Verification ID `6fe6283d`
- **Government Accredited Systems Engineering:** PSEB Registration `FL21/PSEB/2026/25254` (Software & Embedded Systems Engineering).
- Archived audit dossier: [credentials/](credentials/)

---

## 🌟 The Fused Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    PHYSICAL HARDWARE & SENSOR CELL                     │
 │                                                                        │
 │  [Spindle Micro-Acoustics & Vibration]      [13.56 MHz Resonant Tag]   │
 │             │ (I2S DMA 48 kHz / 24-bit)                 │              │
 │             ▼                                           ▼              │
 │   [ESP32-S3 Dual-Core DSP Engine]              [TrackOn Custom Silicon] │
 │      ├── Core 0: Continuous DMA Ingestion         ├── RV32EC Bare-Die  │
 │      └── Core 1: Radix-2 Real FFT (80 Bins)       └── 10x10mm Flexible │
 │             │                                         Coil & PMU       │
 │             ├──► [PC817 Optocoupler] (<15ms Feed Hold)                 │
 │             └──► [Encrypted MicroSD / Local USB Serial Bridge]         │
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
 │  ├── 7. TrackOn RF Tag & Mesh Manager (Silicon eFuse & Telemetry)      │
 │  ├── 8. OS-MCP Cross-Platform Bridge (Android, iOS, Win, Mac, Linux)   │
 │  └── 9. Universal Industrial MCP Gateway (SSE & Stdio Transports)      │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
        ┌─────────────────────────────┼─────────────────────────────┐
        ▼                             ▼                             ▼
[Gemini / Claude / Cursor]  [Shop Floor WhatsApp]       [OS-MCP Client Daemons]
(Real-time Spindle Control)  (Instant Crash Autopsy)    (Android, iOS, Win, Mac, Linux)
```

---

## 🛠️ Unified MCP Tools Exposed

When connected via SSE (`/sse`) or Gemini Stream (`/gemini`), Forge AI V2 exposes physical machine telemetry, tracking hardware, and operating system controls in one interface:

| Category | Tool Name | Description |
| :--- | :--- | :--- |
| **Acoustic Defense** | `forge_get_spindle_telemetry` | Real-time RPM, acoustic RMS dB, chatter detection, and harmonic health. |
| **Acoustic Defense** | `forge_trigger_estop` | Fires the physical PC817 optocoupler circuit in `< 15ms` to engage CNC feed-hold. |
| **Acoustic Defense** | `forge_reset_estop` | Clears the feed-hold and re-arms optical sensors after physical inspection. |
| **Crash Autopsy** | `forge_get_autopsy_report` | Retrieves rolling 30-second crash recorder logs and acoustic spectrograms. |
| **Crash Autopsy** | `forge_send_whatsapp_alert` | Sends instant high-priority autopsy reports and waveforms to shop operators. |
| **TrackOn Hardware** | `trackon_scan_devices` | Scans ambient 13.56 MHz resonant magnetic flux and BLE mesh for TrackOn tags. |
| **TrackOn Hardware** | `trackon_get_device_telemetry` | Queries battery voltage, RF resonance, temperature, and eFuse keys. |
| **OS-MCP Systems** | `os_get_system_info` | Queries host metrics: OS kernel, CPU load, memory, active serial bridges. |
| **OS-MCP Systems** | `os_execute_command` | Executes shell commands protected by environment sandboxing boundaries. |
| **Sandbox Filesystem**| `read_file` | Read files strictly inside whitelisted paths with traversal blocking. |
| **Sandbox Filesystem**| `write_file` | Write content safely with automated timestamped backup creation (`.bkp`). |
| **Sandbox Filesystem**| `list_directory` | Safely explore workspace directories. |
| **Sandbox Filesystem**| `run_shell_command` | Run terminal commands strictly restricted by dropped Linux kernel capabilities. |

---

## 📱 Cross-Platform OS-MCP Client Daemons (`clients/`)

Forge AI natively extends to operator and technician hardware across all operating systems:
- **Android (`clients/Android/`):** Native Android daemon interfacing with mobile sensors and notifications.
- **iOS (`clients/iOS/`):** Web-inspect and platform hooks for Apple mobile hardware.
- **Linux (`clients/Linux/`):** Full kernel-level Linux daemon for industrial shop floor terminals and Raspberry Pis.
- **Windows (`clients/Win/`):** Windows CNC host controller automation (Mach3/Mach4/NcStudio bridge).
- **macOS (`clients/Mac/`):** Apple Silicon native daemon.

---

## 🔬 Hardware Designs & Bare-Die Silicon (`hardware-designs/`)

- **Flexible PCB Blueprints (`hardware-designs/hardware/`):** Complete KiCad project (`TrackOn.kicad_pcb`), Archimedean resonant coil generators, and COMSOL magnetic field simulations (`comsol_coil_sim.java`).
- **Custom Silicon RTL (`hardware-designs/hardware/rtl/`):** RV32EC bare-die core controllers, OTP eFuse security registers (`efuse_controller.v`), and lithium battery power management units (`pmu_lithium.v`).
- **Firmware Cryptography (`hardware-designs/firmware/`):** Rotating NIST P-224 Elliptic Curve advertising protocols (`fmn_crypto.c`).

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
👉 **http://localhost:3000/sse**

Add to your `mcpServers` configuration:
```json
{
  "mcpServers": {
    "forgeai": {
      "url": "http://localhost:3000/sse",
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

- **Render:** 1-click deploy reading `render.yaml`.
- **Google Cloud Run:** Fully automated serverless container builds via `cloudbuild.yaml`.
- **Railway:** Built automatically via `railway.toml` and Nixpacks.
- **AWS EC2:** Runs backed by Caddy reverse proxy on port 3000 with dropped capabilities (`cap_drop: ALL`).
- **Vercel:** Supported via `vercel.json` for testing and edge function exploration.

---

## 🔒 Enterprise License
Forge AI V2 is licensed under the **Business Source License 1.1 (BSL-1.1)**. Free for non-commercial inspection, educational, and testing use. Enterprise and commercial multi-machine deployments require a commercial license from RMAA.
