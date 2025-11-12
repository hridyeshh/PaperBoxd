"use client";

import React from "react";
import { ArrowRight } from "lucide-react";

import { cn } from "@/lib/utils";

interface InteractiveHoverButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  text?: string;
  showIdleAccent?: boolean;
  invert?: boolean;
}

const InteractiveHoverButton = React.forwardRef<
  HTMLButtonElement,
  InteractiveHoverButtonProps
>(
  (
    { text = "Button", className, showIdleAccent = true, invert = false, ...props },
    ref,
  ) => {
  const accentBaseClasses =
    "absolute transition-all duration-300 group-hover:left-[0%] group-hover:top-[0%] group-hover:h-full group-hover:w-full group-hover:scale-[1.8] group-hover:bg-primary group-hover:opacity-100";
  const accentIdleClasses = showIdleAccent
    ? "left-[20%] top-[40%] h-2 w-2 scale-[1] rounded-lg bg-primary"
    : "left-[20%] top-[40%] h-2 w-2 scale-0 rounded-lg bg-transparent opacity-0";
    const hoverTextClasses = invert
      ? "text-background dark:text-zinc-950"
      : "text-primary-foreground";

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
      {...props}
    >
      <span className="inline-block translate-x-1 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        {text}
      </span>
        <div
          className={cn(
            "absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100",
            hoverTextClasses,
          )}
        >
        <span>{text}</span>
        <ArrowRight className="h-4 w-4" />
      </div>
      <div className={cn(accentBaseClasses, accentIdleClasses)} />
    </button>
  );
  },
);

InteractiveHoverButton.displayName = "InteractiveHoverButton";

export { InteractiveHoverButton };

