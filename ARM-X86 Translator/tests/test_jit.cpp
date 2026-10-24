#include "translator.hpp"
#include <iostream>
#include <sys/mman.h>
#include <cstring>
#include <cassert>

using namespace ForgeAI::Translator;

int main() {
    std::cout << "=== ForgeAI ARM-to-x86 JIT Translator Test ===" << std::endl;

    TranslationEngine engine;
    ARM64CpuContext ctx;
    std::memset(&ctx, 0, sizeof(ctx));

    // Initial State: X1 = 100
    ctx.x[1] = 100;
    std::cout << "[Init] Guest ARM X1 = " << ctx.x[1] << ", X0 = " << ctx.x[0] << std::endl;

    // ARM64 Instruction 1: ADD X0, X1, #42
    // Encoded: 0x9100A820
    uint32_t arm_inst1 = 0x9100A820;

    // ARM64 Instruction 2: ADD X0, X0, #8
    // Encoded: 0x91002000
    uint32_t arm_inst2 = 0x91002000;

    // ARM64 Instruction 3: RET
    // Encoded: 0xD65F03C0
    uint32_t arm_ret = 0xD65F03C0;

    std::vector<IRInstruction> ir_ops;
    engine.DecodeARM64(arm_inst1, 0x1000, ir_ops);
    engine.DecodeARM64(arm_inst2, 0x1004, ir_ops);
    engine.DecodeARM64(arm_ret,   0x1008, ir_ops);

    std::cout << "[Decode] Decoded " << ir_ops.size() << " IR micro-operations." << std::endl;

    // JIT compile IR into executable x86-64 machine code
    std::vector<uint8_t> x86_bytes = engine.JITCompileX86(ir_ops);
    std::cout << "[JIT] Emitted " << x86_bytes.size() << " native x86 bytes: ";
    for (uint8_t b : x86_bytes) {
        printf("%02X ", b);
    }
    printf("\n");

    // Allocate executable memory page (PROT_READ | PROT_WRITE | PROT_EXEC)
    void* exec_mem = mmap(nullptr, 4096, PROT_READ | PROT_WRITE | PROT_EXEC, MAP_ANONYMOUS | MAP_PRIVATE, -1, 0);
    assert(exec_mem != MAP_FAILED);
    std::memcpy(exec_mem, x86_bytes.data(), x86_bytes.size());

    BasicBlock bb;
    bb.guest_pc_start = 0x1000;
    bb.guest_pc_end = 0x100C;
    bb.host_native_code = exec_mem;
    bb.host_code_size = x86_bytes.size();

    std::cout << "[Exec] Executing native x86 machine code directly on CPU..." << std::endl;
    engine.ExecuteBlock(bb, &ctx);

    std::cout << "[Result] Guest ARM X0 = " << ctx.x[0] << " (Expected: 150)" << std::endl;
    assert(ctx.x[0] == 150);
    std::cout << ">>> SUCCESS: Native JIT Translation Verified 100%! <<<" << std::endl;

    munmap(exec_mem, 4096);
    return 0;
}
