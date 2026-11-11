/**
 * IPL Intelligence OS × Beyond XI
 * 3D Asset Registry & Licensing Manifest
 * 
 * Records 3D procedural geometries, materials, lighting presets, and attribution.
 */

export interface AssetRecord {
  id: string;
  name: string;
  type: "GEOMETRY" | "PROCEDURAL_MATERIAL" | "INSTANCED_MESH" | "AUDIO_SYNTH";
  creator: string;
  license: string;
  description: string;
  sourceUrl?: string;
}

export const ASSET_REGISTRY: AssetRecord[] = [
  {
    id: "stadium-outfield-turf",
    name: "IPL Circular Outfield Turf with Mowing Stripes",
    type: "PROCEDURAL_MATERIAL",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "Multi-layered radial mowing grass shader using WebGL Canvas texture with physically based roughness (0.8) and specular response."
  },
  {
    id: "cricket-pitch-strip",
    name: "Standard 22-Yard Cricket Clay Pitch",
    type: "GEOMETRY",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "Clay pitch geometry (20.12m x 3.05m) with batting/bowling popping crease lines and wear marks."
  },
  {
    id: "stumps-and-bails",
    name: "Regulation Cricket Stumps and Bails",
    type: "GEOMETRY",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "Cylindrical wooden stumps with LED Zing bails illuminated on dismissal triggers."
  },
  {
    id: "stadium-grandstands",
    name: "Tiered Stadium Concrete Grandstands",
    type: "GEOMETRY",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "Three-tier concentric stadium bowl with spectator access ramps and floodlight gantry supports."
  },
  {
    id: "instanced-spectators",
    name: "Low-Poly Instanced Stadium Crowd System",
    type: "INSTANCED_MESH",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "GPU-accelerated InstancedMesh rendering 1,200+ spectators with franchise color palettes and cheering state transitions."
  },
  {
    id: "procedural-audio-synth",
    name: "Web Audio Cricket Synthesizer",
    type: "AUDIO_SYNTH",
    creator: "IPL Intelligence OS Engineering Team",
    license: "MIT License / Proprietary Beyond XI",
    description: "Procedural Web Audio API sound generator for willow contact crack, boundary roar, and crowd applause."
  }
];
