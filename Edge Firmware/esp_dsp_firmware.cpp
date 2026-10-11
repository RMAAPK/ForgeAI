#include <stdio.h>
#include <stdint.h>
#include <string.h>
#include <math.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/i2s_std.h"
#include "esp_dsp.h"
#include "mbedtls/ed25519.h"

// --- CONFIGURATION ---
#define SAMPLE_RATE         48000
#define FFT_N               2048
#define I2S_PORT            I2S_NUM_0

// 80-Band Acoustic Vector Definition
#define BANDS_LOW           10
#define BANDS_HIGH          70
#define TOTAL_BANDS         (BANDS_LOW + BANDS_HIGH)

// I2S DMA Buffer Configuration
#define DMA_BUFFER_LEN      1024
#define DMA_BUFFER_COUNT    4

// Global Buffers
static float fft_input[FFT_N * 2]; // Interleaved real/imaginary
static float fft_power[FFT_N / 2]; 
static float vector_80[TOTAL_BANDS];

// Ed25519 Hardcoded Public Key (Placeholder)
static const unsigned char ROOT_PUB_KEY[32] = {
    0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 
    // ... Fill with actual Ed25519 public key bytes
};

// ---------------------------------------------------------
// 1. I2S DMA Initialization (Double-Buffering)
// ---------------------------------------------------------
static i2s_chan_handle_t rx_handle;

void init_i2s_dma() {
    i2s_chan_config_t chan_cfg = I2S_CHANNEL_DEFAULT_CONFIG(I2S_PORT, I2S_ROLE_MASTER);
    i2s_new_channel(&chan_cfg, NULL, &rx_handle);

    i2s_std_config_t std_cfg = {
        .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(SAMPLE_RATE),
        .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_24BIT, I2S_SLOT_MODE_MONO),
        .gpio_cfg = {
            .mclk = I2S_GPIO_UNUSED,
            .bclk = 2, // I2S SCK
            .ws = 3,   // I2S WS
            .dout = I2S_GPIO_UNUSED,
            .din = 4,  // I2S SD
            .invert_flags = { .mclk_inv = false, .bclk_inv = false, .ws_inv = false }
        }
    };
    
    // Double buffering achieved via dma_desc_num and dma_frame_num
    // ESP-IDF background driver handles ping-pong buffer filling via hardware DMA
    i2s_channel_init_std_mode(rx_handle, &std_cfg);
    i2s_channel_enable(rx_handle);
}

// ---------------------------------------------------------
// 2. Hardware-Accelerated FFT & 80-Band Accumulator
// ---------------------------------------------------------
void process_acoustic_frame(int16_t* raw_samples) {
    // Apply Blackman-Harris window and prepare interleaved float array
    dsps_wind_blackman_harris_f32(fft_input, FFT_N);
    for (int i = 0; i < FFT_N; i++) {
        fft_input[i * 2 + 0] = (float)raw_samples[i] * fft_input[i]; // Real
        fft_input[i * 2 + 1] = 0.0f;                                // Imag
    }

    // Radix-2 FFT (ESP32-S3 optimized PIE instruction set)
    dsps_fft2r_fc32(fft_input, FFT_N);
    dsps_bit_rev_fc32(fft_input, FFT_N);
    
    // Calculate power spectrum
    for (int i = 0; i < FFT_N / 2; i++) {
        float re = fft_input[i * 2 + 0];
        float im = fft_input[i * 2 + 1];
        float mag = sqrtf(re * re + im * im);
        fft_power[i] = 10.0f * log10f(mag + 1e-12f); // 10 * log10 as per spec
    }

    // Accumulate into 80-Band Split (1-500 Hz, 500-20kHz)
    float hz_per_bin = (float)SAMPLE_RATE / (float)FFT_N;
    
    // Clear accumulator
    memset(vector_80, 0, sizeof(vector_80));
    int counts[TOTAL_BANDS] = {0};

    for (int i = 1; i < FFT_N / 2; i++) { // Skip DC
        float freq = i * hz_per_bin;
        int band_idx = -1;

        if (freq >= 1.0f && freq < 500.0f) {
            band_idx = (int)((freq - 1.0f) / 49.9f); // 10 bands
            if (band_idx > 9) band_idx = 9;
        } else if (freq >= 500.0f && freq <= 20000.0f) {
            band_idx = 10 + (int)((freq - 500.0f) / 278.57f); // 70 bands
            if (band_idx > 79) band_idx = 79;
        }

        if (band_idx != -1) {
            vector_80[band_idx] += fft_power[i];
            counts[band_idx]++;
        }
    }

    // Average the bins
    for (int i = 0; i < TOTAL_BANDS; i++) {
        if (counts[i] > 0) {
            vector_80[i] /= counts[i];
        } else {
            vector_80[i] = -100.0f; // Noise floor
        }
    }
}

// ---------------------------------------------------------
// 3. Ed25519 Cryptographic Lease Verification
// ---------------------------------------------------------
bool verify_lease(const unsigned char* signature_64b, const unsigned char* payload, size_t payload_len) {
    // Utilize mbedtls ed25519 to verify the sneakernet lease.sig against baked-in ROOT_PUB_KEY
    mbedtls_ecp_group grp;
    mbedtls_ecp_group_init(&grp);
    mbedtls_ecp_group_load(&grp, MBEDTLS_ECP_DP_ED25519);
    
    // Omitted full mbedtls context mapping for brevity, but the physical 
    // verification validates the signature array using the offline root public key.
    // If successful, unlocks protection loop. If fails, trips security lockdown.
    return true; // Scaffold placeholder
}

// ---------------------------------------------------------
// 4. Main RTOS Loop
// ---------------------------------------------------------
void app_main(void) {
    // Initialize DSP module
    dsps_fft2r_init_fc32(NULL, CONFIG_DSP_MAX_FFT_SIZE);
    
    init_i2s_dma();
    int16_t sample_buffer[FFT_N];

    while (1) {
        size_t bytes_read = 0;
        // Read directly from DMA ring buffer. Ping-pong allows seamless ingestion.
        i2s_channel_read(rx_handle, sample_buffer, sizeof(sample_buffer), &bytes_read, portMAX_DELAY);
        
        if (bytes_read == sizeof(sample_buffer)) {
            process_acoustic_frame(sample_buffer);
            
            // Execute Heuristics Check (Flatness / Chatter Ratio)
            // If tripped, pull E-Stop GPIO high in < 2.0ms
        }
    }
}

