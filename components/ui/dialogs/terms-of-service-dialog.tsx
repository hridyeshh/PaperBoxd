"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/primitives/dialog"

interface TermsOfServiceDialogProps {
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

export function TermsOfServiceDialog({ open, onOpenChange }: TermsOfServiceDialogProps) {
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
            Terms of Service
          </DialogTitle>
          <DialogDescription style={{ fontFamily: sans, fontSize: 12, color: "#bbb", letterSpacing: "0.04em", marginTop: 8 }}>
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </DialogDescription>
        </DialogHeader>

        <div style={{ paddingBottom: 8 }}>
          <section>
            <p style={sectionLabel}>01</p>
            <h2 style={sectionHeading}>Acceptance of Terms</h2>
            <p style={body}>
              By accessing and using PaperBoxd (&quot;the Service&quot;), you accept and agree to be bound by these Terms of Service. If you do not agree, please do not use the Service.
            </p>
            <p style={body}>
              These Terms govern your access to and use of PaperBoxd, a book tracking and social platform. By creating an account or using our Service, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>02</p>
            <h2 style={sectionHeading}>Description of Service</h2>
            <p style={body}>PaperBoxd is a platform that allows users to:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>Track and organise books they have read, want to read, or are currently reading</li>
              <li style={li}>Rate and review books</li>
              <li style={li}>Create and share reading lists and collections</li>
              <li style={li}>Follow other users and view their reading activity</li>
              <li style={li}>Discover new books through personalised recommendations</li>
              <li style={li}>Participate in a community of book enthusiasts</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>03</p>
            <h2 style={sectionHeading}>User Accounts</h2>

            <h3 style={subHeading}>Account Creation</h3>
            <p style={body}>
              To use certain features, you must create an account via username and password or through Google OAuth.
            </p>

            <h3 style={subHeading}>Account Responsibility</h3>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>You are responsible for maintaining the confidentiality of your credentials</li>
              <li style={li}>You are responsible for all activities that occur under your account</li>
              <li style={li}>You must provide accurate, current, and complete information during registration</li>
            </ul>

            <h3 style={subHeading}>Account Termination</h3>
            <p style={body}>
              You may delete your account at any time through your account settings. We reserve the right to suspend or terminate accounts that violate these Terms.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>04</p>
            <h2 style={sectionHeading}>User Content</h2>

            <h3 style={subHeading}>Content You Post</h3>
            <p style={body}>
              You retain ownership of content you post — reviews, ratings, notes, and profile information. By posting, you grant us a worldwide, non-exclusive, royalty-free licence to use, reproduce, and display your content on the Service.
            </p>

            <h3 style={subHeading}>Content Guidelines</h3>
            <p style={body}>You agree not to post content that:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>Is illegal, harmful, threatening, abusive, or discriminatory</li>
              <li style={li}>Infringes on intellectual property rights of others</li>
              <li style={li}>Contains spam, malware, or malicious code</li>
              <li style={li}>Is false, misleading, or defamatory</li>
              <li style={li}>Violates the privacy or rights of others</li>
            </ul>

            <h3 style={subHeading}>Content Moderation</h3>
            <p style={body}>
              We reserve the right to review, edit, or remove content that violates these Terms. We are not obligated to monitor user content but may do so at our discretion.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>05</p>
            <h2 style={sectionHeading}>Intellectual Property</h2>

            <h3 style={subHeading}>Our Content</h3>
            <p style={body}>
              The Service and its original content are owned by PaperBoxd and protected by international copyright and trademark laws.
            </p>

            <h3 style={subHeading}>Book Information</h3>
            <p style={body}>
              Book covers, descriptions, and metadata are provided by third-party services and subject to their respective copyrights. We do not claim ownership of third-party book content.
            </p>

            <h3 style={subHeading}>Limited Licence</h3>
            <p style={body}>
              We grant you a limited, non-exclusive, non-transferable licence to access and use the Service for personal, non-commercial purposes.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>06</p>
            <h2 style={sectionHeading}>Prohibited Activities</h2>
            <p style={body}>You agree not to:</p>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li style={li}>Use the Service for any illegal purpose or in violation of any laws</li>
              <li style={li}>Attempt to gain unauthorised access to the Service or other accounts</li>
              <li style={li}>Interfere with or disrupt the Service or its servers</li>
              <li style={li}>Use automated systems (bots, scrapers) without permission</li>
              <li style={li}>Impersonate any person or entity</li>
              <li style={li}>Harass, abuse, or harm other users</li>
              <li style={li}>Reverse engineer or decompile any part of the Service</li>
            </ul>
          </section>

          <section>
            <p style={sectionLabel}>07</p>
            <h2 style={sectionHeading}>Third-Party Services</h2>
            <p style={body}>
              The Service may link to third-party websites or services not owned by PaperBoxd. We have no control over and assume no responsibility for their content or practices. We encourage you to read the terms and privacy policies of any third-party services you access.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>08</p>
            <h2 style={sectionHeading}>Disclaimers and Liability</h2>

            <h3 style={subHeading}>Service Availability</h3>
            <p style={body}>
              The Service is provided &quot;as is&quot; without warranties of any kind. We do not guarantee the Service will be uninterrupted, secure, or error-free.
            </p>

            <h3 style={subHeading}>Content Accuracy</h3>
            <p style={body}>
              Book information is provided by third-party services. We are not responsible for errors or omissions in such information.
            </p>

            <h3 style={subHeading}>Limitation of Liability</h3>
            <p style={body}>
              To the maximum extent permitted by law, PaperBoxd shall not be liable for any indirect, incidental, or consequential damages resulting from your use of the Service.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>09</p>
            <h2 style={sectionHeading}>Indemnification</h2>
            <p style={body}>
              You agree to indemnify and hold harmless PaperBoxd and its team from any claims, liabilities, damages, or expenses arising from your use of the Service or violation of these Terms.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>10</p>
            <h2 style={sectionHeading}>Changes to Terms</h2>
            <p style={body}>
              We reserve the right to modify these Terms at any time. Material changes will be communicated with at least 30 days&apos; notice. Continued use of the Service after changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>11</p>
            <h2 style={sectionHeading}>Termination</h2>
            <p style={body}>
              We may terminate or suspend your account immediately, without prior notice, for any breach of these Terms. Upon termination, your right to use the Service ceases immediately.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>12</p>
            <h2 style={sectionHeading}>Governing Law</h2>
            <p style={body}>
              These Terms are governed by the laws of the jurisdiction in which PaperBoxd operates. Disputes shall be resolved in the appropriate courts of that jurisdiction.
            </p>
          </section>

          <section>
            <p style={sectionLabel}>13</p>
            <h2 style={sectionHeading}>Contact Us</h2>
            <p style={body}>For questions about these Terms:</p>
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
