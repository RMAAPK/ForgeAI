import math
import pcbnew

def generate_spiral_coil(board, center_x, center_y, turns, trace_width, gap, layer):
    """
    Generates a planar Archimedean spiral coil for KiCad pcbnew.
    Designed for 13.56 MHz resonant magnetic harvesting.
    """
    # TrackOn Spec: 75 um trace, 75 um gap
    width_iu = pcbnew.FromMM(trace_width)
    pitch_iu = pcbnew.FromMM(trace_width + gap)
    
    # Outer radius constraint (10x10mm board -> ~4.5mm outer coil radius)
    outer_r = pcbnew.FromMM(4.5)
    
    # Calculate starting inner radius based on turns and pitch
    inner_r = outer_r - (turns * pitch_iu)
    
    steps_per_turn = 64
    total_steps = turns * steps_per_turn
    
    last_pt = None
    
    for i in range(total_steps + 1):
        angle = (i / steps_per_turn) * 2 * math.pi
        current_r = inner_r + (pitch_iu * (i / steps_per_turn))
        
        x = center_x + current_r * math.cos(angle)
        y = center_y + current_r * math.sin(angle)
        
        pt = pcbnew.wxPoint(int(x), int(y))
        
        if last_pt is not None:
            track = pcbnew.PCB_TRACK(board)
            track.SetStart(last_pt)
            track.SetEnd(pt)
            track.SetWidth(width_iu)
            track.SetLayer(layer)
            board.Add(track)
            
        last_pt = pt

if __name__ == "__main__":
    # To run this inside KiCad's scripting console:
    # exec(open("generate_coil.py").read())
    board = pcbnew.GetBoard()
    
    # Place at coordinates (100mm, 100mm) just for generation
    center_x = pcbnew.FromMM(100)
    center_y = pcbnew.FromMM(100)
    
    # Spec: 5 turns, 75um trace, 75um gap, Layer 1 (Top Copper)
    generate_spiral_coil(board, center_x, center_y, turns=5, trace_width=0.075, gap=0.075, layer=pcbnew.F_Cu)
    
    pcbnew.Refresh()
    print("13.56 MHz Spiral Coil generated successfully.")
