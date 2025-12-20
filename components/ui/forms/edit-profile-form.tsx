"use client";
import { API_BASE_URL } from '@/lib/api/client';

import Image from "next/image";
import * as React from "react";
import { Check, ChevronDown, LinkIcon, MailIcon, UploadCloud, UserIcon, X, Loader2 } from "lucide-react";
import type { Selection } from "react-aria-components";
import { format as formatDate } from "date-fns";

import { ChronoSelect } from "@/components/ui/forms/chrono-select";
import { Button } from "@/components/ui/primitives/button";
import { Dropdown } from "@/components/ui/primitives/dropdown";
import { GridList, GridListItem } from "@/components/ui/forms/grid-list";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { Textarea } from "@/components/ui/primitives/textarea";
import { AvatarEditor } from "@/components/ui/features/avatar-editor";
import { cn, DEFAULT_AVATAR } from "@/lib/utils";

export type EditableProfile = {
  username: string;
  name: string;
  birthday: string;
  email: string;
  bio: string;
  pronouns: string[];
  links: string;
  gender: string;
  isPublic: boolean;
  avatar: string;
};

export const defaultProfile: EditableProfile = {
  username: "usename",
  name: "name",
  birthday: "1998-09-15",
  email: "username@example.com",
  bio: "",
  pronouns: ["", ""],
  links: "",
  gender: "",
  isPublic: true,
  avatar: DEFAULT_AVATAR,
};

const fieldGroupClass = "space-y-2";
const fieldLabelClass = "text-sm font-medium text-muted-foreground";
const pronounOptions = ["He", "Him", "His", "She", "Her", "They", "Them", "Theirs"];
const genderOptions = ["Female", "Male", "Non-binary", "Transgender", "Intersex", "Prefer not to say", "Custom"];

type EditProfileFormProps = {
  profile: EditableProfile;
  onProfileChange: (profile: EditableProfile) => void;
  onSubmitProfile?: () => Promise<void> | void;
  onCancel?: () => void;
  isSubmitting?: boolean;
  submitError?: string | null;
  cancelButtonText?: string;
  submitButtonText?: string;
};

export function EditProfileForm({
  profile,
  onProfileChange,
  onSubmitProfile,
  onCancel,
  isSubmitting = false,
  submitError,
  cancelButtonText = "Cancel",
  submitButtonText = "Save changes",
}: EditProfileFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [useCustomGender, setUseCustomGender] = React.useState(
    () => profile.gender.length > 0 && !genderOptions.includes(profile.gender),
  );
  const [genderDropdownOpen, setGenderDropdownOpen] = React.useState(false);
  const [pronounDropdownOpen, setPronounDropdownOpen] = React.useState(false);
  const [usernameAvailability, setUsernameAvailability] = React.useState<{
    available: boolean | null;
    checking: boolean;
  }>({ available: null, checking: false });
  const originalUsername = React.useRef(profile.username);
  // Use state for selections to ensure they update immediately
  const [pronounSelection, setPronounSelection] = React.useState<Selection>(() => new Set(profile.pronouns));
  const [genderSelection, setGenderSelection] = React.useState<Selection>(() => {
    if (useCustomGender) {
      return new Set(["Custom"]);
    }
    return profile.gender ? new Set([profile.gender]) : new Set();
  });
  
  // Sync selections when profile changes
  React.useEffect(() => {
    setPronounSelection(new Set(profile.pronouns));
  }, [profile.pronouns]);
  
  React.useEffect(() => {
    if (useCustomGender) {
      setGenderSelection(new Set(["Custom"]));
    } else {
      setGenderSelection(profile.gender ? new Set([profile.gender]) : new Set());
    }
  }, [profile.gender, useCustomGender]);
  const birthdayDate = React.useMemo(
    () => (profile.birthday ? new Date(profile.birthday) : undefined),
    [profile.birthday],
  );

  React.useEffect(() => {
    setUseCustomGender(profile.gender.length > 0 && !genderOptions.includes(profile.gender));
  }, [profile.gender]);

  // Check username availability when it changes (and it's different from original)
  React.useEffect(() => {
    const currentUsername = profile.username?.trim();
    const original = originalUsername.current?.trim();

    // Only check if username changed and is valid
    if (!currentUsername || currentUsername === original) {
      setUsernameAvailability({ available: null, checking: false });
      return;
    }

    // Validate format first
    const usernameRegex = /^[a-zA-Z0-9_]{3,30}$/;
    if (!usernameRegex.test(currentUsername)) {
      setUsernameAvailability({ available: false, checking: false });
      return;
    }

    // Debounce the check
    const timeoutId = setTimeout(async () => {
      setUsernameAvailability({ available: null, checking: true });
      try {
        const response = await fetch(
          `/api/users/check-username?username=${encodeURIComponent(currentUsername)}`
        );
        const data = await response.json();

        if (response.ok) {
          setUsernameAvailability({
            available: data.available,
            checking: false,
          });
        } else {
          setUsernameAvailability({ available: false, checking: false });
        }
      } catch {
        setUsernameAvailability({ available: false, checking: false });
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [profile.username]);

  const updateProfile = React.useCallback(
    (patch: Partial<EditableProfile>) => {
      onProfileChange({ ...profile, ...patch });
    },
    [profile, onProfileChange],
  );

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const target = event.target;
    const { name, value } = target;

    if (target instanceof HTMLInputElement && target.type === "checkbox") {
      updateProfile({ [name]: target.checked } as Partial<EditableProfile>);
      return;
    }

    updateProfile({ [name]: value } as Partial<EditableProfile>);
  }

  async function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Please choose an image that is 5MB or less.");
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setAvatarError("Please select a valid image file.");
      return;
    }

    setAvatarError(null);

    try {
      // Convert file to base64 to show in editor
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = (loadEvent) => {
          const result = loadEvent.target?.result;
          if (typeof result === "string") {
            resolve(result);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = () => reject(new Error("Failed to read file"));
        reader.readAsDataURL(file);
      });

      const base64Image = await base64Promise;
      
      // Show editor with the selected image
      setSelectedImage(base64Image);
      setEditorOpen(true);
    } catch (error) {
      console.error('Error reading file:', error);
      setAvatarError("Failed to read image file. Please try again.");
    } finally {
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  const handleEditorSave = async (croppedImage: string) => {
    setIsUploadingAvatar(true);
    setAvatarError(null);

    try {
      // Upload cropped image to Cloudinary
      const response = await fetch(API_BASE_URL + '/api/upload/avatar', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: croppedImage }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload avatar');
      }

      // Update profile with Cloudinary URL
      updateProfile({ avatar: data.avatar });
      setSelectedImage(null);

      // Dispatch custom event to notify other components (like mobile dock) that avatar was updated
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileAvatarUpdated", {
          detail: { avatar: data.avatar, username: profile.username }
        }));
      }
    } catch (error) {
      console.error('Avatar upload error:', error);
      setAvatarError(
        error instanceof Error ? error.message : 'Failed to upload avatar. Please try again.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = React.useCallback(async () => {
    setAvatarError(null);
    setIsUploadingAvatar(true);

    try {
      // Only call delete endpoint if avatar is from Cloudinary
      if (profile.avatar && profile.avatar.includes('cloudinary.com')) {
        const response = await fetch(API_BASE_URL + '/api/upload/avatar', {
          method: 'DELETE',
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to delete avatar');
        }
      }

      // Remove avatar from profile
      updateProfile({ avatar: '' });

      // Dispatch custom event to notify other components (like mobile dock) that avatar was removed
      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("profileAvatarUpdated", {
          detail: { avatar: '', username: profile.username }
        }));
      }
    } catch (error) {
      console.error('Avatar delete error:', error);
      setAvatarError(
        error instanceof Error ? error.message : 'Failed to delete avatar. Please try again.'
      );
    } finally {
      setIsUploadingAvatar(false);
    }
  }, [profile.avatar, updateProfile, profile.username]);

  const handlePronounSelection = React.useCallback(
    (selection: Selection) => {
      if (selection === "all") {
        const allPronouns = [...pronounOptions];
        setPronounSelection(new Set(allPronouns));
        updateProfile({ pronouns: allPronouns });
        return;
      }
      const selected = Array.from(selection).map((key) => key.toString());
      setPronounSelection(selection);
      updateProfile({ pronouns: selected });
      // Keep dropdown open for multiple selection
    },
    [updateProfile],
  );

  const handleGenderSelection = React.useCallback(
    (selection: Selection) => {
      if (selection === "all") return;
      const [key] = Array.from(selection);
      const value = key?.toString() ?? "";
      
      // Update selection state immediately
      setGenderSelection(selection);
      
      // Process selection
      if (value === "Custom") {
        setUseCustomGender(true);
        updateProfile({
          gender: !genderOptions.includes(profile.gender) ? profile.gender : "",
        });
      } else {
        setUseCustomGender(false);
        updateProfile({ gender: value });
      }
      
      // Close dropdown after a short delay to ensure selection is processed
      setTimeout(() => {
        setGenderDropdownOpen(false);
      }, 150);
    },
    [profile.gender, updateProfile],
  );

  const pronounDisplay = profile.pronouns.length ? profile.pronouns.join(" / ") : "Select pronouns";
  const genderDisplay = useCustomGender ? profile.gender || "Custom" : profile.gender || "Select gender";
  const handleBirthdayChange = React.useCallback((date?: Date) => {
    updateProfile({
      birthday: date ? formatDate(date, "yyyy-MM-dd") : "",
    });
  }, [updateProfile]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSubmitProfile?.();
    },
    [onSubmitProfile],
  );

  return (
    <form className="flex flex-col gap-8" onSubmit={handleSubmit}>
      <section className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-muted/20 p-6 shadow-sm mx-4">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile photo</h2>
          <p className="text-sm text-muted-foreground">I bet this nerd looks cool :p.</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border/70 bg-background">
            <Image src={profile.avatar || DEFAULT_AVATAR} alt={profile.name} fill className="object-cover" sizes="96px" />
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                <Loader2 className="h-6 w-6 animate-spin text-white" />
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Upload the photo you love :P. PNG or JPG works best.</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full px-6"
                disabled={isUploadingAvatar}
              >
                {isUploadingAvatar ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <UploadCloud className="mr-2 h-4 w-4" />
                    Change photo
                  </>
                )}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={handleRemoveAvatar}
                disabled={isUploadingAvatar || !profile.avatar}
              >
                Remove
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            {avatarError ? <p className="text-xs text-destructive">{avatarError}</p> : null}
          </div>
        </div>
      </section>

      <section className="grid gap-6 rounded-3xl border border-border/60 bg-background/90 p-6 shadow-sm lg:grid-cols-2 mx-4">
        <div className="space-y-4">
          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="username">
              Username
            </Label>
            <div className="relative">
              <Input
                id="username"
                name="username"
                value={profile.username}
                onChange={handleChange}
                placeholder="Unique handle"
                className={cn(
                  "pl-9 pr-10",
                  profile.username !== originalUsername.current && 
                    usernameAvailability.available === true && 
                    "border-green-500",
                  profile.username !== originalUsername.current && 
                    usernameAvailability.available === false && 
                    "border-destructive"
                )}
              />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              {profile.username !== originalUsername.current && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  {usernameAvailability.checking ? (
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  ) : usernameAvailability.available === true ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : usernameAvailability.available === false ? (
                    <X className="w-4 h-4 text-destructive" />
                  ) : null}
                </div>
              )}
            </div>
            {profile.username !== originalUsername.current && (
              <>
                {usernameAvailability.available === true && (
                  <p className="text-sm text-green-600">Username is available!</p>
                )}
                {usernameAvailability.available === false && (
                  <p className="text-sm text-destructive">Username is already taken</p>
                )}
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass} htmlFor="name">
                Name
              </Label>
              <Input id="name" name="name" value={profile.name} onChange={handleChange} placeholder="Full name" />
            </div>
            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass} htmlFor="birthday">
                Birthday
              </Label>
              <ChronoSelect
                value={birthdayDate}
                onChange={handleBirthdayChange}
                placeholder="Select birthday"
                yearRange={[1950, new Date().getFullYear() + 1]}
                className="w-full"
              />
            </div>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="email">
              Email address
            </Label>
            <div className="relative">
              <Input
                id="email"
                name="email"
                type="email"
                value={profile.email}
                onChange={handleChange}
                placeholder="you@example.com"
                className="pl-9"
              />
              <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="bio">
              Bio
            </Label>
            <Textarea
              id="bio"
              name="bio"
              value={profile.bio}
              onChange={handleChange}
              placeholder="Tell people what kind of stories you like to collect."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">Keep it short and sweet — under 160 characters.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass} htmlFor="pronouns">
                Pronouns
              </Label>
              <Dropdown.Root 
                className="w-full"
                isOpen={pronounDropdownOpen}
                onOpenChange={setPronounDropdownOpen}
              >
                <Dropdown.Trigger className="flex w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="truncate">{pronounDisplay}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Dropdown.Trigger>
                <Dropdown.Popover align="start" className="w-64 p-2">
                  <div 
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                  <GridList
                    aria-label="Pronouns"
                    selectionMode="multiple"
                    selectionBehavior="toggle"
                    selectedKeys={pronounSelection}
                      onSelectionChange={(selection) => {
                        // Process selection immediately
                        handlePronounSelection(selection);
                      }}
                    className="max-h-60"
                  >
                    {pronounOptions.map((option) => (
                        <GridListItem 
                          id={option} 
                          key={option}
                        >
                        {option}
                      </GridListItem>
                    ))}
                  </GridList>
                  </div>
                </Dropdown.Popover>
              </Dropdown.Root>
            </div>
            <div className={fieldGroupClass}>
              <Label className={fieldLabelClass} htmlFor="gender">
                Gender
              </Label>
              <Dropdown.Root
                className="w-full"
                isOpen={genderDropdownOpen}
                onOpenChange={setGenderDropdownOpen}
              >
                <Dropdown.Trigger className="flex w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="truncate">{genderDisplay}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Dropdown.Trigger>
                <Dropdown.Popover align="start" className="w-64 p-2">
                  <div 
                    style={{ pointerEvents: 'auto' }}
                    onPointerDown={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                    }}
                    onMouseDown={(e) => {
                      e.stopPropagation();
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                    }}
                  >
                  <GridList
                    aria-label="Gender"
                    selectionMode="single"
                    selectedKeys={genderSelection}
                      onSelectionChange={(selection) => {
                        // Process selection immediately
                        handleGenderSelection(selection);
                      }}
                    className="max-h-60"
                  >
                    {genderOptions.map((option) => (
                        <GridListItem 
                          id={option} 
                          key={option}
                        >
                        {option}
                      </GridListItem>
                    ))}
                  </GridList>
                  </div>
                </Dropdown.Popover>
              </Dropdown.Root>
              {useCustomGender ? (
                <Input
                  id="custom-gender"
                  name="gender"
                  value={profile.gender}
                  onChange={handleChange}
                  placeholder="Enter gender"
                  className="mt-2"
                />
              ) : null}
            </div>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="links">
              Links
            </Label>
            <div className="relative">
              <Input
                id="links"
                name="links"
                value={profile.links}
                onChange={handleChange}
                placeholder="https://…"
                className="pl-9"
              />
              <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
            <p className="text-xs text-muted-foreground">Add your website, newsletter, or any place you share recommendations.</p>
          </div>

        </div>
      </section>

      <div className="flex flex-col gap-4 px-4 py-4">
        {submitError ? (
          <p className="text-xs font-semibold text-destructive">{submitError}</p>
        ) : null}
        <div className="flex gap-3">
        <Button type="submit" className="rounded-full px-6" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitButtonText}
          </Button>
          {onCancel && (
          <Button 
            variant="ghost" 
            type="button" 
            className="rounded-full px-6" 
            disabled={isSubmitting}
            onClick={onCancel}
          >
              {cancelButtonText}
          </Button>
          )}
        </div>
      </div>

      {/* Avatar Editor Dialog */}
      {selectedImage && (
        <AvatarEditor
          image={selectedImage}
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) {
              setSelectedImage(null);
            }
          }}
          onSave={handleEditorSave}
        />
      )}
    </form>
  );
}

