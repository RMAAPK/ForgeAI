#include <iostream>
#include <fstream>
#include <vector>
#include <cmath>
#include <cstdint>
#include <random>

static constexpr size_t SAMPLE_RATE = 48000;
static constexpr double PI = 3.14159265358979323846;

struct WavHeader {
    char riff[4] = {'R', 'I', 'F', 'F'};
    uint32_t fileSize = 0;
    char wave[4] = {'W', 'A', 'V', 'E'};
    char fmt[4] = {'f', 'm', 't', ' '};
    uint32_t fmtSize = 16;
    uint16_t audioFormat = 1; // PCM
    uint16_t numChannels = 1; // Mono
    uint32_t sampleRate = SAMPLE_RATE;
    uint32_t byteRate = SAMPLE_RATE * 2; // 16-bit mono
    uint16_t blockAlign = 2;
    uint16_t bitsPerSample = 16;
    char data[4] = {'d', 'a', 't', 'a'};
    uint32_t dataSize = 0;
};

void generate_wav(const std::string& path, double duration_s, double primary_freq, double chatter_freq, double chatter_amp) {
    size_t total_samples = static_cast<size_t>(duration_s * SAMPLE_RATE);
    std::vector<int16_t> pcm_data(total_samples);

    std::mt19937 rng(42);
    std::normal_distribution<double> noise_dist(0.0, 0.05);

    for (size_t i = 0; i < total_samples; ++i) {
        double t = static_cast<double>(i) / SAMPLE_RATE;

        // Kinematic rotational baseline (e.g. 200 Hz spindle fundamental + 400 Hz harmonic)
        double signal = 0.40 * std::sin(2.0 * PI * primary_freq * t)
                      + 0.15 * std::sin(2.0 * PI * (primary_freq * 2.0) * t);

        // High-frequency regenerative chatter burst or squeal (e.g. 3,400 Hz)
        if (chatter_amp > 0.0) {
            // Apply gradual chatter buildup after 0.5s to model resonant onset
            double ramp = (t > 0.5) ? std::min(1.0, (t - 0.5) * 2.5) : 0.0;
            signal += chatter_amp * ramp * std::sin(2.0 * PI * chatter_freq * t);
            // Add tooth-passing sidebands (+- 150 Hz)
            signal += (chatter_amp * 0.3) * ramp * std::sin(2.0 * PI * (chatter_freq + 150.0) * t);
        }

        // Add acoustic background noise
        signal += noise_dist(rng);

        // Clip
        if (signal > 1.0) signal = 1.0;
        if (signal < -1.0) signal = -1.0;

        pcm_data[i] = static_cast<int16_t>(signal * 32767.0);
    }

    WavHeader header;
    header.dataSize = static_cast<uint32_t>(pcm_data.size() * sizeof(int16_t));
    header.fileSize = 36 + header.dataSize;

    std::ofstream out(path, std::ios::binary);
    out.write(reinterpret_cast<const char*>(&header), sizeof(WavHeader));
    out.write(reinterpret_cast<const char*>(pcm_data.data()), header.dataSize);
    std::cout << "[+] Generated: " << path << " (" << duration_s << "s, " << total_samples << " samples)\n";
}

int main() {
    std::cout << "[*] Generating Synthetic 48 kHz Acoustic Waveforms...\n";
    // 1. Normal Cut: 200 Hz spindle fundamental, no chatter
    generate_wav("benchmarks/normal_spindle_cut.wav", 3.0, 200.0, 0.0, 0.0);

    // 2. Severe Chatter Cut: 200 Hz spindle fundamental + strong 3,400 Hz resonant chatter
    generate_wav("benchmarks/severe_chatter_cut.wav", 3.0, 200.0, 3400.0, 0.75);

    return 0;
}

