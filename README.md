# Forge AI - Autonomous Acoustic Spindle Defense Network

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Target: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![Architecture: Air--Gapped](https://img.shields.io/badge/Architecture-Air--Gapped%20DSP-emerald.svg)](Edge%20Firmware/)
[![Status: v1_beta](https://img.shields.io/badge/Release-v1__beta-orange.svg)]()

Forge AI is an industrial-grade, air-gapped acoustic telemetry and CNC spindle defense system. It detects tool deflection, chatter resonance, and imminent tool breakage in under **15 milliseconds** using high-speed frequency partitioning on edge silicon.

---

## Architecture Overview

```
 [Spindle Micro-Vibrations]
             │
             ▼ (I2S DMA Ping-Pong Ring Buffer, 48 kHz / 24-bit)
   [ESP32-S3 Dual-Core DSP]
      ├── Core 0: Continuous I2S DMA Ingestion
      └── Core 1: Radix-2 Real FFT + 80-Band Partition Accumulator
             │
             ├──► [Optocoupler E-Stop] (< 15ms Hardware Feed Hold / Emergency Trip)
             └──► [Encrypted MicroSD Outbox] (/telemetry/outbox.enc)
                        │
                        ▼ (7-Day Sneakernet Swap)
           [Workstation & Telemetry Bridge]
                        │
                        ▼
           [Supabase / DuckDB Telemetry Core] (80-Band Continuous Vector Matrix)
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

### 2. Telemetry Client (`forge_client.py`)
- Standard client interface for querying the 80-band acoustic telemetry matrix from cloud/local storage.
- Zero-leak credential parsing via environment variables.

---

## Quickstart & Environment Setup

1. Copy the example configuration:
   ```bash
   cp .env.example .env
   ```
2. Populate `.env` with your private credentials. **Never commit `.env` or raw keys.**
3. Query telemetry programmatically:
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
├── forge_client.py               # Enterprise Supabase/telemetry reader client
├── .env.example                  # Sanitized environment template (no secrets)
├── .gitignore                    # Enterprise gitignore rules
├── LICENSE.md                    # Business Source License (BSL 1.1)
└── README.md                     # Master architecture documentation
```

---

## Licensing
This project is licensed under the **Business Source License 1.1 (BSL 1.1)**. See [LICENSE.md](LICENSE.md) for full terms and conditions.