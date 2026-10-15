/**
 * RMAA TrackOn - Find My Network (FMN) BLE Payload Structures
 * Target: RV32EC RISC-V Bare-Die Core
 */

#ifndef RMAA_BLE_ADV_H
#define RMAA_BLE_ADV_H

#include <stdint.h>

#pragma pack(push, 1)

/**
 * Full BLE Advertising Frame for Apple Find My Network
 * Broadcasting rotating P-224 Public Keys.
 */
typedef struct {
    // Flags (LE General Discoverable)
    uint8_t flags_len;            // 0x02
    uint8_t flags_type;           // 0x01
    uint8_t flags_val;            // 0x1A

    // Manufacturer Specific Data
    uint8_t  mfg_len;             // Length (varies, typ 30)
    uint8_t  mfg_type;            // 0xFF
    uint16_t company_id;          // Apple (0x004C) or Google (Fast Pair)
    uint8_t  type_code;           // FMN Accessory Type
    uint8_t  length_field;        // Length of public key + status
    uint8_t  rotating_pub_key[28]; // P-224 Elliptic Curve Key (224 bits)
    uint8_t  status_byte;         // Battery Level & State
} fmn_beacon_frame_t;

#pragma pack(pop)

void fmn_derive_rotating_key(uint32_t epoch_seconds, uint8_t* out_pub_key_28bytes);
void fmn_construct_payload(fmn_beacon_frame_t* frame, uint32_t current_epoch);

#endif // RMAA_BLE_ADV_H
