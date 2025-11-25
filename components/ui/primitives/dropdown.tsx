"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";

interface DropdownContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.MutableRefObject<HTMLButtonElement | null>;
  contentRef: React.MutableRefObject<HTMLDivElement | null>;
}

const DropdownContext = React.createContext<DropdownContextValue | null>(null);

function useDropdownContext(component: string) {
  const context = React.useContext(DropdownContext);
  if (!context) {
    throw new Error(`${component} must be used within a Dropdown.Root`);
  }
  return context;
}

interface DropdownRootProps {
  children: React.ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  className?: string;
}

const DropdownRoot: React.FC<DropdownRootProps> = ({
  children,
  isOpen,
  defaultOpen = false,
  onOpenChange,
  className,
}) => {
  const [internalOpen, setInternalOpen] = React.useState(defaultOpen);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const contentRef = React.useRef<HTMLDivElement>(null);

  const open = isOpen ?? internalOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (isOpen === undefined) {
        setInternalOpen(next);
      }
      onOpenChange?.(next);
    },
    [isOpen, onOpenChange],
  );

  React.useEffect(() => {
    if (!open) return;

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        contentRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, setOpen]);

  const contextValue = React.useMemo<DropdownContextValue>(
    () => ({
      open,
      setOpen,
      triggerRef,
      contentRef,
    }),
    [open, setOpen],
  );

  return (
    <DropdownContext.Provider value={contextValue}>
      <div className={cn("relative inline-flex", className)} style={{ position: 'relative' }}>{children}</div>
    </DropdownContext.Provider>
  );
};

type DropdownTriggerProps = React.ButtonHTMLAttributes<HTMLButtonElement>;

const DropdownTrigger = React.forwardRef<
  HTMLButtonElement,
  DropdownTriggerProps
>(
  ({ className, onClick, children, ...props }, forwardedRef) => {
    const { open, setOpen, triggerRef } = useDropdownContext("Dropdown.Trigger");

    return (
      <button
        type="button"
        ref={(node) => {
          triggerRef.current = node;
          if (typeof forwardedRef === "function") {
            forwardedRef(node);
          } else if (forwardedRef) {
            forwardedRef.current = node;
          }
        }}
        className={cn(
          "rounded-full p-1 transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          setOpen(!open);
        }}
        {...props}
      >
        {children}
      </button>
    );
  },
);
DropdownTrigger.displayName = "DropdownTrigger";

type MotionDivProps = React.ComponentPropsWithoutRef<typeof motion.div>;

interface DropdownPopoverProps extends Omit<MotionDivProps, "ref"> {
  align?: "start" | "end";
}

const DropdownPopover = React.forwardRef<HTMLDivElement, DropdownPopoverProps>(
  ({ className, align = "end", children, ...props }, forwardedRef) => {
    const { open, contentRef, triggerRef } = useDropdownContext("Dropdown.Popover");
    const [positionStyle, setPositionStyle] = React.useState<React.CSSProperties>({});

    // Calculate and adjust position on mobile to prevent overflow
    React.useEffect(() => {
      if (!open || typeof window === "undefined") return;

      const calculatePosition = () => {
        if (!triggerRef.current) return;

        const trigger = triggerRef.current;
        const triggerRect = trigger.getBoundingClientRect();
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const isMobile = viewportWidth < 768;
        
        // Estimate dropdown dimensions (will be refined after render)
        const estimatedWidth = 200; // min-w-[200px]
        const estimatedHeight = 100; // approximate height

        // Calculate available space on left and right
        const spaceOnRight = viewportWidth - triggerRect.right;
        const spaceOnLeft = triggerRect.left;
        
        // Use fixed positioning with calculated coordinates from viewport
        const newStyle: React.CSSProperties = {
          // Default: position below trigger
          top: `${triggerRect.bottom + 8}px`,
        };

        if (isMobile) {
          // On mobile, always constrain width
          newStyle.maxWidth = "calc(100vw - 1rem)";
          
          // Determine best alignment based on available space
          if (align === "end") {
            // For "end" alignment, check if there's enough space on the right
            if (spaceOnRight < estimatedWidth && spaceOnLeft > spaceOnRight) {
              // Not enough space on right, align to left instead
              newStyle.left = "0.5rem";
              newStyle.right = "auto";
            } else {
              // Enough space on right, but add padding to prevent edge overflow
              newStyle.right = `${Math.max(8, viewportWidth - triggerRect.right - estimatedWidth)}px`;
              newStyle.left = "auto";
            }
          } else {
            // For "start" alignment, check if there's enough space on the left
            if (spaceOnLeft < estimatedWidth && spaceOnRight > spaceOnLeft) {
              // Not enough space on left, align to right instead
              newStyle.right = "0.5rem";
              newStyle.left = "auto";
            } else {
              // Enough space on left, but add padding to prevent edge overflow
              newStyle.left = `${Math.max(8, triggerRect.left)}px`;
              newStyle.right = "auto";
            }
          }
          
          // Check bottom overflow
          const spaceBelow = viewportHeight - triggerRect.bottom;
          if (spaceBelow < estimatedHeight) {
            // Not enough space below, position above instead
            newStyle.top = "auto";
            newStyle.bottom = `${viewportHeight - triggerRect.top + 8}px`;
          }
        } else {
          // Desktop: Use fixed positioning relative to viewport
          if (align === "end") {
            // For "end" alignment, check if dropdown would overflow on the right
            if (spaceOnRight < estimatedWidth) {
              // Not enough space on right, align to left instead
              newStyle.left = `${Math.max(8, triggerRect.left)}px`;
              newStyle.right = "auto";
            } else {
              // Enough space on right
              newStyle.right = `${Math.max(8, viewportWidth - triggerRect.right)}px`;
              newStyle.left = "auto";
            }
          } else {
            // For "start" alignment, check if dropdown would overflow on the left
            if (spaceOnLeft < estimatedWidth) {
              // Not enough space on left, align to right instead
              newStyle.right = `${Math.max(8, viewportWidth - triggerRect.right)}px`;
              newStyle.left = "auto";
            } else {
              // Enough space on left
              newStyle.left = `${Math.max(8, triggerRect.left)}px`;
              newStyle.right = "auto";
            }
          }
          
          // Check bottom overflow on desktop
          const spaceBelow = viewportHeight - triggerRect.bottom;
          if (spaceBelow < estimatedHeight) {
            // Not enough space below, position above instead
            newStyle.top = "auto";
            newStyle.bottom = `${viewportHeight - triggerRect.top + 8}px`;
          }
        }

        setPositionStyle(newStyle);
      };

      // Calculate position immediately and after a short delay
      calculatePosition();
      const timeoutId = setTimeout(() => {
        // Recalculate after dropdown is rendered to get actual dimensions
        if (contentRef.current && triggerRef.current) {
          const dropdown = contentRef.current;
          const trigger = triggerRef.current;
          const dropdownRect = dropdown.getBoundingClientRect();
          const triggerRect = trigger.getBoundingClientRect();
          const viewportWidth = window.innerWidth;
          const viewportHeight = window.innerHeight;
          const isMobile = viewportWidth < 768;

          setPositionStyle((prevStyle) => {
            const newStyle: React.CSSProperties = { ...prevStyle };

            // Fine-tune position based on actual dimensions for both mobile and desktop
            const overflowsRight = dropdownRect.right > viewportWidth - 8;
            const overflowsLeft = dropdownRect.left < 8;
            const overflowsBottom = dropdownRect.bottom > viewportHeight - 8;

            if (isMobile) {
              if (overflowsRight) {
                newStyle.right = "0.5rem";
                newStyle.left = "auto";
              } else if (overflowsLeft) {
                newStyle.left = "0.5rem";
                newStyle.right = "auto";
              }

              if (overflowsBottom) {
                newStyle.bottom = `${triggerRect.height + 8}px`;
                newStyle.top = "auto";
                newStyle.marginTop = "0";
                newStyle.marginBottom = "0.5rem";
              }

              newStyle.maxWidth = "calc(100vw - 1rem)";
            } else {
              // Desktop overflow handling - adjust fixed positioning
              if (overflowsRight) {
                newStyle.right = `${Math.max(8, viewportWidth - dropdownRect.right)}px`;
                newStyle.left = "auto";
              } else if (overflowsLeft) {
                newStyle.left = `${Math.max(8, dropdownRect.left)}px`;
                newStyle.right = "auto";
              }

              if (overflowsBottom) {
                newStyle.top = "auto";
                newStyle.bottom = `${viewportHeight - triggerRect.top + 8}px`;
              } else {
                newStyle.top = `${triggerRect.bottom + 8}px`;
                newStyle.bottom = "auto";
              }
            }

            return newStyle;
          });
        }
      }, 10);

      window.addEventListener("resize", calculatePosition);

      return () => {
        clearTimeout(timeoutId);
        window.removeEventListener("resize", calculatePosition);
      };
    }, [open, contentRef, triggerRef, align]);

    const [mounted, setMounted] = React.useState(false);

    React.useEffect(() => {
      setMounted(true);
    }, []);

    const dropdownContent = (
      <AnimatePresence>
        {open ? (
          <motion.div
            key="dropdown-popover"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            ref={(node) => {
              contentRef.current = node;
              if (typeof forwardedRef === "function") {
                forwardedRef(node);
              } else if (forwardedRef) {
                forwardedRef.current = node;
              }
            }}
            className={cn(
              "fixed z-50 overflow-hidden rounded-2xl border border-border/60 bg-background p-1 shadow-xl",
              // Responsive width - ensure it doesn't exceed viewport on mobile
              "min-w-[200px]",
              // On mobile, constrain width to viewport. On desktop, no max-width constraint
              "max-w-[calc(100vw-1rem)] md:max-w-none",
              className,
            )}
            style={{
              ...positionStyle,
              ...(props.style || {}),
            }}
            {...props}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    );

    // Use portal to render outside container hierarchy to avoid overflow clipping
    if (!mounted) return null;
    return createPortal(dropdownContent, document.body);
  },
);
DropdownPopover.displayName = "DropdownPopover";

type DropdownMenuProps = React.HTMLAttributes<HTMLDivElement>;

const DropdownMenu = React.forwardRef<HTMLDivElement, DropdownMenuProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn("flex flex-col gap-0 py-1", className)}
        {...props}
      >
        {children}
      </div>
    );
  },
);
DropdownMenu.displayName = "DropdownMenu";

interface DropdownItemProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
  icon?: React.ComponentType<{ className?: string }>;
  addon?: string;
}

const DropdownItem = React.forwardRef<HTMLButtonElement, DropdownItemProps>(
  ({ label, icon: Icon, addon, children, className, onClick, ...props }, ref) => {
    const { setOpen } = useDropdownContext("Dropdown.Item");
    const content = label ?? children;

    return (
      <button
        ref={ref}
        type="button"
        className={cn(
          "flex w-full items-center justify-between gap-3 rounded-xl px-3.5 py-2 text-sm font-medium text-foreground transition hover:bg-foreground/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          className,
        )}
        onClick={(event) => {
          onClick?.(event);
          setOpen(false);
        }}
        {...props}
      >
        <span className="flex items-center gap-2">
          {Icon && <Icon className="size-4 text-muted-foreground" />}
          <span className="truncate">{content}</span>
        </span>
        {addon ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {addon}
          </span>
        ) : null}
      </button>
    );
  },
);
DropdownItem.displayName = "DropdownItem";

type DropdownSeparatorProps = React.HTMLAttributes<HTMLDivElement>;

const DropdownSeparator: React.FC<DropdownSeparatorProps> = ({
  className,
  ...props
}) => (
  <div
    className={cn("my-1 h-px w-full bg-border/60", className)}
    {...props}
  />
);

export const Dropdown = {
  Root: DropdownRoot,
  Trigger: DropdownTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Item: DropdownItem,
  Separator: DropdownSeparator,
};

