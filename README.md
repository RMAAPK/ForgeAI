# Forge AI - Autonomous Acoustic Spindle Defense & Industrial MCP Network

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Target: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![Architecture: Air--Gapped](https://img.shields.io/badge/Architecture-Air--Gapped%20DSP-emerald.svg)](Edge%20Firmware/)
[![MCP Server: Industrial](https://img.shields.io/badge/MCP_Server-Industrial%20v2.0-blue.svg)](server.json)
[![Status: v2_fused](https://img.shields.io/badge/Release-v2__fused-orange.svg)]()

Forge AI is an industrial-grade, air-gapped acoustic telemetry, CNC spindle defense, and secure physical-AI execution gateway. It detects tool deflection, chatter resonance, and imminent tool breakage in under **15 milliseconds** using high-speed frequency partitioning on edge silicon.

---

## Architecture Overview

```
 [Spindle Micro-Vibrations & Acoustics]       [13.56 MHz Resonant Flux]
             │ (48 kHz / 24-bit I2S DMA)                   │
             ▼                                             ▼
   [ESP32-S3 Dual-Core DSP Engine]               [TrackOn Custom Silicon]
      ├── Core 0: Continuous I2S DMA Ingestion      ├── RV32EC Bare-Die Core
      └── Core 1: Radix-2 Real FFT + 80-Band DSP    └── 10x10mm Flexible Coil
             │
             ├──► [Optocoupler E-Stop] (< 15ms Hardware Feed Hold / Emergency Trip)
             └──► [Encrypted MicroSD Outbox / Local USB Serial Bridge]
                        │
                        ▼ (Local Serial Stream / Sneakernet)
           [Forge AI V2 Core Daemon & Industrial MCP Server]
              ├── 1. Edge Serial Hardware Bridge (Auto-detects USB ports)
              ├── 2. Black-Box Autopsy Engine (Offline Store-and-Forward)
              ├── 3. Multi-Channel Dispatcher (Instant WhatsApp / Telegram Alerts)
              ├── 4. Military-Grade Execution Sandbox (Dropped Linux Capabilities)
              └── 5. Universal MCP Server (Exposing 12+ Machine Telemetry & OS Tools)
                        │
                        ├──────────────────────────┐
                        ▼                          ▼
           [Supabase / DuckDB Telemetry Core]   [AI Agents: Gemini / Claude / Cursor]
           (80-Band Continuous Vector Matrix)   (Real-Time Spindle Monitoring & Safety Control)
```

---

## Key Modules

### 1. [Edge Firmware](Edge%20Firmware/)
- **Core 0:** Continuous 48 kHz / 24-bit audio stream ingestion via zero-copy ping-pong ring buffers.
- **Core 1:** Radix-2 Real FFT (`dsps_fft2r_fc32`) with Blackman-Harris windowing.
- **80-Band Linear Partitioning:**
  - **Kinematic & Unbalance Zone (1 Hz - 500 Hz):** 10 linear bins (49.9 Hz/bin) isolating spindle runout, pulley wear, and bearing defect harmonics.
  - **Chatter & Breakage Zone (500 Hz - 20,000 Hz):** 70 linear bins (278.57 Hz/bin) capturing regenerative chatter squeal and micro-chipping acoustic emission.
- **Direct Hardware Interception:** Open-collector optocoupler circuit triggered in `< 15ms` for deterministic feed hold before catastrophic bit failure.
- **Cryptographic 7-Day Sneakernet:** Ed25519 signature verification (`lease.sig`) and monotonic runtime counter enforcement.

### 2. Industrial MCP Server (`src/` & `server.json`)
Native Model Context Protocol gateway allowing AI agents (like Gemini, Claude, Cursor) to monitor spindle harmonics, trigger emergency feed-holds, and run sandboxed diagnostics:
- **`forge_get_spindle_telemetry`**: Real-time RPM, acoustic RMS dB, peak frequency, and harmonic health.
- **`forge_trigger_estop`**: Optical feed-hold trigger (<15ms) via PC817 optocoupler.
- **`forge_reset_estop`**: Re-arm optical sensors after manual operator confirmation.
- **`forge_get_autopsy_report`**: Rolling 30-second black-box crash recorder logs & spectrograms.
- **`forge_send_whatsapp_alert`**: Instant high-priority dispatch of autopsies to WhatsApp.
- **`trackon_scan_devices`** & **`trackon_get_device_telemetry`**: 13.56 MHz resonant flux and BLE tag telemetry.
- **`os_get_system_info`** & **`os_detect_serial_devices`**: Host platform metrics and attached CNC serial bus scanning.
- **`read_file`**, **`write_file`**, **`list_directory`**, **`run_shell_command`**: Sandboxed workspace tools with directory traversal protection.

### 3. [Cross-Platform OS Daemons](clients/)
Native automation daemons interfacing with host platforms across the shop floor:
- `clients/Linux/`: Industrial workshop terminals & single-board computers (Raspberry Pi).
- `clients/Win/`: Windows CNC host controller automation (Mach3/Mach4/NcStudio bridge).
- `clients/Android/` & `clients/iOS/`: Mobile operator and technician telemetry.
- `clients/Mac/`: Workstation engineering clients.

### 4. [Hardware Designs & Flexible Silicon](hardware-designs/)
- `hardware-designs/hardware/`: Complete KiCad PCB layout (`TrackOn.kicad_pcb`), Archimedean resonant coil generator, and COMSOL magnetic field simulations.
- `hardware-designs/hardware/rtl/`: RV32EC bare-die core controllers, OTP eFuse security registers, and lithium PMU.
- `hardware-designs/firmware/`: Rotating NIST P-224 Elliptic Curve mesh cryptography.

### 5. Telemetry Client (`forge_client.py`)
- Standard client interface for querying the 80-band acoustic telemetry matrix from cloud/local storage.
- Zero-leak credential parsing via environment variables.

---

## Quickstart & Environment Setup

1. Copy the example configuration:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your private credentials. **Never commit `.env` or raw keys.**
3. Run the MCP server and dashboard locally:
   ```bash
   npm install
   npm run build
   npm start
   ```
4. Query telemetry programmatically:
   ```python
   from forge_client import ForgeTelemetryClient

   client = ForgeTelemetryClient()
   records = client.fetch_telemetry(limit=5)
   for r in records:
       print(r["machine_name"], r["status"], r["severity_score"])
   ```

---

## Directory Manifest

```
ForgeAI/
├── Edge Firmware/
│   ├── esp_dsp_firmware.cpp     # Production ESP32-S3 DSP & DMA firmware
│   └── README.md                 # Firmware architecture & timing specifications
├── src/                          # Fused Industrial MCP Server & Core Daemon
│   ├── mcp_forge_tools.ts       # 12+ Fused Industrial, Silicon & OS MCP Tools
│   ├── dashboard.ts             # Web security dashboard & SSE endpoints
│   ├── stdio.ts                 # Local stdio CLI runner for Cursor & Claude
│   ├── edge_serial_bridge.ts    # Auto-detects ESP32-S3 USB serial stream
│   ├── whatsapp_dispatcher.ts   # Offline-first black-box crash dispatcher
│   └── matrix_bridge.ts         # Multi-channel Mautrix puppet gateway
├── clients/                      # Cross-Platform OS-MCP Client Daemons
│   ├── Linux/                   # Industrial shop floor terminal daemon
│   ├── Win/                     # CNC controller automation bridge (Mach3/NcStudio)
│   ├── Android/ & iOS/          # Mobile operator daemons
│   └── Mac/                     # Apple Silicon workstation client
├── hardware-designs/             # TrackOn Flexible PCB & Custom Silicon
│   ├── hardware/                # KiCad PCB, Archimedean coils, COMSOL simulations
│   ├── hardware/rtl/            # RV32EC silicon RTL & lithium PMU
│   └── firmware/                # NIST P-224 rotating BLE mesh crypto
├── forge_client.py               # Enterprise Supabase/telemetry reader client
├── server.json                   # Official Global MCP Registry Manifest
├── Dockerfile                    # Kernel-sandboxed container (cap_drop: ALL)
├── docker-compose.yml            # Multi-container orchestration stack
├── render.yaml                   # 1-click cloud deployment spec
├── .env.example                  # Sanitized environment template (no secrets)
├── .gitignore                    # Enterprise gitignore rules
├── LICENSE.md                    # Business Source License (BSL 1.1)
└── README.md                     # Master architecture documentation
```

---

### Physical Domain Credentials

Certified via **TITANS of CNC** on multi-axis CAD/CAM and high-feed cutting standards.

<div align="center">
  <table>
    <tr>
      <td align="center" width="50%">
        <img src="./credentials/6074cf11-titan-2m-cad_page-0001.jpg" width="100%" alt="TITAN-2M">
        <br />
        <sub><b>TITAN-2M</b> (ID: <code>6074cf11</code>)</sub>
      </td>
      <td align="center" width="50%">
        <img src="./credentials/6fe6283d-titan-3m-cad_page-0001.jpg" width="100%" alt="TITAN-3M">
        <br />
        <sub><b>TITAN-3M</b> (ID: <code>6fe6283d</code>)</sub>
      </td>
    </tr>
  </table>
</div>

<p align="center">
  <sub>C++ systems certification & entity documentation archived in <a href="./credentials/"><code>/credentials</code></a>.</sub>
</p>

---

## 📊 Benchmark Acoustic Telemetry & Anomaly Profiles

To calibrate the ESP32-S3 Radix-2 Real FFT pipeline across variable machine loads, Forge AI validates incoming I2S DMA buffers against standard industrial chatter and bearing failure signatures. 

Raw acoustic streams are windowed (Blackman-Harris) and compressed into an 80-band normalized energy array (`band_1` to `band_80`), driving deterministic severity scoring and hardware interrupt thresholds.

### Calibrated Anomaly Vectors (Excerpt)

| ID | Case / Failure Mode | State | Severity | Primary Harmonic Concentration |
|---|---|---|---|---|
| **1** | Spindle Bearing Monitoring (DTect-IT) | `ANOMALY_RECORDED` | **85.5** | Low-band bearing fatigue (Bands 5–11: >50 dB) |
| **2** | Tool Chatter Elimination | `ANOMALY_RECORDED` | **85.5** | Broad resonant chatter (Bands 6–10: >58 dB) |
| **3** | High-Frequency Taming | `ANOMALY_RECORDED` | **85.5** | High-energy wideband saturation (Bands 1–5: >70 dB) |
| **4** | Harmonic Speed Control (Haas) | `ANOMALY_RECORDED` | **85.5** | Rotational speed harmonics (Bands 1–3: >64 dB) |
| **5** | Lathe Regenerative Chatter | `ANOMALY_RECORDED` | **85.5** | Mid-band regenerative vibration (Bands 3–10: >65 dB) |
| **6** | Spindle Speed Variation (Haas SSV) | `ANOMALY_RECORDED` | **85.5** | Variable frequency modulation (Bands 5–9: >56 dB) |

> Complete 80-band raw acoustic telemetry matrix archived in [`/benchmarks/cnc_spindle_telemetry_202610112002.txt`](./benchmarks/cnc_spindle_telemetry_202610112002.txt).

---

## Licensing
This project is licensed under the **Business Source License 1.1 (BSL 1.1)**. See [LICENSE.md](LICENSE.md) for full terms and conditions.
