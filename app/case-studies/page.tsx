import type { Metadata } from "next";
import { CaseStudiesPage } from "@/components/ui/pages/case-studies-page";

export const metadata: Metadata = {
  title: "Research · PaperBoxd",
  description:
    "Ten things publishers, libraries and creators have already proved about readers — and what each one changed about how PaperBoxd is built.",
};

export default function Page() {
  return <CaseStudiesPage />;
}
