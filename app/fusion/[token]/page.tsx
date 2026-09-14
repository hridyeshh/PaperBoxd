import type { Metadata } from "next";
import { goFetch } from "@/lib/api/endpoints";
import { FusionJoin } from "@/components/ui/fusion/fusion-join";

type Props = { params: Promise<{ token: string }> };

type Preview = { status: string; inviter?: { first?: string } };

// Link previews in Messages/WhatsApp name the inviter. Personal links, so
// never indexed.
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  let first = "";
  try {
    const { data } = await goFetch<Preview>(`/api/v1/fusions/invites/${encodeURIComponent(token)}`, {
      next: { revalidate: 60 },
    });
    first = data?.inviter?.first ?? "";
  } catch {
    // Preview text is decoration; the page still works.
  }
  const title = first ? `${first} invited you to a Fusion on PaperBoxd` : "A Fusion invite";
  return {
    title,
    description: "See how your reading tastes line up: what you both loved, where you split, and a book neither of you has read.",
    robots: { index: false, follow: false },
    openGraph: { title, description: "Two tastes. One discovery. On PaperBoxd." },
  };
}

export default async function FusionInvitePage({ params }: Props) {
  const { token } = await params;
  return <FusionJoin token={token} />;
}
