"use client";

import * as React from "react";
import { motion, type Variants } from "framer-motion";

import { cn } from "@/lib/utils";
import { InteractiveHoverButton } from "@/components/ui/buttons";
import { useIsMobile } from "@/hooks/use-media-query";

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

const DockButton = React.forwardRef<HTMLButtonElement, DockItem & { isActive?: boolean; isMobile?: boolean }>(
  ({ label, onClick, className, isActive, isMobile }, ref) => (
    <div
      className={cn(
        isMobile ? "flex-shrink-0" : "flex-1",
        "transition-transform duration-200 ease-out hover:scale-[1.02]",
        className,
      )}
    >
      <InteractiveHoverButton
        ref={ref}
        text={label}
        onClick={onClick}
        showIdleAccent={false}
        hideIcon
        invert={isActive}
        accentColor="bg-foreground dark:bg-white"
        hoverTextClass="text-background dark:text-zinc-950"
        aria-pressed={isActive}
        data-active={isActive ? "true" : "false"}
        className={cn(
          "w-full min-w-[110px] px-1 py-2 text-sm font-semibold transition-all duration-200 md:text-base",
          isActive
            ? "border-foreground/50 bg-foreground text-background hover:text-background dark:border-white/60 dark:bg-white dark:text-zinc-950 dark:hover:text-zinc-950"
            : "border-transparent bg-transparent text-foreground",
        )}
      />
    </div>
  ),
);
DockButton.displayName = "DockButton";

const Dock = React.forwardRef<HTMLDivElement, DockProps>(({ items, className, activeLabel }, ref) => {
  const isMobile = useIsMobile();
  return (
    <div ref={ref} className={cn("w-full flex items-center justify-center p-1", className)}>
      <motion.div
        initial="initial"
        animate="animate"
        variants={floatingAnimation}
        className={cn(
          "rounded-full border border-border/60 bg-background text-foreground shadow-sm dark:border-border/40",
          isMobile 
            ? "w-full max-w-full px-4 py-2" 
            : "w-full max-w-6xl px-8 py-2 md:px-10 flex items-center justify-center gap-3",
        )}
      >
        {isMobile ? (
          <div className="w-full overflow-x-auto scrollbar-hide">
            <div className="flex items-center gap-3 min-w-max">
              {items.map((item) => (
                <DockButton 
                  key={item.label} 
                  {...item} 
                  isActive={item.label === activeLabel} 
                  isMobile={isMobile}
                  className="text-center flex-shrink-0" 
                />
              ))}
            </div>
          </div>
        ) : (
          <>
            {items.map((item) => (
              <DockButton 
                key={item.label} 
                {...item} 
                isActive={item.label === activeLabel} 
                isMobile={isMobile}
                className="flex-1 text-center" 
              />
            ))}
          </>
        )}
      </motion.div>
    </div>
  );
});

Dock.displayName = "Dock";

export { Dock };