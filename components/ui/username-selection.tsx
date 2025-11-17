"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { Loader2, Check, X, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { generateUsernameSuggestions, generatePrimaryUsername } from "@/lib/utils/username-suggestions";

const usernameSchema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
});

type UsernameFormValues = z.infer<typeof usernameSchema>;

interface UsernameSelectionProps {
  name: string;
  email?: string;
  initialUsername?: string; // Pre-generated username to pre-fill
  onComplete?: () => void;
}

export function UsernameSelection({
  name,
  email,
  initialUsername,
  onComplete,
}: UsernameSelectionProps) {
  const router = useRouter();
  const { data: session, update } = useSession();
  const [isChecking, setIsChecking] = React.useState(false);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [availability, setAvailability] = React.useState<{
    available: boolean | null;
    checking: boolean;
  }>({ available: null, checking: false });

  // Generate primary username if not provided
  const primaryUsername = React.useMemo(
    () => initialUsername || generatePrimaryUsername(name, email),
    [initialUsername, name, email]
  );

  const suggestions = React.useMemo(
    () => generateUsernameSuggestions(name, email),
    [name, email]
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<UsernameFormValues>({
    resolver: zodResolver(usernameSchema),
    defaultValues: { username: primaryUsername },
  });

  // Check availability of initial username on mount (only once)
  const hasCheckedInitial = React.useRef(false);
  React.useEffect(() => {
    if (hasCheckedInitial.current || !primaryUsername) return;
    hasCheckedInitial.current = true;

    // Check if the primary username is available
    const checkInitial = async () => {
      setAvailability({ available: null, checking: true });
      try {
        const response = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(primaryUsername)}`
        );
        const data = await response.json();

        if (response.ok) {
          if (data.available) {
            setAvailability({
              available: true,
              checking: false,
            });
          } else {
            // If not available, try to make it unique
            let counter = 1;
            let uniqueUsername = `${primaryUsername}${counter}`;
            let found = false;
            
            // Try up to 10 variations
            while (counter <= 10 && !found) {
              const checkResponse = await fetch(
                `/api/users/check-username?username=${encodeURIComponent(uniqueUsername)}`
              );
              const checkData = await checkResponse.json();
              if (checkData.available) {
                setValue("username", uniqueUsername, { shouldValidate: true });
                setAvailability({ available: true, checking: false });
                found = true;
              } else {
                counter++;
                uniqueUsername = `${primaryUsername}${counter}`;
              }
            }
            
            if (!found) {
              // If we couldn't find a unique variation, just mark as unavailable
              // User can edit it manually
              setAvailability({ available: false, checking: false });
            }
          }
        }
      } catch (error) {
        setAvailability({ available: null, checking: false });
      }
    };
    checkInitial();
  }, [primaryUsername, setValue]);

  const username = watch("username");

  // Check username availability when user types (skip if it's the initial check)
  React.useEffect(() => {
    // Skip if this is the initial username and we haven't finished checking yet
    if (username === primaryUsername && hasCheckedInitial.current === false) {
      return;
    }

    if (!username || username.length < 3) {
      setAvailability({ available: null, checking: false });
      return;
    }

    const timeoutId = setTimeout(async () => {
      setAvailability({ available: null, checking: true });
      try {
        const response = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(username)}`
        );
        const data = await response.json();

        if (response.ok) {
          setAvailability({
            available: data.available,
            checking: false,
          });
        } else {
          setAvailability({ available: false, checking: false });
        }
      } catch (error) {
        setAvailability({ available: false, checking: false });
      }
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
  }, [username, primaryUsername]);

  const onSubmit = async (data: UsernameFormValues) => {
    if (!availability.available) {
      toast.error("Please choose an available username");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/users/set-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: data.username }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to set username");
      }

      // Update session to include username
      await update();

      toast.success("Username set successfully!");
      
      if (onComplete) {
        onComplete();
      } else {
        // Redirect to profile
        router.push("/profile");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to set username";
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setValue("username", suggestion, { shouldValidate: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="w-full max-w-md mx-auto"
    >
      <div className="rounded-xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-sm p-8">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Choose Your Username</h2>
          <p className="text-muted-foreground text-sm">
            Pick a unique username that others will see on your profile
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <Input
                id="username"
                placeholder="username"
                {...register("username")}
                className={cn(
                  "pr-10",
                  errors.username && "border-destructive",
                  availability.available === true && "border-green-500",
                  availability.available === false && "border-destructive"
                )}
                autoFocus
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2">
                {availability.checking ? (
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                ) : availability.available === true ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : availability.available === false ? (
                  <X className="w-4 h-4 text-destructive" />
                ) : null}
              </div>
            </div>
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username.message}</p>
            )}
            {availability.available === true && (
              <p className="text-sm text-green-600">Username is available!</p>
            )}
            {availability.available === false && !errors.username && (
              <p className="text-sm text-destructive">Username is already taken</p>
            )}
          </div>

          {suggestions.length > 0 && (
            <div className="space-y-2">
              <Label>Suggestions</Label>
              <div className="flex flex-wrap gap-2">
                {suggestions.map((suggestion) => (
                  <Button
                    key={suggestion}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="text-xs"
                  >
                    {suggestion}
                  </Button>
                ))}
              </div>
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || !availability.available || availability.checking}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting username...
              </>
            ) : (
              "Continue"
            )}
          </Button>
        </form>
      </div>
    </motion.div>
  );
}

