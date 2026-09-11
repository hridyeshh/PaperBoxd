"use client";

// Social proof for the book page. Every claim here is counted off the shelf by
// GET /api/v1/books/{id}/social — nothing is illustrative, and each block hides
// itself when the data does not support a claim.

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { BookSocial, BookSocialFriend, BookSocialList } from "@/hooks/use-book-social";
import { friendsSentence } from "@/hooks/use-book-social";

/** Google's averages arrive as raw floats (4.6041665); one decimal is plenty. */
function oneDecimal(v: number | null | undefined): string | null {
  if (v == null || isNaN(v)) return null;
  return (Math.round(v * 10) / 10).toFixed(1);
}

function hue(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 360;
  return h;
}

function Avatar({ src, name, size = 28 }: { src: string | null; name: string; size?: number }) {
  if (src) {
    return (
      <div className="relative rounded-full overflow-hidden shrink-0" style={{ width: size, height: size }}>
        <Image src={src} alt={name} fill className="object-cover" sizes={`${size}px`} unoptimized />
      </div>
    );
  }
  return (
    <div
      className="rounded-full shrink-0 flex items-center justify-center text-white font-semibold"
      style={{ width: size, height: size, background: `hsl(${hue(name)},45%,55%)`, fontSize: size * 0.4 }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function statusLine(f: BookSocialFriend): string {
  if (f.rating) return "★".repeat(f.rating);
  if (f.status === "read") return "Read";
  if (f.status === "reading") return f.currentPage ? `p.${f.currentPage}` : "Reading";
  return "Wants to read";
}

/**
 * "3 people you follow have read this · 2 rated it 4★ or higher", with faces.
 * Renders nothing for signed-out readers or when nobody the viewer follows has
 * touched the book.
 */
export function FriendsProof({ social, className }: { social: BookSocial; className?: string }) {
  const sentence = friendsSentence(social);
  if (!sentence) return null;
  const shown = social.friends.slice(0, 6);

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-4", className)}>
      <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-3">
        People you follow
      </div>
      <p className="text-sm text-foreground leading-snug">{sentence}</p>
      <div className="flex flex-wrap gap-3 mt-3">
        {shown.map((f) => (
          <Link
            key={f.userId}
            href={`/u/${f.username}`}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <Avatar src={f.avatarUrl} name={f.name} />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-foreground truncate max-w-[110px]">{f.name}</div>
              <div className="text-[0.625rem] text-muted-foreground">{statusLine(f)}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

/**
 * The Paperboxd rating: our readers' average plus a real histogram. Falls back
 * to the publisher's number — labelled as such — until enough Paperboxd
 * ratings exist to average.
 */
export function ReaderRating({
  social,
  publisherRating,
  publisherRatingsCount,
  serifClass,
}: {
  social: BookSocial;
  publisherRating?: number;
  publisherRatingsCount?: number;
  serifClass?: string;
}) {
  const { rating, ratingsCount, histogram } = social.readers;
  const hasOwn = rating != null && ratingsCount > 0;
  const total = histogram.reduce((a, b) => a + b, 0);
  const shown = oneDecimal(hasOwn ? rating : publisherRating);

  return (
    <>
      <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
        {hasOwn ? "Paperboxd rating" : "Publisher rating"}
      </div>
      <div className="flex items-center gap-3">
        <div className={cn(serifClass, "text-[2rem] font-extrabold leading-none tracking-tight")}>
          {shown ?? "—"}
          <small className="text-base text-muted-foreground font-normal">/5</small>
        </div>
        {hasOwn && total > 0 && (
          <div className="flex flex-col-reverse gap-0.5 flex-1 min-w-[64px]">
            {histogram.map((count, i) => (
              <div key={i} className="flex items-center gap-1.5 text-[0.5rem] text-muted-foreground">
                <span className="w-5">{i + 1}★</span>
                <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((count / total) * 100)}%`,
                      background: i >= 3 ? "#a8893f" : i >= 2 ? "#b85c38" : "#7a7264",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className={cn(serifClass, "text-[0.6875rem] text-muted-foreground mt-1")} style={{ fontStyle: "italic" }}>
        {hasOwn
          ? `${ratingsCount.toLocaleString()} ${ratingsCount === 1 ? "rating" : "ratings"} on Paperboxd`
          : publisherRatingsCount
          ? `${publisherRatingsCount.toLocaleString()} ratings · not from Paperboxd`
          : "No ratings yet"}
      </div>
    </>
  );
}

/**
 * Shelf activity: reads, in-progress, and TBR adds this month. Only the
 * non-zero numbers appear, and the 30-day line needs a handful of adds before
 * it means anything.
 */
export function ShelfActivity({ social, className }: { social: BookSocial; className?: string }) {
  const { reads, reading, tbr, tbr30d } = social.readers;
  const facts: string[] = [];
  if (reads > 0) facts.push(`${reads} ${reads === 1 ? "reader has" : "readers have"} finished it`);
  if (reading > 0) facts.push(`${reading} reading now`);
  if (tbr > 0) facts.push(`${tbr} on a TBR`);
  if (!facts.length) return null;

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-4", className)}>
      <div className="text-[0.625rem] uppercase tracking-[0.12em] text-muted-foreground font-semibold mb-2">
        On Paperboxd
      </div>
      <p className="text-sm text-foreground leading-snug">{facts.join(" · ")}</p>
      {tbr30d >= 3 && (
        <p className="text-xs text-muted-foreground mt-1.5">
          {tbr30d} readers added it to their TBR this month.
        </p>
      )}
    </div>
  );
}

function ListCard({ list }: { list: BookSocialList }) {
  const covers = list.coverUrls.slice(0, 3);
  return (
    <Link
      href={`/u/${list.username}/lists/${list.id}`}
      className="flex gap-4 items-center p-4 rounded-2xl border border-border bg-card hover:border-border/60 hover:shadow-sm transition-all"
    >
      <div className="relative shrink-0" style={{ width: 84, height: 78 }}>
        {covers.length > 0 ? (
          covers.map((c, i) => (
            <div
              key={i}
              className="absolute rounded overflow-hidden shadow-md"
              style={{ left: i * 16, top: i * 4, width: 48, aspectRatio: "2/3", zIndex: 3 - i }}
            >
              <Image src={c} alt="" fill className="object-cover" sizes="48px" unoptimized />
            </div>
          ))
        ) : (
          <div className="w-12 rounded bg-muted" style={{ aspectRatio: "2/3" }} />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-foreground line-clamp-2">{list.title}</div>
        <div className="flex items-center gap-2 mt-2">
          <Avatar src={list.avatarUrl} name={list.ownerName} size={20} />
          <span className="text-xs text-muted-foreground truncate">{list.ownerName}</span>
        </div>
        <div className="text-[0.625rem] uppercase tracking-[0.1em] text-muted-foreground mt-1.5">
          {list.bookCount} books{list.saveCount > 0 ? ` · saved ${list.saveCount}×` : ""}
        </div>
      </div>
    </Link>
  );
}

/** The Lists tab: public lists this book appears in. */
export function BookLists({ social, loaded, serifClass }: { social: BookSocial; loaded: boolean; serifClass?: string }) {
  if (!loaded) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
        {[0, 1].map((i) => (
          <div key={i} className="h-[110px] rounded-2xl border border-border bg-card animate-pulse" />
        ))}
      </div>
    );
  }
  if (social.lists.length === 0) {
    return (
      <div className="mb-8 flex items-center justify-center py-16">
        <div className="text-center">
          <p className={cn(serifClass, "text-lg text-muted-foreground")} style={{ fontStyle: "italic" }}>
            Not in any public list yet
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Add it to one of yours and it shows up here.
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-8">
      {social.lists.map((l) => (
        <ListCard key={l.id} list={l} />
      ))}
    </div>
  );
}
