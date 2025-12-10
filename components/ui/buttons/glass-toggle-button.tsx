"use client";

import * as React from "react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export interface GlassToggleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  icon: LucideIcon;
  isActive?: boolean;
  rounded?: "left" | "right" | "none";
  withDivider?: boolean;
}

const GlassToggleButton = React.forwardRef<HTMLButtonElement, GlassToggleButtonProps>(
  ({ label, icon: Icon, isActive, rounded = "none", withDivider = false, className, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        aria-label={label}
        aria-pressed={isActive}
        className={cn(
          "relative z-10 group flex items-center gap-2 px-4 py-2 text-sm font-medium text-black transition-colors duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 dark:text-white",
          "bg-transparent hover:bg-black/10 dark:hover:bg-white/10",
          rounded === "left" && "rounded-l-lg",
          rounded === "right" && "rounded-r-lg",
          withDivider && "border-r border-white/20 dark:border-white/10",
          isActive && "bg-black/15 text-black dark:bg-white/10 dark:text-white",
          className,
        )}
        {...props}
      >
        <Icon aria-hidden="true" className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
        <span className="select-none">{label}</span>
      </button>
    );
  },
);

GlassToggleButton.displayName = "GlassToggleButton";

export { GlassToggleButton };

