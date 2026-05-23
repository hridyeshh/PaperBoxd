"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Auth } from "@/components/ui/auth/auth-form-1";
import { Pinyon_Script } from "next/font/google";
import { cn } from "@/lib/utils";

// WebGL canvas — must be client-only (no SSR)
const ShaderBackground = dynamic(
  () => import("@/components/ui/features/shader-background").then((m) => ({ default: m.ShaderBackground })),
  { ssr: false, loading: () => null }
);

const pinyonScript = Pinyon_Script({ weight: "400", subsets: ["latin"], display: "swap" });

// Open Library cover URLs for well-known books
const BOOK_COVERS = [
  "https://covers.openlibrary.org/b/isbn/9780439708180-L.jpg", // Harry Potter 1
  "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg", // 1984
  "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg", // Great Gatsby
  "https://covers.openlibrary.org/b/isbn/9780061935466-L.jpg", // To Kill a Mockingbird
  "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg", // Pride and Prejudice
  "https://covers.openlibrary.org/b/isbn/9780062315007-L.jpg", // The Alchemist
  "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg", // Dune
  "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg", // Hunger Games
  "https://covers.openlibrary.org/b/isbn/9780345391803-L.jpg", // Hitchhiker's Guide
  "https://covers.openlibrary.org/b/isbn/9781451626650-L.jpg", // Catch-22
  "https://covers.openlibrary.org/b/isbn/9780385490818-L.jpg", // Handmaid's Tale
  "https://covers.openlibrary.org/b/isbn/9781451673319-L.jpg", // Fahrenheit 451
  "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg", // Sapiens
  "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg", // Gone Girl
  "https://covers.openlibrary.org/b/isbn/9780307454546-L.jpg", // Girl w/ Dragon Tattoo
  "https://covers.openlibrary.org/b/isbn/9780316769174-L.jpg", // Catcher in the Rye
  "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg", // Brave New World
  "https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg", // The Road
  "https://covers.openlibrary.org/b/isbn/9781594631931-L.jpg", // Kite Runner
  "https://covers.openlibrary.org/b/isbn/9780375842207-L.jpg", // The Book Thief
  "https://covers.openlibrary.org/b/isbn/9780316160179-L.jpg", // Twilight
  "https://covers.openlibrary.org/b/isbn/9780679745587-L.jpg", // Anna Karenina
  "https://covers.openlibrary.org/b/isbn/9780156027328-L.jpg", // Life of Pi
  "https://covers.openlibrary.org/b/isbn/9780307474278-L.jpg", // The Da Vinci Code
  "https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg", // Becoming
  "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg", // Educated
  "https://covers.openlibrary.org/b/isbn/9781594483851-L.jpg", // A Thousand Splendid Suns
  "https://covers.openlibrary.org/b/isbn/9780618640157-L.jpg", // Lord of the Rings
  "https://covers.openlibrary.org/b/isbn/9780486415871-L.jpg", // Crime and Punishment
  "https://covers.openlibrary.org/b/isbn/9780385737951-L.jpg", // The Maze Runner
  "https://covers.openlibrary.org/b/isbn/9780439064873-L.jpg", // Harry Potter 2
  "https://covers.openlibrary.org/b/isbn/9780439136365-L.jpg", // Harry Potter 3
];

function CoverColumn({
  direction,
  speed,
  covers,
}: {
  direction: "up" | "down";
  speed: number;
  covers: string[];
}) {
  const doubled = [...covers, ...covers];
  return (
    <div className="relative flex-1 overflow-hidden">
      <div
        className={direction === "up" ? "animate-auth-scroll-up" : "animate-auth-scroll-down"}
        style={{ animationDuration: `${speed}s` }}
      >
        {doubled.map((src, i) => (
          <div
            key={i}
            className="w-full mb-2 rounded-md overflow-hidden"
            style={{ aspectRatio: "2/3" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={src}
              alt=""
              className="w-full h-full object-cover"
              loading={i < 8 ? "eager" : "lazy"}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AuthPage() {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const gradientVariant = isDark ? "warm-dark" : "warm";

  // Distribute 32 covers across 4 columns, offset so columns look varied
  const col1 = BOOK_COVERS.slice(0, 8);
  const col2 = BOOK_COVERS.slice(7, 16);
  const col3 = BOOK_COVERS.slice(14, 23);
  const col4 = BOOK_COVERS.slice(22, 32);

  return (
    <main className="fixed inset-0 flex overflow-hidden bg-background">
      {/* ── Left panel: dark book-cover mosaic ── */}
      <div
        className="relative hidden md:block flex-shrink-0 overflow-hidden"
        style={{ width: "54%", background: "#0c0a0a" }}
      >
        {/* Scrolling book columns */}
        <div className="absolute inset-0 flex gap-2 px-2">
          <CoverColumn direction="up" speed={50} covers={col1} />
          <CoverColumn direction="down" speed={68} covers={col2} />
          <CoverColumn direction="up" speed={42} covers={col3} />
          <CoverColumn direction="down" speed={58} covers={col4} />
        </div>

        {/* Top fade */}
        <div
          className="absolute inset-x-0 top-0 h-28 pointer-events-none z-10"
          style={{ background: "linear-gradient(to bottom, #0c0a0a, transparent)" }}
        />
        {/* Bottom fade */}
        <div
          className="absolute inset-x-0 bottom-0 h-52 pointer-events-none z-10"
          style={{ background: "linear-gradient(to top, #0c0a0a, transparent)" }}
        />
        {/* Right edge fade */}
        <div
          className="absolute inset-y-0 right-0 w-20 pointer-events-none z-10"
          style={{ background: "linear-gradient(to right, transparent, #0c0a0a)" }}
        />

        {/* Wordmark */}
        <div className="absolute bottom-8 left-8 z-20 select-none">
          <p className={cn("text-[2.6rem] leading-none text-white", pinyonScript.className)}>
            PaperBoxd
          </p>
          <p className="mt-1 text-[10px] uppercase tracking-[0.22em] text-white/40 font-medium">
            Your reading universe
          </p>
        </div>
      </div>

      {/* ── Right panel: form ── */}
      <div
        className="flex-1 relative overflow-y-auto flex items-start md:items-center justify-center px-5 md:px-6 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:pt-12 md:pb-12"
      >
        {/* Shader gradient — full-bleed on mobile, inset frame on desktop */}
        <div
          className="absolute inset-0 md:inset-5 md:rounded-[2rem] pointer-events-none z-0 overflow-hidden md:shadow-[0_4px_32px_oklch(0.62_0.08_38/0.12)]"
        >
          <ShaderBackground variant={gradientVariant} />
        </div>

        <div className="w-full max-w-[420px] relative z-10">
          {/* Mobile-only wordmark */}
          <div className="mb-6 md:hidden text-center select-none">
            <p className={cn("text-[2rem] leading-none text-foreground", pinyonScript.className)}>
              PaperBoxd
            </p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.22em] text-muted-foreground/70 font-medium">
              Your reading universe
            </p>
          </div>

          <Auth />
        </div>
      </div>
    </main>
  );
}
