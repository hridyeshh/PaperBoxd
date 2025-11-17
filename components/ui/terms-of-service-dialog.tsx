"use client"

import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TermsOfServiceDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function TermsOfServiceDialog({
  open,
  onOpenChange,
}: TermsOfServiceDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Terms of Service</DialogTitle>
          <DialogDescription>
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 text-sm leading-relaxed">
          <section>
            <h2 className="text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground mb-4">
              By accessing and using PaperBoxd ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>
            <p className="text-muted-foreground">
              These Terms of Service ("Terms") govern your access to and use of PaperBoxd, a book tracking and social platform. By creating an account, accessing, or using our Service, you agree to be bound by these Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground mb-4">
              PaperBoxd is a platform that allows users to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Track and organize books they have read, want to read, or are currently reading</li>
              <li>Rate and review books</li>
              <li>Create and share reading lists and collections</li>
              <li>Follow other users and view their reading activity</li>
              <li>Discover new books through personalized recommendations</li>
              <li>Participate in a community of book enthusiasts</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">3. User Accounts</h2>
            
            <h3 className="text-base font-medium mb-2 mt-4">3.1 Account Creation</h3>
            <p className="text-muted-foreground mb-4">
              To use certain features of the Service, you must create an account. You can create an account by providing a username, email address, and password, or by using a third-party authentication service such as Google OAuth.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">3.2 Account Responsibility</h3>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You are responsible for all activities that occur under your account</li>
              <li>You must provide accurate, current, and complete information during registration</li>
              <li>You must update your information to keep it accurate, current, and complete</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4">3.3 Account Termination</h3>
            <p className="text-muted-foreground">
              You may delete your account at any time through your account settings. We reserve the right to suspend or terminate your account if you violate these Terms or engage in any fraudulent, abusive, or illegal activity.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">4. User Content</h2>
            
            <h3 className="text-base font-medium mb-2 mt-4">4.1 Content You Post</h3>
            <p className="text-muted-foreground mb-4">
              You retain ownership of any content you post on PaperBoxd, including reviews, ratings, reading notes, and profile information. By posting content, you grant us a worldwide, non-exclusive, royalty-free license to use, reproduce, modify, and display your content on the Service.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">4.2 Content Guidelines</h3>
            <p className="text-muted-foreground mb-4">You agree not to post content that:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Is illegal, harmful, threatening, abusive, or discriminatory</li>
              <li>Infringes on intellectual property rights of others</li>
              <li>Contains spam, malware, or malicious code</li>
              <li>Is false, misleading, or defamatory</li>
              <li>Violates the privacy or rights of others</li>
              <li>Contains personal information of others without consent</li>
            </ul>

            <h3 className="text-base font-medium mb-2 mt-4">4.3 Content Moderation</h3>
            <p className="text-muted-foreground">
              We reserve the right to review, edit, or remove any content that violates these Terms or is otherwise objectionable. We are not obligated to monitor user content but may do so at our discretion.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">5. Intellectual Property</h2>
            
            <h3 className="text-base font-medium mb-2 mt-4">5.1 Our Content</h3>
            <p className="text-muted-foreground mb-4">
              The Service, including its original content, features, and functionality, is owned by PaperBoxd and is protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">5.2 Book Information</h3>
            <p className="text-muted-foreground mb-4">
              Book information, including covers, descriptions, and metadata, is provided by third-party services and is subject to their respective copyrights and terms of use. We do not claim ownership of book-related content provided by third parties.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">5.3 Limited License</h3>
            <p className="text-muted-foreground">
              We grant you a limited, non-exclusive, non-transferable license to access and use the Service for personal, non-commercial purposes. You may not reproduce, distribute, modify, or create derivative works from the Service without our express written permission.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">6. Prohibited Activities</h2>
            <p className="text-muted-foreground mb-4">You agree not to:</p>
            <ul className="list-disc list-inside space-y-2 text-muted-foreground ml-4">
              <li>Use the Service for any illegal purpose or in violation of any laws</li>
              <li>Attempt to gain unauthorized access to the Service or other users' accounts</li>
              <li>Interfere with or disrupt the Service or servers connected to the Service</li>
              <li>Use automated systems (bots, scrapers) to access the Service without permission</li>
              <li>Impersonate any person or entity or falsely state your affiliation with any person or entity</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Collect or store personal data about other users without their consent</li>
              <li>Use the Service to transmit viruses, malware, or other harmful code</li>
              <li>Reverse engineer, decompile, or disassemble any part of the Service</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              The Service may contain links to third-party websites or services that are not owned or controlled by PaperBoxd. We have no control over, and assume no responsibility for, the content, privacy policies, or practices of any third-party services.
            </p>
            <p className="text-muted-foreground">
              You acknowledge and agree that PaperBoxd shall not be responsible or liable for any damage or loss caused by your use of any third-party service. We encourage you to read the terms and conditions and privacy policies of any third-party services you access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">8. Disclaimers and Limitations of Liability</h2>
            
            <h3 className="text-base font-medium mb-2 mt-4">8.1 Service Availability</h3>
            <p className="text-muted-foreground mb-4">
              The Service is provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the Service will be uninterrupted, secure, or error-free.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">8.2 Content Accuracy</h3>
            <p className="text-muted-foreground mb-4">
              We do not warrant the accuracy, completeness, or usefulness of any information on the Service. Book information is provided by third-party services, and we are not responsible for any errors or omissions in such information.
            </p>

            <h3 className="text-base font-medium mb-2 mt-4">8.3 Limitation of Liability</h3>
            <p className="text-muted-foreground">
              To the maximum extent permitted by law, PaperBoxd shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from your use of the Service.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">9. Indemnification</h2>
            <p className="text-muted-foreground">
              You agree to indemnify, defend, and hold harmless PaperBoxd, its officers, directors, employees, and agents from and against any claims, liabilities, damages, losses, and expenses, including reasonable attorneys' fees, arising out of or in any way connected with your access to or use of the Service, your violation of these Terms, or your violation of any rights of another.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">10. Changes to Terms</h2>
            <p className="text-muted-foreground">
              We reserve the right to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days' notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion. Your continued use of the Service after any changes constitutes acceptance of the new Terms.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">11. Termination</h2>
            <p className="text-muted-foreground mb-4">
              We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including if you breach these Terms.
            </p>
            <p className="text-muted-foreground">
              Upon termination, your right to use the Service will cease immediately. All provisions of these Terms that by their nature should survive termination shall survive, including ownership provisions, warranty disclaimers, and limitations of liability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">12. Governing Law</h2>
            <p className="text-muted-foreground">
              These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which PaperBoxd operates, without regard to its conflict of law provisions. Any disputes arising from these Terms or the Service shall be resolved in the appropriate courts of that jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">13. Contact Information</h2>
            <p className="text-muted-foreground mb-4">
              If you have any questions about these Terms of Service, please contact us at:
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

