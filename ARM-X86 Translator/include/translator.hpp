#pragma once
#include <cstdint>
#include <vector>
#include <string>
#include <memory>
#include <unordered_map>

namespace ForgeAI {
namespace Translator {

// Standard ARM64 General Purpose Registers (X0 - X30, SP, PC)
struct alignas(64) ARM64CpuContext {
    uint64_t x[31];       // X0 - X30
    uint64_t sp;          // Stack Pointer
    uint64_t pc;          // Program Counter
    uint32_t pstate;      // NZCV Flags (N=bit 31, Z=bit 30, C=bit 29, V=bit 28)
    uint8_t  v[32][16];   // 32 x 128-bit NEON/SIMD Vector Registers
};

// Intermediate Representation (IR) Opcode
enum class IROp : uint8_t {
    NOP = 0,
    LOAD_REG,     // Load ARM register into virtual register
    STORE_REG,    // Store virtual register into ARM register
    ADD,
    SUB,
    MUL,
    AND,
    ORR,
    EOR,
    LSL,
    LSR,
    ASR,
    LOAD_MEM,
    STORE_MEM,
    BARRIER_TSO,  // Memory fence (TSO emulation)
    CMP,
    JUMP_COND,
    JUMP_DIRECT,
    JUMP_INDIRECT
};

struct IRInstruction {
    IROp op;
    uint8_t dst;
    uint8_t src1;
    uint8_t src2;
    int64_t imm;
    uint32_t flags;
};

struct BasicBlock {
    uint64_t guest_pc_start;
    uint64_t guest_pc_end;
    std::vector<IRInstruction> ir_ops;
    void* host_native_code;
    size_t host_code_size;
};

class TranslationEngine {
public:
    TranslationEngine();
    ~TranslationEngine();

    // Disassembles ARM64 32-bit machine word into IR
    bool DecodeARM64(uint32_t raw_inst, uint64_t pc, std::vector<IRInstruction>& out_ir);

    // Emits optimized x86-64 machine code bytes from IR
    std::vector<uint8_t> JITCompileX86(const std::vector<IRInstruction>& ir_ops);

    // Executes a basic block directly on the host x86 CPU
    void ExecuteBlock(const BasicBlock& block, ARM64CpuContext* ctx);

private:
    std::unordered_map<uint64_t, BasicBlock> block_cache_;
};

} // namespace Translator
} // namespace ForgeAI
