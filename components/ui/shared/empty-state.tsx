"use client";

// One empty state, used everywhere. The rule it enforces: an empty surface on
// your own profile always offers the action that fills it, and an empty surface
// on someone else's profile never pretends you can do something about it.

import Link from "next/link";
import { cn } from "@/lib/utils";

export function EmptyState({
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  className,
}: {
  title: string;
  description?: string;
  /** Omit the action entirely when there is nothing useful for this viewer to do. */
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
  className?: string;
}) {
  const action = actionLabel ? (
    actionHref ? (
      <Link
        href={actionHref}
        className="mt-5 inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
      >
        {actionLabel}
      </Link>
    ) : (
      <button
        type="button"
        onClick={onAction}
        className="mt-5 inline-flex items-center rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-85"
      >
        {actionLabel}
      </button>
    )
  ) : null;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-3xl border border-border/70 bg-muted/20 p-12 text-center",
        className,
      )}
    >
      <p className="text-lg font-semibold text-foreground">{title}</p>
      {description && (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
