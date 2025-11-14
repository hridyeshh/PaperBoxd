import * as React from "react";
import type { LucideIcon } from "lucide-react";
import { Moon, Settings, Sun } from "lucide-react";

import { GlassToggleButton } from "@/components/ui/buttons";
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
};

const defaultItems: DockToggleItem[] = [
  { label: "Light", icon: Sun },
  { label: "Dark", icon: Moon },
  { label: "Settings", icon: Settings },
];

export const Component = ({ items = defaultItems, className }: DockToggleProps) => {
  const resolvedItems = items.length ? items : defaultItems;

  return (
    <div
      className={cn(
        "inline-flex overflow-hidden rounded-lg border border-gray-300 bg-white/20 shadow-lg shadow-black/20 backdrop-blur-md transition-colors duration-500 dark:border-black/60 dark:bg-black/40",
        className,
      )}
    >
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
            rounded={isFirst ? "left" : isLast ? "right" : "none"}
            withDivider={!isLast}
          />
        );
      })}
    </div>
  );
};

