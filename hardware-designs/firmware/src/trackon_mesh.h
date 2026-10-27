/**
 * RMAA TrackOn - Ultra-Thin Sticker / Wallet-Card BLE Mesh Architecture
 * Target: RV32EC Bare-Die ASIC (≤ 0.55 mm total package)
 * Standard: Pure BLE Advertising & Bluetooth Mesh Flooding (No GPS, No SIM, No Cellular)
 */

#ifndef RMAA_TRACKON_BLE_MESH_H
#define RMAA_TRACKON_BLE_MESH_H

#include <stdint.h>
#include <stdbool.h>

#pragma pack(push, 1)

/**
 * 1. AirTag / Find My Network Compatible Broadcast Frame
 * Broadcasted during standard beacon mode for crowd-sourced phone location.
 */
typedef struct {
    uint8_t  flags_len;             // 0x02
    uint8_t  flags_type;            // 0x01
    uint8_t  flags_val;             // 0x1A (LE General Discoverable)
    uint8_t  mfg_len;               // 0x1E (30 bytes payload)
    uint8_t  mfg_type;              // 0xFF
    uint16_t company_id;            // 0x004C (Apple) or 0x00E0 (Google)
    uint8_t  type_code;             // 0x12 (FMN Accessory Tag)
    uint8_t  length_field;          // 0x19
    uint8_t  rotating_pub_key[28];  // Rotating P-224 Elliptic Curve Key (Changes every 15 mins)
    uint8_t  status_byte;           // Battery Level & Motion Bitmask
} trackon_fmn_frame_t;

/**
 * 2. Pure Bluetooth Mesh Network PDU (Managed Flooding)
 * Allows TrackOn stickers/cards to form an offline, self-healing database.
 * No internet, no SIM, no Wi-Fi required.
 */
typedef struct {
    uint8_t  ivi_nid;               // Initialization Vector Index (1 bit) + Network ID (7 bits)
    uint8_t  ctl_ttl;               // Control Bit (1 bit) + Time-To-Live (7 bits, typically 7 hops)
    uint32_t seq_num : 24;          // Monotonic sequence number (Replay attack defense)
    uint16_t src_addr;              // Source Mesh Unicast Address (TrackOn sticker ID)
    uint16_t dst_addr;              // Destination Group Address (e.g. 0xC000 for Tooling Group)
    uint8_t  transport_pdu[16];     // Encrypted payload (AppKey + NetKey encrypted)
    uint32_t net_mic;               // Network Message Integrity Check (32-bit AES-CCM)
} trackon_mesh_pdu_t;

/**
 * 3. TrackOn Low-Power Node (LPN) State Storage
 * Stored in ASIC on-chip SRAM / OTP eFuse to survive power cycles.
 */
typedef struct {
    uint16_t unicast_address;       // Mesh network assigned address
    uint32_t sequence_number;       // Current replay sequence counter
    uint8_t  device_key[16];        // 128-bit AES Device Key (eFuse burnt)
    uint8_t  network_key[16];       // 128-bit AES Network Key
    uint8_t  app_key[16];           // 128-bit AES Application Key
    uint16_t friend_address;        // Address of nearby mains-powered relay (e.g. CNC ESP32)
    uint32_t last_sync_epoch;       // Timestamp of last successful mesh poll
} trackon_mesh_state_t;

#pragma pack(pop)

// API Functions for RV32EC RISC-V Bare-Die Core
void trackon_mesh_init(trackon_mesh_state_t* state);
void trackon_mesh_build_pdu(const trackon_mesh_state_t* state, uint16_t group_dst, const uint8_t* payload, uint8_t len, trackon_mesh_pdu_t* out_pdu);
void trackon_mesh_sleep_poll(trackon_mesh_state_t* state);

#endif // RMAA_TRACKON_BLE_MESH_H

