"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Auth } from "@/components/ui/auth/auth-form-1";
import { AuthBookColumnsPanel } from "@/components/ui/auth/auth-book-columns";
import { Pinyon_Script } from "next/font/google";
import { cn } from "@/lib/utils";

const ShaderBackground = dynamic(
  () => import("@/components/ui/features/shader-background").then((m) => ({ default: m.ShaderBackground })),
  { ssr: false, loading: () => null }
);

const pinyonScript = Pinyon_Script({ weight: "400", subsets: ["latin"], display: "swap" });

export default function AuthPage() {
  const [isDark, setIsDark] = React.useState(false);
  React.useEffect(() => {
    const check = () => setIsDark(document.documentElement.classList.contains("dark"));
    check();
    const obs = new MutationObserver(check);
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  const gradientVariant = isDark ? "warm-dark" : "warm";

  return (
    <main className="fixed inset-0 flex overflow-hidden bg-background">
      {/* Desktop: left book-cover mosaic */}
      <AuthBookColumnsPanel
        className="relative hidden w-[54%] flex-shrink-0 overflow-hidden md:block"
        showWordmark
        wordmarkClassName={cn("text-[2.6rem] leading-none text-white", pinyonScript.className)}
        taglineClassName="mt-1 text-[10px] font-medium uppercase tracking-[0.22em] text-white/40"
      />

      {/* Form panel */}
      <div className="relative flex flex-1 flex-col overflow-y-auto px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))] md:items-center md:justify-center md:px-6 md:pt-12 md:pb-12">
        <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden md:inset-5 md:rounded-[2rem] md:shadow-[0_4px_32px_oklch(0.62_0.08_38/0.12)]">
          <ShaderBackground variant={gradientVariant} />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[420px]">
          <div className="mb-6 select-none text-center md:hidden">
            <p className={cn("text-[2rem] leading-none text-foreground", pinyonScript.className)}>
              PaperBoxd
            </p>
            <p className="mt-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
              Your reading universe
            </p>
          </div>

          <Auth />
        </div>
      </div>
    </main>
  );
}
