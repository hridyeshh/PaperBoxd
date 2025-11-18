
import { AuthShell } from "@/components/ui/auth/auth-shell";
import { Auth } from "@/components/ui/auth-form-1";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { Header } from "@/components/ui/layout/header-with-search";

export default function AuthPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <Header />
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12 md:px-8 pt-24">
        <AuthShell
          title="Welcome to PaperBoxd"
          description="Sign in or create an account to start tracking, organizing, and sharing the books you love."
          badge="Get started"
          sideContent={
            <div className="flex flex-col gap-4">
              <div className="space-y-4">
                <h2 className="text-3xl font-semibold text-foreground">
                  Your reading universe, organised.
                </h2>
                <p className="text-sm text-foreground/80">
                  Build shelves, capture notes, and follow friends to discover what everyone is reading right now.
                </p>
              </div>
              <div className="relative w-full overflow-hidden rounded-2xl">
                <video
                  src="/auth-video.mov"
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-auto"
                  style={{ maxWidth: '100%', height: 'auto' }}
                >
                  Your browser does not support the video tag.
                </video>
              </div>
            </div>
          }
          footer={
            <p>
              Need help?{" "}
              <a
                href="mailto:support@paperboxd.com"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Contact support
              </a>
            </p>
          }
        >
          <Auth />
        </AuthShell>
      </div>
    </main>
  );
}

