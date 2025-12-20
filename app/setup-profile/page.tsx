"use client";
import { API_BASE_URL } from '@/lib/api/client';

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { EditProfileForm, type EditableProfile } from "@/components/ui/forms/edit-profile-form";
import TetrisLoading from "@/components/ui/features/tetris-loader";
import { AnimatedGridPattern } from "@/components/ui/shared/animated-grid-pattern";
import { toast } from "sonner";
import { DEFAULT_AVATAR } from "@/lib/utils";

export default function SetupProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [profileData, setProfileData] = useState<EditableProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Load current user profile data
  useEffect(() => {
    if (status === "loading") {
      return;
    }

    if (status === "unauthenticated") {
      router.replace("/auth");
      return;
    }

    if (status === "authenticated" && session?.user) {
      const loadProfile = async () => {
        try {
          setIsLoading(true);
          
          // Fetch current user profile
          const username = session.user.username;
          if (!username) {
            // No username yet, redirect to choose username
            router.replace("/choose-username");
            return;
          }

          const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(username)}`);
          if (response.ok) {
            const data = await response.json();
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
              setProfileData(profile);
            }
          } else {
            // If user not found, use defaults
            const profile: EditableProfile = {
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
            setProfileData(profile);
          }
        } catch (error) {
          console.error("Failed to load profile:", error);
          // Use defaults on error
          const profile: EditableProfile = {
            username: session.user.username || "",
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
          setProfileData(profile);
        } finally {
          setIsLoading(false);
        }
      };

      loadProfile();
    }
  }, [status, session, router]);

  const handleSave = async () => {
    if (!profileData || !session?.user?.username) return;

    try {
      setIsSaving(true);
      setSaveError(null);

      // Prepare payload (same format as edit profile)
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

      const response = await fetch(`${API_BASE_URL}/api/users/${encodeURIComponent(session.user.username)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result.error || "Failed to save profile");
      }

      toast.success("Profile saved successfully!");
      
      // Redirect to onboarding after successful save
      setTimeout(() => {
        router.push("/onboarding");
      }, 500);
    } catch (error) {
      console.error("Failed to save profile:", error);
      setSaveError(error instanceof Error ? error.message : "Failed to save profile");
      toast.error(error instanceof Error ? error.message : "Failed to save profile");
    } finally {
      setIsSaving(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <main className="relative min-h-screen overflow-hidden bg-background">
        <AnimatedGridPattern
          numSquares={120}
          maxOpacity={0.08}
          duration={4}
          repeatDelay={0.75}
          className="text-slate-500 dark:text-slate-400"
        />
        <div className="relative z-10 flex min-h-screen items-center justify-center">
          <TetrisLoading size="md" speed="fast" loadingText="Loading..." />
        </div>
      </main>
    );
  }

  if (status === "unauthenticated" || !session?.user || !profileData) {
    return null; // Will redirect
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
        <div className="w-full max-w-4xl">
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
              onSubmitProfile={handleSave}
              onCancel={() => {
                // Allow skipping - redirect to onboarding
                toast.info("You can complete your profile later from your profile settings");
                router.push("/onboarding");
              }}
              isSubmitting={isSaving}
              submitError={saveError}
              cancelButtonText="Skip for now"
              submitButtonText="Continue"
            />
          </div>
        </div>
      </div>
    </main>
  );
}

