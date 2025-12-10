"use client";

import React from "react";
import { cn } from "@/lib/utils";

/**
 * GlassNoise - Adds a subtle noise texture overlay to glass elements
 * Creates that frosted glass tactility effect using CSS noise pattern
 */
export function GlassNoise({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "absolute inset-0 pointer-events-none overflow-hidden rounded-inherit",
        className
      )}
      aria-hidden="true"
      style={{
        backgroundImage: `
          repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px),
          repeating-linear-gradient(90deg, rgba(0,0,0,0.03) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.03) 3px),
          repeating-linear-gradient(45deg, rgba(0,0,0,0.02) 0px, transparent 1px, transparent 2px, rgba(0,0,0,0.02) 3px)
        `,
        backgroundSize: "4px 4px, 4px 4px, 3px 3px",
        opacity: 0.4,
        mixBlendMode: "overlay",
      }}
    />
  );
}

