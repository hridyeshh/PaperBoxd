"use client";

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
  onProfileChange?: (profile: EditableProfile) => void;
  onSubmitProfile?: (profile: EditableProfile) => Promise<void> | void;
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
  const [localProfile, setLocalProfile] = React.useState<EditableProfile>(profile);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = React.useState(false);
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [selectedImage, setSelectedImage] = React.useState<string | null>(null);
  const [useCustomGender, setUseCustomGender] = React.useState(
    () => localProfile.gender.length > 0 && !genderOptions.includes(localProfile.gender),
  );
  const [genderDropdownOpen, setGenderDropdownOpen] = React.useState(false);
  const [pronounDropdownOpen, setPronounDropdownOpen] = React.useState(false);
  const [usernameAvailability, setUsernameAvailability] = React.useState<{
    available: boolean | null;
    checking: boolean;
  }>({ available: null, checking: false });
  const originalUsername = React.useRef(profile.username);
  // Use state for selections to ensure they update immediately
  const [pronounSelection, setPronounSelection] = React.useState<Selection>(() => new Set(localProfile.pronouns));
  const [genderSelection, setGenderSelection] = React.useState<Selection>(() => {
    if (useCustomGender) {
      return new Set(["Custom"]);
    }
    return localProfile.gender ? new Set([localProfile.gender]) : new Set();
  });

  // Sync selections when localProfile changes
  React.useEffect(() => {
    setPronounSelection(new Set(localProfile.pronouns));
  }, [localProfile.pronouns]);

  React.useEffect(() => {
    if (useCustomGender) {
      setGenderSelection(new Set(["Custom"]));
    } else {
      setGenderSelection(localProfile.gender ? new Set([localProfile.gender]) : new Set());
    }
  }, [localProfile.gender, useCustomGender]);
  const birthdayDate = React.useMemo(
    () => (localProfile.birthday ? new Date(localProfile.birthday) : undefined),
    [localProfile.birthday],
  );

  React.useEffect(() => {
    setUseCustomGender(localProfile.gender.length > 0 && !genderOptions.includes(localProfile.gender));
  }, [localProfile.gender]);

  // Check username availability when it changes (and it's different from original)
  React.useEffect(() => {
    const currentUsername = localProfile.username?.trim();
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
  }, [localProfile.username]);

  const updateProfile = React.useCallback(
    (patch: Partial<EditableProfile>) => {
      setLocalProfile(prev => ({ ...prev, ...patch }));
    },
    [],
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
      const response = await fetch('/api/upload/avatar', {
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
          detail: { avatar: data.avatar, username: localProfile.username }
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
      if (localProfile.avatar && localProfile.avatar.includes('cloudinary.com')) {
        const response = await fetch('/api/upload/avatar', {
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
          detail: { avatar: '', username: localProfile.username }
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
  }, [localProfile.avatar, updateProfile, localProfile.username]);

  const handlePronounSelection = React.useCallback(
    (selection: Selection) => {
      if (selection === "all") return;
      const selected = Array.from(selection).map((key) => key.toString());
      if (selected.length > 2) return;
      setPronounSelection(selection);
      updateProfile({ pronouns: selected });
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
          gender: !genderOptions.includes(localProfile.gender) ? localProfile.gender : "",
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
    [localProfile.gender, updateProfile],
  );

  const pronounDisplay = localProfile.pronouns.length ? localProfile.pronouns.join(" / ") : "Select pronouns";
  const genderDisplay = useCustomGender ? localProfile.gender || "Custom" : localProfile.gender || "Select gender";
  const handleBirthdayChange = React.useCallback((date?: Date) => {
    updateProfile({
      birthday: date ? formatDate(date, "yyyy-MM-dd") : "",
    });
  }, [updateProfile]);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await onSubmitProfile?.(localProfile);
    },
    [onSubmitProfile, localProfile],
  );

  return (
    <form className="flex flex-col" onSubmit={handleSubmit}>

      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 px-6 py-6">
        <div className="relative">
          <div className="relative h-24 w-24 overflow-hidden rounded-full ring-2 ring-border/60 bg-muted">
            <Image src={localProfile.avatar || DEFAULT_AVATAR} alt={localProfile.name} fill className="object-cover" sizes="96px" />
            {isUploadingAvatar && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                <Loader2 className="h-5 w-5 animate-spin text-white" />
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="h-8 rounded-full px-4 text-xs"
            disabled={isUploadingAvatar}
          >
            {isUploadingAvatar ? (
              <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" />Uploading</>
            ) : (
              <><UploadCloud className="mr-1.5 h-3 w-3" />Change photo</>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-full px-4 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10"
            onClick={handleRemoveAvatar}
            disabled={isUploadingAvatar || !localProfile.avatar}
          >
            Remove
          </Button>
        </div>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
        {avatarError && <p className="text-xs text-destructive">{avatarError}</p>}
      </div>

      <div className="h-px bg-border/30" />

      {/* Identity */}
      <div className="flex flex-col gap-5 px-6 py-5">
        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="username">Username</Label>
          <div className="relative">
            <Input
              id="username"
              name="username"
              value={localProfile.username}
              onChange={handleChange}
              placeholder="Unique handle"
              className={cn(
                "pl-9 pr-10",
                localProfile.username !== originalUsername.current &&
                  usernameAvailability.available === true &&
                  "border-green-500",
                localProfile.username !== originalUsername.current &&
                  usernameAvailability.available === false &&
                  "border-destructive"
              )}
            />
            <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            {localProfile.username !== originalUsername.current && (
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
          {localProfile.username !== originalUsername.current && (
            <>
              {usernameAvailability.available === true && (
                <p className="text-xs text-green-600">Username available</p>
              )}
              {usernameAvailability.available === false && (
                <p className="text-xs text-destructive">Username already taken</p>
              )}
            </>
          )}
        </div>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="name">Name</Label>
          <Input id="name" name="name" value={localProfile.name} onChange={handleChange} placeholder="Your name" />
        </div>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            name="bio"
            value={localProfile.bio}
            onChange={handleChange}
            placeholder="What kind of stories do you collect?"
            rows={3}
          />
          <p className="text-xs text-muted-foreground/60">Under 160 characters.</p>
        </div>
      </div>

      <div className="h-px bg-border/30" />

      {/* Personal */}
      <div className="flex flex-col gap-5 px-6 py-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/40">Personal</p>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="birthday">Birthday</Label>
          <ChronoSelect
            value={birthdayDate}
            onChange={handleBirthdayChange}
            placeholder="Select birthday"
            yearRange={[1950, new Date().getFullYear() + 1]}
            className="w-full"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="pronouns">Pronouns</Label>
            <Dropdown.Root className="w-full" isOpen={pronounDropdownOpen} onOpenChange={setPronounDropdownOpen}>
              <Dropdown.Trigger className="flex w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span className="truncate">{pronounDisplay}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Dropdown.Trigger>
              <Dropdown.Popover align="start" className="w-56 p-2">
                <div
                  style={{ pointerEvents: 'auto' }}
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <GridList
                    aria-label="Pronouns"
                    selectionMode="multiple"
                    selectionBehavior="toggle"
                    selectedKeys={pronounSelection}
                    onSelectionChange={handlePronounSelection}
                    className="max-h-60"
                  >
                    {pronounOptions.map((option) => {
                      const isSelected = localProfile.pronouns.includes(option);
                      const atMax = localProfile.pronouns.length >= 2 && !isSelected;
                      return (
                        <GridListItem id={option} key={option} isDisabled={atMax} className={atMax ? "opacity-40 cursor-not-allowed" : ""}>
                          {option}
                        </GridListItem>
                      );
                    })}
                  </GridList>
                </div>
              </Dropdown.Popover>
            </Dropdown.Root>
          </div>

          <div className={fieldGroupClass}>
            <Label className={fieldLabelClass} htmlFor="gender">Gender</Label>
            <Dropdown.Root className="w-full" isOpen={genderDropdownOpen} onOpenChange={setGenderDropdownOpen}>
              <Dropdown.Trigger className="flex w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <span className="truncate">{genderDisplay}</span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </Dropdown.Trigger>
              <Dropdown.Popover align="start" className="w-56 p-2">
                <div
                  style={{ pointerEvents: 'auto' }}
                  onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
                  onMouseDown={(e) => { e.stopPropagation(); }}
                  onClick={(e) => { e.stopPropagation(); }}
                >
                  <GridList
                    aria-label="Gender"
                    selectionMode="single"
                    selectedKeys={genderSelection}
                    onSelectionChange={handleGenderSelection}
                    className="max-h-60"
                  >
                    {genderOptions.map((option) => (
                      <GridListItem id={option} key={option}>{option}</GridListItem>
                    ))}
                  </GridList>
                </div>
              </Dropdown.Popover>
            </Dropdown.Root>
            {useCustomGender && (
              <Input
                id="custom-gender"
                name="gender"
                value={localProfile.gender}
                onChange={handleChange}
                placeholder="Enter gender"
                className="mt-2"
              />
            )}
          </div>
        </div>
      </div>

      <div className="h-px bg-border/30" />

      {/* Online */}
      <div className="flex flex-col gap-5 px-6 py-5">
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground/40">Online</p>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="links">Link</Label>
          <div className="relative">
            <Input
              id="links"
              name="links"
              value={localProfile.links}
              onChange={handleChange}
              placeholder="https://…"
              className="pl-9"
            />
            <LinkIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground/60">Your site, newsletter, or anywhere you share recommendations.</p>
        </div>

        <div className={fieldGroupClass}>
          <Label className={fieldLabelClass} htmlFor="email">Email address</Label>
          <div className="relative">
            <Input
              id="email"
              name="email"
              type="email"
              value={localProfile.email}
              disabled
              placeholder="you@example.com"
              className="pl-9 opacity-60"
            />
            <MailIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>
          <p className="text-xs text-muted-foreground/60">Cannot be changed after sign-up.</p>
        </div>
      </div>

      <div className="h-px bg-border/30" />

      {/* Footer */}
      <div className="flex flex-col gap-3 px-6 py-5">
        {submitError && <p className="text-xs text-destructive">{submitError}</p>}
        <div className="flex items-center gap-3">
          <Button type="submit" className="rounded-full px-6" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : submitButtonText}
          </Button>
          {onCancel && (
            <Button
              variant="ghost"
              type="button"
              className="rounded-full px-6 text-muted-foreground"
              disabled={isSubmitting}
              onClick={onCancel}
            >
              {cancelButtonText}
            </Button>
          )}
        </div>
      </div>

      {selectedImage && (
        <AvatarEditor
          image={selectedImage}
          open={editorOpen}
          onOpenChange={(open) => {
            setEditorOpen(open);
            if (!open) setSelectedImage(null);
          }}
          onSave={handleEditorSave}
        />
      )}
    </form>
  );
}

