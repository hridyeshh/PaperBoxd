"use client";

import * as React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

export interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  showIdleAccent?: boolean;
  invert?: boolean;
  hideIcon?: boolean;
  accentColor?: string; // Custom accent color (e.g., "bg-red-500", "bg-amber-700", "bg-olive-600")
  hoverTextClass?: string; // Custom class for hover overlay text color
}

const InteractiveHoverButton = React.forwardRef<HTMLButtonElement, InteractiveHoverButtonProps>(
  ({ text = "Button", className, showIdleAccent = true, invert = false, hideIcon = false, accentColor = "bg-primary", hoverTextClass, ...props }, ref) => {
    // Check if accentColor is a hex color (starts with #)
    const isHexColor = accentColor?.startsWith("#") ?? false;
    
    // Extract background color classes and convert to hover variants
    const getHoverBgClasses = (color: string) => {
      if (!color || isHexColor) return "";
      // Convert "bg-foreground dark:bg-white" to "group-hover:bg-foreground dark:group-hover:bg-white"
      return color
        .split(" ")
        .map((cls) => {
          if (cls.startsWith("bg-")) {
            return `group-hover:${cls}`;
          } else if (cls.startsWith("dark:bg-")) {
            return cls.replace("dark:bg-", "dark:group-hover:bg-");
          }
          return cls;
        })
        .join(" ");
    };
    
    const hoverBgClasses = getHoverBgClasses(accentColor);
    
    const accentBaseClasses = isHexColor
      ? "absolute transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:opacity-100 z-0"
      : cn(
          "absolute transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:opacity-100 z-0",
          hoverBgClasses
        );
    const accentIdleClasses = showIdleAccent
      ? isHexColor
        ? "left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg"
        : cn("left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg", accentColor)
      : "left-[20%] top-[40%] h-2 w-2 scale-0 rounded-lg bg-transparent opacity-0";
    
    const accentStyle = isHexColor
      ? { 
          backgroundColor: showIdleAccent ? accentColor : "transparent",
          "--accent-color": accentColor 
        } as React.CSSProperties & { "--accent-color"?: string }
      : undefined;
    const hoverTextClasses = hoverTextClass ?? (invert ? "text-background dark:text-zinc-950" : "text-primary-foreground");
    const hoverContentGap = hideIcon ? "gap-0" : "gap-2";

    return (
      <button
        ref={ref}
        className={cn(
          "group relative w-32 cursor-pointer overflow-hidden rounded-full border p-2 text-center font-semibold transition-colors",
          invert
            ? "border-foreground/40 bg-foreground text-background dark:border-white/60 dark:bg-white dark:text-zinc-950"
            : "border-border bg-background text-foreground",
          className,
        )}
        style={isHexColor ? { "--accent-color": accentColor } as React.CSSProperties & { "--accent-color"?: string } : undefined}
        {...props}
      >
        <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
          {text}
        </span>
        <div
          className={cn(
            "absolute top-0 z-10 flex h-full w-full translate-x-10 items-center justify-center opacity-0 transition-all duration-300 group-hover:translate-x-0 group-hover:opacity-100",
            hoverTextClasses,
            hoverContentGap,
          )}
        >
          <span>{text}</span>
          {!hideIcon && <ArrowRight className="h-4 w-4" />}
        </div>
        {isHexColor ? (
          <div 
            className={cn(accentBaseClasses, accentIdleClasses)} 
            style={accentStyle}
            onMouseEnter={(e) => {
              if (isHexColor) {
                e.currentTarget.style.backgroundColor = accentColor;
              }
            }}
          />
        ) : (
          <div 
            className={cn(accentBaseClasses, accentIdleClasses)}
          />
        )}
      </button>
    );
  },
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };

