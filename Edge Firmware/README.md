# Edge Firmware - Bare-Metal DSP & Autonomous Acoustic Sentinel

## Overview
This directory contains the production-grade, bare-metal C++ firmware designed for the **ESP32-S3 (Dual-Core Xtensa LX7 @ 240 MHz + PIE Vector Instructions)**. It operates air-gapped on the physical CNC spindle, executing high-speed digital signal processing (DSP) to detect tool deflection, chatter, and catastrophic breakage in under **15 milliseconds**.

## Hardware & Architecture Highlights
- **I2S Direct Memory Access (DMA):** Continuous 48 kHz / 24-bit audio stream ingestion via zero-copy ping-pong ring buffers on Core 0.
- **Hardware-Accelerated Real FFT:** Radix-2 Real FFT (`dsps_fft2r_fc32`) with Blackman-Harris windowing executed on Core 1.
- **Physics-Informed 80-Band Partitioning:**
  - **Kinematic & Unbalance Zone (1 Hz - 500 Hz):** 10 linear bins (49.9 Hz/bin) monitoring spindle runout, pulley wear, and bearing defects.
  - **Chatter & Breakage Zone (500 Hz - 20,000 Hz):** 70 linear bins (278.57 Hz/bin) capturing regenerative chatter squeal and ultrasonic fracture harmonics.
- **Microsecond Optocoupler E-Stop:** Direct GPIO hardware trip firing an optocoupler open-collector circuit in `< 15ms` to trigger CNC feed hold or emergency stop before bit snap.
- **Cryptographic 7-Day Lease:** Ed25519 signature verification (`lease.sig`) enforcing air-gapped hardware licensing and monotonic anti-tamper runtime tracking.

## Source Manifest
- `esp_dsp_firmware.cpp`: Core DSP pipeline, DMA buffer management, 80-band accumulator loop, and Ed25519 signature validation logic.
