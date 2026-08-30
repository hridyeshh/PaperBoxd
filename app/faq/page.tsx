import type { Metadata } from "next";
import { FAQPage } from "@/components/ui/pages/faq-page";

export const metadata: Metadata = {
  title: "FAQ · PaperBoxd",
  description:
    "Fifteen answers about shelves, streaks, vibe search, privacy and your data.",
};

export default function Page() {
  return <FAQPage />;
}
