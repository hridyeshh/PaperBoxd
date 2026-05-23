"use client"

import { useEffect, useState } from "react"
import { incLoaderCount, decLoaderCount } from "@/lib/splash-state"

// Gradient book covers used by Deck and Sphere
const COVERS = [
  { g: "linear-gradient(155deg,#3a4a2a 0%,#15200e 100%)", t: "Trust" },
  { g: "linear-gradient(155deg,#2a3a5a 0%,#0e1525 100%)", t: "Never\nLet Me Go" },
  { g: "linear-gradient(155deg,#5a3a6a 0%,#251530 100%)", t: "Tomorrow" },
  { g: "linear-gradient(155deg,#6b2a3a 0%,#2d1018 100%)", t: "Beautiful\nWorld" },
  { g: "linear-gradient(155deg,#2a6a5a 0%,#0e2820 100%)", t: "Klara" },
  { g: "linear-gradient(155deg,#5a4a1a 0%,#251e08 100%)", t: "Dune" },
  { g: "linear-gradient(155deg,#1a3a5a 0%,#08151e 100%)", t: "The Road" },
  { g: "linear-gradient(155deg,#4a2a1a 0%,#1e0e08 100%)", t: "Pachinko" },
]

type Size = "sm" | "md" | "lg"

// ── 01. Page Flip ─────────────────────────────────────────────────────────────

function PageFlip({ size }: { size: Size }) {
  const w = { sm: 108, md: 168, lg: 264 }[size]
  const h = Math.round(w * 0.72)
  return (
    <div
      className="pbld-pageflip"
      style={{ "--w": `${w}px`, "--h": `${h}px` } as React.CSSProperties}
    >
      <div className="pbld-pageflip__left" />
      <div className="pbld-pageflip__right" />
      <div className="pbld-pageflip__spine" />
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="pbld-pageflip__page"
          style={{ animationDelay: `${i * 0.32}s` }}
        />
      ))}
    </div>
  )
}

// ── 02. Cover Deck ────────────────────────────────────────────────────────────

function CoverDeck({ size }: { size: Size }) {
  const sz = { sm: 108, md: 156, lg: 252 }[size]
  const covers = COVERS.slice(0, 4)
  return (
    <div
      className="pbld-deck"
      style={{ "--sz": `${sz}px` } as React.CSSProperties}
    >
      {covers.map((c, i) => (
        <div
          key={i}
          className="pbld-deck__cover"
          style={{
            background: c.g,
            animationDelay: `${i * 0.8}s`,
            zIndex: 4 - i,
            fontSize: Math.max(7, sz * 0.13),
          }}
        >
          <span>{c.t}</span>
        </div>
      ))}
    </div>
  )
}

// ── 03. Bookmark ──────────────────────────────────────────────────────────────

function Bookmark({ size }: { size: Size }) {
  const w =     { sm: 180, md: 288, lg: 420 }[size]
  const h =     { sm: 84,  md: 84,  lg: 84  }[size]
  const cover = { sm: 12,  md: 12,  lg: 12  }[size]  // px — scaled from 4px
  const ribbon= { sm: 18,  md: 18,  lg: 18  }[size]  // px — scaled from 6px
  return (
    <div
      className="pbld-bookmark"
      style={{ "--w": `${w}px`, height: `${h}px` } as React.CSSProperties}
    >
      <div className="pbld-bookmark__cover-l" style={{ width: cover }} />
      <div className="pbld-bookmark__pages" style={{ inset: `${Math.round(h * 0.14)}px 0` }} />
      <div className="pbld-bookmark__cover-r" style={{ width: cover }} />
      <div className="pbld-bookmark__ribbon" style={{ width: ribbon, left: cover + 8 }} />
    </div>
  )
}

// ── 04. Sphere ────────────────────────────────────────────────────────────────

function Sphere({ size }: { size: Size }) {
  const sz = { sm: 144, md: 240, lg: 360 }[size]
  const count = 10
  const coverW = sz * 0.22
  const coverH = coverW * 1.5
  const radius = sz / 2.6
  return (
    <div
      className="pbld-sphere"
      style={{ "--sz": `${sz}px` } as React.CSSProperties}
    >
      <div className="pbld-sphere__inner">
        {Array.from({ length: count }).map((_, i) => {
          const c = COVERS[i % COVERS.length]
          const ang = (i / count) * 360
          const lat = Math.sin(i * 1.3) * (sz * 0.12)
          return (
            <div
              key={i}
              className="pbld-sphere__cover"
              style={{
                width: coverW,
                height: coverH,
                background: c.g,
                transform: `translate(-50%,-50%) rotateY(${ang}deg) translateZ(${radius}px) translateY(${lat}px) rotateY(${-ang}deg)`,
              }}
            />
          )
        })}
      </div>
    </div>
  )
}

// ── BookLoader — random picker ─────────────────────────────────────────────────

export interface BookLoaderProps {
  loadingText?: string
  size?: Size
  // kept for drop-in TetrisLoading compatibility — not used
  speed?: string
  showLoadingText?: boolean
}

const VARIANTS = [PageFlip, CoverDeck, Bookmark, Sphere]

export default function BookLoader({
  loadingText,
  size = "md",
  showLoadingText,
}: BookLoaderProps) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    setIdx(Math.floor(Math.random() * VARIANTS.length))
  }, [])

  useEffect(() => {
    incLoaderCount()
    return () => { decLoaderCount() }
  }, [])

  const Variant = VARIANTS[idx]
  const showText = !!loadingText && showLoadingText !== false

  return (
    <div className="flex flex-col items-center gap-4">
      <Variant size={size} />
      {showText && (
        <p className="text-sm text-muted-foreground tracking-wide">{loadingText}</p>
      )}
    </div>
  )
}
