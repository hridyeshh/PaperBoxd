"use client";

import { cn } from "@/lib/utils";

export const AUTH_BOOK_COVERS = [
  "https://covers.openlibrary.org/b/isbn/9780439708180-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780061935466-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781451626650-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307454546-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780316769174-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780316160179-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780679745587-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780156027328-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9781594483851-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780618640157-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780486415871-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780385737951-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780439064873-L.jpg",
  "https://covers.openlibrary.org/b/isbn/9780439136365-L.jpg",
] as const;

function CoverColumn({
  direction,
  speed,
  covers,
}: {
  direction: "up" | "down";
  speed: number;
  covers: readonly string[];
}) {
  const doubled = [...covers, ...covers];
  return (
    <div className="relative min-w-0 flex-1 overflow-hidden">
      <div
        className={direction === "up" ? "animate-auth-scroll-up" : "animate-auth-scroll-down"}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((src, i) => (
          <div
            key={`${src}-${i}`}
            className="mb-1.5 w-full overflow-hidden rounded-md md:mb-2"
            style={{ aspectRatio: "2/3" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="h-full w-full object-cover"
              loading={i < 8 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

const COL1 = AUTH_BOOK_COVERS.slice(0, 8);
const COL2 = AUTH_BOOK_COVERS.slice(7, 16);
const COL3 = AUTH_BOOK_COVERS.slice(14, 23);
const COL4 = AUTH_BOOK_COVERS.slice(22, 32);

/** Four scrolling cover columns (same as desktop auth left panel). */
export function AuthBookColumns({ className }: { className?: string }) {
  return (
    <div className={cn("absolute inset-0 flex gap-1.5 px-1.5 md:gap-2 md:px-2", className)}>
      <CoverColumn direction="up" speed={50} covers={COL1} />
      <CoverColumn direction="down" speed={68} covers={COL2} />
      <CoverColumn direction="up" speed={42} covers={COL3} />
      <CoverColumn direction="down" speed={58} covers={COL4} />
    </div>
  );
}

/** Compact strip for mobile auth form — same slot as the former video preview. */
export function AuthBookColumnsStrip({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "relative aspect-[16/10] max-h-[26vh] w-full overflow-hidden rounded-2xl",
        className
      )}
      style={{ background: "#0c0a0a" }}
    >
      <div className="absolute left-1/2 top-1/2 h-[150%] w-[150%] -translate-x-1/2 -translate-y-1/2 -rotate-45">
        <div className="flex h-full gap-1 px-1">
          <CoverColumn direction="up" speed={28} covers={COL1} />
          <CoverColumn direction="down" speed={36} covers={COL2} />
          <CoverColumn direction="up" speed={24} covers={COL3} />
          <CoverColumn direction="down" speed={32} covers={COL4} />
        </div>
      </div>
      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-10"
        style={{ background: "linear-gradient(to bottom, #0c0a0a, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10"
        style={{ background: "linear-gradient(to top, #0c0a0a, transparent)" }}
      />
    </div>
  );
}

/** Dark mosaic panel with edge fades — desktop auth left panel. */
export function AuthBookColumnsPanel({
  className,
  showWordmark = false,
  wordmarkClassName,
  taglineClassName,
}: {
  className?: string;
  showWordmark?: boolean;
  wordmarkClassName?: string;
  taglineClassName?: string;
}) {
  return (
    <div
      className={cn("relative overflow-hidden", className)}
      style={{ background: "#0c0a0a" }}
    >
      <AuthBookColumns />

      <div
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 md:h-28"
        style={{ background: "linear-gradient(to bottom, #0c0a0a, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-32 md:h-52"
        style={{ background: "linear-gradient(to top, #0c0a0a, transparent)" }}
      />
      <div
        className="pointer-events-none absolute inset-y-0 right-0 z-10 hidden w-20 md:block"
        style={{ background: "linear-gradient(to right, transparent, #0c0a0a)" }}
      />

      {showWordmark && (
        <div className="absolute bottom-8 left-8 z-20 hidden select-none md:block">
          <p className={wordmarkClassName}>PaperBoxd</p>
          <p className={taglineClassName}>Your reading universe</p>
        </div>
      )}
    </div>
  );
}
