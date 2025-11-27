"use client";

import * as React from "react";
import { Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/lib/utils";
import { AuthShell } from "@/components/ui/auth/auth-shell";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { PasswordInput } from "@/components/ui/auth/password-input-2";

const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .regex(/[0-9]/, "Password must contain at least 1 number")
      .regex(/[a-z]/, "Password must contain at least 1 lowercase letter")
      .regex(/[A-Z]/, "Password must contain at least 1 uppercase letter")
      .regex(/[!-\/:-@[-`{-~]/, "Password must contain at least 1 special character"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const token = searchParams.get("token");
  const email = searchParams.get("email");

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (!token || !email) {
      toast.error("Invalid or missing reset token");
    }
  }, [token, email]);

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!token || !email) {
      toast.error("Invalid or missing reset token");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          email,
          newPassword: data.password,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Password reset successful!");
        setTimeout(() => {
          router.push("/auth?success=password-reset");
        }, 2000);
      } else {
        toast.error(result.message || "Failed to reset password");
      }
    } catch (error) {
      console.error("Reset password error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!token || !email) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <AnimatedGridPattern
          numSquares={120}
          maxOpacity={0.08}
          duration={4}
          repeatDelay={0.75}
          className="text-slate-500 dark:text-slate-400"
        />
        <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
          <AuthShell 
            title="Invalid Reset Link" 
            description="This password reset link is invalid or has expired."
            badge={undefined}
            sideContent={undefined}
          >
            <div className="space-y-4 text-center">
              <p className="text-sm text-muted-foreground">
                Please request a new password reset link.
              </p>
              <Link href="/auth/forgot-password">
                <Button variant="outline" className="w-full">
                  Request New Link
                </Button>
              </Link>
              <Link
                href="/auth"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Sign In
              </Link>
            </div>
          </AuthShell>
        </div>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-background">
      <AnimatedGridPattern
        numSquares={120}
        maxOpacity={0.08}
        duration={4}
        repeatDelay={0.75}
        className="text-slate-500 dark:text-slate-400"
      />
      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <AuthShell
          title="Reset Your Password"
          description="Enter your new password below."
          badge={undefined}
          sideContent={undefined}
        >
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-6"
          >
            {isSuccess ? (
              <div className="space-y-4 text-center">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                  <svg
                    className="h-8 w-8 text-green-600 dark:text-green-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
                <div className="space-y-2">
                  <h2 className="text-xl font-semibold">Password Reset Successful</h2>
                  <p className="text-sm text-muted-foreground">
                    Redirecting to sign in...
                  </p>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">New Password</Label>
                  <PasswordInput
                    id="password"
                    placeholder="Enter your new password"
                    disabled={isLoading}
                    inputClassName={cn(
                      "border border-border bg-background/95 focus-visible:border-black",
                      errors.password && "border-destructive focus-visible:ring-destructive"
                    )}
                    strengthLabel="Must contain"
                    wrapperClassName="space-y-2"
                    {...register("password")}
                  />
                  {errors.password ? (
                    <p className="text-xs text-destructive">
                      {errors.password.message}
                    </p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm New Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your new password"
                      disabled={isLoading}
                      className={cn(
                        "pr-10 border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                        errors.confirmPassword && "border-destructive"
                      )}
                      {...register("confirmPassword")}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {errors.confirmPassword ? (
                    <p className="text-xs text-destructive">
                      {errors.confirmPassword.message}
                    </p>
                  ) : null}
                </div>

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetting...
                    </>
                  ) : (
                    "Reset Password"
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
            )}
          </motion.div>
        </AuthShell>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="relative min-h-screen overflow-hidden bg-background">
          <AnimatedGridPattern
            numSquares={120}
            maxOpacity={0.08}
            duration={4}
            repeatDelay={0.75}
            className="text-slate-500 dark:text-slate-400"
          />
          <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
            <AuthShell 
              title="Loading..." 
              description="Please wait..."
              badge={undefined}
              sideContent={undefined}
            >
              <div className="flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            </AuthShell>
          </div>
        </main>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  );
}
