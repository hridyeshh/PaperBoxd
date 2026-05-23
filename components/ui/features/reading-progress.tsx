"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BookOpen, Check, Minus, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/primitives/button";

interface ReadingProgressProps {
  totalPages: number;
  pagesRead: number;
  onProgressChange: (pagesRead: number) => void;
  className?: string;
  size?: number;       // kept for API compat
  strokeWidth?: number;
}

export function ReadingProgress({
  totalPages,
  pagesRead,
  onProgressChange,
  className,
}: ReadingProgressProps) {
  // --- state -----------------------------------------------------------
  const [localPages, setLocalPages] = React.useState(pagesRead);
  const [inputValue, setInputValue] = React.useState(String(pagesRead));
  const [isFocused, setIsFocused] = React.useState(false);
  const [isDragging, setIsDragging] = React.useState(false);
  const [showThumb, setShowThumb] = React.useState(false);
  const [isNumDragging, setIsNumDragging] = React.useState(false);

  // --- refs ------------------------------------------------------------
  const barRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const saveTimeout = React.useRef<NodeJS.Timeout | undefined>(undefined);
  const rafRef = React.useRef<number | undefined>(undefined);
  const numDragRef = React.useRef<{ startY: number; startPages: number; moved: boolean } | null>(null);
  // True while a save is in-flight — prevents the sync effect from
  // resetting localPages to the (stale) parent value before the API responds.
  const pendingSaveRef = React.useRef(false);

  // --- sync from parent (API response) ---------------------------------
  React.useEffect(() => {
    if (isFocused || isDragging || isNumDragging) return;
    if (pendingSaveRef.current) {
      // Still waiting for the server — only accept the parent update once
      // it actually reflects the value we sent (non-zero or explicitly changed).
      if (pagesRead !== 0) pendingSaveRef.current = false;
      else return; // ignore stale 0 while save is in-flight
    }
    setLocalPages(pagesRead);
    setInputValue(String(pagesRead));
  }, [pagesRead, isFocused, isDragging, isNumDragging]);

  // --- helpers ---------------------------------------------------------
  const clamp = (n: number) => Math.max(0, Math.min(Math.round(n), totalPages));

  /** Update visual state immediately, debounce the API call. */
  const commitImmediate = React.useCallback(
    (pages: number) => {
      const clamped = clamp(pages);
      setLocalPages(clamped);
      setInputValue(String(clamped));
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalPages]
  );

  /** Fire the actual save after a short pause. */
  const scheduleSave = React.useCallback(
    (pages: number) => {
      clearTimeout(saveTimeout.current);
      pendingSaveRef.current = true;
      saveTimeout.current = setTimeout(() => onProgressChange(clamp(pages)), 300);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onProgressChange, totalPages]
  );

  const commit = React.useCallback(
    (pages: number) => {
      commitImmediate(pages);
      scheduleSave(pages);
    },
    [commitImmediate, scheduleSave]
  );

  React.useEffect(() => () => clearTimeout(saveTimeout.current), []);

  // --- drag on the progress bar ----------------------------------------
  const pagesFromClientX = React.useCallback(
    (clientX: number): number => {
      if (!barRef.current) return localPages;
      const { left, width } = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min((clientX - left) / width, 1));
      return clamp(ratio * totalPages);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [totalPages, localPages]
  );

  const handleBarPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!totalPages) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    setShowThumb(true);
    const pages = pagesFromClientX(e.clientX);
    commitImmediate(pages);
  };

  const handleBarPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      e.preventDefault();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        const pages = pagesFromClientX(e.clientX);
        commitImmediate(pages);
      });
    },
    [isDragging, pagesFromClientX, commitImmediate]
  );

  const handleBarPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!isDragging) return;
      setIsDragging(false);
      // hide thumb after a brief pause so it doesn't flicker
      setTimeout(() => setShowThumb(false), 800);
      const pages = pagesFromClientX(e.clientX);
      commitImmediate(pages);
      scheduleSave(pages);
    },
    [isDragging, pagesFromClientX, commitImmediate, scheduleSave]
  );

  // --- number scrubber (drag up/down on the page counter) -------------
  const handleNumPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!totalPages) return;
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    numDragRef.current = { startY: e.clientY, startPages: localPages, moved: false };
    setIsNumDragging(false);
  };

  const handleNumPointerMove = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!numDragRef.current) return;
      const deltaY = numDragRef.current.startY - e.clientY; // up = positive
      if (Math.abs(deltaY) > 3) {
        numDragRef.current.moved = true;
        setIsNumDragging(true);
        commitImmediate(clamp(numDragRef.current.startPages + Math.round(deltaY)));
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [commitImmediate, totalPages]
  );

  const handleNumPointerUp = React.useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!numDragRef.current) return;
      const { moved, startY, startPages } = numDragRef.current;
      if (moved) {
        const deltaY = startY - e.clientY;
        scheduleSave(clamp(startPages + Math.round(deltaY)));
      } else {
        inputRef.current?.focus();
        inputRef.current?.select();
      }
      numDragRef.current = null;
      setIsNumDragging(false);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scheduleSave, totalPages]
  );

  // --- stepper ---------------------------------------------------------
  const step = (delta: number) => commit(localPages + delta);

  // --- text input ------------------------------------------------------
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    setInputValue(e.target.value);

  const handleInputBlur = () => {
    setIsFocused(false);
    const n = parseInt(inputValue, 10);
    if (isNaN(n)) { setInputValue(String(localPages)); return; }
    commit(n);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
    if (e.key === "Escape") { setInputValue(String(localPages)); e.currentTarget.blur(); }
  };

  // --- derived values --------------------------------------------------
  const pct = totalPages > 0 ? Math.min((localPages / totalPages) * 100, 100) : 0;
  const pctRounded = Math.round(pct);
  const isComplete = localPages >= totalPages && totalPages > 0;
  const pagesLeft = Math.max(0, totalPages - localPages);

  if (!totalPages) return null;

  return (
    <div className={cn("w-full", className)}>
      <div className="relative rounded-xl border border-border/60 bg-muted/30 backdrop-blur-sm overflow-hidden">
        {/* Top accent bar */}
        <div
          className={cn(
            "absolute inset-x-0 top-0 h-0.5 transition-colors duration-500",
            isComplete ? "bg-green-500" : "bg-primary/60"
          )}
        />

        <div className="px-4 pt-4 pb-3 space-y-3">
          {/* Header row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <BookOpen className="h-3.5 w-3.5" />
              <span>Reading Progress</span>
            </div>
            <AnimatePresence mode="wait">
              {isComplete ? (
                <motion.span
                  key="done"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex items-center gap-1 text-xs font-semibold text-green-500"
                >
                  <Check className="h-3 w-3" />
                  Finished
                </motion.span>
              ) : (
                <motion.span
                  key="pct"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="text-xs font-semibold tabular-nums text-foreground"
                >
                  {pctRounded}%
                </motion.span>
              )}
            </AnimatePresence>
          </div>

          {/* ── Draggable progress bar ────────────────────────────────── */}
          {/* Wrapper grows vertically on drag so tiny movements are easier to hit */}
          <motion.div
            animate={{ height: isDragging ? 28 : 12 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="relative flex items-center"
            style={{ overflow: "visible" }}
          >
            <div
              ref={barRef}
              role="slider"
              aria-valuenow={localPages}
              aria-valuemin={0}
              aria-valuemax={totalPages}
              tabIndex={0}
              className={cn(
                "relative w-full rounded-full select-none touch-none",
                "bg-border/60",
                isDragging ? "cursor-grabbing" : "cursor-pointer"
              )}
              style={{
                height: isDragging ? 28 : 12,
                transition: "height 0.2s ease",
              }}
              onPointerDown={handleBarPointerDown}
              onPointerMove={handleBarPointerMove}
              onPointerUp={handleBarPointerUp}
              onPointerCancel={handleBarPointerUp}
              onKeyDown={(e) => {
                if (e.key === "ArrowRight") step(1);
                if (e.key === "ArrowLeft") step(-1);
                if (e.key === "ArrowUp") step(10);
                if (e.key === "ArrowDown") step(-10);
              }}
            >
              {/* Fill */}
              <div
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full transition-[width] duration-75",
                  isComplete ? "bg-green-500" : "bg-primary"
                )}
                style={{ width: `${pct}%` }}
              />

              {/* Thumb — scales up with the bar when dragging */}
              <motion.div
                className={cn(
                  "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 shadow-md",
                  isComplete
                    ? "bg-green-500 border-green-300"
                    : "bg-background border-primary",
                  "pointer-events-none"
                )}
                style={{ left: `${pct}%` }}
                animate={{
                  width:  isDragging ? 22 : showThumb ? 18 : 0,
                  height: isDragging ? 22 : showThumb ? 18 : 0,
                  opacity: isDragging || showThumb ? 1 : 0,
                }}
                transition={{ duration: 0.15, ease: "easeOut" }}
              />
            </div>
          </motion.div>

          {/* Hint below bar when empty */}
          {!isDragging && localPages === 0 && (
            <p className="text-center text-[11px] text-muted-foreground/60 -mt-1">
              drag bar or tap ＋ to start
            </p>
          )}

          {/* Page stepper */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => step(-10)}
              disabled={localPages <= 0}
              className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Minus className="h-3.5 w-3.5" />
            </button>

            {/* Number scrubber — drag up/down to change pages, click to type */}
            <div
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 text-sm select-none touch-none",
                isNumDragging ? "cursor-ns-resize" : "cursor-ns-resize"
              )}
              title="Drag up/down to change pages"
              onPointerDown={handleNumPointerDown}
              onPointerMove={handleNumPointerMove}
              onPointerUp={handleNumPointerUp}
              onPointerCancel={handleNumPointerUp}
            >
              <span className="text-muted-foreground pointer-events-none">p.</span>
              <input
                ref={inputRef}
                type="number"
                min={0}
                max={totalPages}
                value={inputValue}
                onChange={handleInputChange}
                onFocus={() => { setIsFocused(true); setIsNumDragging(false); }}
                onBlur={handleInputBlur}
                onKeyDown={handleInputKeyDown}
                className="w-16 text-center font-semibold tabular-nums bg-transparent border-b border-border focus:border-primary focus:outline-none text-foreground transition-colors"
                style={{ pointerEvents: isNumDragging ? "none" : undefined }}
              />
              <span className="text-muted-foreground pointer-events-none">/ {totalPages}</span>
            </div>

            <button
              onClick={() => step(10)}
              disabled={localPages >= totalPages}
              className="h-7 w-7 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Plus className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Status label */}
          <p className="text-center text-xs text-muted-foreground">
            {isComplete
              ? "You've finished this book!"
              : localPages === 0
              ? "Tap + to start tracking"
              : `${pagesLeft} page${pagesLeft === 1 ? "" : "s"} left`}
          </p>
        </div>

        {/* Mark as finished */}
        {!isComplete && localPages > 0 && (
          <div className="px-4 pb-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => commit(totalPages)}
              className="w-full h-8 text-xs text-muted-foreground hover:text-green-500 hover:bg-green-500/10 border border-dashed border-border hover:border-green-500/40 transition-colors"
            >
              <Check className="h-3 w-3 mr-1.5" />
              Mark as finished
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
