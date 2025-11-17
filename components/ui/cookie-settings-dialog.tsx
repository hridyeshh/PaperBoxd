"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface CookieSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CookieSettingsDialog({
  open,
  onOpenChange,
}: CookieSettingsDialogProps) {
  const [essentialCookies, setEssentialCookies] = React.useState(true)

  // Essential cookies are always required and cannot be disabled
  React.useEffect(() => {
    setEssentialCookies(true)
  }, [])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Cookie Settings</DialogTitle>
          <DialogDescription>
            Learn about how PaperBoxd uses cookies and local storage.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">About Cookies</h2>
            <p className="text-muted-foreground mb-4">
              Cookies are small text files that are placed on your device when you visit a website. They are widely used to make websites work more efficiently and provide information to website owners.
            </p>
            <p className="text-muted-foreground">
              PaperBoxd uses cookies primarily for essential functionality such as user authentication. We do not use analytics, advertising, or marketing cookies. We also use browser local storage to store your preferences locally on your device.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-4">Cookie Preferences</h2>
            
            <div className="space-y-6">
              {/* Essential Cookies */}
              <div className="flex items-start justify-between gap-4 p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Label htmlFor="essential-cookies" className="text-base font-semibold cursor-pointer">
                      Essential Cookies
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded">Required</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    These cookies are necessary for the website to function properly. They enable core functionality such as authentication and session management. You cannot opt out of these cookies as they are essential for the service to work.
                  </p>
                  <p className="text-xs text-muted-foreground mt-2">
                    <strong>Examples:</strong> NextAuth session cookies for user authentication
                  </p>
                </div>
                <Switch
                  id="essential-cookies"
                  checked={essentialCookies}
                  onCheckedChange={setEssentialCookies}
                  disabled={true}
                  className="mt-1"
                />
              </div>

              {/* Local Storage Information */}
              <div className="p-4 border rounded-lg bg-muted/30">
                <h3 className="text-base font-semibold mb-2">Local Storage</h3>
                <p className="text-sm text-muted-foreground">
                  We use browser local storage (not cookies) to store your preferences such as theme settings and cookie preferences. This data is stored locally on your device and is not sent to our servers automatically.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  <strong>Examples:</strong> Theme preferences (dark/light mode), cookie preference settings
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Managing Cookies</h2>
            <p className="text-muted-foreground mb-4">
              In addition to the controls above, you can manage cookies through your browser settings. Most browsers allow you to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>View what cookies are stored on your device</li>
              <li>Delete cookies that are already stored</li>
              <li>Block cookies from being set in the future</li>
              <li>Set preferences for specific websites</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              Please note that blocking or deleting cookies may impact your experience on PaperBoxd, as some features may not function properly without them.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We use third-party services that may set cookies or use similar technologies:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Google OAuth:</strong> For authentication when you sign in with Google. Google may set cookies as part of their authentication process.</li>
              <li><strong>Book Data APIs:</strong> We fetch book information from ISBNdb and Open Library APIs. These services may set cookies when you interact with their content.</li>
            </ul>
            <p className="text-muted-foreground mt-4">
              We do not use third-party analytics, advertising, or marketing services that would set tracking cookies. Any cookies set by third-party services are subject to their respective privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Updates to Cookie Policy</h2>
            <p className="text-muted-foreground">
              We may update our cookie usage from time to time. When we make changes, we will update this page and notify you of any material changes. We encourage you to review this page periodically to stay informed about how we use cookies.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about our use of cookies, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-muted-foreground">
                <strong>Email:</strong> hridyesh2309@gmail.com<br />
                paperboxd@gmail.com
              </p>
            </div>
          </section>

          {/* Close Button */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button
              onClick={() => onOpenChange(false)}
              className="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

