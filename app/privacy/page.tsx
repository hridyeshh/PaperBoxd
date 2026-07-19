import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Privacy Policy — PaperBoxd",
  // Draft: keep out of search until placeholders are filled. Flip to true
  // alongside DRAFT in legal-doc.tsx once the policy is final.
  robots: { index: false, follow: false },
};

export default function PrivacyPolicyPage() {
  return <LegalDoc slug="privacy-policy" />;
}
