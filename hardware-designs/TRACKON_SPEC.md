RMAA TrackOn — Hardware & Architecture Specification
Document ID: SPEC-RMAA-001
Classification: Proprietary / Engineering Blueprint
Target Platform: KiCad 8.x / Custom ASIC / RISC-V RTL / Supabase Backend
Author / Entity: Ali CNC / RMAA Tech

1. Executive Summary & Product Objective
RMAA TrackOn is a 10×10 mm ultra-low-profile, flexible electronic tracking tag. It natively integrates with Apple "Find My" and Google "Find My Device" networks, charges via 13.56 MHz resonant magnetic flux, and interfaces with a backend subscription platform featuring sanitized law-enforcement export links.

2. Electrical & Silicon Architecture
2.1 Silicon Layer (Custom Bare-Die ASIC)
 * Compute Core: Custom in-house RV32EC RISC-V digital core synthesized for ultra-low static power.
 * eFuse Security: One-Time-Programmable (OTP) eFuse block for permanently burning NIST P-224 elliptic curve root keys.
 * Transceiver: Integrated 2.4 GHz RF front-end supporting BLE 5.x FMN payloads.
 * Power Management Unit (PMU): Strict voltage cutoff monitoring for Lithium pouch (2.7V UVLO, 4.2V max charge).

2.2 PCB & Substrate Specifications (KiCad Stackup)
 * Form Factor: 10.0 mm diameter circular or 10.0 × 10.0 mm square.
 * Total Assembly Profile: \le 0.55\ \text{mm}.
 * Layer Count: 2-Layer Flexible Printed Circuit (FPC) Polyimide (25 µm).

2.3 Resonant Magnetic Harvesting (13.56 MHz)
 * Inductive Coil Design: Outer-perimeter planar Archimedean spiral.
 * Storage Cell: Thin-film Lithium Pouch (Highest capacity, longer offline tracking).

3. Firmware & Protocol Structure
3.1 Find My Network (FMN) Payload
 * Payload structure strictly conforms to Apple/Google rotating cryptographic standards.
 * Key Rotation: NIST P-224 Elliptic Curve Public Key rotates every 15 minutes.
 * Anti-stalking compliance baked into the firmware.

4. Software Stack & Infrastructure
 * Cloud Backend: Next.js 15 frontend, Supabase / PostgreSQL database.
 * Police Live Link: Sanitized tracking portal stripping user PII.
