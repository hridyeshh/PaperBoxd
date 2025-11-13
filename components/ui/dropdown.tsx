"use client";

import * as React from "react";
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
      <div className={cn("relative inline-flex", className)}>{children}</div>
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
    const { open, contentRef } = useDropdownContext("Dropdown.Popover");

    const alignmentClass =
      align === "end" ? "right-0" : align === "start" ? "left-0" : "right-0";

    return (
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
              "absolute z-50 mt-2 min-w-[200px] overflow-hidden rounded-2xl border border-border/60 bg-background p-1 shadow-xl",
              alignmentClass,
              className,
            )}
            {...props}
          >
            {children}
          </motion.div>
        ) : null}
      </AnimatePresence>
    );
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

