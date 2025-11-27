"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
  Mail,
  KeyRound,
  ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/primitives/button";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { Separator } from "@/components/ui/primitives/separator";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { cn } from "@/lib/utils";
import { PasswordInput } from "@/components/ui/auth/password-input-2";
import {
  signInWithCredentials,
  signInWithGoogle,
  registerUser,
} from "@/lib/auth-client";
import { PrivacyPolicyDialog } from "@/components/ui/dialogs/privacy-policy-dialog";
import { TermsOfServiceDialog } from "@/components/ui/dialogs/terms-of-service-dialog";
import { useIsMobile } from "@/hooks/use-media-query";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { signIn as nextAuthSignIn } from "next-auth/react";

enum AuthView {
  SIGN_IN = "sign-in",
  SIGN_UP = "sign-up",
  FORGOT_PASSWORD = "forgot-password",
  OTP_LOGIN = "otp-login",
  RESET_PASSWORD = "reset-password",
}

interface AuthState {
  view: AuthView;
}

interface FormState {
  isLoading: boolean;
  error: string | null;
  showPassword: boolean;
}

const signInSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const signUpSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  terms: z
    .boolean()
    .refine((value) => value, {
      message: "You must agree to the terms",
  }),
});

type SignInFormValues = z.infer<typeof signInSchema>;
type SignUpFormValues = z.infer<typeof signUpSchema>;

function Auth({ className, ...props }: React.ComponentProps<"div">) {
  const [state, setState] = React.useState<AuthState>({
    view: AuthView.SIGN_IN,
  });

  const setView = React.useCallback((view: AuthView) => {
    setState((prev) => ({ ...prev, view }));
  }, []);

  return (
    <div
      data-slot="auth"
      className={cn("mx-auto w-full max-w-md", className)}
      {...props}
    >
      <div className="relative min-h-[560px] overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-lg shadow-primary/5 backdrop-blur">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {state.view === AuthView.SIGN_IN && (
              <AuthSignIn
                key="sign-in"
                onSignUp={() => setView(AuthView.SIGN_UP)}
                onForgotPassword={() => setView(AuthView.FORGOT_PASSWORD)}
              />
            )}
            {state.view === AuthView.SIGN_UP && (
              <AuthSignUp
                key="sign-up"
                onSignIn={() => setView(AuthView.SIGN_IN)}
              />
            )}
            {state.view === AuthView.FORGOT_PASSWORD && (
              <ForgotPasswordCard
                key="forgot-password"
                onBack={() => setView(AuthView.SIGN_IN)}
                onOTPLogin={() => setView(AuthView.OTP_LOGIN)}
                onResetPassword={() => setView(AuthView.RESET_PASSWORD)}
              />
            )}
            {state.view === AuthView.OTP_LOGIN && (
              <OTPLoginCard
                key="otp-login"
                onBack={() => setView(AuthView.SIGN_IN)}
              />
            )}
            {state.view === AuthView.RESET_PASSWORD && (
              <ResetPasswordCard
                key="reset-password"
                onBack={() => setView(AuthView.SIGN_IN)}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

interface AuthFormProps {
  onSubmit: React.FormEventHandler<HTMLFormElement>;
  children: React.ReactNode;
  className?: string;
}

function AuthForm({ onSubmit, children, className }: AuthFormProps) {
  return (
    <form
      onSubmit={onSubmit}
      data-slot="auth-form"
      className={cn("space-y-6", className)}
    >
      {children}
    </form>
  );
}

interface AuthErrorProps {
  message: string | null;
}

function AuthError({ message }: AuthErrorProps) {
  if (!message) return null;

  return (
    <div
      data-slot="auth-error"
      className="mb-6 animate-in rounded-lg border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive"
    >
      {message}
    </div>
  );
}

interface AuthSocialButtonsProps {
  isLoading: boolean;
  onGoogleClick?: () => void;
}

function AuthSocialButtons({ isLoading, onGoogleClick }: AuthSocialButtonsProps) {
  return (
    <div data-slot="auth-social-buttons" className="mt-6 w-full">
      <Button
        type="button"
        variant="outline"
        className="h-12 w-full border-border/50 bg-background/50"
        disabled={isLoading}
        onClick={onGoogleClick}
      >
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            fill="#4285F4"
          />
          <path
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            fill="#34A853"
          />
          <path
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            fill="#FBBC05"
          />
          <path
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            fill="#EA4335"
          />
          <path d="M1 1h22v22H1z" fill="none" />
        </svg>
        Google
      </Button>
    </div>
  );
}

interface AuthSeparatorProps {
  text?: string;
}

function AuthSeparator({ text = "Or continue with" }: AuthSeparatorProps) {
  return (
    <div data-slot="auth-separator" className="relative mt-6">
      <div className="absolute inset-0 flex items-center">
        <Separator />
      </div>
      <div className="relative flex justify-center text-xs uppercase">
        <span className="bg-card px-2 text-muted-foreground">{text}</span>
      </div>
    </div>
  );
}

interface AuthSignInProps {
  onSignUp: () => void;
  onForgotPassword: () => void;
}

// Video player component that ensures autoplay on mobile
function VideoPlayer({ src }: { src: string }) {
  const videoRef = React.useRef<HTMLVideoElement>(null);

  React.useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Force play on mount for mobile browsers
    const playPromise = video.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Auto-play was prevented, try again on user interaction
        const handleInteraction = () => {
          video.play().catch(() => {});
          document.removeEventListener('touchstart', handleInteraction);
          document.removeEventListener('click', handleInteraction);
        };
        document.addEventListener('touchstart', handleInteraction, { once: true });
        document.addEventListener('click', handleInteraction, { once: true });
      });
    }
  }, []);

  return (
    <video
      ref={videoRef}
      src={src}
      autoPlay
      loop
      muted
      playsInline
      className="w-full h-auto"
      style={{ maxWidth: '100%', height: 'auto' }}
    >
      Your browser does not support the video tag.
    </video>
  );
}

function AuthSignIn({ onSignUp, onForgotPassword }: AuthSignInProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [formState, setFormState] = React.useState<FormState>({
    isLoading: false,
    error: null,
    showPassword: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormValues>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: SignInFormValues) => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await signInWithCredentials(data.email, data.password);
      
      // Check if sign-in was successful
      if (result?.error) {
        // Error should have been thrown already, but handle it just in case
        const errorMessage = "Invalid email or password";
        toast.error(errorMessage);
        setFormState((prev) => ({
          ...prev,
          error: errorMessage,
        }));
        return;
      }
      
      if (result?.ok) {
        toast.success("Signed in successfully!");
        
        // Update session to ensure it's fresh
        await updateSession();
        
        // Wait a moment for session to be established, then check onboarding status
        setTimeout(async () => {
          try {
            const response = await fetch("/api/onboarding/status");
            if (response.ok) {
              const data = await response.json();
              
              // Determine redirect URL based on onboarding status
              let redirectUrl = "/";
              
              if (!data.hasUsername) {
                // No username - go to choose username
                redirectUrl = "/choose-username";
              } else if (data.isNewUser && !data.completed) {
                // New user who hasn't completed onboarding - go to onboarding
                // (setup-profile is only shown right after username selection)
                redirectUrl = "/onboarding";
              } else if (data.username) {
                // Has username - go to profile
                redirectUrl = `/u/${data.username}`;
              } else {
                // Fallback to home
                redirectUrl = "/";
              }
              
              router.push(redirectUrl);
            } else {
              // If API fails, redirect to home (it will check and redirect)
              router.push("/");
            }
          } catch (error) {
            console.error("Failed to check onboarding status:", error);
            // On error, redirect to home (it will check and redirect)
            router.push("/");
          }
        }, 100);
      }
    } catch (error) {
      // Set error message from the caught error
      const errorMessage = error instanceof Error 
        ? error.message 
        : "Invalid email or password";
      
      // Show toast notification
      toast.error(errorMessage);
      
      setFormState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
      await signInWithGoogle();
    } catch {
      const errorMessage = "Failed to sign in with Google";
      toast.error(errorMessage);
      setFormState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <motion.div
      data-slot="auth-sign-in"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col p-6 md:p-8"
    >
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">Read anything new?</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to your account & save it!
          </p>
        </div>

        {/* Video - Only show on mobile */}
        {isMobile && (
          <div className="relative w-full overflow-hidden rounded-2xl">
            <VideoPlayer src="/auth-video.mov" />
          </div>
        )}

        <AuthError message={formState.error} />

        <AuthForm onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2 max-w-xl">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              disabled={formState.isLoading}
              className={cn(
                "max-w-xl border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                errors.email && "border-destructive",
              )}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password">Password</Label>
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-xs"
                onClick={onForgotPassword}
                disabled={formState.isLoading}
              >
                Forgot password?
              </Button>
            </div>
            <PasswordInput
              id="password"
              placeholder="Enter your password"
              disabled={formState.isLoading}
              inputClassName={cn(
                "border border-border bg-background/95 pr-12 focus-visible:border-black",
                errors.password && "border-destructive focus-visible:ring-destructive",
              )}
              showChecklist={false}
              showStrengthLabel={false}
              showStrengthMeter={false}
              {...register("password")}
            />
            {errors.password ? (
              <p className="text-xs text-destructive">
                {errors.password.message}
              </p>
            ) : null}
          </div>
          <Button type="submit" className="w-full" disabled={formState.isLoading}>
            {formState.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign in"
            )}
          </Button>
        </AuthForm>
      </div>

      <div className="mt-8 space-y-6">
        <AuthSeparator />
        <AuthSocialButtons isLoading={formState.isLoading} onGoogleClick={handleGoogleSignIn} />
        <p className="text-center text-sm text-muted-foreground">
          No account?{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={onSignUp}
            disabled={formState.isLoading}
          >
            Create one
          </Button>
        </p>
      </div>
    </motion.div>
  );
}

interface AuthSignUpProps {
  onSignIn: () => void;
}

function AuthSignUp({ onSignIn }: AuthSignUpProps) {
  const [formState, setFormState] = React.useState<FormState>({
    isLoading: false,
    error: null,
    showPassword: false,
  });
  const [privacyDialogOpen, setPrivacyDialogOpen] = React.useState(false);
  const [termsDialogOpen, setTermsDialogOpen] = React.useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { name: "", email: "", password: "", terms: false },
  });

  const terms = watch("terms");

  const onSubmit = async (data: SignUpFormValues) => {
    setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      // Register the user
      await registerUser({
        name: data.name,
        email: data.email,
        password: data.password,
      });

      // Automatically sign in after successful registration
      const signInResult = await signInWithCredentials(data.email, data.password);
      
      if (signInResult?.ok) {
        // Redirect to choose username page after successful registration
        toast.success("Account created successfully!");
        // Use a small delay to ensure session is established
        setTimeout(() => {
          window.location.href = "/choose-username";
        }, 100);
      } else {
        throw new Error("Failed to sign in after registration");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Registration failed. Please try again.";
      toast.error(errorMessage);
      setFormState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setFormState((prev) => ({ ...prev, isLoading: true, error: null }));
      await signInWithGoogle();
    } catch {
      const errorMessage = "Failed to sign in with Google";
      toast.error(errorMessage);
      setFormState((prev) => ({
        ...prev,
        error: errorMessage,
      }));
    } finally {
      setFormState((prev) => ({ ...prev, isLoading: false }));
    }
  };

  return (
    <motion.div
      data-slot="auth-sign-up"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col p-6 md:p-8"
    >
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">
            Create account
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Get started with your account
          </p>
        </div>

        <AuthError message={formState.error} />

        <AuthForm onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              type="text"
              placeholder="John Doe"
              disabled={formState.isLoading}
              className={cn(
                "border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                errors.name && "border-destructive",
              )}
              {...register("name")}
            />
            {errors.name ? (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              disabled={formState.isLoading}
              className={cn(
                "border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                errors.email && "border-destructive",
              )}
              {...register("email")}
            />
            {errors.email ? (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            ) : null}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <PasswordInput
              id="password"
              placeholder="Create a password"
              disabled={formState.isLoading}
              inputClassName={cn(
                "border border-border bg-background/95 focus-visible:border-black",
                errors.password && "border-destructive focus-visible:ring-destructive",
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
          <div className="flex items-start space-x-2">
            <Checkbox
              id="terms"
              checked={terms}
              onCheckedChange={(checked) =>
                setValue("terms", checked as boolean, { shouldValidate: true })
              }
              disabled={formState.isLoading}
            />
            <div className="space-y-1">
              <Label htmlFor="terms" className="text-sm">
                I agree to the terms
              </Label>
              <p className="text-xs text-muted-foreground">
                By signing up, you agree to our{" "}
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs" 
                  type="button"
                  onClick={() => setTermsDialogOpen(true)}
                >
                  Terms
                </Button>{" "}
                and{" "}
                <Button 
                  variant="link" 
                  className="h-auto p-0 text-xs" 
                  type="button"
                  onClick={() => setPrivacyDialogOpen(true)}
                >
                  Privacy Policy
                </Button>
                .
              </p>
            </div>
          </div>
          {errors.terms ? (
            <p className="text-xs text-destructive">{errors.terms.message}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={formState.isLoading}>
            {formState.isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </AuthForm>
      </div>

      <div className="mt-8 space-y-6">
        <AuthSeparator />
        <AuthSocialButtons isLoading={formState.isLoading} onGoogleClick={handleGoogleSignIn} />
        <p className="text-center text-sm text-muted-foreground">
          Have an account?{" "}
          <Button
            variant="link"
            className="h-auto p-0 text-sm"
            onClick={onSignIn}
            disabled={formState.isLoading}
          >
            Sign in
          </Button>
        </p>
      </div>

      <PrivacyPolicyDialog 
        open={privacyDialogOpen} 
        onOpenChange={setPrivacyDialogOpen} 
      />
      <TermsOfServiceDialog 
        open={termsDialogOpen} 
        onOpenChange={setTermsDialogOpen} 
      />
    </motion.div>
  );
}

interface ForgotPasswordCardProps {
  onBack: () => void;
  onOTPLogin: () => void;
  onResetPassword: () => void;
}

function ForgotPasswordCard({ onBack, onOTPLogin, onResetPassword }: ForgotPasswordCardProps) {
  const handleOTPLogin = () => {
    onOTPLogin();
  };

  const handleResetPassword = () => {
    onResetPassword();
  };

  return (
    <motion.div
      data-slot="auth-forgot-password"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col p-6 md:p-8"
    >
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">
            Forgot Password?
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Choose an option to recover your account
          </p>
        </div>

        <div className="space-y-4">
          <button
            type="button"
            onClick={handleOTPLogin}
            className={cn(
              "w-full rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-primary/10 hover:border-border text-left",
              "md:p-8"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "rounded-xl border border-border/40 bg-primary/5 p-3 flex-shrink-0"
              )}>
                <Mail className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Log in through OTP
                </h3>
                <p className="text-xs text-muted-foreground">
                  Receive a one-time password via email to sign in
                </p>
              </div>
            </div>
          </button>

          <button
            type="button"
            onClick={handleResetPassword}
            className={cn(
              "w-full rounded-3xl border border-border/60 bg-background/95 p-6 shadow-lg shadow-primary/5 backdrop-blur transition-all hover:shadow-xl hover:shadow-primary/10 hover:border-border text-left",
              "md:p-8"
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "rounded-xl border border-border/40 bg-primary/5 p-3 flex-shrink-0"
              )}>
                <KeyRound className="h-5 w-5 text-primary" />
              </div>
              <div className="space-y-1 flex-1">
                <h3 className="text-base font-semibold text-foreground">
                  Reset Password
                </h3>
                <p className="text-xs text-muted-foreground">
                  Get a password reset link sent to your email
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-8">
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    </motion.div>
  );
}

interface OTPLoginCardProps {
  onBack: () => void;
}

type OTPStep = "email" | "code";

const otpEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

const otpCodeSchema = z.object({
  code: z.string().length(6, "Code must be 6 digits"),
});

type OTPEmailFormValues = z.infer<typeof otpEmailSchema>;
type OTPCodeFormValues = z.infer<typeof otpCodeSchema>;

function OTPLoginCard({ onBack }: OTPLoginCardProps) {
  const router = useRouter();
  const { update: updateSession } = useSession();
  const [step, setStep] = React.useState<OTPStep>("email");
  const [email, setEmail] = React.useState("");
  const [isLoading, setIsLoading] = React.useState(false);
  const [attemptsRemaining, setAttemptsRemaining] = React.useState<number | undefined>();
  const isSubmittingRef = React.useRef(false);
  const hasSucceededRef = React.useRef(false);

  const emailForm = useForm<OTPEmailFormValues>({
    resolver: zodResolver(otpEmailSchema),
    defaultValues: { email: "" },
  });

  const codeForm = useForm<OTPCodeFormValues>({
    resolver: zodResolver(otpCodeSchema),
    defaultValues: { code: "" },
  });

  const onEmailSubmit = async (data: OTPEmailFormValues) => {
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

  const onCodeSubmit = async (data: OTPCodeFormValues) => {
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

      if (response.ok && result.success && result.sessionToken) {
        const signInResult = await nextAuthSignIn("credentials", {
          email,
          otpSessionToken: result.sessionToken,
          redirect: false,
        });

        if (signInResult?.ok) {
          hasSucceededRef.current = true;
          toast.success("Signed in successfully!");
          await updateSession();

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
          return;
        } else if (signInResult?.error) {
          console.error("Sign in error:", signInResult.error);
          if (signInResult.error !== "Configuration") {
            toast.error("Failed to create session. Please try again.");
          }
          return;
        }
      }

      if ((!response.ok || !result.success) && !hasSucceededRef.current) {
        setAttemptsRemaining(result.attemptsRemaining);
        if (result.message && result.message !== "Code verified successfully") {
          toast.error(result.message || "Invalid code");
        }
      }
    } catch (error) {
      if (hasSucceededRef.current) {
        return;
      }
      
      console.error("Verify code error:", error);
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

  const codeValue = codeForm.watch("code");
  React.useEffect(() => {
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
        if (!isSubmittingRef.current && !isLoading && !hasSucceededRef.current) {
          onCodeSubmit({ code: codeValue });
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeValue, isLoading, step]);

  return (
    <motion.div
      data-slot="auth-otp-login"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col p-6 md:p-8"
    >
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">
            {step === "email" ? "Sign in with Code" : "Enter Verification Code"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {step === "email"
              ? "Enter your email address and we&apos;ll send you a verification code."
              : `We sent a code to ${email}. Enter it below to sign in.`}
          </p>
        </div>

        <AnimatePresence mode="wait">
          {step === "email" ? (
            <motion.div
              key="email"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-email">Email</Label>
                  <Input
                    id="otp-email"
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
              </form>
            </motion.div>
          ) : (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <form onSubmit={codeForm.handleSubmit(onCodeSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="otp-code">Verification Code</Label>
                  <Input
                    id="otp-code"
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
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-auto p-0 text-sm"
                      onClick={() => {
                        setStep("email");
                        codeForm.reset();
                        setAttemptsRemaining(undefined);
                      }}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Use a different email
                    </Button>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div className="mt-8">
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    </motion.div>
  );
}

interface ResetPasswordCardProps {
  onBack: () => void;
}

const resetPasswordEmailSchema = z.object({
  email: z.string().email("Invalid email address"),
});

type ResetPasswordEmailFormValues = z.infer<typeof resetPasswordEmailSchema>;

function ResetPasswordCard({ onBack }: ResetPasswordCardProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordEmailFormValues>({
    resolver: zodResolver(resetPasswordEmailSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = async (data: ResetPasswordEmailFormValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: data.email }),
      });

      const result = await response.json();

      if (response.ok) {
        setIsSuccess(true);
        toast.success("Check your email for a password reset link");
      } else {
        toast.error(result.message || "Failed to send reset link");
      }
    } catch (error) {
      console.error("Forgot password error:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      data-slot="auth-reset-password"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
      className="flex h-full flex-col p-6 md:p-8"
    >
      <div className="flex-1 space-y-6 overflow-y-auto pr-2">
        <div className="text-center">
          <h1 className="text-3xl font-semibold text-foreground">
            Reset Your Password
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Enter your email address and we&apos;ll send you a link to reset your password.
          </p>
        </div>

        {isSuccess ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="space-y-4 text-center"
          >
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Mail className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted-foreground">
                We&apos;ve sent a password reset link to your email address.
                The link will expire in 1 hour.
              </p>
            </div>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email">Email</Label>
              <Input
                id="reset-email"
                type="email"
                placeholder="Enter your email"
                disabled={isLoading}
                className={cn(
                  "border border-border bg-background/95 px-4 focus-visible:border-black focus-visible:ring-0 focus-visible:ring-offset-0",
                  errors.email && "border-destructive"
                )}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-xs text-destructive">
                  {errors.email.message}
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
                  Send Reset Link
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8">
        <Button
          variant="ghost"
          className="w-full"
          onClick={onBack}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to sign in
        </Button>
      </div>
    </motion.div>
  );
}


export {
  Auth,
  AuthSignIn,
  AuthSignUp,
  AuthForm,
  AuthError,
  AuthSocialButtons,
  AuthSeparator,
};
