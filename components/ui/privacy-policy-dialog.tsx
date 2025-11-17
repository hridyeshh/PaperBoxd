"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface PrivacyPolicyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PrivacyPolicyDialog({
  open,
  onOpenChange,
}: PrivacyPolicyDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Privacy Policy</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to PaperBoxd ("we," "our," or "us"). We are committed to protecting your privacy and ensuring you have a positive experience on our platform. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our book tracking and social platform.
            </p>
            <p className="text-muted-foreground">
              By using PaperBoxd, you agree to the collection and use of information in accordance with this policy. If you do not agree with our policies and practices, please do not use our service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Information We Collect</h2>
            
            <h3 className="text-base font-medium mb-2 mt-4">2.1 Information You Provide</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Account Information:</strong> When you create an account, we collect your username, email address, and password. If you sign up using Google OAuth, we collect your name, email, and profile picture from your Google account.</li>
              <li><strong>Profile Information:</strong> You may choose to provide additional information such as a profile picture, bio, and reading preferences.</li>
              <li><strong>Reading Data:</strong> We collect information about books you add to your bookshelf, liked books, books you want to read (TBR), ratings, reviews, and reading notes.</li>
              <li><strong>Social Interactions:</strong> Information about users you follow, followers, and your activity on the platform.</li>
              <li><strong>Onboarding Preferences:</strong> Information you provide during the onboarding questionnaire to help us personalize your recommendations.</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4">2.2 Automatically Collected Information</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Usage Data:</strong> We collect information about how you interact with our platform, including pages visited, features used, and time spent on the platform.</li>
              <li><strong>Device Information:</strong> We may collect information about your device, including browser type, operating system, IP address, and device identifiers.</li>
              <li><strong>Cookies and Tracking Technologies:</strong> We use cookies and similar tracking technologies to track activity on our platform and store certain information.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-4">We use the information we collect for various purposes, including:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>To provide, maintain, and improve our services</li>
              <li>To personalize your experience and provide book recommendations based on your reading preferences</li>
              <li>To enable social features such as following other users, viewing activity feeds, and sharing your reading progress</li>
              <li>To communicate with you about your account, updates to our services, and promotional materials (with your consent)</li>
              <li>To analyze usage patterns and improve our platform's functionality</li>
              <li>To detect, prevent, and address technical issues and security threats</li>
              <li>To comply with legal obligations and enforce our terms of service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. Data Sharing and Disclosure</h2>
            <p className="text-muted-foreground mb-4">We do not sell your personal information. We may share your information in the following circumstances:</p>
            
            <h3 className="text-base font-medium mb-2 mt-4">4.1 Public Information</h3>
            <p className="text-muted-foreground mb-4">
              Your username, profile information, and public reading activity (books you've read, ratings, reviews) are visible to other users on the platform. You can control the visibility of certain information through your privacy settings.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">4.2 Service Providers</h3>
            <p className="text-muted-foreground mb-4">
              We may share your information with third-party service providers who perform services on our behalf, such as hosting, data analysis, email delivery, and customer service. These providers are contractually obligated to protect your information.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">4.3 Legal Requirements</h3>
            <p className="text-muted-foreground mb-4">
              We may disclose your information if required by law, court order, or government regulation, or if we believe disclosure is necessary to protect our rights, your safety, or the safety of others.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">4.4 Business Transfers</h3>
            <p className="text-muted-foreground">
              In the event of a merger, acquisition, or sale of assets, your information may be transferred to the acquiring entity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Data Storage and Security</h2>
            <p className="text-muted-foreground mb-4">
              We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. However, no method of transmission over the Internet or electronic storage is 100% secure.
            </p>
            <p className="text-muted-foreground">
              Your data is stored on secure servers, and we use encryption for sensitive information. We regularly review and update our security practices to protect your information.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Your Rights and Choices</h2>
            <p className="text-muted-foreground mb-4">You have the following rights regarding your personal information:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li><strong>Access:</strong> You can access and review your personal information through your account settings</li>
              <li><strong>Correction:</strong> You can update or correct your personal information at any time</li>
              <li><strong>Deletion:</strong> You can request deletion of your account and associated data by contacting us or using the account deletion feature</li>
              <li><strong>Data Portability:</strong> You can request a copy of your data in a machine-readable format</li>
              <li><strong>Opt-Out:</strong> You can opt out of marketing communications by adjusting your notification preferences</li>
              <li><strong>Cookie Preferences:</strong> You can manage cookie preferences through your browser settings</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Cookies and Tracking Technologies</h2>
            <p className="text-muted-foreground mb-4">
              We use cookies and similar tracking technologies to enhance your experience on our platform. Cookies are small data files stored on your device that help us remember your preferences and improve our services.
            </p>
            <p className="text-muted-foreground">
              You can control cookies through your browser settings. However, disabling cookies may limit your ability to use certain features of our platform.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new Privacy Policy on this page and updating the "Last updated" date. We encourage you to review this Privacy Policy periodically.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us at:
            </p>
            <div className="bg-muted p-4 rounded-lg">
              <p className="text-muted-foreground">
                <strong>Email:</strong> hridyesh2309@gmail.com<br />
                paperboxd@gmail.com
              </p>
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

