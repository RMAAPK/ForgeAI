> [!IMPORTANT]
> **Proprietary Notice & Institutional Attribution**
> **Forge AI** is an intellectual property and flagship industrial execution product of **RMAA HOLDINGS**. All rights reserved.

> [!CAUTION]
> **Advisory & Experimental Disclaimer for Evaluators and Investors**
> This repository is maintained as an active research and development workspace. Modules within this codebase undergo rapid iteration and autonomous synthesis. Portions of the codebase are experimental and subject to ongoing validation and physical bench testing. Evaluators, partners, and investors should review system claims against the hardware validation logs in `/benchmarks` and official entity certifications in `/credentials`.

---

# Forge AI (v0-beta): Edge Acoustic Spindle Defense & Hardware Sentinel
### Pure Bare-Metal DSP Silicon • 80-Band Frequency Partitioning • Microsecond Optical E-Stop
Maintained by **RMAA HOLDINGS** • Licensed under **BSL 1.1**

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE.md)
[![Platform: ESP32-S3](https://img.shields.io/badge/Platform-ESP32--S3-red.svg)](Edge%20Firmware/)
[![Architecture: Bare--Metal DSP](https://img.shields.io/badge/Architecture-Bare--Metal%20DSP-emerald.svg)](Edge%20Firmware/)
[![Release: v0-beta](https://img.shields.io/badge/Release-v0--beta-orange.svg)]()
[![Backend: Supabase](https://img.shields.io/badge/Backend-Supabase%20Postgres-3ECF8E.svg)](hardware-designs/backend/supabase/)

Forge AI is an industrial-grade bare-metal edge hardware sentinel designed for high-speed CNC spindle protection, acoustic load classification, and deterministic tool breakage defense. 

Operating directly on edge silicon (ESP32-S3 @ 240 MHz with hardware vector extensions), it continuously samples spindle micro-acoustics at 48 kHz / 24-bit, executes Radix-2 Real FFTs, partitions the spectrum into 80 physical frequency bands, and trips an optical PC817 feed hold circuit in **under 15 milliseconds** upon detecting severe chatter resonance or imminent tool deflection.

---

## 🏛️ System Architecture

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                    PHYSICAL HARDWARE & SENSOR LAYER                    │
 │                                                                        │
 │  [Spindle Micro-Acoustics & Vibration]     [Tool / Part / Spindle]    │
 │             │ (I2S DMA 48 kHz / 24-bit)                 │              │
 │             ▼                                           ▼              │
 │   [ESP32-S3 Dual-Core DSP Engine]              [Hardware Interception] │
 │      ├── Core 0: Zero-Copy Ping-Pong DMA          ├── PC817 Optocoupler │
 │      └── Core 1: Radix-2 Real FFT (80 Bins)       └── < 15ms Feed Hold │
 │             │                                                          │
 │             ├──► Hardware Feed Hold Interrupt (GPIO E-Stop)            │
 │             └──► USB Serial / Private Sync Telemetry                   │
 └────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      ▼
 ┌────────────────────────────────────────────────────────────────────────┐
 │                   PRIVATE SUPABASE STORAGE & POSTGRES                  │
 │                                                                        │
 │  • edge_devices: Registered ESP32-S3 hardware MAC / eFuse IDs          │
 │  • acoustic_telemetry: 80-band partitioned acoustic energy arrays      │
 │  • incident_autopsies: Instant snapshot logs on optical E-stop trip    │
 └────────────────────────────────────────────────────────────────────────┘
```

---

## 🔬 80-Band Physics-Informed Frequency Partitioning

Raw audio ingested via I2S DMA is windowed with Blackman-Harris and transformed via `dsps_fft2r_fc32`. The resulting power spectrum is accumulated into **80 discrete energy bands**:

1. **Kinematic & Unbalance Zone (1 Hz – 500 Hz):**
   - **10 linear bins** (~49.9 Hz per bin).
   - Monitors fundamental spindle rotational frequency, belt/pulley slip harmonics, runout, and low-frequency bearing race wear.

2. **Chatter & Breakage Zone (500 Hz – 20,000 Hz):**
   - **70 linear bins** (~278.57 Hz per bin).
   - Isolates regenerative chatter squeal, cutter tooth engagement frequencies, micro-chipping acoustic emission, and imminent carbide fracture.

When high-frequency chatter harmonics exceed calibrated energy ratios relative to baseline cutting power, Core 1 drives a dedicated GPIO pin high in **< 15ms**, triggering a PC817 optocoupler to halt machine axis feeds instantly.

---

## 📁 Repository Manifest

- **[`Edge Firmware/`](Edge%20Firmware/):** Bare-metal C++ firmware for the ESP32-S3 running FreeRTOS with hardware-accelerated ESP-DSP routines (`esp_dsp_firmware.cpp`).
- **[`hardware-designs/`](hardware-designs/):** KiCad PCB schematics, flexible substrates, and PMU designs.
- **[`hardware-designs/backend/supabase/`](hardware-designs/backend/supabase/):** Private PostgreSQL migrations for telemetry ingestion, 80-band array storage, and E-stop autopsy logs.
- **[`benchmarks/`](benchmarks/):** Illustrative 80-band telemetry reference datasets.
- **[`credentials/`](credentials/):** Physical CNC machining certifications (TITANS of CNC multi-axis CAD/CAM).

---

## 📊 Benchmark Acoustic Telemetry & Anomaly Profiles (Illustrative Sample)

> [!WARNING]
> **Data Provenance & Non-Verification Disclaimer**
> The telemetry values and anomaly profiles presented in this section and in `/benchmarks` are **unverified illustrative approximations** synthesized from publicly available educational media (such as YouTube machining audio analysis and public shop floor demonstrations). They are included strictly as structural reference samples to demonstrate how the 80-band frequency partitioning schema is formatted, parsed, and ingested by the pipeline. These figures must not be treated as certified sensor ground truth or laboratory calibration data.

Raw acoustic streams are windowed (Blackman-Harris) and compressed into an 80-band normalized energy array (`band_1` to `band_80`), driving deterministic severity scoring and hardware interrupt thresholds.

| ID | Case / Failure Mode | State | Severity | Primary Harmonic Concentration |
|---|---|---|---|---|
| **1** | Spindle Bearing Monitoring | `ANOMALY_RECORDED` | **85.5** | Low-band bearing fatigue (Bands 5–11: >50 dB) |
| **2** | Tool Chatter Elimination | `ANOMALY_RECORDED` | **85.5** | Broad resonant chatter (Bands 6–10: >58 dB) |
| **3** | High-Frequency Taming | `ANOMALY_RECORDED` | **85.5** | High-energy wideband saturation (Bands 1–5: >70 dB) |
| **4** | Harmonic Speed Control | `ANOMALY_RECORDED` | **85.5** | Rotational speed harmonics (Bands 1–3: >64 dB) |
| **5** | Lathe Regenerative Chatter | `ANOMALY_RECORDED` | **85.5** | Mid-band regenerative vibration (Bands 3–10: >65 dB) |
| **6** | Spindle Speed Variation | `ANOMALY_RECORDED` | **85.5** | Variable frequency modulation (Bands 5–9: >56 dB) |

> Complete 80-band raw acoustic telemetry matrix archived in [`/benchmarks/cnc_spindle_telemetry_202610112002.txt`](./benchmarks/cnc_spindle_telemetry_202610112002.txt).

---

## 📜 Licensing
This project is licensed under the **Business Source License 1.1 (BSL 1.1)**. See [LICENSE.md](LICENSE.md) for full terms and conditions.
