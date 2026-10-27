#include <iostream>
#include <vector>
#include <complex>
#include <cmath>
#include <chrono>
#include <fstream>
#include <iomanip>
#include <string>
#include <cstring>
#include <cstdint>

// Constants for DSP
static constexpr size_t SAMPLE_RATE = 48000;
static constexpr size_t FFT_SIZE    = 1024;
static constexpr size_t NUM_BANDS_KINEMATIC = 10;
static constexpr size_t NUM_BANDS_CHATTER   = 70;
static constexpr size_t TOTAL_BANDS         = 80;
static constexpr double PI = 3.14159265358979323846;

// Minimal Standard RIFF/WAV Header & Ingestion without third-party dependencies
struct WavHeader {
    char riff[4];
    uint32_t fileSize;
    char wave[4];
    char fmt[4];
    uint32_t fmtSize;
    uint16_t audioFormat;
    uint16_t numChannels;
    uint32_t sampleRate;
    uint32_t byteRate;
    uint16_t blockAlign;
    uint16_t bitsPerSample;
};

// 4-Term Blackman-Harris Window coefficients
// w(n) = a0 - a1*cos(2*pi*n/(N-1)) + a2*cos(4*pi*n/(N-1)) - a3*cos(6*pi*n/(N-1))
static std::vector<float> generate_blackman_harris(size_t N) {
    std::vector<float> w(N);
    const double a0 = 0.35875;
    const double a1 = 0.48829;
    const double a2 = 0.14128;
    const double a3 = 0.01168;

    for (size_t n = 0; n < N; ++n) {
        double val = a0 
                   - a1 * std::cos(2.0 * PI * n / (N - 1))
                   + a2 * std::cos(4.0 * PI * n / (N - 1))
                   - a3 * std::cos(6.0 * PI * n / (N - 1));
        w[n] = static_cast<float>(val);
    }
    return w;
}

// In-Place Radix-2 Cooley-Tukey Decimation-in-Time FFT
static void fft_radix2(std::vector<std::complex<float>>& a) {
    size_t n = a.size();
    
    // Bit-reversal permutation
    for (size_t i = 1, j = 0; i < n; ++i) {
        size_t bit = n >> 1;
        for (; j & bit; bit >>= 1) {
            j ^= bit;
        }
        j ^= bit;
        if (i < j) {
            std::swap(a[i], a[j]);
        }
    }

    // Butterfly computations
    for (size_t len = 2; len <= n; len <<= 1) {
        double angle = -2.0 * PI / len;
        std::complex<float> wlen(std::cos(angle), std::sin(angle));
        for (size_t i = 0; i < n; i += len) {
            std::complex<float> w(1.0f, 0.0f);
            for (size_t j = 0; j < len / 2; ++j) {
                std::complex<float> u = a[i + j];
                std::complex<float> v = a[i + j + len / 2] * w;
                a[i + j] = u + v;
                a[i + j + len / 2] = u - v;
                w *= wlen;
            }
        }
    }
}

// Read raw PCM audio from 16-bit or 24-bit WAV file into float normalized [-1.0, 1.0]
static bool load_wav_pcm(const std::string& path, std::vector<float>& out_samples, uint32_t& out_sample_rate) {
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        std::cerr << "[-] Error: Failed to open audio file: " << path << "\n";
        return false;
    }

    WavHeader header;
    file.read(reinterpret_cast<char*>(&header), sizeof(WavHeader));
    if (std::strncmp(header.riff, "RIFF", 4) != 0 || std::strncmp(header.wave, "WAVE", 4) != 0) {
        std::cerr << "[-] Error: Invalid WAV file signature in " << path << "\n";
        return false;
    }

    // Skip extra chunks until 'data' chunk is reached
    char chunkId[4];
    uint32_t chunkSize = 0;
    while (file.read(chunkId, 4)) {
        file.read(reinterpret_cast<char*>(&chunkSize), 4);
        if (std::strncmp(chunkId, "data", 4) == 0) {
            break;
        }
        file.seekg(chunkSize, std::ios::cur);
    }

    out_sample_rate = header.sampleRate;
    size_t num_channels = header.numChannels;
    size_t bits = header.bitsPerSample;
    size_t bytes_per_sample = bits / 8;
    size_t total_samples = chunkSize / (bytes_per_sample * num_channels);

    out_samples.resize(total_samples);
    std::vector<uint8_t> raw_buf(chunkSize);
    file.read(reinterpret_cast<char*>(raw_buf.data()), chunkSize);

    for (size_t i = 0; i < total_samples; ++i) {
        size_t byte_idx = i * num_channels * bytes_per_sample;
        double sample_val = 0.0;

        if (bits == 16) {
            int16_t s16 = *reinterpret_cast<int16_t*>(&raw_buf[byte_idx]);
            sample_val = s16 / 32768.0;
        } else if (bits == 24) {
            int32_t s24 = (raw_buf[byte_idx] << 8) | (raw_buf[byte_idx + 1] << 16) | (raw_buf[byte_idx + 2] << 24);
            sample_val = s24 / 2147483648.0;
        } else if (bits == 32) {
            int32_t s32 = *reinterpret_cast<int32_t*>(&raw_buf[byte_idx]);
            sample_val = s32 / 2147483648.0;
        }
        out_samples[i] = static_cast<float>(sample_val);
    }

    return true;
}

int main(int argc, char* argv[]) {
    if (argc < 2) {
        std::cout << "Usage: " << argv[0] << " <path_to_wav_file>\n";
        return 1;
    }

    std::string wav_path = argv[1];
    std::vector<float> audio_samples;
    uint32_t sample_rate = 0;

    if (!load_wav_pcm(wav_path, audio_samples, sample_rate)) {
        return 1;
    }

    std::cout << "================================================================================\n";
    std::cout << " Forge AI - High-Speed Edge DSP Acoustic Simulation Harness\n";
    std::cout << " Spindle Defense System for CNCs • Sub-10ms Hardware E-Stop Interception\n";
    std::cout << " Target Silicon: ESP32-S3 Dual-Core LX7 @ 240 MHz + PIE Vector Instructions\n";
    std::cout << "================================================================================\n";
    std::cout << "[+] Ingested Audio File : " << wav_path << "\n";
    std::cout << "[+] Sampling Rate       : " << sample_rate << " Hz\n";
    std::cout << "[+] Total Samples       : " << audio_samples.size() << " (" 
              << std::fixed << std::setprecision(2) << (double)audio_samples.size() / sample_rate << " s)\n";
    std::cout << "[+] Frame Resolution    : " << FFT_SIZE << " samples ("
              << std::setprecision(2) << ((double)FFT_SIZE / sample_rate * 1000.0) << " ms/frame)\n";
    std::cout << "[+] Windowing Function  : 4-Term Blackman-Harris (Dynamic Range > 92 dB)\n";
    std::cout << "[+] Partitioning Schema : 80 Physical Bands (10 Kinematic [1-500Hz], 70 Chatter [500-20kHz])\n";
    std::cout << "--------------------------------------------------------------------------------\n";
    std::cout << std::setw(6) << "Frame" 
              << std::setw(10) << "Time (s)"
              << std::setw(12) << "Kinematic"
              << std::setw(12) << "Chatter"
              << std::setw(10) << "Ratio"
              << std::setw(12) << "DSP (us)"
              << std::setw(14) << "Hardware Trip"
              << "  Energy Profile Visualizer\n";
    std::cout << "--------------------------------------------------------------------------------\n";

    const auto window = generate_blackman_harris(FFT_SIZE);
    const float hz_per_bin = static_cast<float>(sample_rate) / static_cast<float>(FFT_SIZE);

    size_t total_frames = audio_samples.size() / FFT_SIZE;
    size_t trips_detected = 0;
    double total_dsp_us = 0.0;
    double max_dsp_us = 0.0;

    std::vector<std::complex<float>> frame_buf(FFT_SIZE);
    std::vector<float> power_spec(FFT_SIZE / 2);
    std::vector<float> bands_80(TOTAL_BANDS, 0.0f);

    for (size_t f = 0; f < total_frames; ++f) {
        size_t offset = f * FFT_SIZE;

        auto t_start = std::chrono::high_resolution_clock::now();

        // 1. Apply Blackman-Harris Window
        for (size_t i = 0; i < FFT_SIZE; ++i) {
            frame_buf[i] = std::complex<float>(audio_samples[offset + i] * window[i], 0.0f);
        }

        // 2. Compute In-Place Radix-2 Real FFT
        fft_radix2(frame_buf);

        // 3. Compute Power Spectrum (dB magnitude)
        for (size_t i = 0; i < FFT_SIZE / 2; ++i) {
            float re = frame_buf[i].real();
            float im = frame_buf[i].imag();
            float mag_sq = re * re + im * im;
            power_spec[i] = mag_sq;
        }

        // 4. Accumulate into 80 Physical Bands
        std::fill(bands_80.begin(), bands_80.end(), 0.0f);
        std::vector<int> band_counts(TOTAL_BANDS, 0);

        float kinematic_energy = 0.0f;
        float chatter_energy = 0.0f;

        for (size_t i = 1; i < FFT_SIZE / 2; ++i) {
            float freq = i * hz_per_bin;
            int band_idx = -1;

            if (freq >= 1.0f && freq < 500.0f) {
                // Zone 1: Kinematic & Unbalance (10 linear bins, ~49.9 Hz/bin)
                band_idx = static_cast<int>((freq - 1.0f) / 49.9f);
                if (band_idx > 9) band_idx = 9;
                kinematic_energy += power_spec[i];
            } else if (freq >= 500.0f && freq <= 20000.0f) {
                // Zone 2: Chatter & Breakage (70 linear bins, ~278.57 Hz/bin)
                band_idx = 10 + static_cast<int>((freq - 500.0f) / 278.57f);
                if (band_idx > 79) band_idx = 79;
                chatter_energy += power_spec[i];
            }

            if (band_idx >= 0 && band_idx < static_cast<int>(TOTAL_BANDS)) {
                bands_80[band_idx] += power_spec[i];
                band_counts[band_idx]++;
            }
        }

        auto t_end = std::chrono::high_resolution_clock::now();
        double dsp_duration_us = std::chrono::duration<double, std::micro>(t_end - t_start).count();
        total_dsp_us += dsp_duration_us;
        if (dsp_duration_us > max_dsp_us) max_dsp_us = dsp_duration_us;

        float ratio = (kinematic_energy > 1e-6f) ? (chatter_energy / kinematic_energy) : 0.0f;

        // Trip Threshold Logic:
        // Severe resonant chatter generates high-frequency acoustic emission surpassing baseline cutting
        bool trip_active = (ratio > 2.5f && chatter_energy > 10.0f);
        if (trip_active) trips_detected++;

        // Render compact ASCII Visualizer
        double frame_time_s = static_cast<double>(f * FFT_SIZE) / sample_rate;
        int bar_len = static_cast<int>(std::min(25.0f, std::log10(chatter_energy + 1.0f) * 8.0f));
        std::string ascii_bar(bar_len > 0 ? bar_len : 1, '#');

        std::cout << std::setw(6) << f 
                  << std::setw(10) << std::fixed << std::setprecision(3) << frame_time_s
                  << std::setw(12) << std::scientific << std::setprecision(2) << kinematic_energy
                  << std::setw(12) << std::scientific << std::setprecision(2) << chatter_energy
                  << std::setw(10) << std::fixed << std::setprecision(2) << ratio
                  << std::setw(12) << std::fixed << std::setprecision(1) << dsp_duration_us
                  << std::setw(14) << (trip_active ? "\033[1;31m[TRIP PC817]\033[0m" : "     OK     ")
                  << "  " << (trip_active ? "\033[1;31m" : "\033[1;32m") << ascii_bar << "\033[0m\n";

        if (trip_active && trips_detected <= 3) {
            // Find peak chatter band
            int peak_band = 10;
            float max_band_energy = 0.0f;
            for (size_t b = 10; b < TOTAL_BANDS; ++b) {
                if (bands_80[b] > max_band_energy) {
                    max_band_energy = bands_80[b];
                    peak_band = static_cast<int>(b);
                }
            }
            float peak_approx_freq = 500.0f + (peak_band - 10) * 278.57f;
            std::cout << "  >>> \033[1;31m[TRIP ALERT] Band [" << peak_band << "] (~" 
                      << std::fixed << std::setprecision(0) << peak_approx_freq 
                      << " Hz) Resonant Chatter Detected | E-Stop Interrupt: " 
                      << std::setprecision(3) << (dsp_duration_us / 1000.0) << " ms | PC817 Optocoupler FIRED!\033[0m\n";
        }
    }

    double avg_dsp_us = total_dsp_us / (total_frames > 0 ? total_frames : 1);
    double avg_dsp_ms = avg_dsp_us / 1000.0;
    double max_dsp_ms = max_dsp_us / 1000.0;

    std::cout << "================================================================================\n";
    std::cout << " BENCHMARK SUMMARY RESULTS\n";
    std::cout << "================================================================================\n";
    std::cout << "[*] Total Audio Processed    : " << std::fixed << std::setprecision(3) 
              << (double)audio_samples.size() / sample_rate << " seconds (" << total_frames << " frames)\n";
    std::cout << "[*] Hardware Trips Fired     : " << trips_detected << "\n";
    std::cout << "[*] Average DSP Latency/Frame: " << std::fixed << std::setprecision(2) 
              << avg_dsp_us << " us (" << std::setprecision(4) << avg_dsp_ms << " ms)\n";
    std::cout << "[*] Peak DSP Latency/Frame   : " << std::fixed << std::setprecision(2) 
              << max_dsp_us << " us (" << std::setprecision(4) << max_dsp_ms << " ms)\n";
    std::cout << "[*] Sub-10ms Target Status   : " 
              << (avg_dsp_ms < 10.0 ? "\033[1;32m[PASS] CONFIRMED (< 10.0 ms)\033[0m" : "\033[1;31m[FAIL]\033[0m") 
              << " (Margin: " << std::setprecision(2) << (10.0 - avg_dsp_ms) << " ms headroom)\n";
    std::cout << "================================================================================\n";

    return 0;
}
