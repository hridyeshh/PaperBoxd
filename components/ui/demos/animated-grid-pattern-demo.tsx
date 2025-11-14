import { cn } from "@/lib/utils";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";

export function AnimatedGridPatternDemo() {
  return (
    <div className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className={cn("text-slate-500 dark:text-slate-400")}
      />
    </div>
  );
}
