"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog"

interface PrivacyPolicyDialogProps {
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

export function PrivacyPolicyDialog({ open, onOpenChange }: PrivacyPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-3xl max-h-[88vh] overflow-y-auto"
        style={{ background: "#fff", borderRadius: 16, border: "1px solid #e8e8e8", padding: "40px 44px" }}
      >
        <DialogHeader style={{ marginBottom: 28, borderBottom: "1px solid #efefef", paddingBottom: 24 }}>
          <div style={{ fontFamily: sans, fontSize: 9.5, letterSpacing: "0.22em", textTransform: "uppercase", color: "#aaa", fontWeight: 500, marginBottom: 10 }}>
            Legal
          </div>
          <DialogTitle style={{ fontFamily: serif, fontSize: 30, fontWeight: 700, color: "#111", lineHeight: 1.15, margin: 0 }}>
            Privacy Policy
          </DialogTitle>
          <DialogDescription style={{ fontFamily: sans, fontSize: 12, color: "#bbb", letterSpacing: "0.04em", marginTop: 8 }}>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div style={{ paddingBottom: 8 }}>
          <section>
            <p style={sectionLabel}>01</p>
            <h2 style={sectionHeading}>Introduction</h2>
            <p style={body}>
              Welcome to PaperBoxd (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our book tracking and social platform.
            </p>
            <p style={body}>
              By using PaperBoxd, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>02</p>
            <h2 style={sectionHeading}>Information We Collect</h2>

            <h3 style={subHeading}>Information You Provide</h3>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}><strong>Account Information:</strong> Username, email address, and password. If you sign up via Google OAuth, we collect your name, email, and profile picture.</li>
              <li style={li}><strong>Profile Information:</strong> Profile picture, bio, and reading preferences you choose to share.</li>
              <li style={li}><strong>Reading Data:</strong> Books added to your shelf, liked books, TBR lists, ratings, reviews, and reading notes.</li>
              <li style={li}><strong>Social Interactions:</strong> Users you follow, your followers, and your activity on the platform.</li>
              <li style={li}><strong>Onboarding Preferences:</strong> Information from the onboarding questionnaire to personalise your recommendations.</li>
            </ul>

            <h3 style={subHeading}>Automatically Collected Information</h3>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}><strong>Usage Data:</strong> Pages visited, features used, and time spent on the platform.</li>
              <li style={li}><strong>Device Information:</strong> Browser type, operating system, IP address, and device identifiers.</li>
              <li style={li}><strong>Cookies &amp; Tracking:</strong> We use cookies and similar technologies to remember your preferences.</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>03</p>
            <h2 style={sectionHeading}>How We Use Your Information</h2>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>To provide, maintain, and improve our services</li>
              <li style={li}>To personalise your experience and provide book recommendations</li>
              <li style={li}>To enable social features — following, activity feeds, sharing progress</li>
              <li style={li}>To communicate with you about your account and updates (with your consent)</li>
              <li style={li}>To analyse usage patterns and improve platform functionality</li>
              <li style={li}>To detect and address technical issues and security threats</li>
              <li style={li}>To comply with legal obligations and enforce our terms</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>04</p>
            <h2 style={sectionHeading}>Data Sharing and Disclosure</h2>
            <p style={body}>We do not sell your personal information. We may share your information in the following circumstances:</p>

            <h3 style={subHeading}>Public Information</h3>
            <p style={body}>Your username, profile, and public reading activity are visible to other users. You can control visibility through your privacy settings.</p>

            <h3 style={subHeading}>Service Providers</h3>
            <p style={body}>We may share data with third-party providers (hosting, email delivery, analytics) who are contractually obligated to protect your information.</p>

            <h3 style={subHeading}>Legal Requirements</h3>
            <p style={body}>We may disclose information if required by law or to protect the rights and safety of users and the public.</p>

            <h3 style={subHeading}>Business Transfers</h3>
            <p style={body}>In the event of a merger or acquisition, your information may be transferred to the acquiring entity.</p>
          </section>

          <section>
            <p style={sectionLabel}>05</p>
            <h2 style={sectionHeading}>Data Storage and Security</h2>
            <p style={body}>We implement appropriate technical and organisational measures to protect your information. No method of transmission over the internet is 100% secure, but we regularly review and update our practices.</p>
          </section>

          <section>
            <p style={sectionLabel}>06</p>
            <h2 style={sectionHeading}>Your Rights and Choices</h2>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}><strong>Access:</strong> Review your personal information through account settings</li>
              <li style={li}><strong>Correction:</strong> Update or correct your information at any time</li>
              <li style={li}><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li style={li}><strong>Data Portability:</strong> Request a copy of your data in a machine-readable format</li>
              <li style={li}><strong>Opt-Out:</strong> Opt out of marketing communications via notification preferences</li>
              <li style={li}><strong>Cookie Preferences:</strong> Manage cookies through your browser settings</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>07</p>
            <h2 style={sectionHeading}>Cookies and Tracking Technologies</h2>
            <p style={body}>We use cookies to enhance your experience. You can control them through your browser settings, though disabling cookies may limit certain features.</p>
          </section>

          <section>
            <p style={sectionLabel}>08</p>
            <h2 style={sectionHeading}>Changes to This Policy</h2>
            <p style={body}>We may update this Privacy Policy from time to time. We will notify you of material changes by posting the updated policy and revising the date above.</p>
          </section>

          <section>
            <p style={sectionLabel}>09</p>
            <h2 style={sectionHeading}>Contact Us</h2>
            <p style={body}>For questions, concerns, or requests about this Privacy Policy:</p>
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
