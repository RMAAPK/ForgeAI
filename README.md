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
