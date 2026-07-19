import type { Metadata } from "next";
import { LegalDoc } from "@/components/legal/legal-doc";

export const metadata: Metadata = {
  title: "Terms of Service — PaperBoxd",
  // Draft: keep out of search until placeholders are filled. Flip to true
  // alongside DRAFT in legal-doc.tsx once the terms are final.
  robots: { index: false, follow: false },
};

export default function TermsOfServicePage() {
  return <LegalDoc slug="terms-of-service" />;
}
