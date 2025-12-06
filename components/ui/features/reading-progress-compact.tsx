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

function AnimatedPercentage({ value }: { value: number }) {
  return <>{Math.round(value * 100)}%</>;
}

export function ReadingProgressCompact({
  totalPages,
  pagesRead,
  size = 60,
  strokeWidth = 4,
  className,
}: ReadingProgressCompactProps) {
  // Unique key to force re-render and re-animate
  const key = `${pagesRead}-${totalPages}`;
  
  const targetProgress = totalPages > 0 ? Math.min(pagesRead / totalPages, 1) : 0;
  const circumference = 2 * Math.PI * (size / 2 - strokeWidth / 2);

  // Log props received
  React.useEffect(() => {
    console.log('[ReadingProgressCompact] 📥 Props received:', {
      pagesRead,
      totalPages,
      targetProgress,
      calculatedPercentage: `${Math.round(targetProgress * 100)}%`,
      isComplete: targetProgress >= 1,
      key
    });
  }, [pagesRead, totalPages, targetProgress, key]);

  const spring = useSpring(0, {
    damping: 30,
    stiffness: 200,
    mass: 1,
  });

  const offset = useTransform(spring, (value) => circumference * (1 - value));

  const [animatedValue, setAnimatedValue] = React.useState(0);
  const previousTargetRef = React.useRef(targetProgress);
  const previousTotalPagesRef = React.useRef(totalPages);
  
  useMotionValueEvent(spring, "change", (latest) => {
    setAnimatedValue(latest);
    // Log when animated value changes significantly
    if (Math.abs(latest - previousTargetRef.current) > 0.01) {
      console.log('[ReadingProgressCompact] 🎬 Animation value changed:', {
        previous: previousTargetRef.current,
        current: latest,
        target: targetProgress,
        percentage: `${Math.round(latest * 100)}%`
      });
      previousTargetRef.current = latest;
    }
  });
  
  React.useEffect(() => {
    // If totalPages changed from a fallback value (1) to a real value, reset spring to 0 first
    const wasFallback = previousTotalPagesRef.current === 1 && totalPages > 1;
    
    if (wasFallback) {
      console.log('[ReadingProgressCompact] 🔄 Resetting spring - totalPages changed from fallback to real value:', {
        from: previousTotalPagesRef.current,
        to: totalPages,
        resettingToZero: true
      });
      spring.set(0);
      // Small delay to ensure reset happens before setting target
      setTimeout(() => {
        spring.set(targetProgress);
      }, 10);
    } else {
      console.log('[ReadingProgressCompact] 🎯 Setting spring target:', {
        from: spring.get(),
        to: targetProgress,
        percentage: `${Math.round(targetProgress * 100)}%`
      });
      spring.set(targetProgress);
    }
    
    previousTotalPagesRef.current = totalPages;
  }, [spring, targetProgress, totalPages]);

  // Log render
  React.useEffect(() => {
    console.log('[ReadingProgressCompact] 🎨 Component rendered:', {
      pagesRead,
      totalPages,
      animatedValue,
      targetProgress,
      isComplete: animatedValue >= 1 && targetProgress >= 1,
      timestamp: new Date().toISOString()
    });
  });

  if (pagesRead === 0 || totalPages === 0) {
    console.log('[ReadingProgressCompact] ⏭️ Returning null - no pages:', { pagesRead, totalPages });
    return null;
  }

  const isComplete = animatedValue >= 1 && targetProgress >= 1;
  
  if (isComplete) {
    console.log('[ReadingProgressCompact] ✅ Book is complete!');
  }

  return (
    <div key={key} className={cn("relative flex items-center justify-center", className)}>
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
      >
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
          className={cn(
            (targetProgress >= 1) ? "text-green-500" : "text-primary"
          )}
        />
      </svg>

      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          {isComplete ? (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 300 }}
            >
              <Check className="h-4 w-4 text-green-500" strokeWidth={3} />
            </motion.div>
          ) : (
            <motion.div
              className="text-xs font-semibold text-foreground leading-none"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              <AnimatedPercentage value={animatedValue} />
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
