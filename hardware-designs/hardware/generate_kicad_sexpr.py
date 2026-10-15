import math

def generate_pcb():
    cx, cy = 100.0, 100.0
    
    lines = [
        '(kicad_pcb (version 20240108) (generator "pcbnew")',
        '  (general (thickness 0.025))',
        '  (paper "A4")',
        '  (layers',
        '    (0 "F.Cu" signal)',
        '    (31 "B.Cu" signal)',
        '    (37 "F.SilkS" user)',
        '    (44 "Edge.Cuts" user)',
        '  )',
        '  (setup (stackup (layer "F.Cu" (type "copper") (thickness 0.018))))',
        f'  (gr_circle (center {cx} {cy}) (end {cx} {cy+5.0}) (stroke (width 0.05) (type solid)) (layer "Edge.Cuts"))',
        f'  (gr_text "RMAA ASIC\\nBARE DIE" (at {cx} {cy}) (layer "F.SilkS") (effects (font (size 0.6 0.6) (thickness 0.1))))'
    ]
    
    # Coil math: 5 turns, 75um trace, 150um pitch
    turns = 5
    trace_w = 0.075
    pitch = 0.150
    outer_r = 4.5
    inner_r = outer_r - (turns * pitch)
    steps = 64
    
    last_x, last_y = None, None
    for i in range(turns * steps + 1):
        angle = (i / steps) * 2 * math.pi
        cr = inner_r + (pitch * (i / steps))
        x = cx + cr * math.cos(angle)
        y = cy + cr * math.sin(angle)
        
        if last_x is not None:
            # Native KiCad S-expression for a track segment
            lines.append(f'  (segment (start {last_x:.5f} {last_y:.5f}) (end {x:.5f} {y:.5f}) (width {trace_w}) (layer "F.Cu"))')
            
        last_x, last_y = x, y
        
    lines.append(')')
    
    with open('c:/Ali CNC/Work Area/RMAA AI/TrackOn/hardware/TrackOn.kicad_pcb', 'w') as f:
        f.write('\n'.join(lines))
        
    print("Successfully compiled raw KiCad S-Expressions to TrackOn.kicad_pcb!")

if __name__ == "__main__":
    generate_pcb()
