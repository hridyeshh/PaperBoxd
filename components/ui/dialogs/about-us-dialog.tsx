"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog"

interface AboutUsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AboutUsDialog({
  open,
  onOpenChange,
}: AboutUsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">About PaperBoxd</DialogTitle>
          <DialogDescription>
            Your reading universe, organized.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <p className="text-muted-foreground mb-4">
              A modern social book tracking platform that empowers readers to discover, track, and share their literary journey. PaperBoxd transforms reading into a connected, discoverable experience—inspired by the simplicity and community spirit of Letterboxd, but built exclusively for books.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Our Mission</h2>
            <p className="text-muted-foreground mb-4">
              PaperBoxd was conceived to solve a fundamental problem: reading is a deeply personal yet inherently social activity, but existing platforms fragment the experience. Our mission is to create a unified space where readers can:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Track their journey:</strong> From "to-be-read" aspirations to completed masterpieces</li>
              <li><strong>Discover meaningfully:</strong> Through community curation and authentic recommendations</li>
              <li><strong>Express authentically:</strong> With rich profiles, custom lists, and thoughtful reviews</li>
              <li><strong>Connect organically:</strong> By following fellow readers and exploring their literary landscapes</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Core Philosophy</h2>
            <p className="text-muted-foreground">
              We believe that the best book recommendations come from people, not algorithms. PaperBoxd is designed around the principle that reading communities thrive when readers can express themselves, discover through trusted networks, and maintain control over their personal data and privacy.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Key Features</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-base font-medium mb-2">User Profiles</h3>
                <p className="text-muted-foreground">
                  Create rich profiles with your reading history, favorite books, and custom lists. Follow other readers and discover new books through their collections.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-2">Book Management</h3>
                <p className="text-muted-foreground">
                  Organize your reading journey with bookshelves, likes, and to-be-read lists. Track what you've read, what you loved, and what you want to read next.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-2">Social Features</h3>
                <p className="text-muted-foreground">
                  Follow fellow readers, see their activity, and discover books through your network. Build your reading community and share your literary discoveries.
                </p>
              </div>
              <div>
                <h3 className="text-base font-medium mb-2">Personalized Recommendations</h3>
                <p className="text-muted-foreground">
                  Get intelligent book recommendations based on your reading preferences, favorite genres, and what your friends are enjoying.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Built With Modern Technology</h2>
            <p className="text-muted-foreground mb-4">
              PaperBoxd is built with a focus on performance, user experience, and privacy:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Next.js 15</strong> - Server-side rendering for fast page loads</li>
              <li><strong>React 19</strong> - Modern UI with concurrent features</li>
              <li><strong>TypeScript</strong> - Type-safe development throughout</li>
              <li><strong>MongoDB</strong> - Flexible, scalable database</li>
              <li><strong>Tailwind CSS</strong> - Beautiful, responsive design</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Privacy & Security</h2>
            <p className="text-muted-foreground">
              We take your privacy seriously. PaperBoxd uses server-side tracking for recommendations (no third-party cookies), stores your data securely, and gives you full control over your information. Your reading data belongs to you.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Open Source</h2>
            <p className="text-muted-foreground">
              PaperBoxd is open source. You can view our code, contribute, and help us build a better reading community. Visit our{" "}
              <a 
                href="https://github.com/hridyeshh/PaperBoxd" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline"
              >
                GitHub repository
              </a>{" "}
              to learn more.
            </p>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

