"use client";

import { useState, useEffect, useRef, useMemo, createContext, useContext } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { PrivacyPolicyDialog } from "@/components/ui/dialogs/privacy-policy-dialog";
import { TermsOfServiceDialog } from "@/components/ui/dialogs/terms-of-service-dialog";
import { CookieSettingsDialog } from "@/components/ui/dialogs/cookie-settings-dialog";
import { AboutUsDialog } from "@/components/ui/dialogs/about-us-dialog";

// ── Book cover data ──────────────────────────────────────────────────────────
// Gradient + typography fallbacks used while real books load (or if the API fails).
const COVERS = [
  { g: "linear-gradient(155deg,#6b5b95 0%,#2f1f50 100%)", t: "The Left Hand\nof Darkness", a: "Le Guin" },
  { g: "linear-gradient(155deg,#c44536 0%,#6a1f1a 100%)", t: "Pachinko", a: "Min Jin Lee" },
  { g: "linear-gradient(155deg,#c49a6c 0%,#7a5230 100%)", t: "Norwegian\nWood", a: "Murakami" },
  { g: "linear-gradient(155deg,#2a4a3a 0%,#10201a 100%)", t: "Piranesi", a: "Clarke" },
  { g: "linear-gradient(155deg,#3a5a7a 0%,#15253a 100%)", t: "The Sea,\nthe Sea", a: "Murdoch" },
  { g: "linear-gradient(155deg,#8a3a5a 0%,#3d1528 100%)", t: "Beloved", a: "Morrison" },
  { g: "linear-gradient(155deg,#4a6a2a 0%,#1e2e10 100%)", t: "Circe", a: "Miller" },
  { g: "linear-gradient(155deg,#b85c38 0%,#5c2810 100%)", t: "Middlemarch", a: "Eliot" },
  { g: "linear-gradient(155deg,#2a3a5a 0%,#0e1525 100%)", t: "Master &\nMargarita", a: "Bulgakov" },
  { g: "linear-gradient(155deg,#8a7a2a 0%,#3d3510 100%)", t: "Anna\nKarenina", a: "Tolstoy" },
  { g: "linear-gradient(155deg,#5a2a6a 0%,#250e30 100%)", t: "Americanah", a: "Adichie" },
  { g: "linear-gradient(155deg,#1a5a4a 0%,#081f18 100%)", t: "Demon\nCopperhead", a: "Kingsolver" },
  { g: "linear-gradient(155deg,#6b4a2a 0%,#2d1a08 100%)", t: "Lonesome\nDove", a: "McMurtry" },
  { g: "linear-gradient(155deg,#3a2a6a 0%,#150e30 100%)", t: "Invisible\nMan", a: "Ellison" },
  { g: "linear-gradient(155deg,#5a4a1a 0%,#251e06 100%)", t: "Their Eyes\nWere Watching\nGod", a: "Hurston" },
  { g: "linear-gradient(155deg,#1a3a5a 0%,#081525 100%)", t: "Remains\nof the Day", a: "Ishiguro" },
  { g: "linear-gradient(155deg,#6a3a2a 0%,#2d1510 100%)", t: "Wide\nSargasso\nSea", a: "Rhys" },
  { g: "linear-gradient(155deg,#2a5a3a 0%,#0e2518 100%)", t: "Kindred", a: "Butler" },
  { g: "linear-gradient(155deg,#6b2a3a 0%,#2d1018 100%)", t: "Beautiful\nWorld", a: "Rooney" },
  { g: "linear-gradient(155deg,#3a4a2a 0%,#15200e 100%)", t: "Trust", a: "Diaz" },
  { g: "linear-gradient(155deg,#5a3a6a 0%,#251530 100%)", t: "Tomorrow,\nand Tomorrow", a: "Zevin" },
  { g: "linear-gradient(155deg,#2a6a5a 0%,#0e2820 100%)", t: "Klara &\nthe Sun", a: "Ishiguro" },
];

const FRIENDS = [
  { u: "maya.r", n: "Maya", g: "linear-gradient(135deg,#d97757,#6b3520)" },
  { u: "hridyesh", n: "Hridyesh", g: "linear-gradient(135deg,#5b8db8,#1f3c5c)" },
  { u: "anais", n: "Anaïs", g: "linear-gradient(135deg,#9a4570,#4a1f38)" },
  { u: "jake.b", n: "Jake", g: "linear-gradient(135deg,#7ba05b,#2e4520)" },
  { u: "omar", n: "Omar", g: "linear-gradient(135deg,#c79a3a,#5a4218)" },
  { u: "lin", n: "Lin", g: "linear-gradient(135deg,#6f5b8e,#2f243f)" },
];

// ── Real books (with placeholder fallback) ───────────────────────────────────

type LandingBook = {
  id: string;
  src?: string;      // real cover image URL (undefined → render gradient + typography)
  title: string;     // single-line plain title
  author: string;
  g: string;         // gradient fallback
  t: string;         // multi-line typography for fallback rendering
};

const FALLBACK_BOOKS: LandingBook[] = COVERS.map((c, i) => ({
  id: `f-${i}`,
  title: c.t.replace(/\n/g, " "),
  author: c.a,
  g: c.g,
  t: c.t,
}));

const BooksContext = createContext<LandingBook[]>(FALLBACK_BOOKS);
const useBooks = () => useContext(BooksContext);

type LandingApiBook = {
  id: string;
  title: string;
  author: string;
  cover: string;
};

// Loads an image and resolves true only if it's a real cover (not a placeholder).
// Google Books "no image available" placeholders are typically ≤128px wide.
function validateCoverImage(url: string, timeoutMs = 2500): Promise<boolean> {
  return new Promise((resolve) => {
    const img = new Image();
    const timer = setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      clearTimeout(timer);
      resolve(img.naturalWidth > 128 && img.naturalHeight > 150);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(false);
    };
    img.src = url;
  });
}

function useLandingBooks(): { books: LandingBook[]; loading: boolean } {
  const [books, setBooks] = useState<LandingBook[]>(FALLBACK_BOOKS);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/books/landing?limit=40")
      .then((r) => (r.ok ? r.json() : null))
      .then(async (data: { books?: LandingApiBook[] } | null) => {
        if (cancelled) return;
        if (data?.books?.length) {
          const candidates = data.books.filter(
            (b) => b.cover && b.cover.trim().startsWith("http")
          );
          // Validate all covers in parallel — strips placeholder "no image" images
          const results = await Promise.all(
            candidates.map((b) => validateCoverImage(b.cover))
          );
          if (cancelled) return;
          const real: LandingBook[] = candidates
            .filter((_, i) => results[i])
            .map((b, i) => {
              const fb = FALLBACK_BOOKS[i % FALLBACK_BOOKS.length];
              return {
                id: b.id || `r-${i}`,
                src: b.cover,
                title: b.title,
                author: b.author,
                g: fb.g,
                t: b.title,
              };
            });
          if (real.length > 0) setBooks(real);
        }
        if (!cancelled) setLoading(false);
      })
      .catch(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);
  return { books, loading };
}

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

function coverBg(book: LandingBook): string {
  return book.src
    ? `center / cover no-repeat url("${book.src}"), ${book.g}`
    : book.g;
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

function LandingNav({ dialogOpen }: { dialogOpen: boolean }) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    const on = () => {
      const sections = document.querySelectorAll("[data-nav-dark]");
      let isDark = false;
      sections.forEach((s) => {
        const r = s.getBoundingClientRect();
        if (r.top < 80 && r.bottom > 80) isDark = true;
      });
      setDark(isDark);
    };
    on();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => {
      window.removeEventListener("scroll", on);
      window.removeEventListener("resize", on);
    };
  }, []);

  return (
    <nav
      className="lp-nav"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 28px",
        background: dark ? "rgba(15,15,15,0.6)" : "rgba(255,255,255,0.78)",
        backdropFilter: "saturate(180%) blur(14px)",
        WebkitBackdropFilter: "saturate(180%) blur(14px)",
        borderBottom: dark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(0,0,0,0.05)",
        transition: "background .3s, border-color .3s, color .3s, opacity .25s",
        color: dark ? "#fff" : "#111",
        opacity: dialogOpen ? 0 : 1,
        pointerEvents: dialogOpen ? "none" : "auto",
      }}
    >
      <span
        className="lp-nav-wordmark"
        style={{
          fontFamily: '"brooklyn-heritage-script", "Pinyon Script", cursive',
          fontSize: 30,
          lineHeight: 1,
          color: "inherit",
        }}
      >
        PaperBoxd
      </span>
      <div className="lp-nav-actions" style={{ display: "flex", gap: 22, alignItems: "center" }}>
        <a
          href="#explore"
          className="lp-nav-link"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            textDecoration: "none",
          }}
        >
          Explore
        </a>
        <a
          href="#friends"
          className="lp-nav-link"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            textDecoration: "none",
          }}
        >
          Friends
        </a>
        <Link
          href="/auth"
          className="lp-nav-link"
          style={{
            fontSize: 13.5,
            fontWeight: 500,
            color: dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)",
            textDecoration: "none",
          }}
        >
          Sign in
        </Link>
        <Link
          href="/auth"
          style={{
            background: dark ? "#fff" : "#111",
            color: dark ? "#111" : "#fff",
            fontFamily: "inherit",
            fontSize: 13,
            fontWeight: 600,
            border: "none",
            padding: "8px 16px",
            borderRadius: 999,
            cursor: "pointer",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          Join free
        </Link>
      </div>
    </nav>
  );
}

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
      sub: "Pages logged, moods captured, half-finished books forgiven. PaperBoxd remembers the reading, not just the books.",
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
        <span>Slow burn</span>
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
        Three small things that change how you read. No streaks. No notifications you didn&apos;t ask for. No engagement bait.
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
              Log pages, capture moods, write a sentence when you feel like it. Your library remembers the reading, not just the title.
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
              See what they shelved, what they loved, what they quietly abandoned at p.42. Borrow their lists.
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
              The more you shelve, the smarter your wall gets. Five carousels of next reads, curated from your taste and your friends&apos;.
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
            Follow people who read, not influencers who post. See what they finished at 2am, what they put down at p.42, and what they keep going back to.
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

// ── Footer ────────────────────────────────────────────────────────────────────

interface LandingFooterProps {
  privacyOpen: boolean; setPrivacyOpen: (v: boolean) => void;
  termsOpen: boolean;   setTermsOpen:   (v: boolean) => void;
  cookieOpen: boolean;  setCookieOpen:  (v: boolean) => void;
  aboutOpen: boolean;   setAboutOpen:   (v: boolean) => void;
}

function LandingFooter({ privacyOpen, setPrivacyOpen, termsOpen, setTermsOpen, cookieOpen, setCookieOpen, aboutOpen, setAboutOpen }: LandingFooterProps) {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleNewsletter = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!email || submitting) return;
    setSubmitting(true);
    setMsg(null);
    try {
      const res = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, source: "landing-footer" }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setMsg({ type: "success", text: data.message || "You're in. Welcome." });
        setEmail("");
        setTimeout(() => setMsg(null), 5000);
      } else {
        setMsg({ type: "error", text: data.error || "Something went wrong." });
      }
    } catch {
      setMsg({ type: "error", text: "Failed to subscribe. Try again later." });
    } finally {
      setSubmitting(false);
    }
  };

  const fl: React.CSSProperties = {
    display: "block",
    color: "#444",
    textDecoration: "none",
    fontSize: 14,
    marginBottom: 8,
    fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
    transition: "color .15s",
  };
  const ch: React.CSSProperties = {
    fontFamily: '"Geist Sans", "Geist", system-ui, sans-serif',
    fontSize: 9.5,
    letterSpacing: "0.22em",
    textTransform: "uppercase" as const,
    color: "#aaa",
    marginBottom: 16,
    fontWeight: 500,
  };
  const btnLink: React.CSSProperties = {
    display: "block",
    background: "none",
    border: "none",
    padding: 0,
    color: "#444",
    fontSize: 14,
    cursor: "pointer",
    textAlign: "left" as const,
    marginBottom: 8,
    fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif',
  };
  const iconBtn: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 34,
    borderRadius: 999,
    border: "1px solid #e0e0e0",
    background: "transparent",
    color: "#555",
    cursor: "pointer",
    textDecoration: "none",
    transition: "border-color .2s, color .2s",
  };

  return (
    <>
      <footer style={{ borderTop: "1px solid #efefef", padding: "64px 24px 36px", background: "#fafafa" }}>
        <div style={{ maxWidth: 1240, margin: "0 auto" }}>
          <div className="lp-footer-grid">

            {/* Newsletter column */}
            <div style={{ position: "relative" }}>
              <div style={{ fontFamily: '"brooklyn-heritage-script", "Pinyon Script", cursive', fontSize: 34, color: "#111", lineHeight: 1, marginBottom: 12 }}>
                PaperBoxd
              </div>
              <p style={{ fontSize: 14, color: "#777", lineHeight: 1.6, maxWidth: 280, marginBottom: 20, fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}>
                Subscribe to be the first to know about new features and updates.
              </p>
              <form onSubmit={handleNewsletter} style={{ position: "relative", maxWidth: 280 }}>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={submitting}
                  style={{
                    width: "100%",
                    padding: "10px 44px 10px 14px",
                    border: "1px solid #e0e0e0",
                    borderRadius: 999,
                    fontSize: 13.5,
                    background: "#fff",
                    color: "#111",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    position: "absolute",
                    right: 5,
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: 30,
                    height: 30,
                    borderRadius: 999,
                    background: "#111",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#fff",
                    opacity: submitting ? 0.5 : 1,
                  }}
                >
                  <Send size={13} />
                </button>
              </form>
              {msg && (
                <p style={{ marginTop: 10, fontSize: 12.5, color: msg.type === "success" ? "#2a7a4a" : "#b03030" }}>
                  {msg.text}
                </p>
              )}
              {/* decorative blur */}
              <div style={{ position: "absolute", right: -16, top: 0, width: 80, height: 80, borderRadius: "50%", background: "rgba(0,0,0,0.04)", filter: "blur(24px)", pointerEvents: "none" }} />
            </div>

            {/* Quick Links */}
            <div>
              <div style={ch}>Quick Links</div>
              <Link href="/" style={fl}>Home</Link>
              <button style={btnLink} onClick={() => setAboutOpen(true)}>About Us</button>
              <Link href="/recommendations" style={fl}>Discover Books</Link>
              <Link href="/search" style={fl}>Search</Link>
              <Link href="/lists" style={fl}>Lists</Link>
            </div>

            {/* Contact */}
            <div>
              <div style={ch}>Contact</div>
              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginTop: 0, fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}>
                PaperBoxd<br />
                Your Reading Companion<br />
                <a href="mailto:paperboxd@gmail.com" style={{ color: "#444", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}>paperboxd@gmail.com</a><br />
                Follow us for book updates
              </p>
            </div>

            {/* Follow */}
            <div>
              <div style={ch}>Follow</div>
              <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
                <a href="https://x.com/hridyeshhh" target="_blank" rel="noopener noreferrer" style={iconBtn} title="Twitter / X">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.738l7.73-8.835L1.254 2.25H8.08l4.261 5.635 5.903-5.635Zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                </a>
                <a href="https://www.instagram.com/hridyeshhhh/" target="_blank" rel="noopener noreferrer" style={iconBtn} title="Instagram">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                </a>
                <a href="https://www.linkedin.com/in/hridyeshh/" target="_blank" rel="noopener noreferrer" style={iconBtn} title="LinkedIn">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1-2.063-2.065 2.064 2.064 0 1 1 2.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                </a>
                <a href="https://github.com/hridyeshh/PaperBoxd" target="_blank" rel="noopener noreferrer" style={iconBtn} title="GitHub">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.374 0 0 5.373 0 12c0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0 1 12 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z"/></svg>
                </a>
              </div>
            </div>

          </div>

          {/* Bottom bar */}
          <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid #efefef", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
            <span style={{ fontFamily: '"Geist Sans", "Geist", system-ui, sans-serif', fontSize: 11, color: "#bbb", letterSpacing: "0.06em" }}>© {new Date().getFullYear()} PaperBoxd. All rights reserved.</span>
            <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "center" }}>
              <button style={{ ...btnLink, fontSize: 11, color: "#bbb", marginBottom: 0, fontFamily: '"Geist Sans", "Geist", system-ui, sans-serif', letterSpacing: "0.04em" }} onClick={() => setPrivacyOpen(true)}>
                Privacy Policy
              </button>
              <button style={{ ...btnLink, fontSize: 11, color: "#bbb", marginBottom: 0, fontFamily: '"Geist Sans", "Geist", system-ui, sans-serif', letterSpacing: "0.04em" }} onClick={() => setTermsOpen(true)}>
                Terms of Service
              </button>
              <button style={{ ...btnLink, fontSize: 11, color: "#bbb", marginBottom: 0, fontFamily: '"Geist Sans", "Geist", system-ui, sans-serif', letterSpacing: "0.04em" }} onClick={() => setCookieOpen(true)}>
                Cookie Settings
              </button>
            </div>
            <span style={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "#bbb", letterSpacing: "0.05em" }}>Made for readers, in too many time zones.</span>
          </div>
        </div>
      </footer>

      <PrivacyPolicyDialog open={privacyOpen} onOpenChange={setPrivacyOpen} />
      <TermsOfServiceDialog open={termsOpen} onOpenChange={setTermsOpen} />
      <CookieSettingsDialog open={cookieOpen} onOpenChange={setCookieOpen} />
      <AboutUsDialog open={aboutOpen} onOpenChange={setAboutOpen} />
    </>
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
        gap: 40,
        transition: "opacity .65s cubic-bezier(.4,0,.2,1)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
      }}
    >
      <span className="pbld-scribe" style={{ fontSize: 120 }}>
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

        .lp-footer-grid {
          display: grid;
          grid-template-columns: 2fr 1fr 1fr 1fr;
          gap: 40px;
        }
        @media (max-width: 760px) {
          .lp-footer-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
        }

        @media (max-width: 640px) {
          .lp-features-grid { padding: 0; }
        }

        /* ── Mobile browser: keep hero logo + nav inside the viewport ── */
        @media (max-width: 768px) {
          .lp-wordmark {
            font-size: clamp(40px, 15vw, 92px) !important;
            max-width: 100%;
            overflow-wrap: anywhere;
          }
          .lp-nav { padding: 0 16px !important; }
          .lp-nav-wordmark { font-size: 24px !important; }
          .lp-nav-link { display: none !important; }
          .lp-nav-actions { gap: 0 !important; }
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
          font-family: "brooklyn-heritage-script","Pinyon Script","Dancing Script",cursive;
          font-weight: 400; letter-spacing: -0.015em; line-height: 1;
          color: #fff;
        }
        .pbld-scribe__inner {
          display: inline-block;
          padding-right: 0.18em;
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
        <LandingFriendsBand />
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
