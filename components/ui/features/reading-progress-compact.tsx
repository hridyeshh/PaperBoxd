"use client";
import * as React from "react";
import { Check } from "lucide-react";
import { motion, useSpring, useTransform, useMotionValueEvent } from "framer-motion";
import { cn } from "@/lib/utils";

interface ReadingProgressCompactProps {
  totalPages: number;
  pagesRead: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
}

export function ReadingProgressCompact({
  totalPages,
  pagesRead,
  size = 60,
  strokeWidth = 4,
  className,
}: ReadingProgressCompactProps) {
  const key = `${pagesRead}-${totalPages}`;
  const targetProgress = totalPages > 0 ? Math.min(pagesRead / totalPages, 1) : 0;
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth / 2);

  const spring = useSpring(0, { damping: 30, stiffness: 200, mass: 1 });
  const offset = useTransform(spring, (value) => circumference * (1 - value));
  const [animatedValue, setAnimatedValue] = React.useState(0);
  const previousTotalPagesRef = React.useRef(totalPages);

  useMotionValueEvent(spring, "change", (latest) => {
    setAnimatedValue(latest);
  });

  React.useEffect(() => {
    const wasFallback = previousTotalPagesRef.current === 1 && totalPages > 1;
    if (wasFallback) {
      spring.set(0);
      setTimeout(() => spring.set(targetProgress), 10);
    } else {
      spring.set(targetProgress);
    }
    previousTotalPagesRef.current = totalPages;
  }, [spring, targetProgress, totalPages]);

  if (pagesRead === 0 || totalPages === 0) return null;

  const isComplete = animatedValue >= 1 && targetProgress >= 1;

  return (
    <div key={key} className={cn("relative flex items-center justify-center", className)}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-muted opacity-20"
        />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - strokeWidth / 2}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          className={cn(targetProgress >= 1 ? "text-green-500" : "text-primary")}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {isComplete ? (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300 }}>
              <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div className="text-xs font-semibold text-foreground leading-none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
              {Math.round(animatedValue * 100)}%
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
