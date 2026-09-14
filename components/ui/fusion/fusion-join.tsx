"use client";

// Fusion invite, web side. The story itself lives in the apps; the web's job
// is to let the invited reader sign in, tap Fuse once, and hand off to the app.
// Visual language follows the Fusion design kit: one grotesk, hairlines,
// vermilion for the invitee's half.

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Pinyon_Script } from "next/font/google";
import { toast } from "sonner";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { rememberPendingFusion, clearPendingFusion } from "@/components/ui/fusion/pending-fusion";

const script = Pinyon_Script({ weight: "400", subsets: ["latin"], display: "swap" });

type Status = "valid" | "expired" | "used" | "own" | "joined" | "unavailable";
type Preview = { status: Status; inviter?: { first: string; username: string } };
type View = { kind: "loading" } | { kind: "error" } | ({ kind: "ready" } & Preview);

const ACCENT = "#e33d21";

export function FusionJoin({ token }: { token: string }) {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [view, setView] = React.useState<View>({ kind: "loading" });
  const [fusing, setFusing] = React.useState(false);

  const load = React.useCallback(async () => {
    setView({ kind: "loading" });
    try {
      const res = await fetch(`/api/fusions/invites/${encodeURIComponent(token)}`, { cache: "no-store" });
      if (!res.ok) throw new Error(String(res.status));
      setView({ kind: "ready", ...((await res.json()) as Preview) });
    } catch {
      setView({ kind: "error" });
    }
  }, [token]);

  // Re-read once auth settles: "own" and "joined" depend on who is looking.
  React.useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, isAuthenticated, load]);

  React.useEffect(() => {
    if (isAuthenticated && view.kind === "ready") clearPendingFusion();
  }, [isAuthenticated, view.kind]);

  const first = view.kind === "ready" ? view.inviter?.first ?? "Your friend" : "";

  const signIn = () => {
    rememberPendingFusion(token);
    router.push("/auth");
  };

  const fuse = async () => {
    setFusing(true);
    try {
      const res = await fetch(`/api/fusions/invites/${encodeURIComponent(token)}/accept`, { method: "POST" });
      const body = (await res.json().catch(() => ({}))) as { status?: Status };
      if (res.ok) {
        setView((v) => (v.kind === "ready" ? { ...v, status: "joined" } : v));
      } else if (res.status === 401) {
        signIn();
      } else if (body.status) {
        setView((v) => (v.kind === "ready" ? { ...v, status: body.status! } : v));
      } else {
        toast.error("Couldn't make this Fusion right now. Try again.");
      }
    } catch {
      toast.error("Couldn't make this Fusion right now. Try again.");
    } finally {
      setFusing(false);
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success("Fusion link copied");
    } catch {
      toast.error("Couldn't copy the link");
    }
  };

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <div className="mx-auto flex min-h-dvh w-full max-w-[440px] flex-col px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-[max(2rem,env(safe-area-inset-top))] md:justify-center">
        <header className="flex items-baseline justify-between">
          <Link href="/" className={cn("text-[1.75rem] leading-none", script.className)}>
            PaperBoxd
          </Link>
          <Eyebrow>Fusion invite</Eyebrow>
        </header>
        <hr className="mt-3 border-foreground/15" />

        <div className="flex flex-1 flex-col md:flex-none">
          {view.kind === "loading" && <div className="flex-1 py-24" aria-busy="true" />}

          {view.kind === "error" && (
            <State
              head="We couldn't open this invite right now."
              body="Nothing was shared. Check your connection and try again."
              cta={<Primary onClick={() => void load()}>Try again</Primary>}
            />
          )}

          {view.kind === "ready" && view.status === "valid" && (
            <>
              <Discs className="mt-10" />
              <h1 className="mt-8 text-[2.6rem] font-bold leading-[0.98] tracking-[-0.035em]">
                {first} invited you
                <br />
                <span style={{ color: ACCENT }}>to a Fusion.</span>
              </h1>

              <Eyebrow className="mt-8">{first} will see</Eyebrow>
              <ol className="mt-2 border-t border-foreground/15">
                {[
                  "Your ratings on books you have both read",
                  `Books you loved that ${first} has not read`,
                  "Where your tastes agree, and where they split",
                ].map((line, i) => (
                  <li key={line} className="flex gap-3 border-b border-foreground/15 py-3 text-[0.9rem] text-foreground/85">
                    <span className="w-5 pt-0.5 text-[0.7rem] font-bold tabular-nums" style={{ color: ACCENT }}>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {line}
                  </li>
                ))}
              </ol>
              <p className="mt-3 text-[0.8rem] text-muted-foreground">Your diary entries and notes are never included.</p>

              <div className="mt-auto pt-10 md:mt-10">
                {isAuthenticated ? (
                  <>
                    <Primary onClick={() => void fuse()} disabled={fusing}>
                      {fusing ? "Fusing…" : `Fuse with ${first}`}
                    </Primary>
                    <div className="mt-3 text-center">
                      <Link href="/" className="text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground hover:text-foreground">
                        Not now
                      </Link>
                    </div>
                  </>
                ) : (
                  <>
                    <Primary onClick={signIn}>Sign in to Fuse</Primary>
                    <p className="mt-3 text-center text-[0.8rem] text-muted-foreground">
                      New to PaperBoxd? You can create an account there. Your invite waits for you.
                    </p>
                  </>
                )}
              </div>
            </>
          )}

          {view.kind === "ready" && view.status === "joined" && (
            <State
              head={
                <>
                  You fused
                  <br />
                  <span style={{ color: ACCENT }}>with {first}.</span>
                </>
              }
              body={`Your Fusion lives in the PaperBoxd app: ten pages, one number, and a book neither of you has read. ${first} has been told.`}
              cta={
                <>
                  <Primary href={`paperboxd://fusion/${encodeURIComponent(token)}`}>Open in the app</Primary>
                  <p className="mt-3 text-center text-[0.8rem] text-muted-foreground">
                    On your computer? Open this link on your phone.
                  </p>
                </>
              }
            />
          )}

          {view.kind === "ready" && view.status === "own" && (
            <State
              head="This is your own invite."
              body="A Fusion needs two readers. Send this link to someone else."
              cta={<Primary onClick={() => void copyLink()}>Copy link</Primary>}
            />
          )}

          {view.kind === "ready" && view.status === "used" && (
            <State
              head="Someone already used this invite."
              body={`Each link makes one Fusion with one reader. Ask ${first} for a link of your own.`}
              cta={<Primary href="/">Go to PaperBoxd</Primary>}
            />
          )}

          {view.kind === "ready" && view.status === "expired" && (
            <State
              head="This invite has expired."
              body={`Fusion links last seven days. Ask ${first} to send a new one.`}
              cta={<Primary href="/">Go to PaperBoxd</Primary>}
            />
          )}

          {view.kind === "ready" && view.status === "unavailable" && (
            <State
              head="This invite isn't available."
              body="It may have been cancelled. Nothing was shared."
              cta={<Primary href="/">Go to PaperBoxd</Primary>}
            />
          )}
        </div>
      </div>
    </main>
  );
}

function Eyebrow({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={cn("text-[0.65rem] font-semibold uppercase tracking-[0.17em] text-muted-foreground", className)}>
      {children}
    </p>
  );
}

// The two-disc mark: the only place the Fusion symbol appears.
function Discs({ className }: { className?: string }) {
  return (
    <div className={cn("relative h-[62px] w-[108px]", className)} aria-hidden>
      <span className="absolute left-0 top-0 size-[62px] rounded-full mix-blend-multiply dark:mix-blend-screen" style={{ background: ACCENT }} />
      <span className="absolute left-[46px] top-0 size-[62px] rounded-full bg-foreground mix-blend-multiply dark:mix-blend-screen" />
    </div>
  );
}

function State({ head, body, cta }: { head: React.ReactNode; body: string; cta: React.ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col justify-center py-12 md:flex-none">
        <h1 className="text-[2.1rem] font-bold leading-[1.04] tracking-[-0.03em]">{head}</h1>
        <hr className="my-5 border-foreground/15" />
        <p className="max-w-[20rem] text-[0.95rem] leading-relaxed text-foreground/80">{body}</p>
      </div>
      <div>{cta}</div>
    </>
  );
}

const primaryClass =
  "block w-full border border-foreground bg-foreground px-5 py-4 text-center text-[0.7rem] font-semibold uppercase tracking-[0.1em] text-background transition-opacity hover:opacity-90 disabled:opacity-50";

function Primary({
  children,
  onClick,
  href,
  disabled,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  href?: string;
  disabled?: boolean;
}) {
  if (href) {
    return (
      <a href={href} className={primaryClass}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={primaryClass}>
      {children}
    </button>
  );
}
