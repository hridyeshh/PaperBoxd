"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * The reader's own taste, drawn from the same numbers that rank their
 * recommendations. Every bar and every sentence has evidence behind it on the
 * backend (see service.GetTasteDashboard); the component only decides how to
 * draw what it is given, and draws nothing when `enough` is false rather than
 * padding thin data into confident-looking bars.
 */
type TasteBar = { axis: string; label: string; value: number; strength: number };
type TasteShift = { axis: string; label: string; direction: "up" | "down"; delta: number };
type TasteInsight = { kind: string; text: string };
type Dashboard = {
  bars: TasteBar[];
  shifts: TasteShift[];
  current_mood: string[];
  insights: TasteInsight[];
  top_genres: string[];
  dislikes: string[];
  books_rated: number;
  enough: boolean;
};

export function TasteDashboard({ className, serifClass }: { className?: string; serifClass?: string }) {
  const [data, setData] = React.useState<Dashboard | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    fetch("/api/users/me/taste")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Dashboard | null) => {
        if (!cancelled && d) setData(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!data) return null;

  if (!data.enough) {
    return (
      <section className={cn("rounded-2xl border border-border bg-card p-5", className)}>
        <h3 className={cn(serifClass, "text-lg font-semibold")}>Your reading taste</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Rate {Math.max(0, 5 - data.books_rated)} more book{5 - data.books_rated === 1 ? "" : "s"} and this
          fills in. It only shows what your ratings actually support.
        </p>
      </section>
    );
  }

  // Bars read as "you tend to love X"; a low value on an axis is a preference
  // for its opposite, so show the opposite label rather than a short bar.
  const opposite: Record<string, string> = {
    "Character-driven": "Plot over character",
    "Emotionally intense": "Light-hearted",
    "Plot-driven": "Quiet",
    "Fast-paced": "Slow-burn",
    Literary: "Plain-spoken",
    "Structurally ambitious": "Straightforward",
    Dark: "Warm",
    "Romance-led": "Romance-light",
    "Big worlds": "Grounded",
  };

  return (
    <section className={cn("rounded-2xl border border-border bg-card p-5 flex flex-col gap-5", className)}>
      <div>
        <h3 className={cn(serifClass, "text-lg font-semibold")}>You tend to love</h3>
        <ul className="mt-3 flex flex-col gap-2">
          {data.bars.slice(0, 6).map((b) => {
            const flipped = b.value < 0.5;
            const label = flipped ? (opposite[b.label] ?? b.label) : b.label;
            const width = Math.round((flipped ? 1 - b.value : b.value) * 100);
            return (
              <li key={b.axis} className="flex items-center gap-3 text-sm">
                <span className="w-40 shrink-0 text-muted-foreground">{label}</span>
                <span className="relative h-2 flex-1 overflow-hidden rounded-full bg-muted">
                  <span
                    className="absolute inset-y-0 left-0 rounded-full bg-foreground/80"
                    style={{ width: `${width}%`, opacity: 0.35 + b.strength * 0.65 }}
                  />
                </span>
              </li>
            );
          })}
        </ul>
      </div>

      {data.shifts.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Your taste is evolving</h4>
          <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {data.shifts.map((s) => (
              <li key={s.axis}>
                <span className="mr-1 text-muted-foreground">{s.direction === "up" ? "↑" : "↓"}</span>
                {s.label}
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.current_mood.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Lately</h4>
          <p className="mt-1 text-sm">{data.current_mood.join(" · ")}</p>
        </div>
      )}

      {data.dislikes.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Not for you</h4>
          <p className="mt-1 text-sm text-muted-foreground">{data.dislikes.join(" · ")}</p>
        </div>
      )}

      {data.insights.length > 0 && (
        <div>
          <h4 className="text-xs uppercase tracking-widest text-muted-foreground">Patterns</h4>
          <ul className="mt-2 flex flex-col gap-1.5 text-sm">
            {data.insights.map((i) => (
              <li key={i.kind}>{i.text}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
