#include "translator.hpp"
#include <iostream>
#include <cstring>
#include <sys/mman.h>

namespace ForgeAI {
namespace Translator {

TranslationEngine::TranslationEngine() {}
TranslationEngine::~TranslationEngine() {}

// Fast ARM64 instruction decoder
bool TranslationEngine::DecodeARM64(uint32_t inst, uint64_t pc, std::vector<IRInstruction>& out_ir) {
    // Check ADD (shifted register) / ADD (immediate)
    // Format: 1001 0001 xx imm12 Rn Rd (ADD 64-bit imm)
    if ((inst & 0xFF800000) == 0x91000000) {
        uint8_t rd = inst & 0x1F;
        uint8_t rn = (inst >> 5) & 0x1F;
        uint16_t imm12 = (inst >> 10) & 0xFFF;
        uint8_t shift = (inst >> 22) & 0x3;
        int64_t val = (shift == 1) ? (imm12 << 12) : imm12;

        out_ir.push_back({IROp::LOAD_REG, 0, rn, 0, 0, 0});
        out_ir.push_back({IROp::ADD, 0, 0, 0, val, 0});
        out_ir.push_back({IROp::STORE_REG, rd, 0, 0, 0, 0});
        return true;
    }

    // SUB (64-bit immediate)
    // Format: 1101 0001 xx imm12 Rn Rd
    if ((inst & 0xFF800000) == 0xD1000000) {
        uint8_t rd = inst & 0x1F;
        uint8_t rn = (inst >> 5) & 0x1F;
        uint16_t imm12 = (inst >> 10) & 0xFFF;
        uint8_t shift = (inst >> 22) & 0x3;
        int64_t val = (shift == 1) ? (imm12 << 12) : imm12;

        out_ir.push_back({IROp::LOAD_REG, 0, rn, 0, 0, 0});
        out_ir.push_back({IROp::SUB, 0, 0, 0, val, 0});
        out_ir.push_back({IROp::STORE_REG, rd, 0, 0, 0, 0});
        return true;
    }

    // RET (Unconditional branch to register X30)
    // 1101 0110 0101 1111 0000 00 Rn 00000 (0xD65F0000)
    if ((inst & 0xFFFFFC1F) == 0xD65F0000) {
        out_ir.push_back({IROp::JUMP_INDIRECT, 0, 30, 0, 0, 0});
        return true;
    }

    // NOP
    if (inst == 0xD503201F) {
        out_ir.push_back({IROp::NOP, 0, 0, 0, 0, 0});
        return true;
    }

    return false;
}

// JIT Compiles IR directly into native x86-64 machine code
std::vector<uint8_t> TranslationEngine::JITCompileX86(const std::vector<IRInstruction>& ir_ops) {
    std::vector<uint8_t> code;

    // Host ABI: RDI points to ARM64CpuContext
    // We use RAX as scratch register (virtual register 0)
    for (const auto& ir : ir_ops) {
        switch (ir.op) {
            case IROp::LOAD_REG: {
                // mov rax, [rdi + rn * 8]
                uint32_t offset = ir.src1 * 8;
                code.push_back(0x48); // REX.W
                code.push_back(0x8B); // MOV r64, r/m64
                if (offset < 128) {
                    code.push_back(0x47); // ModR/M: disp8(rdi)
                    code.push_back(static_cast<uint8_t>(offset));
                } else {
                    code.push_back(0x87); // ModR/M: disp32(rdi)
                    for (int i = 0; i < 4; ++i) code.push_back((offset >> (i * 8)) & 0xFF);
                }
                break;
            }
            case IROp::STORE_REG: {
                // mov [rdi + rd * 8], rax
                uint32_t offset = ir.dst * 8;
                code.push_back(0x48);
                code.push_back(0x89);
                if (offset < 128) {
                    code.push_back(0x47);
                    code.push_back(static_cast<uint8_t>(offset));
                } else {
                    code.push_back(0x87);
                    for (int i = 0; i < 4; ++i) code.push_back((offset >> (i * 8)) & 0xFF);
                }
                break;
            }
            case IROp::ADD: {
                // add rax, imm32
                code.push_back(0x48);
                code.push_back(0x05); // ADD RAX, imm32
                int32_t imm32 = static_cast<int32_t>(ir.imm);
                for (int i = 0; i < 4; ++i) code.push_back((imm32 >> (i * 8)) & 0xFF);
                break;
            }
            case IROp::SUB: {
                // sub rax, imm32
                code.push_back(0x48);
                code.push_back(0x2D); // SUB RAX, imm32
                int32_t imm32 = static_cast<int32_t>(ir.imm);
                for (int i = 0; i < 4; ++i) code.push_back((imm32 >> (i * 8)) & 0xFF);
                break;
            }
            case IROp::JUMP_INDIRECT:
            case IROp::NOP:
            default:
                break;
        }
    }

    // Emit x86 RET (0xC3)
    code.push_back(0xC3);
    return code;
}

void TranslationEngine::ExecuteBlock(const BasicBlock& block, ARM64CpuContext* ctx) {
    if (!block.host_native_code) return;
    typedef void (*JITFunc)(ARM64CpuContext*);
    JITFunc fn = reinterpret_cast<JITFunc>(block.host_native_code);
    fn(ctx);
}

} // namespace Translator
} // namespace ForgeAI
