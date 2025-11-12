"use client";

import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthCardProps extends HTMLAttributes<HTMLDivElement> {
  header?: ReactNode;
  footer?: ReactNode;
}

/**
 * Reusable surface for authentication forms. Accepts optional header and footer
 * slots to keep layout consistent across login, sign-up, and reset flows.
 */
export function AuthCard({
  header,
  footer,
  children,
  className,
  ...props
}: AuthCardProps) {
  return (
    <div
      className={cn(
        "space-y-6 rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur md:p-8",
        className,
      )}
      {...props}
    >
      {header ? <div className="space-y-1 text-center md:text-left">{header}</div> : null}
      <div className="space-y-4">{children}</div>
      {footer ? <div className="text-center text-sm text-muted-foreground md:text-left">{footer}</div> : null}
    </div>
  );
}

