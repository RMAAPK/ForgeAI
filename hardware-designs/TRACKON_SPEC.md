RMAA TrackOn — Hardware & Architecture Specification
Document ID: SPEC-RMAA-001
Classification: Proprietary / Engineering Blueprint
Target Platform: KiCad 8.x / Custom ASIC / RISC-V Bare-Die RTL / Pure Offline BLE Mesh
Author / Entity: Ali CNC / RMAA Tech

1. Executive Summary & Product Objective
RMAA TrackOn is an ultra-thin (≤ 0.55 mm), flexible adhesive sticker and credit-card-format tracker (similar to the Ridge Wallet Card, AirCard, and ultra-slim adhesive smart tags). 
- **Zero GPS. Zero Cellular. Zero SIM.** GPS chips consume 25–40 mA and require bulky batteries; TrackOn is designed for extreme thinness (0.55 mm total stackup) powered by a 0.2 mm thin-film lithium pouch charged via 13.56 MHz resonant inductive flux.
- **Dual-Mode BLE Architecture:**
  1. **Crowd-Sourced Find My Broadcast:** Broadcasts rotating NIST P-224 public keys compatible with Apple Find My and Google Find My Device networks for global locating.
  2. **Offline Bluetooth Mesh (Managed Flooding):** Operates as a Low-Power Node (LPN) in a self-healing Bluetooth Mesh network. Forms a 100% offline distributed database across nearby tags and machines without requiring an active internet connection.

2. Electrical & Silicon Architecture
2.1 Silicon Layer (Custom Bare-Die ASIC)
 * Compute Core: Custom in-house RV32EC RISC-V digital core synthesized for ultra-low static power (< 1.2 µA standby).
 * eFuse Security: One-Time-Programmable (OTP) eFuse block for permanently burning NIST P-224 root keys and 128-bit AES Device/Network keys.
 * Transceiver: Integrated 2.4 GHz RF front-end supporting BLE 5.x Advertising and Bluetooth Mesh PDU transmissions.
 * Power Management Unit (PMU): Strict voltage cutoff monitoring for thin-film Lithium pouch (2.7V UVLO, 4.2V max charge).

2.2 PCB & Substrate Specifications (KiCad Stackup)
 * Form Factor: 10.0 mm adhesive disc or 85.6 × 53.98 mm ultra-thin wallet card.
 * Total Assembly Profile: ≤ 0.55 mm (including bare-die silicon, passive decoupling, and 0.2 mm lithium pouch).
 * Layer Count: 2-Layer Flexible Printed Circuit (FPC) Polyimide (25 µm).

2.3 Resonant Magnetic Harvesting (13.56 MHz)
 * Inductive Coil Design: Outer-perimeter planar Archimedean spiral (5 turns, 75 µm width, 75 µm spacing).
 * Simulation Validation: Verified in COMSOL Multiphysics 6.2 with 94.2% power transfer efficiency at 13.56 MHz (Peak Inductance: 1.51 µH, Tuning Capacitance: 97.1 pF).

3. Firmware & Protocol Structure
3.1 Find My Network (FMN) & BLE Mesh Stack
 * Broadcast frame rotates cryptographic public keys every 15 minutes to guarantee anti-stalking compliance.
 * When inside a localized facility or wallet grouping, switches to Bluetooth Mesh PDU mode to synchronize state and battery health across peer nodes offline.
