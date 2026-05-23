"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { usePathname } from "next/navigation"
import { setSplashActive, useLoaderCount } from "@/lib/splash-state"

// Fade duration when dismissing
const FADE_MS = 400
// If no BookLoader ever mounts within this window, assume data is already cached → dismiss
const NO_LOADER_GRACE_MS = 800
// Absolute safety ceiling — never let the splash hang forever
const MAX_VISIBLE_MS = 6000
// Wait for fonts before showing the wordmark so it doesn't size-jump mid-animation
const FONT_TIMEOUT_MS = 2500

export function SiteSplash() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const [fading, setFading] = useState(false)
  const [fontReady, setFontReady] = useState(false)

  const loaderCount = useLoaderCount()

  const isFirstRunRef = useRef(true)
  const prevPathRef = useRef(pathname)
  const everHadLoaderRef = useRef(false)
  const dismissedRef = useRef(false)
  const timersRef = useRef<{
    hideTimer?: ReturnType<typeof setTimeout>
    graceTimer?: ReturnType<typeof setTimeout>
    maxTimer?: ReturnType<typeof setTimeout>
  }>({})

  const dismiss = useCallback(() => {
    if (dismissedRef.current) return
    dismissedRef.current = true

    const t = timersRef.current
    if (t.graceTimer) clearTimeout(t.graceTimer)
    if (t.maxTimer)   clearTimeout(t.maxTimer)
    if (t.hideTimer)  clearTimeout(t.hideTimer)

    setFading(true)
    t.hideTimer = setTimeout(() => {
      setVisible(false)
      setSplashActive(false)
    }, FADE_MS)
  }, [])

  // Wait for the script font to load before letting the wordmark render —
  // prevents the mid-animation size jump when next/font swaps in.
  useEffect(() => {
    if (typeof document === "undefined") {
      setFontReady(true)
      return
    }

    let cancelled = false

    const probe = document.createElement("span")
    probe.textContent = "PaperBoxd"
    probe.style.cssText =
      "position:absolute;left:-9999px;top:-9999px;font-family:var(--font-pinyon),'Pinyon Script',cursive;font-size:90px;opacity:0;pointer-events:none"
    document.body.appendChild(probe)
    void probe.offsetWidth

    const cleanup = () => {
      if (probe.parentNode) probe.parentNode.removeChild(probe)
    }

    const done = () => {
      if (cancelled) return
      cleanup()
      requestAnimationFrame(() => {
        if (!cancelled) setFontReady(true)
      })
    }

    if (document.fonts?.ready) {
      Promise.race([
        document.fonts.ready,
        new Promise((r) => setTimeout(r, FONT_TIMEOUT_MS)),
      ]).then(done)
    } else {
      done()
    }

    return () => {
      cancelled = true
      cleanup()
    }
  }, [])

  // Decide whether to trigger the splash on the current path
  useEffect(() => {
    let shouldShow = false

    if (isFirstRunRef.current) {
      isFirstRunRef.current = false
      const nav = performance.getEntriesByType(
        "navigation"
      )[0] as PerformanceNavigationTiming | undefined
      if (nav?.type === "reload") shouldShow = true
      if (pathname === "/") shouldShow = true
    } else {
      if (pathname === "/" && prevPathRef.current !== "/") shouldShow = true
    }
    prevPathRef.current = pathname

    if (!shouldShow) return

    const t = timersRef.current
    if (t.hideTimer)  clearTimeout(t.hideTimer)
    if (t.graceTimer) clearTimeout(t.graceTimer)
    if (t.maxTimer)   clearTimeout(t.maxTimer)

    dismissedRef.current = false
    everHadLoaderRef.current = false

    setFading(false)
    setVisible(true)
    setSplashActive(true)

    // If no BookLoader has appeared by NO_LOADER_GRACE_MS, assume the page
    // had nothing to load (cached/instant) and dismiss right away.
    t.graceTimer = setTimeout(() => {
      if (!everHadLoaderRef.current) dismiss()
    }, NO_LOADER_GRACE_MS)

    // Absolute safety net
    t.maxTimer = setTimeout(dismiss, MAX_VISIBLE_MS)
  }, [pathname, dismiss])

  // React to the loader count — this is the actual "data is ready" signal.
  // While at least one BookLoader is mounted, the page is loading. The moment
  // they're all unmounted (and at least one was previously mounted), dismiss.
  useEffect(() => {
    if (!visible || dismissedRef.current) return

    if (loaderCount > 0) {
      everHadLoaderRef.current = true
      return
    }

    if (everHadLoaderRef.current) dismiss()
  }, [loaderCount, visible, dismiss])

  if (!visible) return null

  return (
    <div
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center gap-6"
      style={{
        background: "oklch(0.14 0 0)",
        opacity: fading ? 0 : 1,
        transition: fading ? `opacity ${FADE_MS}ms ease-out` : undefined,
        pointerEvents: fading ? "none" : undefined,
      }}
    >
      {/* Reserve the wordmark slot so layout doesn't shift while the font loads */}
      <div
        style={{
          height: 90,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          visibility: fontReady ? "visible" : "hidden",
        }}
      >
        <span className="pbld-scribe" style={{ fontSize: 90, color: "#fff" }}>
          <span className="pbld-scribe__inner">PaperBoxd</span>
        </span>
      </div>

      <p
        style={{
          fontFamily: '"Playfair Display", serif',
          fontStyle: "italic",
          fontSize: 16,
          color: "rgba(255,255,255,0.45)",
          margin: "-8px 0 0",
          letterSpacing: "-0.01em",
        }}
      >
        Your reading universe, organised.
      </p>

      <div className="pbld-caption" style={{ color: "rgba(255,255,255,0.35)" }}>
        <span>Opening your library…</span>
        <span>Pulling your shelves…</span>
        <span>Brewing your taste…</span>
      </div>
    </div>
  )
}
