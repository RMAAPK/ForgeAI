/**
 * RMAA TrackOn - Find My Network (FMN) Cryptography Stub
 * Target: RV32EC RISC-V Custom ASIC
 * 
 * Handles the generation of the rotating P-224 Elliptic Curve Public Key
 * payload required by Apple and Google tracking networks.
 */

#include "ble_adv.h"
#include <string.h>

// Simulated hardware crypto accelerator register addresses
#define HW_CRYPTO_BASE 0x40020000
#define HW_CRYPTO_CMD  (*(volatile uint32_t*)(HW_CRYPTO_BASE + 0x00))
#define HW_CRYPTO_STAT (*(volatile uint32_t*)(HW_CRYPTO_BASE + 0x04))

/**
 * Derives the current rotating P-224 public key based on the 
 * root key burned into the OTP eFuse and the current epoch timestamp.
 * In a real FMN device, this happens every 15 minutes.
 */
void fmn_derive_rotating_key(uint32_t epoch_seconds, uint8_t* out_pub_key_28bytes) {
    // 1. Write epoch to hardware crypto block
    // 2. Trigger derivation using eFuse root key
    HW_CRYPTO_CMD = 0x01; // START_DERIVATION
    
    while((HW_CRYPTO_STAT & 0x01) == 0) {
        // Wait for derivation to complete (WFI - Wait for Interrupt to save power)
        __asm__ volatile ("wfi");
    }

    // 3. Read derived 28-byte (224-bit) public key from memory mapped buffer
    // (Mocked for this pre-product build)
    const uint8_t mock_key[28] = {
        0x04, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
        0x88, 0x99, 0xAA, 0xBB, 0xCC, 0xDD, 0xEE, 0xFF,
        0x00, 0x11, 0x22, 0x33, 0x44, 0x55, 0x66, 0x77,
        0x88, 0x99, 0xAA, 0xBB
    };
    memcpy(out_pub_key_28bytes, mock_key, 28);
}

/**
 * Constructs the BLE Advertising payload conforming to FMN specs.
 */
void fmn_construct_payload(fmn_beacon_frame_t* frame, uint32_t current_epoch) {
    frame->flags_len = 0x02;
    frame->flags_type = 0x01;
    frame->flags_val = 0x1A; // FMN requires specific flags

    frame->mfg_len = 0x1E; // 30 bytes
    frame->mfg_type = 0xFF;
    frame->company_id = 0x004C; // Apple Inc. for Find My Network

    // Derive and inject the rotated public key
    fmn_derive_rotating_key(current_epoch, frame->rotating_pub_key);
    
    // Add primary status byte (Battery status + capabilities)
    frame->status_byte = 0x00; // e.g., 0x00 = Battery OK
}
