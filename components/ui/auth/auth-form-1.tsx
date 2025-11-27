"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "framer-motion";
import {
  Loader2,
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

enum AuthView {
  SIGN_IN = "sign-in",
  SIGN_UP = "sign-up",
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
      <div className="relative min-h-[560px] overflow-hidden rounded-xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5" />
        <div className="relative z-10">
          <AnimatePresence mode="wait">
            {state.view === AuthView.SIGN_IN && (
              <AuthSignIn
                key="sign-in"
                onSignUp={() => setView(AuthView.SIGN_UP)}
              />
            )}
            {state.view === AuthView.SIGN_UP && (
              <AuthSignUp
                key="sign-up"
                onSignIn={() => setView(AuthView.SIGN_IN)}
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

function AuthSignIn({ onSignUp }: AuthSignInProps) {
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
      className="flex h-full flex-col p-8"
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
                onClick={() => toast.info("Developer is working on this feature")}
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
      className="flex h-full flex-col p-8"
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


export {
  Auth,
  AuthSignIn,
  AuthSignUp,
  AuthForm,
  AuthError,
  AuthSocialButtons,
  AuthSeparator,
};
