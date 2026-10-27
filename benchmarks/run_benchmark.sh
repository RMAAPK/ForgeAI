#!/usr/bin/env bash
set -e

# ==============================================================================
# Forge AI - High-Speed Edge DSP Benchmark & Verification Runner
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$REPO_ROOT"

echo "================================================================================"
echo " Building & Executing Forge AI DSP Acoustic Benchmark Suite"
echo "================================================================================"

# 1. Compile Audio Waveform Generator and Simulation Harness
echo "[1/4] Compiling synthetic audio generator and DSP simulation harness with -O3..."
g++ -O3 -std=c++17 benchmarks/gen_test_audio.cpp -o benchmarks/gen_test_audio
g++ -O3 -std=c++17 benchmarks/bench_dsp.cpp -o benchmarks/bench_dsp

# 2. Synthesize 48 kHz / 24-bit PCM Waveforms
echo "[2/4] Synthesizing 48 kHz acoustic waveforms (spindle baseline & 3.4 kHz chatter)..."
./benchmarks/gen_test_audio

# 3. Execute Baseline Cut Test
echo "[3/4] Running Baseline Spindle Cut Verification (expecting 0 false trips)..."
./benchmarks/bench_dsp benchmarks/normal_spindle_cut.wav > benchmarks/baseline_run.log
TRIPS_BASELINE=$(grep "Hardware Trips Fired" benchmarks/baseline_run.log | awk '{print $NF}')
echo "      -> Baseline Hardware Trips: $TRIPS_BASELINE (Expected: 0)"

# 4. Execute Severe Resonant Chatter Failure Test
echo "[4/4] Running Resonant Chatter Failure Test & Generating Benchmark Log..."
./benchmarks/bench_dsp benchmarks/severe_chatter_cut.wav | sed 's/\x1b\[[0-9;]*m//g' > benchmarks/desktop_dsp_benchmark_linux.txt

TRIPS_CHATTER=$(grep "Hardware Trips Fired" benchmarks/desktop_dsp_benchmark_linux.txt | awk '{print $NF}')
AVG_LATENCY=$(grep "Average DSP Latency/Frame" benchmarks/desktop_dsp_benchmark_linux.txt | awk '{print $4, $5}')
STATUS=$(grep "Sub-10ms Target Status" benchmarks/desktop_dsp_benchmark_linux.txt | awk '{print $4, $5}')

echo "--------------------------------------------------------------------------------"
echo " Verification Complete!"
echo " [*] Baseline Trips        : $TRIPS_BASELINE"
echo " [*] Chatter Trips         : $TRIPS_CHATTER"
echo " [*] Average Latency/Frame : $AVG_LATENCY"
echo " [*] Benchmark Target      : $STATUS"
echo " [*] Benchmark Output Saved: benchmarks/desktop_dsp_benchmark_linux.txt"
echo "================================================================================"

# Cleanup transient binaries
rm -f benchmarks/gen_test_audio benchmarks/bench_dsp benchmarks/baseline_run.log

