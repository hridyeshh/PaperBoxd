"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import Link from "next/link";
import {
  BooksContext,
  useBooks,
  useLandingBooks,
  coverBg,
  type LandingBook,
} from "@/components/ui/landing/books";
import { LandingNav, LandingFooter } from "@/components/ui/landing/web-chrome";
import { CasesGrid, FAQDigest, PBW_CASES, PBW_ARROW } from "@/components/ui/landing/web-sections";

const FRIENDS = [
  { u: "maya.r", n: "Maya", g: "linear-gradient(135deg,#d97757,#6b3520)" },
  { u: "hridyesh", n: "Hridyesh", g: "linear-gradient(135deg,#5b8db8,#1f3c5c)" },
  { u: "anais", n: "Anaïs", g: "linear-gradient(135deg,#9a4570,#4a1f38)" },
  { u: "jake.b", n: "Jake", g: "linear-gradient(135deg,#7ba05b,#2e4520)" },
  { u: "omar", n: "Omar", g: "linear-gradient(135deg,#c79a3a,#5a4218)" },
  { u: "lin", n: "Lin", g: "linear-gradient(135deg,#6f5b8e,#2f243f)" },
];

// ── Hooks ────────────────────────────────────────────────────────────────────

function useScrollY() {
  const [y, setY] = useState(0);
  useEffect(() => {
    let raf = 0;
    const on = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => { raf = 0; setY(window.scrollY); });
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => { window.removeEventListener("scroll", on); if (raf) cancelAnimationFrame(raf); };
  }, []);
  return y;
}

function useScrollRange(ref: React.RefObject<HTMLElement | null>) {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        const vh = window.innerHeight;
        const total = r.height + vh;
        const past = vh - r.top;
        let prog = past / total;
        if (prog < 0) prog = 0;
        if (prog > 1) prog = 1;
        setP(prog);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [ref]);
  return p;
}

function useReveals() {
  useEffect(() => {
    const els = document.querySelectorAll(".lp-reveal");
    if (!("IntersectionObserver" in window)) {
      els.forEach((e) => e.classList.add("is-in"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("is-in");
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);
}

// ── Sphere ────────────────────────────────────────────────────────────────────

interface SphereProps {
  size?: number;
  count?: number;
  coverW?: number;
  spin?: number;
}

function Sphere({ size = 460, count = 18, coverW = 60, spin = 60 }: SphereProps) {
  const books = useBooks();
  const radius = size / 2.3;
  const items = [];
  for (let i = 0; i < count; i++) {
    const cover = books[i % books.length];
    const angleY = (i / count) * 360;
    const lat = Math.sin(i * 1.3) * 40;
    items.push(
      <div
        key={i}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: coverW,
          height: coverW * 1.5,
          background: coverBg(cover),
          borderRadius: 4,
          boxShadow: "0 4px 12px rgba(0,0,0,.25), inset 0 0 0 1px rgba(255,255,255,.04)",
          display: "flex",
          alignItems: "flex-end",
          padding: 6,
          fontSize: 8,
          color: "rgba(255,255,255,0.7)",
          fontFamily: '"Playfair Display", serif',
          fontWeight: 600,
          lineHeight: 1.2,
          whiteSpace: "pre-line",
          overflow: "hidden",
          filter: "brightness(0.78) saturate(0.9)",
          transform: `translate(-50%,-50%) rotateY(${angleY}deg) translateZ(${radius}px) translateY(${lat}px) rotateY(${-angleY}deg)`,
        }}
      >
        {cover.src ? "" : cover.t}
      </div>
    );
  }
  const inner = [];
  const innerCount = Math.floor(count * 0.6);
  for (let i = 0; i < innerCount; i++) {
    const cover = books[(i + 4) % books.length];
    const angleY = (i / innerCount) * 360 + 20;
    inner.push(
      <div
        key={"i" + i}
        style={{
          position: "absolute",
          left: "50%",
          top: "50%",
          width: coverW * 0.7,
          height: coverW * 0.7 * 1.5,
          background: coverBg(cover),
          borderRadius: 4,
          opacity: 0.5,
          boxShadow: "0 4px 12px rgba(0,0,0,.25)",
          display: "flex",
          alignItems: "flex-end",
          padding: 4,
          fontSize: 7,
          color: "rgba(255,255,255,0.7)",
          fontFamily: '"Playfair Display", serif',
          overflow: "hidden",
          filter: "brightness(0.78) saturate(0.9)",
          transform: `translate(-50%,-50%) rotateY(${angleY}deg) rotateX(72deg) translateZ(${radius * 0.55}px) translateY(${-radius * 0.18}px) rotateX(-72deg) rotateY(${-angleY}deg)`,
        }}
      >
        {cover.src ? "" : cover.t}
      </div>
    );
  }
  return (
    <div
      style={{
        position: "relative",
        width: size,
        height: size,
        perspective: 1000,
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          animation: `lpSphereSpin ${spin}s linear infinite`,
        }}
      >
        {items}
        {inner}
      </div>
    </div>
  );
}

// ── Nav ───────────────────────────────────────────────────────────────────────

// ── Hero ──────────────────────────────────────────────────────────────────────

function LandingHero() {
  const phrases = [
    "Save the books you've read",
    "Show off your taste",
    "Follow your friends",
    "Get smarter recommendations",
    "Share your collection",
    "Keep a reading diary",
  ];
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setIdx((i) => (i + 1) % phrases.length), 2400);
    return () => clearTimeout(id);
  }, [idx]); // eslint-disable-line react-hooks/exhaustive-deps

  const y = useScrollY();
  const heroH = typeof window !== "undefined" ? window.innerHeight : 800;
  const t = Math.min(1, Math.max(0, y / heroH));
  const scale = 0.7 + t * 1.0;
  const fade = 1 - Math.min(1, t * 1.3);

  const sphereSize =
    typeof window !== "undefined" ? Math.min(window.innerWidth * 0.9, 620) : 620;

  return (
    <section
      style={{
        position: "relative",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "100px 24px 80px",
        overflow: "hidden",
        background: "#fff",
      }}
    >
      {/* Sphere */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          opacity: 0.55 + fade * 0.35,
          transform: `translate(-50%, -50%) scale(${scale})`,
          transition: "opacity .1s linear",
          pointerEvents: "none",
          zIndex: 0,
        }}
      >
        <Sphere size={sphereSize} count={20} coverW={70} spin={70} />
      </div>

      {/* Radial vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at center, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0.6) 30%, rgba(255,255,255,0.3) 55%, rgba(255,255,255,0) 80%)",
          zIndex: 1,
        }}
      />

      {/* Text block */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          textAlign: "center",
          maxWidth: 980,
          opacity: 1 - t * 0.4,
          transform: `translateY(${t * -40}px)`,
        }}
      >
        <div
          style={{
            fontFamily: '"Geist Mono", "JetBrains Mono", monospace',
            fontSize: 11,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(0,0,0,0.4)",
            marginBottom: 36,
          }}
        >
          A reader&apos;s social network
        </div>

        <span
          className="lp-wordmark"
          style={{
            display: "block",
            fontFamily: '"brooklyn-heritage-script", "Pinyon Script", "Dancing Script", cursive',
            fontSize: "clamp(96px, 17vw, 240px)",
            color: "#111",
            lineHeight: 0.85,
            animation: "lpWmIn 1.1s cubic-bezier(.2,.8,.2,1) .15s both",
          }}
        >
          PaperBoxd
        </span>

        {/* Rotating phrase */}
        <div
          style={{
            position: "relative",
            height: "clamp(40px, 6.5vw, 80px)",
            marginTop: 18,
            overflow: "hidden",
          }}
        >
          {phrases.map((p, i) => (
            <div
              key={i}
              style={{
                position: "absolute",
                inset: 0,
                fontFamily: '"cofo-glassier", "Playfair Display", serif',
                fontSize: "clamp(20px, 3.6vw, 44px)",
                fontWeight: 500,
                fontStyle: "italic",
                letterSpacing: "-0.01em",
                color: "rgba(0,0,0,0.62)",
                textAlign: "center",
                transform: `translateY(${idx === i ? 0 : idx > i ? "-100%" : "100%"})`,
                opacity: idx === i ? 1 : 0,
                transition: "transform .6s cubic-bezier(.2,.8,.2,1), opacity .5s",
              }}
            >
              {p}
            </div>
          ))}
        </div>

        <p
          style={{
            margin: "26px auto 32px",
            maxWidth: 560,
            fontSize: "clamp(15px, 1.4vw, 18px)",
            lineHeight: 1.55,
            color: "rgba(0,0,0,0.55)",
          }}
        >
          Your reading universe, organised. Track every book from the procrastination wall to
          finished, keep a diary, share lists, and follow the friends who actually read.
        </p>

        <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
          <Link href="/auth" className="lp-pill lp-pill-primary">
            Start saving your books
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <button
            onClick={() => window.scrollBy({ top: Math.round(window.innerHeight * 0.75), behavior: "smooth" })}
            className="lp-pill lp-pill-ghost"
          >
            Explore
          </button>
        </div>
      </div>

      {/* Scroll hint */}
      <div
        style={{
          position: "absolute",
          bottom: 28,
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "rgba(0,0,0,0.35)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
          opacity: fade * 0.8,
          animation: "lpDriftY 2.6s ease-in-out infinite",
        }}
      >
        Scroll
        <span
          style={{
            width: 1,
            height: 40,
            background: "linear-gradient(to bottom, rgba(0,0,0,0.3), transparent)",
          }}
        />
      </div>
    </section>
  );
}

// ── 3D scroll section ─────────────────────────────────────────────────────────

function Landing3D() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const sectionRef = useRef<HTMLElement>(null);
  const p = useScrollRange(sectionRef);
  const dollyT = Math.min(1, Math.max(0, (p - 0.18) / 0.62));
  const DOLLY_MAX = 1800;
  const dolly = dollyT * DOLLY_MAX;
  const books = useBooks();

  const chapters = [
    {
      eyebrow: "Chapter one",
      h: "Every book you've ever read.",
      em: "Every book you'll ever read.",
      sub: "Track titles from the procrastination wall to finished. Five-star them, save them, write about them.",
    },
    {
      eyebrow: "Chapter two",
      h: "A diary, not a database.",
      em: "Memories, not metadata.",
      sub: "Pages logged, a line written when you feel like it, half-finished books forgiven. PaperBoxd remembers the reading, not just the books.",
    },
    {
      eyebrow: "Chapter three",
      h: "Your friends, between covers.",
      em: "Their taste, your shelves.",
      sub: "See what they're reading. Borrow their lists. Argue politely about the ending.",
    },
  ];
  const chapterIdx = Math.min(2, Math.floor(dollyT * 3));

  const coverField = useMemo(() => {
    const out = [];
    const N = 36;
    let seed = 7;
    const rand = () => {
      seed = (seed * 9301 + 49297) % 233280;
      return seed / 233280;
    };
    for (let i = 0; i < N; i++) {
      const angle = rand() * Math.PI * 2;
      const r = 220 + rand() * 320;
      const x = Math.cos(angle) * r;
      const y = (rand() - 0.5) * 700;
      const z = -1600 + rand() * 1500;
      const rot = (rand() - 0.5) * 18;
      const cover = books[i % books.length];
      const size = 90 + rand() * 110;
      out.push({ x, y, z, rot, cover, size, key: i });
    }
    out.sort((a, b) => a.z - b.z);
    return out;
  }, [books]);

  if (!mounted) {
    return <div style={{ height: "400vh", background: "#0a0a0a" }} />;
  }

  return (
    <section
      ref={sectionRef}
      data-nav-dark
      style={{ position: "relative", height: "400vh", background: "#0a0a0a", color: "#fff" }}
    >
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {/* 3D viewport — isolated so 3D-transformed covers can't bleed above text */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            isolation: "isolate",
            zIndex: 0,
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              perspective: 1200,
              perspectiveOrigin: "50% 50%",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: 0,
                transformStyle: "preserve-3d",
                transform: `translateZ(${dolly}px)`,
              }}
            >
              {coverField.map((c) => {
                const effectiveZ = c.z + dolly;
                let opacity = 1;
                if (effectiveZ > -80) opacity = Math.max(0, 1 - (effectiveZ + 80) / 200);
                if (effectiveZ < -1700) opacity = 0;
                return (
                  <div
                    key={c.key}
                    style={{
                      position: "absolute",
                      left: "50%",
                      top: "50%",
                      opacity,
                      transformStyle: "preserve-3d",
                      willChange: "transform, opacity",
                      transform: `translate(-50%,-50%) translate3d(${c.x}px, ${c.y}px, ${c.z}px) rotate(${c.rot}deg)`,
                    }}
                  >
                    <div
                      style={{
                        width: c.size,
                        aspectRatio: "2/3",
                        background: coverBg(c.cover),
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "flex-end",
                        padding: 6,
                        color: "rgba(255,255,255,0.85)",
                        fontSize: Math.max(7, Math.round(c.size * 0.08)),
                        lineHeight: 1.2,
                        whiteSpace: "pre-line",
                        fontFamily: '"Playfair Display", serif',
                        fontWeight: 600,
                        overflow: "hidden",
                        boxShadow: "0 4px 14px rgba(0,0,0,.18), inset 0 0 0 1px rgba(255,255,255,.04)",
                        flexShrink: 0,
                        filter: "brightness(0.55) saturate(0.85) contrast(0.95)",
                      }}
                    >
                      {!c.cover.src && c.size > 100 ? c.cover.t : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Vignette lives inside the isolated 3D layer */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              pointerEvents: "none",
              background:
                "radial-gradient(ellipse at center, rgba(10,10,10,0.45) 0%, rgba(10,10,10,0.35) 30%, rgba(10,10,10,0.7) 70%, #0a0a0a 100%)",
            }}
          />
        </div>

        {/* Text overlay — sits above the isolated 3D layer, z-index guaranteed */}
        {chapters.map((ch, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              right: 0,
              top: "50%",
              transform: "translateY(-50%)",
              zIndex: 10,
              textAlign: "center",
              padding: "0 32px",
              pointerEvents: "none",
              opacity: i === chapterIdx ? 1 : 0,
              transition: "opacity 0.6s ease",
            }}
          >
            <div style={{ maxWidth: 880, margin: "0 auto" }}>
              <div
                style={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 11,
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "rgba(255,255,255,0.5)",
                  marginBottom: 26,
                }}
              >
                {ch.eyebrow}
              </div>
              <h2
                style={{
                  fontFamily: '"cofo-glassier", "Playfair Display", serif',
                  fontSize: "clamp(36px, 6vw, 84px)",
                  lineHeight: 1.02,
                  letterSpacing: "-0.02em",
                  fontWeight: 600,
                  margin: 0,
                  color: "#fff",
                  textShadow: "0 2px 24px rgba(0,0,0,0.45)",
                }}
              >
                {ch.h}
                <br />
                <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.7)" }}>
                  {ch.em}
                </em>
              </h2>
              <p
                style={{
                  marginTop: 20,
                  fontSize: "clamp(15px, 1.4vw, 19px)",
                  lineHeight: 1.55,
                  color: "rgba(255,255,255,0.72)",
                  maxWidth: 540,
                  marginLeft: "auto",
                  marginRight: "auto",
                  textShadow: "0 1px 12px rgba(0,0,0,0.5)",
                }}
              >
                {ch.sub}
              </p>
            </div>
          </div>
        ))}

        {/* Chapter pips */}
        <div
          style={{
            position: "absolute",
            bottom: 32,
            left: "50%",
            transform: "translateX(-50%)",
            display: "flex",
            gap: 8,
            zIndex: 10,
          }}
        >
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: i === chapterIdx ? "#111" : "rgba(255,255,255,0.3)",
                background: i === chapterIdx ? "#fff" : "transparent",
                padding: "4px 10px",
                border: `1px solid ${i === chapterIdx ? "#fff" : "rgba(255,255,255,0.08)"}`,
                borderRadius: 999,
                transition: "color .3s, border-color .3s, background .3s",
              }}
            >
              0{i + 1}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Feature cards ─────────────────────────────────────────────────────────────

function DiaryCard() {
  const books = useBooks();
  const book = books[2 % books.length];
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid #ececec",
        boxShadow: "0 10px 30px rgba(0,0,0,.06)",
        padding: 16,
        width: "100%",
        maxWidth: 280,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        transform: "rotate(-1.5deg)",
      }}
      className="lp-diary-card"
    >
      <div style={{ display: "flex", gap: 10 }}>
        <div
          style={{
            width: 48,
            aspectRatio: "2/3",
            borderRadius: 4,
            flexShrink: 0,
            background: coverBg(book),
            boxShadow: "0 4px 10px rgba(0,0,0,.15)",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: 15, color: "#111", fontWeight: 600, lineHeight: 1.2, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {book.title}
          </div>
          <div style={{ fontSize: 11, color: "#888", marginTop: 4, fontFamily: '"Geist Mono", monospace', letterSpacing: "0.04em", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {book.author} · p.142 / 386
          </div>
          <div style={{ marginTop: 8, height: 3, background: "#f0f0f0", borderRadius: 999, overflow: "hidden" }}>
            <div style={{ height: "100%", width: "38%", background: "#111" }} />
          </div>
        </div>
      </div>
      <div
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: "italic",
          fontSize: 13.5,
          lineHeight: 1.5,
          color: "#444",
          paddingLeft: 10,
          borderLeft: "2px solid #111",
        }}
      >
        Loved the rain scene. Read it twice. Whole evening lost — happily.
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", fontFamily: '"Geist Mono", monospace', fontSize: 10, color: "#aaa", letterSpacing: "0.08em" }}>
        <span>Tue · 7:42 pm</span>
        <span>★★★★☆</span>
      </div>
    </div>
  );
}

function FriendStack() {
  const books = useBooks();
  const acts = [
    { f: FRIENDS[0], verb: "finished", book: books[3 % books.length], t: "2 h ago" },
    { f: FRIENDS[1], verb: "shelved",  book: books[1 % books.length], t: "4 h ago" },
    { f: FRIENDS[2], verb: "wrote about", book: books[5 % books.length], t: "yesterday" },
  ];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", maxWidth: 280 }}>
      {acts.map((a, i) => (
        <div
          key={i}
          style={{
            background: "#fff",
            border: "1px solid #ececec",
            borderRadius: 12,
            padding: "10px 12px",
            display: "flex",
            gap: 10,
            alignItems: "center",
            boxShadow: "0 4px 12px rgba(0,0,0,.04)",
          }}
        >
          <div style={{ width: 28, height: 28, borderRadius: 999, flexShrink: 0, background: a.f.g }} />
          <div style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: "#333", lineHeight: 1.35 }}>
            <div style={{ display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
              <strong style={{ fontWeight: 600 }}>{a.f.n}</strong>{" "}
              {a.verb}{" "}
              <em style={{ fontStyle: "italic", color: "#111", fontFamily: '"Playfair Display", serif' }}>{a.book.title}</em>
            </div>
            <div style={{ fontSize: 10, color: "#aaa", fontFamily: '"Geist Mono", monospace', letterSpacing: "0.05em", marginTop: 2 }}>{a.t}</div>
          </div>
          <div style={{ width: 24, aspectRatio: "2/3", borderRadius: 2, flexShrink: 0, background: coverBg(a.book) }} />
        </div>
      ))}
    </div>
  );
}

function LandingFeatures() {
  return (
    <section
      id="explore"
      style={{ position: "relative", padding: "120px 24px", maxWidth: 1240, margin: "0 auto" }}
    >
      <div className="lp-reveal" style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 18 }}>
        What lives inside
      </div>
      <h2 className="lp-reveal lp-reveal-d1" style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: "clamp(36px, 5.5vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600, margin: 0 }}>
        A reading universe
        <br />
        <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(0,0,0,0.5)" }}>built one shelf at a time.</em>
      </h2>
      <p className="lp-reveal lp-reveal-d2" style={{ fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.55, color: "rgba(0,0,0,0.55)", maxWidth: 540, marginTop: 20 }}>
        Three small things that change how you read. No notifications you didn&apos;t ask for, no engagement bait, no ads.
      </p>

      <div className="lp-features-grid">
        {/* Feature 1 */}
        <article className="lp-feature lp-reveal lp-reveal-d1">
          <div>
            <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.18em", color: "rgba(0,0,0,0.4)" }}>01 / Track</div>
            <h3 style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600, color: "#111", margin: "12px 0 8px" }}>
              A diary, not a database.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(0,0,0,0.6)", margin: 0 }}>
              Log pages, rate what you finish, write a sentence when you feel like it. Your library remembers the reading, not just the title.
            </p>
          </div>
          <div style={{ marginTop: 28, flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <DiaryCard />
          </div>
        </article>

        {/* Feature 2 */}
        <article className="lp-feature lp-reveal lp-reveal-d2">
          <div>
            <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.18em", color: "rgba(0,0,0,0.4)" }}>02 / Follow</div>
            <h3 style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600, color: "#111", margin: "12px 0 8px" }}>
              Friends, between covers.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(0,0,0,0.6)", margin: 0 }}>
              See what they shelved, what they loved, and what&apos;s still sitting unfinished. Borrow their lists.
            </p>
          </div>
          <div style={{ marginTop: 28, flex: 1, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
            <FriendStack />
          </div>
        </article>

        {/* Feature 3 */}
        <article className="lp-feature lp-reveal lp-reveal-d3" style={{ background: "#0a0a0a", color: "#fff", borderColor: "rgba(255,255,255,0.06)" }}>
          <div>
            <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.18em", color: "rgba(255,255,255,0.45)" }}>03 / Discover</div>
            <h3 style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: 28, lineHeight: 1.1, letterSpacing: "-0.02em", fontWeight: 600, color: "#fff", margin: "12px 0 8px" }}>
              Recommendations that listen.
            </h3>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: "rgba(255,255,255,0.62)", margin: 0 }}>
              The more you shelve, the smarter your wall gets. Six carousels of next reads, curated from your taste and your friends&apos;.
            </p>
          </div>
          <div style={{ marginTop: 28, flex: 1, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}>
            <div style={{ transform: "scale(0.85)", opacity: 0.9 }}>
              <Sphere size={220} count={14} coverW={38} spin={45} />
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}

// ── Spotlight (3D book) ───────────────────────────────────────────────────────

function Book3D({ cover }: { cover: LandingBook }) {
  const W = 220, H = 320, D = 32;
  return (
    <div style={{ width: W, height: H, transformStyle: "preserve-3d", position: "relative" }}>
      <div style={{ position: "absolute", inset: 0, background: coverBg(cover), borderRadius: "4px 8px 8px 4px", boxShadow: "0 30px 60px rgba(0,0,0,.25)", transform: `translateZ(${D / 2}px)`, display: "flex", alignItems: "flex-end", padding: 18, color: "rgba(255,255,255,0.92)", fontFamily: '"Playfair Display", serif', fontWeight: 600, fontSize: 18, lineHeight: 1.15, whiteSpace: "pre-line" }}>
        {cover.src ? "" : cover.t}
      </div>
      <div style={{ position: "absolute", inset: 0, background: "#1a1a1a", borderRadius: "4px 8px 8px 4px", transform: `translateZ(${-D / 2}px) rotateY(180deg)` }} />
      <div style={{ position: "absolute", top: 0, left: 0, width: D, height: "100%", background: cover.g, filter: "brightness(0.7)", transform: `translateX(${-D / 2}px) rotateY(-90deg)`, transformOrigin: "right center", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "rgba(255,255,255,0.85)", writingMode: "vertical-rl", fontFamily: '"Playfair Display", serif', fontSize: 11, letterSpacing: "0.05em" }}>{cover.title}</span>
      </div>
      <div style={{ position: "absolute", top: 4, right: 0, bottom: 4, width: D - 4, background: "repeating-linear-gradient(to bottom, #f7f3eb 0 1px, #ddd6c8 1px 2px)", transform: `translateX(${(D - 4) / 2}px) rotateY(90deg)`, transformOrigin: "left center" }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: D - 4, background: "#f0e9d8", transform: `translateY(${-(D - 4) / 2}px) rotateX(90deg)`, transformOrigin: "center bottom" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: D - 4, background: "#e8e0cd", transform: `translateY(${(D - 4) / 2}px) rotateX(-90deg)`, transformOrigin: "center top" }} />
    </div>
  );
}

function LandingSpotlight() {
  const sectionRef = useRef<HTMLElement>(null);
  const p = useScrollRange(sectionRef);
  const tiltT = Math.max(0, Math.min(1, (p - 0.2) / 0.6));
  const rotY = 25 - tiltT * 50;
  const rotX = 8 - tiltT * 10;
  const books = useBooks();
  const cover = books[7 % books.length];

  return (
    <section
      ref={sectionRef}
      id="lists"
      style={{ position: "relative", padding: "120px 24px", maxWidth: 1240, margin: "0 auto" }}
    >
      <div className="lp-spotlight-grid">
        <div className="lp-reveal" style={{ position: "relative", aspectRatio: "5/4", perspective: 1200 }}>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: "50%",
              transformStyle: "preserve-3d",
              transform: `translate(-50%,-50%) rotateX(${rotX}deg) rotateY(${rotY}deg)`,
              transition: "transform .8s cubic-bezier(.2,.8,.2,1)",
            }}
          >
            <Book3D cover={cover} />
          </div>
          <div
            style={{
              position: "absolute",
              left: "50%",
              bottom: "12%",
              width: "60%",
              height: 30,
              background: "radial-gradient(ellipse, rgba(0,0,0,.18), transparent 70%)",
              transform: "translateX(-50%)",
              filter: "blur(8px)",
            }}
          />
        </div>
        <div>
          <div className="lp-reveal" style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(0,0,0,0.4)", marginBottom: 18 }}>
            A book is more than its cover
          </div>
          <h2 className="lp-reveal lp-reveal-d1" style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: "clamp(36px, 5.5vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600, margin: 0 }}>
            Every reread is a
            <br />
            <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(0,0,0,0.5)" }}>different book.</em>
          </h2>
          <p className="lp-reveal lp-reveal-d2" style={{ fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.55, color: "rgba(0,0,0,0.55)", maxWidth: 540, marginTop: 20 }}>
            Save the dog-eared page, the line that wrecked you, the friend who lent it to you. Your shelves are made of memories, and PaperBoxd is where they live.
          </p>
          <div className="lp-reveal lp-reveal-d3" style={{ marginTop: 28 }}>
            <Link href="/auth" className="lp-pill lp-pill-primary">Start your library</Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Friends band ──────────────────────────────────────────────────────────────

function LandingFriendsBand() {
  const books = useBooks();
  const acts: Array<{ f: typeof FRIENDS[0]; verb: string; obj: string; book: LandingBook | null; meta: string; body?: string }> = [
    { f: FRIENDS[0], verb: "finished",   obj: books[3 % books.length].title, book: books[3 % books.length], meta: "★★★★★ · 2 h ago", body: "Felt like wandering my own house with the lights off." },
    { f: FRIENDS[1], verb: "shelved",    obj: books[1 % books.length].title, book: books[1 % books.length], meta: "To-be-read · 4 h ago" },
    { f: FRIENDS[2], verb: "wrote about", obj: books[5 % books.length].title, book: books[5 % books.length], meta: "Diary · yesterday", body: '"Read it twice. Will read it again."' },
    { f: FRIENDS[3], verb: "liked",      obj: "Slow autumn reads", book: null, meta: "List · yesterday" },
  ];

  return (
    <section
      id="friends"
      data-nav-dark
      style={{ background: "#0a0a0a", color: "#fff", margin: 0 }}
    >
      <div style={{ maxWidth: 1240, margin: "0 auto", padding: "120px 24px" }} className="lp-friends-grid">
        <div>
          <div className="lp-reveal" style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(255,255,255,0.45)", marginBottom: 18 }}>
            Friends
          </div>
          <h2 className="lp-reveal lp-reveal-d1" style={{ fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: "clamp(36px, 5.5vw, 76px)", lineHeight: 1.02, letterSpacing: "-0.025em", fontWeight: 600, margin: 0, color: "#fff" }}>
            The shelf
            <br />
            <em style={{ fontStyle: "italic", fontWeight: 400, color: "rgba(255,255,255,0.5)" }}>is more honest</em>
            <br />
            than the feed.
          </h2>
          <p className="lp-reveal lp-reveal-d2" style={{ fontSize: "clamp(15px, 1.5vw, 19px)", lineHeight: 1.55, color: "rgba(255,255,255,0.6)", maxWidth: 540, marginTop: 20 }}>
            Follow people who read, not influencers who post. See what they finished at 2am, what&apos;s still unfinished, and what they keep going back to.
          </p>
          <div className="lp-reveal lp-reveal-d3" style={{ marginTop: 28 }}>
            <Link href="/auth" className="lp-pill lp-pill-invert">Find your friends</Link>
          </div>
        </div>

        <div className="lp-reveal lp-reveal-d2" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {acts.map((a, i) => (
            <div
              key={i}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16,
                padding: 16,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <div style={{ width: 36, height: 36, borderRadius: 999, flexShrink: 0, background: a.f.g }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, color: "#ddd", lineHeight: 1.45 }}>
                  <strong style={{ fontWeight: 600, color: "#fff" }}>{a.f.n}</strong>{" "}
                  {a.verb}{" "}
                  <em style={{ fontStyle: "italic", fontFamily: '"Playfair Display", serif', color: "#fff" }}>{a.obj}</em>
                </div>
                <div style={{ fontFamily: '"Geist Mono", monospace', fontSize: 10.5, color: "rgba(255,255,255,0.4)", letterSpacing: "0.06em", marginTop: 4 }}>{a.meta}</div>
                {a.body && <div style={{ fontFamily: '"Playfair Display", serif', fontStyle: "italic", fontSize: 13.5, color: "rgba(255,255,255,0.6)", marginTop: 6, lineHeight: 1.5 }}>{a.body}</div>}
              </div>
              {a.book && (
                <div style={{ width: 32, aspectRatio: "2/3", borderRadius: 3, flexShrink: 0, background: coverBg(a.book) }} />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

// ── Case studies teaser ───────────────────────────────────────────────────────

// Three of the ten — the rest live on /case-studies.
function LandingCaseStudies() {
  // Drop `wide` so the teaser is an even 3-up row — the ragged editorial grid
  // is for the full /case-studies page.
  const featured = useMemo(() => PBW_CASES.slice(0, 3).map((c) => ({ ...c, wide: false })), []);
  return (
    <section id="case-studies" className="pbw-wrap" style={{ padding: "120px 24px 40px" }}>
      <div className="lp-reveal">
        <div className="pbw-kicker">Research</div>
        <h2 className="pbw-h2" style={{ marginTop: 16 }}>
          What happens when<br /><em>taste gets a shelf.</em>
        </h2>
        <p className="pbw-p" style={{ maxWidth: 480, marginTop: 20 }}>
          Ten things publishers, libraries and creators have already proved about
          readers — and what each one changed about how PaperBoxd is built.
        </p>
      </div>
      <CasesGrid cases={featured} />
      <div style={{ marginTop: 40 }}>
        <Link className="pbw-pill pbw-pill--ghost" href="/case-studies">
          All ten write-ups {PBW_ARROW}
        </Link>
      </div>
    </section>
  );
}

// ── FAQ teaser ────────────────────────────────────────────────────────────────

function LandingFAQ() {
  return (
    <section id="faq" className="pbw-wrap" style={{ padding: "110px 24px 40px" }}>
      <FAQDigest />
    </section>
  );
}

function LandingCTA() {
  return (
    <section
      style={{
        position: "relative",
        textAlign: "center",
        padding: "160px 24px 120px",
        background: "#fff",
        overflow: "hidden",
      }}
    >
      <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", opacity: 0.6, pointerEvents: "none" }}>
        <Sphere size={580} count={16} coverW={56} spin={90} />
      </div>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.7) 0%, rgba(255,255,255,0.4) 40%, rgba(255,255,255,0) 75%)",
          zIndex: 1,
        }}
      />
      <div style={{ position: "relative", zIndex: 2, maxWidth: 720, margin: "0 auto" }}>
        <span className="lp-reveal" style={{ fontFamily: '"brooklyn-heritage-script", "Pinyon Script", cursive', fontSize: "clamp(68px, 10vw, 140px)", color: "#111", display: "block", lineHeight: 0.9 }}>
          PaperBoxd
        </span>
        <h2 className="lp-reveal lp-reveal-d1" style={{ marginTop: 24, fontFamily: '"cofo-glassier", "Playfair Display", serif', fontSize: "clamp(28px, 3.8vw, 48px)", fontWeight: 500, fontStyle: "italic", color: "rgba(0,0,0,0.7)", letterSpacing: "-0.01em", lineHeight: 1.15 }}>
          Your reading life is waiting.<br />It&apos;s free and it&apos;s quiet.
        </h2>
        <div className="lp-reveal lp-reveal-d2" style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: 36, flexWrap: "wrap" }}>
          <Link href="/auth" className="lp-pill lp-pill-primary">
            Start saving your books
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M13 5l7 7-7 7" />
            </svg>
          </Link>
          <a href="#explore" className="lp-pill lp-pill-ghost">Get the app</a>
        </div>
        <div className="lp-reveal lp-reveal-d3" style={{ marginTop: 22, fontFamily: '"Geist Mono", monospace', fontSize: 11, letterSpacing: "0.18em", color: "rgba(0,0,0,0.35)", textTransform: "uppercase" }}>
          No ads · no spam — ever
        </div>
      </div>
    </section>
  );
}

// ── Root ──────────────────────────────────────────────────────────────────────

// ── Splash loader ─────────────────────────────────────────────────────────────

function LandingSplash({ visible }: { visible: boolean }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "#0a0a0a",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 28,
        padding: "0 1.25rem",
        overflow: "hidden",
        transition: "opacity .65s cubic-bezier(.4,0,.2,1)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <span
        className="pbld-scribe pbld-scribe--responsive max-w-full text-center"
        style={{ fontSize: "clamp(1.75rem, 11vw, 7.5rem)", color: "#fff" }}
      >
        <span className="pbld-scribe__inner">PaperBoxd</span>
      </span>
      <div className="pbld-pageflip">
        <div className="pbld-pageflip__left" />
        <div className="pbld-pageflip__right" />
        <div className="pbld-pageflip__spine" />
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="pbld-pageflip__page" style={{ animationDelay: `${i * 0.32}s` }} />
        ))}
      </div>
      <div className="pbld-caption">
        <span>Fetching your next favourite book</span>
        <span>Building your shelves</span>
        <span>Every reread is a different book</span>
      </div>
    </div>
  );
}

export function LandingPage() {
  useReveals();
  const { books, loading } = useLandingBooks();
  const [splashGone, setSplashGone] = useState(false);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => setSplashGone(true), 700);
      return () => clearTimeout(t);
    }
  }, [loading]);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const anyDialogOpen = privacyOpen || termsOpen || cookieOpen || aboutOpen;

  return (
    <BooksContext.Provider value={books}>
      <style>{`
        @keyframes lpSphereSpin {
          from { transform: rotateY(0deg) rotateX(-6deg); }
          to   { transform: rotateY(360deg) rotateX(-6deg); }
        }
        @keyframes lpWmIn {
          from { opacity: 0; transform: translateY(20px); letter-spacing: -0.04em; }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes lpDriftY {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50%       { transform: translateX(-50%) translateY(8px); }
        }

        .lp-reveal {
          opacity: 0;
          transform: translateY(28px);
          transition: opacity .8s cubic-bezier(.2,.8,.2,1), transform .8s cubic-bezier(.2,.8,.2,1);
        }
        .lp-reveal.is-in {
          opacity: 1;
          transform: translateY(0);
        }
        .lp-reveal-d1 { transition-delay: .08s; }
        .lp-reveal-d2 { transition-delay: .16s; }
        .lp-reveal-d3 { transition-delay: .24s; }

        .lp-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 13px 24px;
          border-radius: 999px;
          border: 1px solid transparent;
          font-family: inherit;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          text-decoration: none;
          transition: background .2s, color .2s, transform .15s, box-shadow .2s;
          white-space: nowrap;
        }
        .lp-pill-primary  { background: #111; color: #fff; }
        .lp-pill-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 24px rgba(0,0,0,.15); }
        .lp-pill-ghost    { background: transparent; color: #111; border-color: rgba(0,0,0,0.14); }
        .lp-pill-ghost:hover { background: #f5f5f5; }
        .lp-pill-invert   { background: #fff; color: #111; }
        .lp-pill-invert:hover { transform: translateY(-1px); }

        .lp-features-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 28px;
          margin-top: 80px;
        }
        @media (max-width: 900px) {
          .lp-features-grid { grid-template-columns: 1fr; gap: 20px; }
        }

        .lp-feature {
          position: relative;
          border-radius: 24px;
          padding: 32px;
          min-height: 460px;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          overflow: hidden;
          background: #fafafa;
          border: 1px solid #efefef;
          transition: transform .3s cubic-bezier(.2,.8,.2,1), box-shadow .3s;
        }
        .lp-feature:hover { transform: translateY(-4px); box-shadow: 0 20px 40px rgba(0,0,0,.06); }
        .lp-feature:hover .lp-diary-card { transform: rotate(0deg) translateY(-4px); }

        .lp-spotlight-grid {
          display: grid;
          grid-template-columns: 1.1fr 1fr;
          gap: 64px;
          align-items: center;
          margin-top: 80px;
        }
        @media (max-width: 900px) {
          .lp-spotlight-grid { grid-template-columns: 1fr; gap: 40px; }
        }

        .lp-friends-grid {
          display: grid;
          grid-template-columns: 1fr 1.2fr;
          gap: 64px;
          align-items: center;
        }
        @media (max-width: 900px) {
          .lp-friends-grid { grid-template-columns: 1fr; gap: 40px; }
        }

        /* .lp-footer-grid and the mobile .lp-nav rules live in globals.css —
           the nav and footer are shared with /case-studies, /faq and the 404. */

        @media (max-width: 640px) {
          .lp-features-grid { padding: 0; }
        }

        /* ── Mobile browser: keep the hero logo inside the viewport ── */
        @media (max-width: 768px) {
          .lp-wordmark {
            font-size: clamp(40px, 15vw, 92px) !important;
            max-width: 100%;
            overflow-wrap: anywhere;
          }
        }

        /* ── Splash loader ── */
        @keyframes pbld-pageFlip {
          0%, 5%   { transform: rotateY(0deg); }
          45%, 50% { transform: rotateY(-180deg); }
          100%     { transform: rotateY(-180deg); opacity: 0; }
        }
        @keyframes pbld-scribeReveal {
          0%   { clip-path: inset(0 100% 0 0); }
          45%  { clip-path: inset(0 0 0 0); }
          85%  { clip-path: inset(0 0 0 0); }
          100% { clip-path: inset(0 100% 0 0); }
        }
        @keyframes pbld-captionCycle {
          0%, 2%   { opacity: 0; transform: translateY(6px); }
          6%, 30%  { opacity: 1; transform: translateY(0); }
          34%, 100%{ opacity: 0; transform: translateY(-6px); }
        }
        .pbld-pageflip {
          width: 120px; height: 86px;
          position: relative; perspective: 300px;
        }
        .pbld-pageflip__left, .pbld-pageflip__right {
          position: absolute; top: 4px; bottom: 4px;
          width: 58px;
          background: rgba(255,255,255,0.08);
          box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
        }
        .pbld-pageflip__left  { left: 0; border-radius: 4px 2px 2px 4px; }
        .pbld-pageflip__right { right: 0; border-radius: 2px 4px 4px 2px; }
        .pbld-pageflip__spine {
          position: absolute; left: 50%; top: 0; bottom: 0;
          width: 2px; background: rgba(255,255,255,0.22);
          transform: translateX(-1px);
        }
        .pbld-pageflip__page {
          position: absolute; top: 4px; bottom: 4px;
          width: 58px; right: 0;
          background: rgba(255,255,255,0.14);
          box-shadow: -2px 0 4px rgba(0,0,0,0.2);
          transform-origin: left center;
          transform-style: preserve-3d;
          backface-visibility: hidden;
          animation: pbld-pageFlip 2.4s ease-in-out infinite;
        }
        .pbld-scribe {
          position: relative; display: inline-block;
          max-width: 100%;
          font-family: "brooklyn-heritage-script","Pinyon Script","Dancing Script",cursive;
          font-weight: 400; letter-spacing: -0.015em; line-height: 1;
          color: #fff;
        }
        .pbld-scribe--responsive {
          overflow: hidden;
          white-space: nowrap;
        }
        .pbld-scribe__inner {
          display: inline-block;
          max-width: 100%;
          padding-right: 0.12em;
          clip-path: inset(0 100% 0 0);
          animation: pbld-scribeReveal 3.6s cubic-bezier(.5,.1,.3,1) infinite;
        }
        .pbld-caption {
          position: relative; height: 22px;
          font-family: "Geist Mono","JetBrains Mono",monospace;
          font-size: 11px; letter-spacing: 0.22em; text-transform: uppercase;
          color: rgba(255,255,255,0.32);
        }
        .pbld-caption > span {
          position: absolute; inset: 0; text-align: center; opacity: 0;
          animation: pbld-captionCycle 9s linear infinite;
        }
        .pbld-caption > span:nth-child(1) { animation-delay: 0s; }
        .pbld-caption > span:nth-child(2) { animation-delay: 3s; }
        .pbld-caption > span:nth-child(3) { animation-delay: 6s; }
      `}</style>

      {!splashGone && <LandingSplash visible={loading} />}

      <div style={{ background: "#fff", color: "#111", fontFamily: '"Geist", "Inter", system-ui, sans-serif', WebkitFontSmoothing: "antialiased", overflowX: "clip" }}>
        <LandingNav dialogOpen={anyDialogOpen} />
        <LandingHero />
        <Landing3D />
        <LandingFeatures />
        <LandingSpotlight />
        <LandingCaseStudies />
        <LandingFriendsBand />
        <LandingFAQ />
        <LandingCTA />
        <LandingFooter
          privacyOpen={privacyOpen} setPrivacyOpen={setPrivacyOpen}
          termsOpen={termsOpen}     setTermsOpen={setTermsOpen}
          cookieOpen={cookieOpen}   setCookieOpen={setCookieOpen}
          aboutOpen={aboutOpen}     setAboutOpen={setAboutOpen}
        />
      </div>
    </BooksContext.Provider>
  );
}
