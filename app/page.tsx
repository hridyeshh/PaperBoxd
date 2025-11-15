import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { Header } from "@/components/ui/layout/header-with-search";
import { Hero } from "@/components/ui/home/hero";

export default function Home() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen flex-col">
        <Header />
        <div className="flex flex-1 items-center justify-center px-4 pb-16 pt-20 md:pb-24 md:pt-24">
          <Hero />
        </div>
      </div>
    </main>
  );
}
