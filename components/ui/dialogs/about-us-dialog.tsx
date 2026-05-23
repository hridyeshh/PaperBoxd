"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog"

interface AboutUsDialogProps {
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

const subHeading: React.CSSProperties = {
  fontFamily: serif,
  fontSize: 14,
  fontWeight: 600,
  color: "#222",
  marginBottom: 8,
  marginTop: 16,
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

export function AboutUsDialog({ open, onOpenChange }: AboutUsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[88vh] overflow-y-auto"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", padding: "40px 44px" }}
      >
        <DialogHeader style={{ marginBottom: 28, borderBottom: "1px solid #efefef", paddingBottom: 24 }}>
          <div style={{ fontFamily: sans, fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#aaa", fontWeight: 500, marginBottom: 10 }}>
            About
          </div>
          <DialogTitle style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: "#111", lineHeight: 1.15, margin: 0 }}>
            PaperBoxd
          </DialogTitle>
          <DialogDescription style={{ fontFamily: sans, fontSize: 12, color: "#bbb", letterSpacing: "0.04em", marginTop: 8 }}>
            Your reading universe, organised.
          </DialogDescription>
        </DialogHeader>

        <div style={{ paddingBottom: 8 }}>
          <section>
            <p style={sectionLabel}>01</p>
            <h2 style={sectionHeading}>What We Are</h2>
            <p style={body}>
              PaperBoxd is a modern social book tracking platform that empowers readers to discover, track, and share their literary journey. We transform reading into a connected, discoverable experience — inspired by the simplicity and community spirit of Letterboxd, but built exclusively for books.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>02</p>
            <h2 style={sectionHeading}>Our Mission</h2>
            <p style={body}>
              Reading is deeply personal yet inherently social — but existing platforms fragment the experience. PaperBoxd creates a unified space where readers can:
            </p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}><strong>Track their journey</strong> — from &quot;to-be-read&quot; aspirations to completed masterpieces</li>
              <li style={li}><strong>Discover meaningfully</strong> — through community curation and authentic recommendations</li>
              <li style={li}><strong>Express authentically</strong> — with rich profiles, custom lists, and thoughtful reviews</li>
              <li style={li}><strong>Connect organically</strong> — by following fellow readers and exploring their literary landscapes</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>03</p>
            <h2 style={sectionHeading}>Core Philosophy</h2>
            <p style={body}>
              The best book recommendations come from people, not algorithms. PaperBoxd is designed around the principle that reading communities thrive when readers can express themselves freely, discover through trusted networks, and maintain full control over their personal data.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>04</p>
            <h2 style={sectionHeading}>Features</h2>

            <h3 style={subHeading}>User Profiles</h3>
            <p style={body}>
              Create rich profiles with your reading history, favourite books, and custom lists. Follow other readers and discover new titles through their collections.
            </p>

            <h3 style={subHeading}>Book Management</h3>
            <p style={body}>
              Organise your reading life with shelves, likes, and to-be-read lists. Track what you&apos;ve read, what you loved, and what&apos;s next.
            </p>

            <h3 style={subHeading}>Social Features</h3>
            <p style={body}>
              Follow fellow readers, see their activity, and discover books through your network. Build your reading community and share your literary discoveries.
            </p>

            <h3 style={subHeading}>Recommendations</h3>
            <p style={body}>
              Get book recommendations shaped by your reading preferences, favourite genres, and what your friends are enjoying — no black-box algorithms.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>05</p>
            <h2 style={sectionHeading}>Privacy & Data</h2>
            <p style={body}>
              PaperBoxd uses server-side tracking for recommendations with no third-party cookies. Your data is stored securely and you retain full control over it. Your reading history belongs to you.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>06</p>
            <h2 style={sectionHeading}>Get in Touch</h2>
            <div style={{ border: "1px solid #efefef", borderRadius: 10, padding: "16px 20px", background: "#fafafa" }}>
              <p style={{ ...body, marginBottom: 0 }}>
                <a href="mailto:paperboxd@gmail.com" style={{ color: "#111", textDecoration: "underline", textUnderlineOffset: 3, fontFamily: serif }}>
                  paperboxd@gmail.com
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
