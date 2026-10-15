/*
 * RMAA TrackOn ASIC - OTP eFuse Controller
 * Language: Verilog 2001
 * 
 * Description: 
 * Manages the One-Time-Programmable memory containing the 
 * NIST P-224 Elliptic Curve private root key for Find My Network integration.
 * Prevents readout via JTAG/Debug once the LOCK bit is set.
 */

module efuse_controller (
    input wire clk,
    input wire rst_n,
    input wire read_en,
    input wire [7:0] addr,
    output reg [31:0] data_out,
    output reg ready
);

    // Simulated 256-bit eFuse array (8 words x 32 bits)
    // [0:6] = P-224 Private Key (224 bits)
    // [7]   = Configuration & Lock Bits (Bit 31: LOCK)
    reg [31:0] efuse_array [0:7];

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            data_out <= 32'h0;
            ready <= 1'b0;
        end else if (read_en) begin
            // Security Check: If locked, only internal crypto accelerator can read,
            // standard APB/debug bus reads are masked to 0.
            if (efuse_array[7][31] == 1'b1 /* Locked */) begin
                data_out <= 32'h00000000; 
            end else begin
                data_out <= efuse_array[addr[2:0]];
            end
            ready <= 1'b1;
        end else begin
            ready <= 1'b0;
        end
    end

endmodule
