"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, ArrowLeft, Mail, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signIn as nextAuthSignIn } from "next-auth/react";

import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/ui/auth/auth-shell";
import { useSession } from "next-auth/react";

const emailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const codeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type EmailFormValues = z.infer<typeof emailSchema>;
type CodeFormValues = z.infer<typeof codeSchema>;

type Step = "email" | "code";

export default function OTPLoginPage() {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = React.useState<Step>("email");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = React.useState<number | undefined>();
  const isSubmittingRef = React.useRef(false);
  const hasSucceededRef = React.useRef(false);

  const emailForm = useForm<EmailFormValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    defaultValues: { code: "" },
  });

  const onEmailSubmit = async (data: EmailFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp-login/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setEmail(data.email);
        setStep("code");
        toast.success("Code sent! Check your email.");
      } else if (response.status === 429) {
        toast.error(result.message || "Too many requests. Please try again later.");
      } else {
        toast.error(result.message || "Failed to send code");
      }
    } catch (error) {
      console.error("Send code error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const onCodeSubmit = async (data: CodeFormValues) => {
    // Prevent multiple submissions or if we've already succeeded
    if (isSubmittingRef.current || isLoading || hasSucceededRef.current) {
      return;
    }
    
    isSubmittingRef.current = true;
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp-login/verify-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, code: data.code }),
      });

      const result = await response.json();

      // Check if verification was successful
      if (response.ok && result.success && result.sessionToken) {
        // Sign in using NextAuth with OTP session token
        const signInResult = await nextAuthSignIn("credentials", {
          email,
          otpSessionToken: result.sessionToken,
          redirect: false,
        });

        if (signInResult?.ok) {
          // Success! Mark as succeeded to prevent any further processing
          hasSucceededRef.current = true;
          
          // Success! Don't show any error toasts
          toast.success("Signed in successfully!");
          await updateSession();

          // Check onboarding status and redirect
          setTimeout(async () => {
            try {
              const onboardingResponse = await fetch("/api/onboarding/status");
              if (onboardingResponse.ok) {
                const onboardingData = await onboardingResponse.json();
                let redirectUrl = "/";

                if (!onboardingData.hasUsername) {
                  redirectUrl = "/choose-username";
                } else if (onboardingData.isNewUser && !onboardingData.completed) {
                  redirectUrl = "/onboarding";
                } else if (onboardingData.username) {
                  redirectUrl = `/u/${onboardingData.username}`;
                }

                router.push(redirectUrl);
              } else {
                router.push("/");
              }
            } catch (error) {
              console.error("Failed to check onboarding status:", error);
              router.push("/");
            }
          }, 100);
          // Return early to prevent any error handling below
          return;
        } else if (signInResult?.error) {
          // Only show error if there's a specific error message
          console.error("Sign in error:", signInResult.error);
          // Don't show toast for generic errors - the user might already be signed in
          if (signInResult.error !== "Configuration") {
            toast.error("Failed to create session. Please try again.");
          }
          return;
        }
      }

      // Only show error if verification failed (not successful) and we haven't already succeeded
      if ((!response.ok || !result.success) && !hasSucceededRef.current) {
        setAttemptsRemaining(result.attemptsRemaining);
        // Only show error toast if we have a meaningful error message
        if (result.message && result.message !== "Code verified successfully") {
          toast.error(result.message || "Invalid code");
        }
      }
    } catch (error) {
      // Don't show errors if we've already succeeded
      if (hasSucceededRef.current) {
        return;
      }
      
      console.error("Verify code error:", error);
      // Only show error if it's not a network error or if we haven't already shown one
      if (error instanceof Error && !error.message.includes("Failed to fetch")) {
        toast.error("An error occurred. Please try again.");
      }
    } finally {
      setIsLoading(false);
      isSubmittingRef.current = false;
    }
  };

  const handleResendCode = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/otp-login/send-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const result = await response.json();

      if (response.ok) {
        toast.success("New code sent! Check your email.");
        codeForm.reset({ code: "" });
        setAttemptsRemaining(undefined);
      } else {
        toast.error(result.message || "Failed to send code");
      }
    } catch (error) {
      console.error("Resend code error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-submit when 6 digits are entered
  const codeValue = codeForm.watch("code");
  React.useEffect(() => {
    // Only auto-submit if:
    // 1. Code is exactly 6 digits
    // 2. Not already loading/submitting
    // 3. We're on the code step
    // 4. Form is not already being submitted
    // 5. We haven't already succeeded
    if (
      codeValue &&
      codeValue.length === 6 &&
      /^\d{6}$/.test(codeValue) &&
      !isLoading &&
      !isSubmittingRef.current &&
      !hasSucceededRef.current &&
      step === "code"
    ) {
      const timer = setTimeout(() => {
        // Double-check we're still in a valid state
        if (!isSubmittingRef.current && !isLoading && !hasSucceededRef.current) {
          onCodeSubmit({ code: codeValue });
        }
      }, 500); // Slightly longer delay to prevent rapid-fire submissions
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeValue, isLoading, step]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <AuthShell
          title={step === "email" ? "Sign in with Code" : "Enter Verification Code"}
          description={
            step === "email"
              ? "Enter your email address and we'll send you a verification code."
              : `We sent a code to ${email}. Enter it below to sign in.`
          }
        >
          <AnimatePresence mode="wait">
            {step === "email" ? (
              <motion.div
                key="email"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="Enter your email"
                      disabled={isLoading}
                      className={cn(
                        "border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                        emailForm.formState.errors.email && "border-destructive"
                      )}
                      {...emailForm.register("email")}
                    />
                    {emailForm.formState.errors.email ? (
                      <p className="text-xs text-destructive">
                        {emailForm.formState.errors.email.message}
                      </p>
                    ) : null}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Send Code
                      </>
                    )}
                  </Button>

                  <div className="text-center">
                    <Link
                      href="/auth"
                      className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back to Sign In
                    </Link>
                  </div>
                </form>
              </motion.div>
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="code">Verification Code</Label>
                    <Input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      maxLength={6}
                      placeholder="000000"
                      disabled={isLoading}
                      className={cn(
                        "text-center text-2xl tracking-widest font-mono border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                        codeForm.formState.errors.code && "border-destructive"
                      )}
                      {...codeForm.register("code", {
                        pattern: {
                          value: /^\d{6}$/,
                          message: "Code must be 6 digits",
                        },
                      })}
                    />
                    {codeForm.formState.errors.code ? (
                      <p className="text-xs text-destructive">
                        {codeForm.formState.errors.code.message}
                      </p>
                    ) : attemptsRemaining !== undefined ? (
                      <p className="text-xs text-muted-foreground">
                        {attemptsRemaining} attempt{attemptsRemaining !== 1 ? "s" : ""} remaining
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">
                        Enter the 6-digit code from your email
                      </p>
                    )}
                  </div>

                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Verifying...
                      </>
                    ) : (
                      <>
                        <KeyRound className="mr-2 h-4 w-4" />
                        Verify Code
                      </>
                    )}
                  </Button>

                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="ghost"
                      className="w-full"
                      onClick={handleResendCode}
                      disabled={isLoading}
                    >
                      Didn&apos;t receive code? Send again
                    </Button>

                    <div className="text-center">
                      <button
                        type="button"
                        onClick={() => {
                          setStep("email");
                          codeForm.reset();
                          setAttemptsRemaining(undefined);
                        }}
                        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Use a different email
                      </button>
                    </div>
                  </div>
                </form>
              </motion.div>
            )}
          </AnimatePresence>
        </AuthShell>
      </div>
    </main>
  );
}

