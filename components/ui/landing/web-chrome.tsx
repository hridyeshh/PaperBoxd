"use client";

// Shared marketing-site chrome: the fixed nav and the footer, used by the
// landing page, /case-studies, /faq and the 404. Page-specific CSS lives with
// each page; the .lp-nav / .lp-footer-grid / .lp-pill rules live in globals.css.

import { useState, useEffect } from "react";
import Link from "next/link";
import { Send } from "lucide-react";
import { PrivacyPolicyDialog } from "@/components/ui/dialogs/privacy-policy-dialog";
import { TermsOfServiceDialog } from "@/components/ui/dialogs/terms-of-service-dialog";
import { CookieSettingsDialog } from "@/components/ui/dialogs/cookie-settings-dialog";
import { AboutUsDialog } from "@/components/ui/dialogs/about-us-dialog";

export type NavLink = { label: string; href: string };

// Landing uses in-page anchors; standalone pages route back to the landing hash.
export const LANDING_NAV_LINKS: NavLink[] = [
  { label: "Explore", href: "#explore" },
  { label: "Research", href: "/case-studies" },
  { label: "FAQ", href: "/faq" },
];

export const WEB_NAV_LINKS: NavLink[] = [
  { label: "Explore", href: "/#explore" },
  { label: "Research", href: "/case-studies" },
  { label: "FAQ", href: "/faq" },
];

interface LandingNavProps {
  dialogOpen?: boolean;
  links?: NavLink[];
  /** Active link label — rendered at full contrast. */
  active?: string;
  /** Force the dark treatment (used by the always-dark 404). */
  forceDark?: boolean;
}

export function LandingNav({ dialogOpen = false, links = LANDING_NAV_LINKS, active, forceDark = false }: LandingNavProps) {
  const [dark, setDark] = useState(forceDark);
  useEffect(() => {
    if (forceDark) { setDark(true); return; }
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
  }, [forceDark]);

  const linkStyle = (isActive: boolean): React.CSSProperties => ({
    fontSize: 13.5,
    fontWeight: isActive ? 600 : 500,
    color: isActive
      ? (dark ? "#fff" : "#111")
      : (dark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)"),
    textDecoration: "none",
  });

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
      <Link
        href="/"
        className="lp-nav-wordmark"
        style={{
          fontFamily: '"brooklyn-heritage-script", "Pinyon Script", cursive',
          fontSize: 30,
          lineHeight: 1,
          color: "inherit",
          textDecoration: "none",
        }}
      >
        PaperBoxd
      </Link>
      <div className="lp-nav-actions" style={{ display: "flex", gap: 22, alignItems: "center" }}>
        {links.map((l) =>
          l.href.startsWith("#") ? (
            <a key={l.label} href={l.href} className="lp-nav-link" style={linkStyle(l.label === active)}>
              {l.label}
            </a>
          ) : (
            <Link key={l.label} href={l.href} className="lp-nav-link" style={linkStyle(l.label === active)}>
              {l.label}
            </Link>
          )
        )}
        <Link href="/auth" className="lp-nav-link" style={linkStyle(false)}>
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

// ── Footer ────────────────────────────────────────────────────────────────────

interface LandingFooterProps {
  privacyOpen: boolean; setPrivacyOpen: (v: boolean) => void;
  termsOpen: boolean;   setTermsOpen:   (v: boolean) => void;
  cookieOpen: boolean;  setCookieOpen:  (v: boolean) => void;
  aboutOpen: boolean;   setAboutOpen:   (v: boolean) => void;
}

export function LandingFooter({ privacyOpen, setPrivacyOpen, termsOpen, setTermsOpen, cookieOpen, setCookieOpen, aboutOpen, setAboutOpen }: LandingFooterProps) {
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

            {/* Project */}
            <div>
              <div style={ch}>Project</div>
              <Link href="/case-studies" style={fl}>Research</Link>
              <Link href="/faq" style={fl}>FAQ</Link>
              <p style={{ fontSize: 14, color: "#444", lineHeight: 1.8, marginTop: 16, fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}>
                PaperBoxd<br />
                Your Reading Companion<br />
                <a href="mailto:hridyesh@paperboxd.in" style={{ color: "#444", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: 'var(--font-playfair), "Playfair Display", Georgia, serif' }}>hridyesh@paperboxd.in</a>
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

// Footer that owns its own dialog state — for pages that don't need to dim the
// nav while a dialog is open (everything except the landing page).
export function WebFooter() {
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [termsOpen, setTermsOpen] = useState(false);
  const [cookieOpen, setCookieOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  return (
    <LandingFooter
      privacyOpen={privacyOpen} setPrivacyOpen={setPrivacyOpen}
      termsOpen={termsOpen}     setTermsOpen={setTermsOpen}
      cookieOpen={cookieOpen}   setCookieOpen={setCookieOpen}
      aboutOpen={aboutOpen}     setAboutOpen={setAboutOpen}
    />
  );
}
