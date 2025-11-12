"use client";

import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

interface AuthShellProps {
  /** Main title displayed above the form. */
  title: ReactNode;
  /** Optional supporting text shown under the title. */
  description?: ReactNode;
  /** Optional badge displayed above the title (e.g., "Welcome back"). */
  badge?: ReactNode;
  /** Optional content rendered in the left panel on desktop layouts. */
  sideContent?: ReactNode;
  /** Footer text or actions rendered below the form card. */
  footer?: ReactNode;
  /** The authentication form or children to render inside the card. */
  children: ReactNode;
  /** Additional classes for the form card. */
  className?: string;
}

/**
 * Responsive shell that composes the authentication page layout with an optional
 * marketing panel, contextual badge, and form card.
 */
export function AuthShell({
  title,
  description,
  badge = "Welcome back",
  sideContent,
  footer,
  children,
  className,
}: AuthShellProps) {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center">
      <div className="grid w-full max-w-6xl grid-cols-1 gap-10 px-6 py-12 md:grid-cols-[minmax(0,1.1fr)_minmax(0,420px)] md:px-12 lg:px-16">
        <div
          className={cn(
            "hidden min-h-[820px] max-h-[820px] flex-col justify-between overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-10 shadow-xl shadow-primary/10 backdrop-blur lg:flex",
            sideContent ? "md:flex" : "md:hidden",
          )}
        >
          {sideContent}
        </div>
        <div className="flex flex-col gap-8">
          <div className="flex flex-col gap-3 text-center md:text-left">
            {badge ? (
              <span className="inline-flex w-fit items-center gap-2 rounded-full border border-border/80 bg-background/80 px-3 py-1 text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground">
                {badge}
              </span>
            ) : null}
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              {title}
            </h1>
            {description ? (
              <p className="text-sm text-muted-foreground sm:text-base">
                {description}
              </p>
            ) : null}
          </div>
          <div
            className={cn(
              "rounded-3xl border border-border/70 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur md:max-w-2xl lg:max-w-3xl",
              "md:p-8",
              className,
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="text-center text-sm text-muted-foreground md:text-left">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

