"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog"
import { Switch } from "@/components/ui/primitives/switch"

interface CookieSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const serif = 'var(--font-playfair), "Playfair Display", Georgia, serif'
const sans = '"Geist Sans", "Geist", system-ui, sans-serif'

const sectionLabel: React.CSSProperties = {
  fontFamily: sans,
  fontSize: 9.5,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "#aaa",
  fontWeight: 500,
  marginBottom: 10,
  marginTop: 28,
}

const sectionHeading: React.CSSProperties = {
  fontFamily: serif,
  fontSize: 17,
  fontWeight: 600,
  color: "#111",
  marginBottom: 10,
  marginTop: 0,
}

const body: React.CSSProperties = {
  fontFamily: serif,
  fontSize: 14,
  color: "#555",
  lineHeight: 1.75,
  marginBottom: 10,
}

const li: React.CSSProperties = {
  fontFamily: serif,
  fontSize: 14,
  color: "#555",
  lineHeight: 1.75,
  marginBottom: 6,
}

export function CookieSettingsDialog({ open, onOpenChange }: CookieSettingsDialogProps) {
  const [essentialCookies] = React.useState(true)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-2xl max-h-[88vh] overflow-y-auto"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", padding: "40px 44px" }}
      >
        <DialogHeader style={{ marginBottom: 28, borderBottom: "1px solid #efefef", paddingBottom: 24 }}>
          <div style={{ fontFamily: sans, fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#aaa", fontWeight: 500, marginBottom: 10 }}>
            Preferences
          </div>
          <DialogTitle style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: "#111", lineHeight: 1.15, margin: 0 }}>
            Cookie Settings
          </DialogTitle>
          <DialogDescription style={{ fontFamily: sans, fontSize: 12, color: "#bbb", letterSpacing: "0.04em", marginTop: 8 }}>
            Learn about how PaperBoxd uses cookies and local storage.
          </DialogDescription>
        </DialogHeader>

        <div style={{ paddingBottom: 8 }}>
          <section>
            <p style={sectionLabel}>About</p>
            <h2 style={sectionHeading}>What Are Cookies?</h2>
            <p style={body}>
              Cookies are small text files placed on your device when you visit a website. They help websites work efficiently and remember your preferences.
            </p>
            <p style={body}>
              PaperBoxd uses cookies only for essential functionality — primarily user authentication. We do not use analytics, advertising, or marketing cookies.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>Preferences</p>
            <h2 style={sectionHeading}>Cookie Preferences</h2>

            {/* Essential Cookies */}
            <div style={{
              display: "flex",
              alignItems: "flex-start",
              justifyContent: "space-between",
              gap: 20,
              border: "1px solid #efefef",
              borderRadius: 12,
              padding: "18px 20px",
              marginBottom: 12,
            }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                  <span style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: "#111" }}>Essential Cookies</span>
                  <span style={{
                    fontFamily: sans,
                    fontSize: 9,
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: "#aaa",
                    border: "1px solid #e0e0e0",
                    borderRadius: 999,
                    padding: "2px 8px",
                  }}>Required</span>
                </div>
                <p style={{ ...body, marginBottom: 6 }}>
                  Necessary for the website to function. They enable core functionality such as authentication and session management. These cannot be disabled.
                </p>
                <p style={{ fontFamily: sans, fontSize: 11, color: "#bbb", letterSpacing: "0.02em" }}>
                  Examples: NextAuth session cookies for user authentication
                </p>
              </div>
              <Switch
                id="essential-cookies"
                checked={essentialCookies}
                disabled={true}
                className="mt-1 shrink-0"
              />
            </div>

            {/* Local Storage */}
            <div style={{
              border: "1px solid #efefef",
              borderRadius: 12,
              padding: "18px 20px",
              background: "#fafafa",
            }}>
              <p style={{ fontFamily: serif, fontSize: 15, fontWeight: 600, color: "#111", marginBottom: 6 }}>Local Storage</p>
              <p style={{ ...body, marginBottom: 6 }}>
                We use browser local storage — not cookies — to store your preferences such as theme settings. This data stays on your device and is not sent to our servers.
              </p>
              <p style={{ fontFamily: sans, fontSize: 11, color: "#bbb", letterSpacing: "0.02em" }}>
                Examples: Dark/light mode preference, cookie settings
              </p>
            </div>
          </section>

          <section>
            <p style={sectionLabel}>Control</p>
            <h2 style={sectionHeading}>Managing Cookies</h2>
            <p style={body}>You can also manage cookies directly through your browser settings. Most browsers allow you to:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>View cookies stored on your device</li>
              <li style={li}>Delete existing cookies</li>
              <li style={li}>Block cookies from being set in the future</li>
              <li style={li}>Set preferences for specific websites</li>
            </ul>
            <p style={{ ...body, marginTop: 12 }}>
              Blocking or deleting cookies may impact your PaperBoxd experience, as some features rely on them.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>Third-party</p>
            <h2 style={sectionHeading}>Third-Party Services</h2>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}><strong>Google OAuth:</strong> Google may set cookies as part of their authentication flow when you sign in with Google.</li>
              <li style={li}><strong>Book Data APIs:</strong> ISBNdb and Open Library are used to fetch book data. Their cookies are subject to their own privacy policies.</li>
            </ul>
            <p style={{ ...body, marginTop: 12 }}>
              We do not use third-party analytics or advertising services that set tracking cookies.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>Contact</p>
            <h2 style={sectionHeading}>Questions?</h2>
            <div style={{ border: "1px solid #efefef", borderRadius: 10, padding: "16px 20px", background: "#fafafa" }}>
              <p style={{ ...body, marginBottom: 0 }}>
                <a href="mailto:hridyesh@paperboxd.in" style={{ color: "#111", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: serif }}>
                  hridyesh@paperboxd.in
                </a>
              </p>
            </div>
          </section>

          <div style={{ marginTop: 36, paddingTop: 24, borderTop: "1px solid #efefef", display: "flex", justifyContent: "flex-end" }}>
            <button
              onClick={() => onOpenChange(false)}
              style={{
                fontFamily: sans,
                fontSize: 12,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                fontWeight: 500,
                background: "#111",
                color: "#fff",
                border: "none",
                borderRadius: 999,
                padding: "10px 28px",
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
