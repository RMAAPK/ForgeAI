/*
 * RMAA TrackOn ASIC - Thin-Film Lithium PMU
 * Language: Verilog 2001
 *
 * Description:
 * Power Management Unit enforcing strict voltage cutoffs 
 * for the 0.2mm thin-film lithium pouch.
 */

module pmu_lithium_monitor (
    input wire clk,
    input wire rst_n,
    input wire [11:0] vbat_adc,    // 12-bit ADC reading of VBat
    output reg sys_power_en,       // Enables core VDD
    output reg charge_en           // Enables 13.56MHz coil charging path
);

    // ADC Thresholds (Assuming 1 LSB = 1mV)
    parameter UVLO_THRESH   = 12'd2700; // 2.700V (Under-Voltage Lockout)
    parameter RECOV_THRESH  = 12'd3000; // 3.000V (Recovery Voltage)
    parameter FULL_THRESH   = 12'd4200; // 4.200V (Max Charge Voltage)

    reg [1:0] state;
    parameter STATE_DEAD    = 2'b00;
    parameter STATE_ACTIVE  = 2'b01;

    always @(posedge clk or negedge rst_n) begin
        if (!rst_n) begin
            state <= STATE_DEAD;
            sys_power_en <= 1'b0;
            charge_en <= 1'b1;
        end else begin
            // Charging Logic (Hysteresis)
            if (vbat_adc >= FULL_THRESH)
                charge_en <= 1'b0; // Stop charging, battery full
            else if (vbat_adc < RECOV_THRESH)
                charge_en <= 1'b1; // Resume charging

            // Discharge / System Power Logic
            case (state)
                STATE_DEAD: begin
                    sys_power_en <= 1'b0;
                    if (vbat_adc >= RECOV_THRESH)
                        state <= STATE_ACTIVE;
                end
                STATE_ACTIVE: begin
                    sys_power_en <= 1'b1;
                    if (vbat_adc <= UVLO_THRESH)
                        state <= STATE_DEAD; // Emergency cut-off to save pouch
                end
            endcase
        end
    end

endmodule
