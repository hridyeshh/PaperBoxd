"use client";

import * as React from "react";
import { Check, Clock, Heart, ThumbsDown, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Per-recommendation feedback.
 *
 * A rating requires having read the book, so before this the only thing a
 * reader could tell the engine about a recommendation was silence — and silence
 * is ambiguous. "I scrolled past it", "I already own it" and "this is not the
 * kind of book I read" are three different statements that all looked the same.
 *
 * The reason chips matter more than the verdict. "Not for me" narrows the pool
 * a little; "not for me, too slow" is a measurement on one axis and is what
 * lets the engine learn "you like this genre, but not at this pace" rather than
 * dropping the genre wholesale.
 */

export type Verdict = "loved" | "maybe" | "not_for_me" | "already_read" | "not_now";

const VERDICTS: { id: Verdict; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "loved", label: "Love it", icon: Heart },
  { id: "maybe", label: "Maybe", icon: Clock },
  { id: "not_for_me", label: "Not for me", icon: ThumbsDown },
  { id: "already_read", label: "Already read", icon: Check },
  { id: "not_now", label: "Not now", icon: X },
];

/**
 * Kept in sync with service.FeedbackReasonCodes on the backend. Only the codes
 * that map to a trait axis are worth surfacing first — those are the ones that
 * teach the engine something specific rather than just registering displeasure.
 */
const REASONS: { id: string; label: string }[] = [
  { id: "too_slow", label: "Too slow" },
  { id: "too_long", label: "Too long" },
  { id: "too_dark", label: "Too dark" },
  { id: "too_romance", label: "Too much romance" },
  { id: "too_much_worldbuilding", label: "Too much worldbuilding" },
  { id: "too_complex", label: "Too complicated" },
  { id: "wrong_genre", label: "Wrong genre" },
  { id: "wrong_mood", label: "Wrong mood" },
  { id: "dislike_author", label: "Not this author" },
  { id: "dislike_premise", label: "Premise doesn't grab me" },
];

async function send(bookId: string, verdict: Verdict, reasonCodes: string[], reasonType?: string) {
  try {
    await fetch("/api/recommendations/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        book_id: bookId,
        verdict,
        reason_codes: reasonCodes,
        reason_type: reasonType,
      }),
      keepalive: true,
    });
  } catch {
    // Fire-and-forget: a failed write must not block the card.
  }
}

export function RecFeedback({
  bookId,
  reasonType,
  onResolved,
  className,
}: {
  bookId: string;
  reasonType?: string;
  /** Called once the card can be removed from the rail. */
  onResolved?: (verdict: Verdict) => void;
  className?: string;
}) {
  const [verdict, setVerdict] = React.useState<Verdict | null>(null);
  const [codes, setCodes] = React.useState<string[]>([]);
  const [done, setDone] = React.useState(false);

  // "Not for me" is the only verdict worth a follow-up question. Asking after
  // "love it" would tax the one answer we most want people to give.
  const asksWhy = verdict === "not_for_me";

  const choose = (v: Verdict) => {
    setVerdict(v);
    void send(bookId, v, [], reasonType);
    if (v !== "not_for_me") {
      setDone(true);
      onResolved?.(v);
    }
  };

  const toggleCode = (id: string) => {
    const next = codes.includes(id) ? codes.filter((c) => c !== id) : [...codes, id];
    setCodes(next);
    // Resend with the refined reason rather than waiting for a submit button:
    // the verdict is already recorded, this only sharpens it, and an extra tap
    // is how optional feedback stops being given.
    if (verdict) void send(bookId, verdict, next, reasonType);
  };

  if (done) {
    return (
      <p className={cn("text-[11px] text-muted-foreground", className)}>
        Thanks — noted.
      </p>
    );
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap gap-1.5">
        {VERDICTS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            aria-pressed={verdict === id}
            onClick={() => choose(id)}
            className={cn(
              "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] transition-colors",
              verdict === id
                ? "border-foreground bg-foreground text-background"
                : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            <Icon className="h-3 w-3" />
            {label}
          </button>
        ))}
      </div>

      {asksWhy && (
        <div className="flex flex-col gap-1.5">
          <p className="text-[11px] text-muted-foreground">
            What put you off? Optional, but it stops us suggesting the same shape again.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {REASONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                aria-pressed={codes.includes(id)}
                onClick={() => toggleCode(id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[11px] transition-colors",
                  codes.includes(id)
                    ? "border-foreground bg-foreground text-background"
                    : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              setDone(true);
              onResolved?.("not_for_me");
            }}
            className="self-start text-[11px] underline text-muted-foreground hover:text-foreground"
          >
            Done
          </button>
        </div>
      )}
    </div>
  );
}
