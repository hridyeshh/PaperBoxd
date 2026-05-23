"use client";

import { ShaderGradientCanvas, ShaderGradient } from "@shadergradient/react";

// Warm amber-parchment gradient — lamplight on paper.
// Light mode: honey / cream / terracotta.
// Dark mode: identical hues at lower brightness so the warm glow
// still reads as "cozy library" rather than "glaring light".

interface ShaderBackgroundProps {
  variant?: "warm" | "warm-dark";
}

export function ShaderBackground({ variant = "warm" }: ShaderBackgroundProps) {
  const isDark = variant === "warm-dark";

  return (
    <ShaderGradientCanvas
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      pixelDensity={1}
      fov={45}
    >
      <ShaderGradient
        type="plane"
        animate="on"
        uSpeed={0.10}
        uStrength={2.2}
        uDensity={1.4}
        uFrequency={2.0}
        uAmplitude={0}
        color1={isDark ? "#3a1f0a" : "#FBF5DD"}
        color2={isDark ? "#7a3a14" : "#E7E1B1"}
        color3={isDark ? "#c8741a" : "#C85A20"}
        lightType="3d"
        brightness={isDark ? 1.15 : 1.4}
        grain="on"
        grainBlending={0.42}
        cDistance={6}
        cPolarAngle={90}
        cAzimuthAngle={180}
        reflection={0.04}
      />
    </ShaderGradientCanvas>
  );
}
