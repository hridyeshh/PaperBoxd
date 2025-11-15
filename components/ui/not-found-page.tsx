"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { BookOpen, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
  EmptyMedia,
} from "@/components/ui/empty";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";

export function NotFoundPage() {
  const router = useRouter();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-16 sm:px-6 lg:px-8">
        <Empty className="w-full max-w-2xl">
          <EmptyMedia variant="icon">
            <BookOpen className="size-24 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle className="text-4xl md:text-5xl">Page Not Found</EmptyTitle>
            <EmptyDescription className="text-lg md:text-xl mt-4">
              The page you're looking for doesn't exist or has been moved.
              <br />
              Let's get you back to reading.
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex flex-col gap-4 sm:flex-row sm:justify-center mt-6">
              <Button
                onClick={() => router.push("/")}
                variant="default"
                size="lg"
                className="w-full sm:w-auto text-base px-8 py-6"
              >
                <Home className="mr-2 size-5" />
                Go Home
              </Button>
              <Button
                onClick={() => router.back()}
                variant="outline"
                size="lg"
                className="w-full sm:w-auto text-base px-8 py-6"
              >
                Go Back
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      </div>
    </main>
  );
}

