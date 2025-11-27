"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useIsMobile } from "@/hooks/use-media-query";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { UsernameSelection } from "./username-selection";
import { EditProfileForm, type EditableProfile } from "@/components/ui/forms/edit-profile-form";
import { OnboardingQuestionnaire } from "./onboarding-questionnaire";
import { DEFAULT_AVATAR, cn } from "@/lib/utils";
import { toast } from "sonner";

type OnboardingStep = "username" | "profile" | "questionnaire" | "loading";

interface UnifiedOnboardingProps {
  onComplete?: () => void;
}

export function UnifiedOnboarding({ onComplete }: UnifiedOnboardingProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const isMobile = useIsMobile();
  
  // Initialize step based on whether user already has username
  const getInitialStep = (): OnboardingStep => {
    if (session?.user?.username) {
      console.log("[UnifiedOnboarding] User already has username, starting at profile step");
      return "profile";
    }
    return "username";
  };
  
  const [step, setStep] = React.useState<OnboardingStep>(getInitialStep);
  const [profileData, setProfileData] = React.useState<EditableProfile | null>(null);
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);
  const [currentUsername, setCurrentUsername] = React.useState<string | null>(
    session?.user?.username || null
  );

  // Update step and username when session updates
  React.useEffect(() => {
    const sessionUsername = session?.user?.username;
    if (sessionUsername) {
      // If we have a session username but not in currentUsername, update it
      if (sessionUsername !== currentUsername) {
        console.log("[UnifiedOnboarding] Session updated with username:", sessionUsername);
        console.log("[UnifiedOnboarding] Current username state:", currentUsername);
        setCurrentUsername(sessionUsername);
      }
      
      // If we're on username step but session has username, move to profile
      if (step === "username" && sessionUsername) {
        console.log("[UnifiedOnboarding] ✅ Moving from username step to profile step (session has username)");
        setStep("profile");
      }
    }
  }, [session?.user?.username, currentUsername, step]);

  // Debug: Log step changes
  React.useEffect(() => {
    console.log("[UnifiedOnboarding] Step changed:", step);
    console.log("[UnifiedOnboarding] Current state:", {
      step,
      currentUsername,
      hasProfileData: !!profileData,
      hasSession: !!session,
      sessionUsername: session?.user?.username,
    });
  }, [step, currentUsername, profileData, session]);

  // Load profile data when moving to profile step
  React.useEffect(() => {
    console.log("[UnifiedOnboarding] Profile loading useEffect triggered:", {
      step,
      hasSession: !!session?.user,
      hasProfileData: !!profileData,
      currentUsername,
      conditions: {
        stepIsProfile: step === "profile",
        hasSession: !!session?.user,
        noProfileData: !profileData,
        hasUsername: !!currentUsername,
      },
    });

    if (step === "profile" && session?.user && !profileData && currentUsername) {
      console.log("[UnifiedOnboarding] ✅ All conditions met, loading profile for username:", currentUsername);
      const loadProfile = async () => {
        try {
          const username = currentUsername;
          console.log("[UnifiedOnboarding] Fetching profile for username:", username);

          const response = await fetch(`/api/users/${encodeURIComponent(username)}`);
          console.log("[UnifiedOnboarding] Profile fetch response status:", response.status);

          if (response.ok) {
            const data = await response.json();
            console.log("[UnifiedOnboarding] Profile data received:", data);
            if (data.user) {
              const profile: EditableProfile = {
                username: data.user.username || "",
                name: data.user.name || session.user.name || "",
                birthday: data.user.birthday ? new Date(data.user.birthday).toISOString().split('T')[0] : "",
                email: data.user.email || session.user.email || "",
                bio: data.user.bio || "",
                pronouns: Array.isArray(data.user.pronouns) ? data.user.pronouns : [],
                links: Array.isArray(data.user.links) ? data.user.links.join(", ") : (data.user.links || ""),
                gender: data.user.gender || "",
                isPublic: data.user.isPublic ?? true,
                avatar: data.user.avatar || DEFAULT_AVATAR,
              };
              console.log("[UnifiedOnboarding] ✅ Setting profile data:", profile);
              setProfileData(profile);
            } else {
              console.log("[UnifiedOnboarding] ⚠️ No user data in response, using defaults");
              // Use defaults
              const defaultProfile = {
                username: username,
                name: session.user.name || "",
                birthday: "",
                email: session.user.email || "",
                bio: "",
                pronouns: [],
                links: "",
                gender: "",
                isPublic: true,
                avatar: DEFAULT_AVATAR,
              };
              console.log("[UnifiedOnboarding] Setting default profile:", defaultProfile);
              setProfileData(defaultProfile);
            }
          } else {
            console.log("[UnifiedOnboarding] ⚠️ Profile fetch failed, using defaults");
            const errorText = await response.text().catch(() => "Unknown error");
            console.log("[UnifiedOnboarding] Error response:", errorText);
            // Use defaults
            const defaultProfile = {
              username: username,
              name: session.user.name || "",
              birthday: "",
              email: session.user.email || "",
              bio: "",
              pronouns: [],
              links: "",
              gender: "",
              isPublic: true,
              avatar: DEFAULT_AVATAR,
            };
            setProfileData(defaultProfile);
          }
        } catch (error) {
          console.error("[UnifiedOnboarding] ❌ Failed to load profile:", error);
          console.error("[UnifiedOnboarding] Error details:", {
            message: error instanceof Error ? error.message : "Unknown error",
            stack: error instanceof Error ? error.stack : undefined,
          });
          // Use defaults on error
          const defaultProfile = {
            username: currentUsername || session?.user?.username || "",
            name: session?.user?.name || "",
            birthday: "",
            email: session?.user?.email || "",
            bio: "",
            pronouns: [],
            links: "",
            gender: "",
            isPublic: true,
            avatar: DEFAULT_AVATAR,
          };
          console.log("[UnifiedOnboarding] Setting default profile after error:", defaultProfile);
          setProfileData(defaultProfile);
        }
      };

      loadProfile();
    } else {
      console.log("[UnifiedOnboarding] ❌ Conditions not met for loading profile");
      if (step !== "profile") {
        console.log("[UnifiedOnboarding]   - Step is not 'profile', it is:", step);
      }
      if (!session?.user) {
        console.log("[UnifiedOnboarding]   - No session or user");
      }
      if (profileData) {
        console.log("[UnifiedOnboarding]   - Profile data already exists");
      }
      if (!currentUsername) {
        console.log("[UnifiedOnboarding]   - No currentUsername set");
      }
    }
  }, [step, session, profileData, currentUsername]);

  const handleUsernameComplete = (username: string) => {
    console.log("[UnifiedOnboarding] 🎯 handleUsernameComplete called with username:", username);
    console.log("[UnifiedOnboarding] Current state before update:", {
      step,
      currentUsername,
      sessionUsername: session?.user?.username,
    });
    
    // Store the username immediately
    setCurrentUsername((prev) => {
      console.log("[UnifiedOnboarding] Setting currentUsername from:", prev, "to:", username);
      return username;
    });
    
    // Move to profile step immediately
    // The session update useEffect will also catch this, but we do it here too for immediate feedback
    setStep((prev) => {
      console.log("[UnifiedOnboarding] Setting step from:", prev, "to: profile");
      if (prev === "username") {
        console.log("[UnifiedOnboarding] ✅ Transitioning from username to profile");
      } else {
        console.warn("[UnifiedOnboarding] ⚠️ Unexpected step transition from:", prev);
      }
      return "profile";
    });
  };

  const handleProfileSave = async () => {
    console.log("[UnifiedOnboarding] 🎯 handleProfileSave called");
    console.log("[UnifiedOnboarding] Profile data:", profileData);
    console.log("[UnifiedOnboarding] Session username:", session?.user?.username);
    
    if (!profileData) {
      console.error("[UnifiedOnboarding] ❌ No profile data to save");
      toast.error("No profile data to save");
      return;
    }
    
    if (!session?.user?.username) {
      console.error("[UnifiedOnboarding] ❌ No session username available");
      toast.error("Session error. Please try again.");
      return;
    }

    try {
      setIsSavingProfile(true);
      console.log("[UnifiedOnboarding] Starting profile save...");

      type ProfileUpdatePayload = {
        username: string;
        name: string;
        bio: string;
        birthday: string | null;
        gender: string;
        pronouns: string[];
        links: string[];
        avatar: string;
      };

      const payload: ProfileUpdatePayload = {
        username: profileData.username,
        name: profileData.name,
        bio: profileData.bio,
        birthday: profileData.birthday || null,
        gender: profileData.gender,
        pronouns: Array.isArray(profileData.pronouns)
          ? profileData.pronouns.filter((p) => p && typeof p === "string" && p.trim().length > 0)
          : [],
        links: profileData.links
          ? profileData.links
              .split(",")
              .map((link) => link.trim())
              .filter(Boolean)
          : [],
        avatar: profileData.avatar || "",
      };

      console.log("[UnifiedOnboarding] Profile payload:", payload);
      console.log("[UnifiedOnboarding] Fetching to:", `/api/users/${encodeURIComponent(session.user.username)}`);

      const response = await fetch(`/api/users/${encodeURIComponent(session.user.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      console.log("[UnifiedOnboarding] Profile save response status:", response.status);

      const result = await response.json().catch((err) => {
        console.error("[UnifiedOnboarding] ❌ Failed to parse response:", err);
        return {};
      });

      console.log("[UnifiedOnboarding] Profile save result:", result);

      if (!response.ok) {
        throw new Error(result.error || "Failed to save profile");
      }

      console.log("[UnifiedOnboarding] ✅ Profile saved successfully, moving to questionnaire");
      // Move to questionnaire step
      setStep("questionnaire");
    } catch (error) {
      console.error("[UnifiedOnboarding] ❌ Failed to save profile:", error);
      console.error("[UnifiedOnboarding] Error details:", {
        message: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
      });
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleProfileSkip = () => {
    console.log("[UnifiedOnboarding] 🎯 handleProfileSkip called, moving to questionnaire");
    // Skip profile and move to questionnaire
    setStep("questionnaire");
  };

  const handleQuestionnaireComplete = async () => {
    console.log("[UnifiedOnboarding] 🎯 handleQuestionnaireComplete called");
    // Move to loading step
    setStep("loading");
    console.log("[UnifiedOnboarding] ✅ Step changed to loading");
    
    // Small delay for smooth transition
    setTimeout(() => {
      console.log("[UnifiedOnboarding] Executing completion callback");
      try {
        if (onComplete) {
          console.log("[UnifiedOnboarding] Calling onComplete callback");
          onComplete();
        } else {
          console.log("[UnifiedOnboarding] No onComplete callback, redirecting to home");
          router.push("/");
        }
      } catch (error) {
        console.error("[UnifiedOnboarding] ❌ Error in completion:", error);
      }
    }, 1500);
  };

  // Progress indicator
  const getProgress = () => {
    switch (step) {
      case "username":
        return { current: 1, total: 3, label: "Step 1 of 3: Choose Username" };
      case "profile":
        return { current: 2, total: 3, label: "Step 2 of 3: Complete Profile" };
      case "questionnaire":
        return { current: 3, total: 3, label: "Step 3 of 3: Select Preferences" };
      default:
        return { current: 0, total: 3, label: "" };
    }
  };

  const progress = getProgress();

  if (!session?.user) {
    return null;
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
      <div className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className={cn(
          "w-full",
          isMobile ? "max-w-[95vw]" : "max-w-4xl"
        )}>
          {/* Progress indicator */}
          {step !== "loading" && (
            <div className="mb-6 text-center">
              <p className="text-sm text-muted-foreground mb-2">{progress.label}</p>
              <div className="flex items-center justify-center gap-2">
                {[1, 2, 3].map((num) => (
                  <div
                    key={num}
                    className={cn(
                      "h-2 rounded-full transition-all",
                      num <= progress.current
                        ? (isMobile ? "w-10 bg-primary" : "w-12 bg-primary")
                        : (isMobile ? "w-5 bg-muted" : "w-6 bg-muted")
                    )}
                  />
                ))}
              </div>
            </div>
          )}

          <AnimatePresence mode="wait">
            {step === "username" && (
              <motion.div
                key="username"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <UsernameSelection
                  name={session.user.name || ""}
                  email={session.user.email || ""}
                  onComplete={handleUsernameComplete}
                />
              </motion.div>
            )}

            {step === "profile" && (
              <>
                {profileData ? (
                  <motion.div
                    key="profile"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="rounded-xl border border-border/50 bg-card/80 shadow-xl backdrop-blur-sm p-6 md:p-8">
                      <div className="mb-6 text-center">
                        <h1 className="text-3xl font-bold mb-2">Complete Your Profile</h1>
                        <p className="text-muted-foreground">
                          Tell us a bit about yourself. You can always edit this later.
                        </p>
                      </div>
                      <EditProfileForm
                        profile={profileData}
                        onProfileChange={setProfileData}
                        onSubmitProfile={handleProfileSave}
                        onCancel={handleProfileSkip}
                        isSubmitting={isSavingProfile}
                        cancelButtonText="Skip for now"
                        submitButtonText="Continue"
                      />
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="profile-loading"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex items-center justify-center min-h-[400px]"
                  >
                    <div className="text-center">
                      <p className="text-muted-foreground">Loading profile...</p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Step: {step}, Username: {currentUsername || "none"}, ProfileData: {profileData ? "exists" : "null"}
                      </p>
                    </div>
                  </motion.div>
                )}
              </>
            )}

            {step === "questionnaire" && (
              <motion.div
                key="questionnaire"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                <OnboardingQuestionnaire onComplete={handleQuestionnaireComplete} />
              </motion.div>
            )}

            {step === "loading" && (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="flex items-center justify-center min-h-[400px]"
              >
                <TetrisLoading size="md" speed="fast" loadingText="Setting up your account..." />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </main>
  );
}

