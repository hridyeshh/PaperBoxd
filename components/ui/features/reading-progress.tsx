"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/primitives/input";

interface ReadingProgressProps {
  totalPages: number;
  pagesRead: number;
  onProgressChange: (pagesRead: number) => void;
  className?: string;
  size?: number;
  strokeWidth?: number;
}

// Throttle function for smooth 60fps updates
function useThrottledCallback<T extends (...args: never[]) => void>(
  callback: T,
  delay: number
): T {
  const lastRan = React.useRef(Date.now());
  const timeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);

  return React.useCallback(
    ((...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRan.current;

      if (timeSinceLastRun >= delay) {
        callback(...args);
        lastRan.current = now;
      } else {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => {
          callback(...args);
          lastRan.current = Date.now();
        }, delay - timeSinceLastRun);
      }
    }) as T,
    [callback, delay]
  );
}

export function ReadingProgress({
  totalPages,
  pagesRead,
  onProgressChange,
  className,
  size = 120,
  strokeWidth = 8,
}: ReadingProgressProps) {
  // Separate visual state (smooth) from committed state (saved to DB)
  const [visualPagesRead, setVisualPagesRead] = React.useState(pagesRead);
  const [isDragging, setIsDragging] = React.useState(false);
  const [showTick, setShowTick] = React.useState(false);
  const [inputValue, setInputValue] = React.useState(pagesRead.toString());
  const [animatedProgress, setAnimatedProgress] = React.useState(0);
  const svgRef = React.useRef<SVGSVGElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const rafRef = React.useRef<number | undefined>(undefined);
  const saveTimeoutRef = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const animationRef = React.useRef<number | undefined>(undefined);
  const previousPagesReadRef = React.useRef(pagesRead);
  const isInternalUpdateRef = React.useRef(false);

  // Sync visual state and input when pagesRead changes externally (not from drag)
  React.useEffect(() => {
    if (!isDragging) {
      setVisualPagesRead(pagesRead);
      setInputValue(pagesRead.toString());

      // Only animate if this is NOT an internal update from dragging
      // Animate from previous value to new value
      // Only animate if the value actually changed and we're not at the initial state
      if (previousPagesReadRef.current !== pagesRead && !isInternalUpdateRef.current) {
        const startValue = previousPagesReadRef.current;
        const endValue = pagesRead;

        // If we're starting from 0 and going to a value, animate from 0
        // Otherwise animate from previous to new
        const actualStartValue = startValue === 0 && animatedProgress === 0 ? 0 : startValue;

        const duration = 800; // 800ms animation
        const startTime = Date.now();

        if (animationRef.current) {
          cancelAnimationFrame(animationRef.current);
        }

        const animate = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);

          // Easing function (ease-out)
          const eased = 1 - Math.pow(1 - progress, 3);

          const currentValue = actualStartValue + (endValue - actualStartValue) * eased;
          setAnimatedProgress(currentValue);

          if (progress < 1) {
            animationRef.current = requestAnimationFrame(animate);
          } else {
            setAnimatedProgress(endValue);
            previousPagesReadRef.current = endValue;
          }
        };

        animationRef.current = requestAnimationFrame(animate);
        previousPagesReadRef.current = endValue;
      } else if (isInternalUpdateRef.current) {
        // If it's an internal update, just set the values directly without animation
        setAnimatedProgress(pagesRead);
        previousPagesReadRef.current = pagesRead;
        isInternalUpdateRef.current = false;
      }
    }
  }, [pagesRead, isDragging, animatedProgress]);

  // Use visual state for smooth rendering during drag
  // During animation, use animatedProgress; otherwise use pagesRead
  // But if we're not animating and animatedProgress is 0, use pagesRead directly
  // Always round to ensure we display whole numbers
  const displayPages = Math.round(isDragging
    ? visualPagesRead
    : (animatedProgress > 0 ? animatedProgress : pagesRead));
  
  const progress = React.useMemo(
    () => (totalPages > 0 ? Math.min(displayPages / totalPages, 1) : 0),
    [displayPages, totalPages]
  );
  
  // Check completion based on actual pagesRead, not animated progress
  const isComplete = totalPages > 0 && pagesRead >= totalPages;
  const circumference = React.useMemo(
    () => 2 * Math.PI * (size / 2 - strokeWidth / 2),
    [size, strokeWidth]
  );
  const offset = React.useMemo(
    () => circumference * (1 - progress),
    [circumference, progress]
  );

  // Show tick animation when completed - keep it visible once complete
  // Use a ref to track if we've ever been complete, so tick stays visible
  const hasBeenCompleteRef = React.useRef(false);
  
  React.useEffect(() => {
    const currentlyComplete = totalPages > 0 && pagesRead >= totalPages;
    
    if (currentlyComplete) {
      hasBeenCompleteRef.current = true;
      setShowTick(true);
    } else if (pagesRead === 0) {
      // Only hide tick if progress is reset to 0
      hasBeenCompleteRef.current = false;
      setShowTick(false);
    } else if (hasBeenCompleteRef.current) {
      // Once complete, keep tick visible unless progress drops significantly
      // Only hide if it goes below 95% (allows for small rounding differences)
      const progressPercent = totalPages > 0 ? (pagesRead / totalPages) * 100 : 0;
      if (progressPercent < 95) {
        hasBeenCompleteRef.current = false;
        setShowTick(false);
      } else {
        // Keep tick visible if we're still above 95%
        setShowTick(true);
      }
    }
  }, [pagesRead, totalPages]);

  // Calculate progress from mouse/touch position
  const calculateProgress = React.useCallback(
    (clientX: number, clientY: number) => {
      if (!containerRef.current) return 0;

      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const x = clientX - centerX;
      const y = clientY - centerY;

      const angle = Math.atan2(y, x);
      // Normalize angle to 0-2π range, starting from top (-π/2)
      let normalizedAngle = angle + Math.PI / 2;
      if (normalizedAngle < 0) normalizedAngle += 2 * Math.PI;

      const progressValue = normalizedAngle / (2 * Math.PI);
      const newPagesRead = Math.round(progressValue * totalPages);

      // Clamp between 0 and totalPages
      return Math.max(0, Math.min(newPagesRead, totalPages));
    },
    [totalPages]
  );

  // Update visual state immediately (smooth)
  const updateVisualProgress = React.useCallback(
    (clientX: number, clientY: number) => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }

      rafRef.current = requestAnimationFrame(() => {
        const newPages = calculateProgress(clientX, clientY);
        setVisualPagesRead(newPages);
      });
    },
    [calculateProgress]
  );

  // Commit to parent (throttled for smooth drag, debounced for final save)
  const commitProgressThrottled = useThrottledCallback(
    (pages: number) => {
      onProgressChange(pages);
    },
    50 // Throttle to ~20 updates per second for smooth drag
  );

  const commitProgress = React.useCallback(
    (pages: number) => {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
        onProgressChange(pages);
      }, 100); // Small delay to batch rapid updates
    },
    [onProgressChange]
  );

  const updateProgress = React.useCallback(
    (e: React.MouseEvent | MouseEvent | React.TouchEvent) => {
      if (!containerRef.current) return;

      let clientX: number, clientY: number;
      if ("touches" in e && e.touches && e.touches[0]) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      const newPages = calculateProgress(clientX, clientY);
      updateVisualProgress(clientX, clientY);
      // Use throttled commit during drag for smooth updates
      if (isDragging) {
        commitProgressThrottled(newPages);
      } else {
      commitProgress(newPages);
      }
    },
    [calculateProgress, updateVisualProgress, commitProgress, commitProgressThrottled, isDragging]
  );

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!totalPages) return;
    e.preventDefault();
    setIsDragging(true);
    updateProgress(e);
  };

  const handleClick = (e: React.MouseEvent) => {
    if (!totalPages || isDragging) return;
    updateProgress(e);
  };

  const handleMouseMove = React.useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      if (!isDragging || !totalPages) return;
      e.preventDefault();
      updateProgress(e);
    },
    [isDragging, totalPages, updateProgress]
  );

  const handleMouseUp = React.useCallback(() => {
    setIsDragging(false);
    // Mark as internal update to prevent animation
    isInternalUpdateRef.current = true;
    // Final commit on release
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    commitProgress(visualPagesRead);
  }, [visualPagesRead, commitProgress]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (!totalPages) return;
    e.preventDefault();
    setIsDragging(true);
    updateProgress(e);
  };

  const handleTouchMove = React.useCallback(
    (e: React.TouchEvent | TouchEvent) => {
      if (!isDragging || !totalPages) return;
      e.preventDefault();
      updateProgress(e as React.TouchEvent);
    },
    [isDragging, totalPages, updateProgress]
  );

  const handleTouchEnd = React.useCallback(() => {
    setIsDragging(false);
    // Mark as internal update to prevent animation
    isInternalUpdateRef.current = true;
    // Final commit on release
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
    }
    commitProgress(visualPagesRead);
  }, [visualPagesRead, commitProgress]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
  };

  const handleInputBlur = () => {
    const numValue = parseInt(inputValue, 10);
    if (isNaN(numValue) || numValue < 0) {
      setInputValue(pagesRead.toString());
      return;
    }
    const clampedPages = Math.max(0, Math.min(numValue, totalPages));
    // Mark as internal update to prevent animation
    isInternalUpdateRef.current = true;
    onProgressChange(clampedPages);
    setInputValue(clampedPages.toString());
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.currentTarget.blur();
    }
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener("mousemove", handleMouseMove, { passive: false });
      document.addEventListener("mouseup", handleMouseUp);
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      return () => {
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
        }
        clearTimeout(saveTimeoutRef.current);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp, handleTouchMove, handleTouchEnd]);

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  // Initialize animated progress on mount - animate from 0 to current progress
  React.useEffect(() => {
    // Only animate on initial mount if we have progress
    if (pagesRead > 0 && previousPagesReadRef.current === 0 && animatedProgress === 0) {
      // Start animation from 0 to pagesRead on initial load
      const startValue = 0;
      const endValue = pagesRead;
      const duration = 1000; // 1 second animation
      const startTime = Date.now();
      
      const animate = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        
        // Easing function (ease-out)
        const eased = 1 - Math.pow(1 - progress, 3);
        
        const currentValue = startValue + (endValue - startValue) * eased;
        setAnimatedProgress(currentValue);
        
        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animate);
        } else {
          setAnimatedProgress(endValue);
          previousPagesReadRef.current = endValue;
        }
      };
      
      animationRef.current = requestAnimationFrame(animate);
    } else if (pagesRead === 0) {
      // Reset animation if pagesRead is 0
      setAnimatedProgress(0);
      previousPagesReadRef.current = 0;
    } else if (pagesRead > 0 && animatedProgress === 0) {
      // If we have pagesRead but no animation yet, set it directly
      setAnimatedProgress(pagesRead);
      previousPagesReadRef.current = pagesRead;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run on mount

  if (!totalPages) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={cn("relative flex flex-col items-center gap-4", className)}
    >
      {/* Progress circle container */}
      <div
        className="relative cursor-grab active:cursor-grabbing select-none touch-none group"
        onMouseDown={handleMouseDown}
        onClick={handleClick}
        onTouchStart={handleTouchStart}
        style={{
          width: size,
          height: size,
          touchAction: "none",
        }}
      >
        {/* Glow effect behind the circle */}
        <motion.div
          className="absolute inset-0 rounded-full"
          animate={{
            boxShadow: isDragging
              ? "0 0 30px rgba(var(--primary-rgb, 99, 102, 241), 0.4)"
              : isComplete
              ? "0 0 20px rgba(34, 197, 94, 0.3)"
              : "0 0 15px rgba(var(--primary-rgb, 99, 102, 241), 0.2)",
          }}
          transition={{ duration: 0.3 }}
        />

        <svg
          ref={svgRef}
          width={size}
          height={size}
          className="transform -rotate-90 relative z-10"
        >
          {/* Background circle with subtle gradient */}
          <defs>
            <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.05" />
            </linearGradient>
            <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isComplete ? "#22c55e" : "currentColor"} stopOpacity="1" />
              <stop offset="100%" stopColor={isComplete ? "#16a34a" : "currentColor"} stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth / 2}
            fill="none"
            stroke="url(#bgGradient)"
            strokeWidth={strokeWidth}
            className="text-muted"
          />

          {/* Progress circle - animated with gradient */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={size / 2 - strokeWidth / 2}
            fill="none"
            stroke="url(#progressGradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{
              strokeDashoffset: offset,
            }}
            transition={{
              duration: isDragging ? 0 : 0.5,
              ease: "easeOut",
            }}
            className={cn(
              "transition-all duration-300",
              isComplete ? "text-green-500" : "text-primary"
            )}
            style={{
              willChange: isDragging ? "stroke-dashoffset" : "auto",
              filter: isDragging ? "drop-shadow(0 0 8px currentColor)" : "drop-shadow(0 0 4px currentColor)",
            }}
          />
        </svg>

        {/* Center content with enhanced styling */}
        <div className="absolute inset-0 flex items-center justify-center">
          <AnimatePresence mode="wait">
            {showTick ? (
              <motion.div
                key="tick"
                initial={{ scale: 0, opacity: 0, rotate: -180 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                exit={{ scale: 0, opacity: 0, rotate: 180 }}
                transition={{
                  type: "spring",
                  stiffness: 300,
                  damping: 20,
                }}
                className="relative"
              >
                <div className="absolute inset-0 rounded-full bg-green-500/20 blur-xl" />
                <Check className="h-10 w-10 text-green-500 relative z-10" strokeWidth={3} />
              </motion.div>
            ) : (
              <motion.div
                key="text"
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                className="text-center"
              >
                <motion.div
                  className="text-2xl font-bold text-foreground"
                  animate={{ scale: isDragging ? 1.1 : 1 }}
                  transition={{ duration: 0.2 }}
                >
                  {displayPages}
                </motion.div>
                <div className="text-xs text-muted-foreground font-medium mt-0.5">
                  of {totalPages}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Progress percentage with better styling */}
      <motion.div
        className="text-sm font-medium text-center"
        animate={{
          color: isComplete
            ? "rgb(34, 197, 94)"
            : progress > 0.5
            ? "hsl(var(--primary))"
            : "hsl(var(--muted-foreground))"
        }}
      >
        {Math.round(progress * 100)}% complete
      </motion.div>

      {/* Manual input field with enhanced design */}
      <div className="flex items-center gap-2 w-full max-w-[180px]">
        <div className="relative flex-1">
          <Input
            type="number"
            min={0}
            max={totalPages}
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            className="h-10 text-center text-sm font-medium border-2 focus-visible:ring-2 focus-visible:ring-primary/20"
            placeholder="0"
          />
        </div>
        <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
          / {totalPages}
        </span>
      </div>
    </div>
  );
}

