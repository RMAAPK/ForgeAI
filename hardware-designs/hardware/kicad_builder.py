import pcbnew
import math

def build_trackon_board():
    """
    Automated KiCad 8 Layout Script for RMAA TrackOn
    Run this in the KiCad PCB Editor Python Console:
    exec(open("c:/Ali CNC/Work Area/RMAA AI/TrackOn/hardware/kicad_builder.py").read())
    """
    board = pcbnew.GetBoard()
    
    # Set center coordinates to (100mm, 100mm)
    cx = pcbnew.FromMM(100)
    cy = pcbnew.FromMM(100)
    
    # 1. Draw Edge Cuts (10.0mm diameter circular flex PCB)
    edge = pcbnew.PCB_SHAPE(board)
    edge.SetShape(pcbnew.SHAPE_T_CIRCLE)
    edge.SetCenter(pcbnew.wxPoint(cx, cy))
    edge.SetStart(pcbnew.wxPoint(cx, cy + pcbnew.FromMM(5.0))) # 5mm radius
    edge.SetLayer(pcbnew.Edge_Cuts)
    edge.SetWidth(pcbnew.FromMM(0.05))
    board.Add(edge)
    
    # 2. Draw 13.56 MHz Planar Spiral Coil (F_Cu Layer)
    turns = 5
    trace_w = pcbnew.FromMM(0.075) # 75um trace
    pitch = pcbnew.FromMM(0.150)   # 75um trace + 75um gap
    outer_r = pcbnew.FromMM(4.5)   # 0.5mm clearance from edge
    inner_r = outer_r - (turns * pitch)
    
    steps = 64
    last_pt = None
    for i in range(turns * steps + 1):
        angle = (i / steps) * 2 * math.pi
        cr = inner_r + (pitch * (i / steps))
        
        x = cx + cr * math.cos(angle)
        y = cy + cr * math.sin(angle)
        pt = pcbnew.wxPoint(int(x), int(y))
        
        if last_pt is not None:
            track = pcbnew.PCB_TRACK(board)
            track.SetStart(last_pt)
            track.SetEnd(pt)
            track.SetWidth(trace_w)
            track.SetLayer(pcbnew.F_Cu)
            board.Add(track)
            
        last_pt = pt

    # 3. Add ASIC Placemarker (Silkscreen)
    text = pcbnew.PCB_TEXT(board)
    text.SetText("RMAA ASIC\nBARE DIE")
    text.SetPosition(pcbnew.wxPoint(cx, cy))
    text.SetTextSize(pcbnew.wxSize(pcbnew.FromMM(0.6), pcbnew.FromMM(0.6)))
    text.SetTextThickness(pcbnew.FromMM(0.1))
    text.SetLayer(pcbnew.F_SilkS)
    board.Add(text)

    pcbnew.Refresh()
    print("TrackOn 10mm Circular Board & Coil successfully generated!")

if __name__ == "__main__":
    build_trackon_board()
