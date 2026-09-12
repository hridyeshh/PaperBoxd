"use client";

import * as React from "react";
import { useRouter, usePathname } from "next/navigation";
import { Fingerprint } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";

/**
 * The reader's own taste, drawn from the same numbers that rank their
 * recommendations. Every bar and every sentence has evidence behind it on the
 * backend (see service.GetTasteDashboard); the component only decides how to
 * draw what it is given, and draws nothing when `enough` is false rather than
 * padding thin data into confident-looking bars.
 *
 * It lives behind a button on the profile: a full-width card was a lot of
 * surface for something a reader looks at occasionally, and while the profile
 * was too thin to draw it the card became a block of apology. The button opens
 * the taste when there is one, and the reason when there is not.
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

// Mirrors the two conditions behind `enough` in service.GetTasteDashboard.
// Kept as named constants so the copy below cannot drift from the gate again.
const RATINGS_NEEDED = 5;
const PATTERNS_NEEDED = 3;

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

/** One of the two things the dashboard is waiting on, with its progress. */
function Requirement({
  label,
  have,
  need,
  note,
}: {
  label: string;
  have: number;
  need: number;
  note: string;
}) {
  const met = have >= need;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <dt className="text-[13px] text-foreground">{label}</dt>
        <dd className="font-mono text-[11px] text-muted-foreground shrink-0">
          {Math.min(have, need)}/{need}
        </dd>
      </div>
      <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", met ? "bg-foreground" : "bg-foreground/40")}
          style={{ width: `${Math.min(100, (have / need) * 100)}%` }}
        />
      </div>
      <p className="text-[11.5px] text-muted-foreground">{note}</p>
    </div>
  );
}

/**
 * Why the taste is not drawable yet, and what to do about it. `enough` is two
 * conditions on the backend (>= 5 ratings AND >= 3 axes with evidence), so
 * ratings alone never explained it: a reader past 5 ratings with thin axis
 * coverage was asked to "rate 0 more books". Both numbers are in the payload,
 * so name the one that is actually short.
 */
function NotEnoughYet({ data, onRate }: { data: Dashboard; onRate: () => void }) {
  const ratingsShort = Math.max(0, RATINGS_NEEDED - data.books_rated);
  const patternsShort = Math.max(0, PATTERNS_NEEDED - (data.bars?.length ?? 0));

  return (
    <>
      <p className="text-sm text-muted-foreground">
        Not enough to draw this honestly yet. It needs both of these:
      </p>

      <dl className="mt-4 flex flex-col gap-3">
        <Requirement
          label="Books you've rated"
          have={data.books_rated}
          need={RATINGS_NEEDED}
          note={ratingsShort > 0 ? `${ratingsShort} more to go` : "Enough — this part is done"}
        />
        <Requirement
          label="Patterns we can back up"
          have={data.bars?.length ?? 0}
          need={PATTERNS_NEEDED}
          note={
            patternsShort > 0
              ? "Your ratings so far point in too many directions to call"
              : "Enough — this part is done"
          }
        />
      </dl>

      <p className="mt-4 text-sm text-muted-foreground">
        {ratingsShort > 0
          ? `Rate ${ratingsShort} more book${ratingsShort === 1 ? "" : "s"} you've finished. Ratings are the only thing this reads — shelving a book doesn't count.`
          : "Keep rating the books you finish, and rate across the kinds of books you actually read. A pattern only shows up once several ratings agree on it."}
      </p>

      <button
        type="button"
        onClick={onRate}
        className="mt-5 inline-flex items-center rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-85"
      >
        Rate your books
      </button>
    </>
  );
}

/** The taste itself, once there is enough behind it to draw. */
function TasteBody({ data }: { data: Dashboard }) {
  return (
    <div className="flex flex-col gap-5">
      <ul className="flex flex-col gap-2">
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
    </div>
  );
}

export function TasteDashboard({ className, serifClass }: { className?: string; serifClass?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = React.useState<Dashboard | null>(null);
  const [open, setOpen] = React.useState(false);

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

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-foreground transition-colors"
      >
        <Fingerprint className="h-4 w-4" />
        Your reading taste
        {!data.enough && (
          <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            not yet
          </span>
        )}
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-border shrink-0">
            <DialogTitle className={cn(serifClass, "text-xl font-semibold")}>
              {data.enough ? "You tend to love" : "Your reading taste"}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 py-5">
            {data.enough ? (
              <TasteBody data={data} />
            ) : (
              <NotEnoughYet
                data={data}
                onRate={() => {
                  setOpen(false);
                  router.push(`${pathname}?tab=Bookshelf`);
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
