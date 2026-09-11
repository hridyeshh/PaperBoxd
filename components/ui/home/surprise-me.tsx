"use client";

import * as React from "react";
import { Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { trackRecClick } from "@/hooks/use-rec-impression";

type Surprise = {
  mode: string;
  label: string;
  because: string;
  book: { id: string; title: string; authors: string[]; cover_url: string; reason?: string; reasonType?: string };
};

/**
 * ✨ Surprise me. One book, one framing, one reason. The mode is chosen on
 * the server (weighted toward safe) so the button is fun before it is risky;
 * a reader who wants a specific kind of surprise can pick it after the first.
 */
export function SurpriseMe({ className, serifClass }: { className?: string; serifClass?: string }) {
  const router = useRouter();
  const [result, setResult] = React.useState<Surprise | null>(null);
  const [loading, setLoading] = React.useState(false);

  const roll = async (mode?: string) => {
    setLoading(true);
    try {
      const r = await fetch(`/api/recommendations/surprise${mode ? `?mode=${mode}` : ""}`);
      if (r.ok) {
        const d = (await r.json()) as { surprise: Surprise | null };
        setResult(d.surprise);
      }
    } catch {
      // keep whatever was showing
    } finally {
      setLoading(false);
    }
  };

  if (!result) {
    return (
      <button
        type="button"
        onClick={() => roll()}
        disabled={loading}
        className={cn(
          "inline-flex items-center gap-2 rounded-full border border-border px-4 py-2 text-sm hover:border-foreground transition-colors disabled:opacity-60",
          className
        )}
      >
        <Sparkles className="h-4 w-4" />
        {loading ? "Thinking…" : "Surprise me"}
      </button>
    );
  }

  const b = result.book;
  return (
    <section className={cn("rounded-2xl border border-border bg-card p-4 flex gap-4", className)}>
      <button
        type="button"
        onClick={() => {
          trackRecClick(b.id, `surprise_${result.mode}`);
          router.push(`/b/${b.id}`);
        }}
        className="relative h-36 w-24 shrink-0 overflow-hidden rounded-md bg-muted"
        aria-label={`Open ${b.title}`}
      >
        {b.cover_url && <Image src={b.cover_url} alt="" fill className="object-cover" sizes="96px" unoptimized />}
      </button>
      <div className="min-w-0 flex flex-col">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">{result.label}</span>
        <h3 className={cn(serifClass, "mt-0.5 text-lg font-semibold leading-tight line-clamp-2")}>{b.title}</h3>
        <p className="text-xs text-muted-foreground truncate">{b.authors?.[0]}</p>
        <p className="mt-2 text-sm leading-snug">{result.because}</p>
        <div className="mt-auto flex flex-wrap gap-1.5 pt-3">
          {(["safe", "unexpected", "gem", "obsession", "wild"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => roll(m)}
              disabled={loading}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[11px] transition-colors disabled:opacity-60",
                m === result.mode
                  ? "border-foreground bg-foreground text-background"
                  : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
              )}
            >
              {m === "gem" ? "hidden gem" : m === "obsession" ? "next obsession" : m}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
