import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Moon, Settings, Sun } from "lucide-react";

import { GlassToggleButton } from "@/components/ui/buttons";
import { GlassNoise } from "@/components/ui/shared/glass-noise";
import { cn } from "@/lib/utils";

export type DockToggleItem = {
  label: string;
  icon: LucideIcon;
  onClick?: () => void;
  isActive?: boolean;
};

export type DockToggleProps = {
  items?: DockToggleItem[];
  className?: string;
  buttonClassName?: string;
};

const defaultItems: DockToggleItem[] = [
  { label: "Light", icon: Sun },
  { label: "Dark", icon: Moon },
  { label: "Settings", icon: Settings },
];

export const Component = ({ items = defaultItems, className, buttonClassName }: DockToggleProps) => {
  const resolvedItems = items.length ? items : defaultItems;
  
  // Check if justify-between or justify-evenly is in className (for equal spacing)
  const hasJustifyClass = className?.includes('justify-between') || className?.includes('justify-evenly') || className?.includes('justify-around');
  const shouldSpaceEvenly = hasJustifyClass;

  return (
    <div
      className={cn(
        "relative inline-flex overflow-hidden rounded-lg",
        // Double border trick for crisp Apple look
        "border border-white/20 ring-1 ring-black/5",
        "dark:border-white/10 dark:ring-white/5",
        // Enhanced glass effect with progressive blur
        "bg-white/10 dark:bg-black/20",
        "backdrop-blur-xl",
        // Enhanced shadow for depth
        "shadow-[0_8px_32px_0_rgba(31,38,135,0.37)]",
        "dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.5)]",
        "transition-all duration-500",
        shouldSpaceEvenly && "flex",
        className,
      )}
    >
      {/* Noise texture overlay for tactility */}
      <GlassNoise />
      {resolvedItems.map((item, index) => {
        const Icon = item.icon;
        const isFirst = index === 0;
        const isLast = index === resolvedItems.length - 1;

        return (
          <GlassToggleButton
            key={item.label}
            label={item.label}
            icon={Icon}
            onClick={item.onClick}
            isActive={item.isActive}
            rounded={shouldSpaceEvenly ? "none" : (isFirst ? "left" : isLast ? "right" : "none")}
            withDivider={!shouldSpaceEvenly && !isLast}
            className={cn(shouldSpaceEvenly ? "flex-1" : undefined, buttonClassName)}
          />
        );
      })}
    </div>
  );
};

