# ENGINEERING RELEASE • REV 1.0 — FORGE AI — HARDWARE PROTOTYPE
### Complete Bill of Materials (BOM) & Bench Assembly Technical Specifications
**Author:** Ali CNC Engineering • **Project:** ForgeAI Spindle Defense System for CNCs  
**Target Silicon:** ESP32-S3 (Dual-Core Xtensa LX7 @ 240 MHz) • **Response Latency:** < 2.0 ms (Edge E-Stop)  
**Estimated Local Market Total:** Rs. 3,000 – 3,400 PKR (~$10–12 USD) • **Licensed under:** BSL 1.1 • Rawalpindi, Pakistan  
**Original Engineering PDF:** [`hardware/FORGE_AI_HARDWARE_PROTOTYPE_REV1.0.pdf`](FORGE_AI_HARDWARE_PROTOTYPE_REV1.0.pdf)

---

## 1. Executive Summary & System Overview

The **Forge AI Hardware Prototype** is an industrial edge acoustic monitoring instrument designed to detect high-frequency micro-chatter, spindle bearing wear, and cutting tool fracture on CNC milling spindles before catastrophic breakage occurs.

Audio is ingested at 48 kHz (24-bit Mono) via an omnidirectional digital MEMS microphone over an I2S DMA bus, transformed into an 80-band acoustic vector using hardware-accelerated Radix-2 Real FFT, and evaluated against safety heuristics. A tripped anomaly triggers an optically isolated solid-state E-Stop circuit within **< 2.0 milliseconds** (total system interception guaranteed **< 10 ms**).

---

## 2. Official Bill of Materials (BOM) — Procurement Checklist

Itemized checklist for component distributors (College Road / Electronic Market):

| # | Component Name | Technical Specification | Qty | Function / Role |
|---|---|---|---|---|
| **1** | **ESP32-S3 DevKit Board** | ESP32-S3-WROOM-1 / N16R8 (16MB Flash, 8MB Octal PSRAM, Dual Type-C) | 1 pc | Main Edge Processor • Runs 48 kHz I2S DMA + 2048-pt hardware FFT |
| **2** | **INMP441 MEMS Microphone** | Omnidirectional Digital I2S Module (High SNR 61 dBA, Bottom-ported, 24-bit) | 1 pc | Direct acoustic ingestion from CNC spindle chassis |
| **3** | **PC817 Optocoupler Breakout** | PC817 1-Channel / 2-Channel Module (Screw terminals, 5kV galvanic isolation) | 1 pc | Galvanically isolated E-Stop trigger • Protects CNC controller |
| **4** | **Prototyping Breadboard** | MB-102 Full Size (830 Tie-Points) *(Do not purchase mini 400-point board)* | 1 pc | Provides sufficient clearance on both sides of wide ESP32-S3 |
| **5** | **Dupont Jumper Wires (M-F)** | Male-to-Female Ribbon Cable (20cm) | 1 pack (40 pcs) | Module pin headers to breadboard interconnects |
| **6** | **Dupont Jumper Wires (M-M)** | Male-to-Male Ribbon Cable (20cm) | 1 pack (40 pcs) | Breadboard rail jumpers and circuit interconnects |
| **7** | **Visual Trip Indicator LEDs** | 5mm High-Brightness Diffused Red LEDs | 5 pcs | Visual E-Stop trip confirmation on test bench |
| **8** | **Current-Limiting Resistors** | 220Ω or 330Ω Metal Film (1/4 Watt, 5%) | 5 pcs | Limits LED & optocoupler diode forward current |
| **9** | **Isolated Test Power Supply** | 9V Heavy Duty Battery + 9V Snap Connector Clip | 1 set | Powers the fully isolated secondary side of the E-Stop loop |
| **10** | **USB Data & Flashing Cable** | USB Type-A to Type-C (or Type-C to C, Must support Data/Sync) | 1 pc | Firmware flashing, serial console telemetry, and 5V power |

**Estimated Local Market Total:** **Rs. 3,000 – 3,400 PKR**

---

## 3. Electrical Pinout & Wiring Schematic

### A. INMP441 Microphone → ESP32-S3 Wiring
> [!CAUTION]
> **CRITICAL VOLTAGE NOTICE:** Connect INMP441 VDD strictly to the **3.3V** pin of the ESP32-S3. Connecting VDD to 5V will permanently destroy the MEMS sensor.

| INMP441 Pin | ESP32-S3 Pin | Signal Type | Firmware Role |
|---|---|---|---|
| **VDD** | `3.3V` | Power Supply | 3.3V Regulated Rail |
| **GND** | `GND` | Ground Reference | Common System Ground |
| **SD (Serial Data)** | `GPIO 4` | Digital Input | I2S Direct Memory Access (DMA) Ingestion |
| **SCK (Bit Clock)** | `GPIO 2` | Digital Clock | I2S Serial Clock (BCLK) |
| **WS (Word Select)** | `GPIO 3` | Digital Sync | I2S Frame / Left-Right Clock (LRCK) |
| **L/R** | `GND` | Channel Select | Tied to GND for Left Channel (Mono Mode) |

---

### B. PC817 Optocoupler & Isolated E-Stop Trip Circuit

The optocoupler ensures physical galvanic isolation between the microcontroller and the CNC emergency stop circuit.

| Optocoupler Pin | Connection Point | Description / Circuit Function |
|---|---|---|
| **Pin 1 (Anode)** | `GPIO 5` (via 330Ω resistor) | MCU Logic HIGH triggers internal infrared transmitter diode |
| **Pin 2 (Cathode)** | `ESP32 GND` | Completes primary low-voltage circuit |
| **Pin 4 (Collector)**| `+9V` (Red Lead of 9V Battery) | High-side isolated voltage supply |
| **Pin 3 (Emitter)**  | `LED Anode (+)` → `330Ω` → `9V GND (-)` | When tripped, current conducts from 9V battery through the Red LED to ground |

> **CIRCUIT BEHAVIOR VERIFICATION:**  
> Under normal spindle operation, `GPIO 5` remains LOW (0V). When chatter harmonics exceed safety envelopes, the ESP-DSP firmware pulls `GPIO 5` HIGH (3.3V). The phototransistor saturates within **< 2.0 ms**, illuminating the Red LED and opening/closing the CNC E-Stop / Feed-Hold contact.

---

## 4. Step-by-Step Bench Assembly Instructions

1. **Mount ESP32-S3**: Insert the ESP32-S3 dev board across the center divider of the MB-102 breadboard so row pins on both sides remain accessible.
2. **Wire INMP441**: Connect `GND` and `3.3V` first. Connect `SCK` → `GPIO 2`, `WS` → `GPIO 3`, and `SD` → `GPIO 4`. Ensure `L/R` pin is firmly strapped to `GND`.
3. **Wire Optocoupler Primary**: Connect ESP32 `GPIO 5` in series with a 330Ω resistor to PC817 Pin 1 (Anode). Connect Pin 2 (Cathode) to ESP32 `GND`.
4. **Wire Optocoupler Secondary**: Connect the 9V battery red lead (+) to PC817 Pin 4 (Collector). Connect PC817 Pin 3 (Emitter) to the Red LED long leg (Anode). Connect the short leg (Cathode) through a 330Ω resistor back to the black lead (-) of the 9V battery.
5. **Firmware Flash**: Connect USB-C data cable from PC to the ESP32-S3 USB / COM port. Compile and flash `esp_dsp_firmware.cpp` using ESP-IDF v5.x.
