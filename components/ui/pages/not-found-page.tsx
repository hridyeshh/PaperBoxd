"use client";

// 404 — "Out of print". A void of drifting real book covers in CSS 3D,
// falling numerals, an out-of-print stamp, and a lost-&-found rail.
// Port of the design prototype's web/404.jsx.

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { BooksContext, useBooks, useLandingBooks, coverBg, type LandingBook } from "@/components/ui/landing/books";
import { LandingNav, WebFooter, WEB_NAV_LINKS } from "@/components/ui/landing/web-chrome";
import { useTilt } from "@/components/ui/landing/web-sections";

const LOST: { t: string; s: string; h: string }[] = [
  { t: "Your diary", s: "Everything you logged, in order.", h: "/profile" },
  { t: "Popular lists", s: "\"Books that ruined me\", and whatever else people made.", h: "/search" },
  { t: "Vibe search", s: "Describe a feeling, get a book.", h: "/search" },
  { t: "Leaderboard", s: "See who actually finished it.", h: "/leaderboard" },
];

type FieldItem = {
  book: LandingBook;
  w: number; h: number; a: number; r: number; y: number;
  tilt: number; roll: number; dim: number;
};

// Browsers round inline-style numbers when parsing (104.08915565662755px is
// stored as 104.089px), so full-precision values fail hydration. Round every
// number that reaches a style attribute to something both sides agree on.
const r3 = (n: number) => Math.round(n * 1000) / 1000;

// Deterministic pseudo-random scatter so re-renders stay stable per seed.
function field(books: LandingBook[], seed: number, count: number, spread: number): FieldItem[] {
  const rnd = (i: number, k: number) => {
    const x = Math.sin((i + 1) * (12.9898 + seed * 0.37) + k * 78.233 + seed * 4.1) * 43758.5453;
    return x - Math.floor(x);
  };
  return Array.from({ length: count }, (_, i) => {
    const w = 46 + rnd(i, 4) * 66;
    return {
      book: books[i % books.length],
      w: r3(w),
      h: r3(w * 1.5),
      a: r3(rnd(i, 1) * 360),
      r: r3(spread * (0.42 + rnd(i, 2) * 0.72)),
      y: r3((rnd(i, 3) - 0.5) * spread * 1.15),
      tilt: r3((rnd(i, 5) - 0.5) * 46),
      roll: r3((rnd(i, 6) - 0.5) * 30),
      dim: r3(0.5 + rnd(i, 7) * 0.5),
    };
  });
}

function LostScene({ seed }: { seed: number }) {
  const books = useBooks();
  const rings = useMemo(
    () => [
      { cls: "", items: field(books, seed, 16, 520) },
      { cls: " pbw-404__orbit--b", items: field(books, seed + 7, 12, 760) },
    ],
    [books, seed]
  );
  return (
    <>
      {rings.map((ring, ri) => (
        <div key={ri} className={"pbw-404__orbit" + ring.cls}>
          {ring.items.map((c, i) => (
            <div
              key={i}
              className="pbw-404__cover"
              style={{
                width: c.w,
                height: c.h,
                background: coverBg(c.book),
                opacity: c.dim,
                filter: c.w < 62 ? "blur(1.4px)" : "none",
                transform: `translate(-50%,-50%) rotateY(${c.a}deg) translateZ(${c.r}px) translateY(${c.y}px) rotateZ(${c.roll}deg) rotateX(${c.tilt}deg)`,
                transition: "transform 1.1s cubic-bezier(.2,.8,.2,1), opacity .8s",
              }}
            >
              {c.w > 70 && !c.book.src ? c.book.t : ""}
            </div>
          ))}
        </div>
      ))}
    </>
  );
}

function NotFoundScene() {
  const [seed, setSeed] = useState(1);
  const [, tiltVars] = useTilt({ ampX: 7, ampY: 16, baseX: 9, baseY: 0, global: true });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") setSeed((s) => s + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <section className="pbw-404" data-nav-dark onClick={() => setSeed((s) => s + 1)}>
      <div className="pbw-404__scene">
        <div className="pbw-404__stage" style={tiltVars}>
          <LostScene seed={seed} />
        </div>
      </div>
      <div className="pbw-404__glow" />
      <div className="pbw-404__vig" />

      <div className="pbw-404__inner">
        <div className="pbw-kicker pbw-kicker--inv" style={{ marginBottom: 26 }}>Error 404 · shelf not found</div>
        <div style={{ position: "relative", display: "inline-block" }}>
          <h1 className="pbw-404__num">
            {["4", "0", "4"].map((d, i) => (
              <span key={i} style={{ animationDelay: `${0.15 + i * 0.14}s` }}>{d}</span>
            ))}
          </h1>
          <div className="pbw-404__stamp">Out of print</div>
        </div>
        <p className="pbw-404__lede">
          This page came off the shelf. Somebody borrowed it, never logged it, and the spine
          is nowhere in the stacks. Happens to the best editions.
        </p>
        <div className="pbw-404__row">
          <Link className="pbw-pill pbw-pill--invert" href="/" onClick={(e) => e.stopPropagation()}>
            Back to the shelf
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14M13 5l7 7-7 7" /></svg>
          </Link>
          <button
            className="pbw-pill pbw-pill--dark-ghost"
            onClick={(e) => { e.stopPropagation(); setSeed((s) => s + 1); }}
          >
            Reshuffle the void
          </button>
        </div>
      </div>

      <div className="pbw-lost pbw-in" style={{ animationDelay: "1.35s" }}>
        <div className="pbw-lost__h">Lost &amp; found — try one of these</div>
        <div className="pbw-lost__grid">
          {LOST.map((l) => (
            <Link key={l.t} className="pbw-lost__card" href={l.h} onClick={(e) => e.stopPropagation()}>
              <span className="pbw-lost__ttl">{l.t}</span>
              <span className="pbw-lost__sub">{l.s}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="pbw-404__hint">Click anywhere to shuffle the void</div>
    </section>
  );
}

export function NotFoundPage() {
  const { books } = useLandingBooks();
  return (
    <BooksContext.Provider value={books}>
      <LandingNav links={WEB_NAV_LINKS} forceDark />
      <main style={{ background: "#0a0a0a" }}>
        <NotFoundScene />
      </main>
      <WebFooter />
    </BooksContext.Provider>
  );
}
