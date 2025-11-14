"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { InteractiveHoverButton } from "@/components/ui/buttons";

export interface DockItem {
  label: string;
  onClick?: () => void;
  className?: string;
}

interface DockProps {
  className?: string;
  items: DockItem[];
  activeLabel?: string;
}

const floatingAnimation: Variants = {
  initial: { y: 0 },
  animate: {
    y: [-1, 1, -1],
    transition: {
      duration: 6,
      repeat: Infinity,
      ease: "easeInOut" as const,
    },
  },
};

const DockButton = React.forwardRef<HTMLButtonElement, DockItem & { isActive?: boolean }>(
  ({ label, onClick, className, isActive }, ref) => (
    <div
      className={cn(
        "flex-1 transition-all duration-200 ease-out hover:mr-3",
        className,
      )}
    >
      <InteractiveHoverButton
        ref={ref}
        text={label}
        onClick={onClick}
        showIdleAccent={false}
        hideIcon
        aria-pressed={isActive}
        data-active={isActive ? "true" : "false"}
        className={cn(
          "w-full min-w-[110px] px-1 py-2 text-sm font-semibold transition-all duration-200 md:text-base",
          isActive
            ? "border-foreground/50 bg-foreground text-background hover:text-background dark:border-white/60 dark:bg-white dark:text-zinc-950 dark:hover:text-zinc-950"
            : "border-transparent bg-transparent text-foreground hover:text-background hover:dark:text-zinc-950",
        )}
      />
    </div>
  ),
);
DockButton.displayName = "DockButton";

const Dock = React.forwardRef<HTMLDivElement, DockProps>(({ items, className, activeLabel }, ref) => {
  return (
    <div ref={ref} className={cn("w-full flex items-center justify-center p-1", className)}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={floatingAnimation}
        className={cn(
          "flex w-full max-w-6xl items-center justify-center gap-3 rounded-full border border-border/60 bg-background px-8 py-2 text-foreground shadow-sm md:px-10",
          "dark:border-border/40",
        )}
      >
        {items.map((item) => (
          <DockButton key={item.label} {...item} isActive={item.label === activeLabel} className="flex-1 text-center" />
        ))}
      </motion.div>
    </div>
  );
});

Dock.displayName = "Dock";

export { Dock };

