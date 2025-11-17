"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { Instagram, Linkedin, Send, Twitter } from "lucide-react"
import { PrivacyPolicyDialog } from "@/components/ui/privacy-policy-dialog"
import { TermsOfServiceDialog } from "@/components/ui/terms-of-service-dialog"
import { CookieSettingsDialog } from "@/components/ui/cookie-settings-dialog"
import { AboutUsDialog } from "@/components/ui/about-us-dialog"

function Footerdemo() {
  const [isPrivacyDialogOpen, setIsPrivacyDialogOpen] = React.useState(false)
  const [isTermsDialogOpen, setIsTermsDialogOpen] = React.useState(false)
  const [isCookieDialogOpen, setIsCookieDialogOpen] = React.useState(false)
  const [isAboutDialogOpen, setIsAboutDialogOpen] = React.useState(false)
  const [email, setEmail] = React.useState("")
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [submitMessage, setSubmitMessage] = React.useState<{
    type: "success" | "error"
    text: string
  } | null>(null)

  const handleNewsletterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    
    if (!email || isSubmitting) return

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const response = await fetch("/api/newsletter/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, source: "footer" }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setSubmitMessage({
          type: "success",
          text: data.message || "Thank you for subscribing!",
        })
        setEmail("") // Clear the input
        // Clear message after 5 seconds
        setTimeout(() => setSubmitMessage(null), 5000)
      } else {
        setSubmitMessage({
          type: "error",
          text: data.error || "Something went wrong. Please try again.",
        })
      }
    } catch (error) {
      console.error("Newsletter subscription error:", error)
      setSubmitMessage({
        type: "error",
        text: "Failed to subscribe. Please try again later.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <footer className="relative border-t bg-background text-foreground transition-colors duration-300">
      <div className="container mx-auto px-4 py-12 md:px-6 lg:px-8">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <h2 className="mb-4 text-3xl font-bold tracking-tight">Stay Connected</h2>
            <p className="mb-6 text-muted-foreground">
              Join our newsletter for the latest features and updates.
            </p>
            <form className="relative" onSubmit={handleNewsletterSubmit}>
              <Input
                type="email"
                placeholder="Enter your email"
                className="pr-12 backdrop-blur-sm"
                value={email || ""}
                onChange={(e) => setEmail(e.target.value || "")}
                required
                disabled={isSubmitting}
              />
              <Button
                type="submit"
                size="icon"
                disabled={isSubmitting}
                className="absolute right-1 top-1 h-8 w-8 rounded-full bg-primary text-primary-foreground transition-transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Subscribe</span>
              </Button>
            </form>
            {submitMessage && (
              <p
                className={`mt-3 text-sm ${
                  submitMessage.type === "success"
                    ? "text-green-600 dark:text-green-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {submitMessage.text}
              </p>
            )}
            <div className="absolute -right-4 top-0 h-24 w-24 rounded-full bg-primary/10 blur-2xl" />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Quick Links</h3>
            <nav className="space-y-2 text-sm">
              <a href="/" className="block transition-colors hover:text-primary">
                Home
              </a>
              <button
                onClick={() => setIsAboutDialogOpen(true)}
                className="block transition-colors hover:text-primary cursor-pointer text-left w-full"
              >
                About Us
              </button>
              <a href="/books" className="block transition-colors hover:text-primary">
                Discover Books
              </a>
              <a href="/contact" className="block transition-colors hover:text-primary">
                Contact
              </a>
            </nav>
          </div>
          <div>
            <h3 className="mb-4 text-lg font-semibold">Contact Us</h3>
            <address className="space-y-2 text-sm not-italic">
              <p>PaperBoxd</p>
              <p>Your Reading Companion</p>
              <p>Email: paperboxd@gmail.com</p>
              <p>Follow us for book updates</p>
            </address>
          </div>
          <div className="relative">
            <h3 className="mb-4 text-lg font-semibold">Follow Us</h3>
            <div className="mb-6 flex space-x-4">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://x.com/hridyeshhh " target="_blank" rel="noopener noreferrer">
                        <Twitter className="h-4 w-4" />
                        <span className="sr-only">Twitter</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Twitter</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://www.instagram.com/hridyeshhhh/ " target="_blank" rel="noopener noreferrer">
                        <Instagram className="h-4 w-4" />
                        <span className="sr-only">Instagram</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Follow us on Instagram</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button variant="outline" size="icon" className="rounded-full" asChild>
                      <a href="https://www.linkedin.com/in/hridyeshh/ " target="_blank" rel="noopener noreferrer">
                        <Linkedin className="h-4 w-4" />
                        <span className="sr-only">LinkedIn</span>
                      </a>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Connect with us on LinkedIn</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t pt-8 text-center md:flex-row">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} PaperBoxd. All rights reserved.
          </p>
          <nav className="flex gap-4 text-sm">
            <button
              onClick={() => setIsPrivacyDialogOpen(true)}
              className="transition-colors hover:text-primary cursor-pointer"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setIsTermsDialogOpen(true)}
              className="transition-colors hover:text-primary cursor-pointer"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setIsCookieDialogOpen(true)}
              className="transition-colors hover:text-primary cursor-pointer"
            >
              Cookie Settings
            </button>
            <a href="https://github.com/hridyeshh/PaperBoxd" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-primary">
              GitHub
            </a>
          </nav>
        </div>
      </div>

      <PrivacyPolicyDialog
        open={isPrivacyDialogOpen}
        onOpenChange={setIsPrivacyDialogOpen}
      />
      <TermsOfServiceDialog
        open={isTermsDialogOpen}
        onOpenChange={setIsTermsDialogOpen}
      />
      <CookieSettingsDialog
        open={isCookieDialogOpen}
        onOpenChange={setIsCookieDialogOpen}
      />
      <AboutUsDialog
        open={isAboutDialogOpen}
        onOpenChange={setIsAboutDialogOpen}
      />
    </footer>
  )
}

export { Footerdemo }
