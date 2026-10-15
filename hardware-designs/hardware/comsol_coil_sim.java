/*
 * RMAA TrackOn - COMSOL Simple 13.56 MHz Resonance Script
 * Document ID: SPEC-RMAA-001
 * 
 * Description: 
 * This is a simple COMSOL Java API macro to scaffold the 3D physics 
 * environment for the 13.56 MHz resonant magnetic flux charging.
 */

import com.comsol.model.*;
import com.comsol.model.util.*;

public class TrackOnCoilSim {
    public static void main(String[] args) {
        run();
    }

    public static Model run() {
        // Initialize COMSOL Model
        Model model = ModelUtil.create("TrackOn_13_56MHz");
        
        // 1. Setup 3D Geometry
        model.modelNode().create("comp1", true);
        model.geom().create("geom1", 3);
        model.geom("geom1").lengthUnit("mm");
        
        // Create the 25um Polyimide Substrate (10mm diameter)
        model.geom("geom1").feature().create("substrate", "Cylinder");
        model.geom("geom1").feature("substrate").set("r", 5.0);      // 5mm radius
        model.geom("geom1").feature("substrate").set("h", 0.025);    // 25um thickness
        model.geom("geom1").run();
        
        // 2. Setup Physics: AC/DC Magnetic Fields (mf)
        model.physics().create("mf", "MagneticFields", "geom1");
        
        // 3. Setup Study: Frequency Domain (13.56 MHz)
        model.study().create("std1");
        model.study("std1").create("freq", "Frequency");
        model.study("std1").feature("freq").set("plist", "13.56[MHz]");
        
        System.out.println("COMSOL Model successfully scaffolded!");
        System.out.println("- Geometry: 10mm Circular Substrate");
        System.out.println("- Physics: Magnetic Fields");
        System.out.println("- Frequency: 13.56 MHz");
        
        // You can save this to an .mph file natively using:
        // try { model.save("TrackOn_Coil.mph"); } catch(Exception e) {}
        
        return model;
    }
}
