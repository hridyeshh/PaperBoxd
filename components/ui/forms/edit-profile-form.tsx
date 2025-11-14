"use client";

import Image from "next/image";
import * as React from "react";
import { Check, ChevronDown, LinkIcon, MailIcon, UploadCloud, UserIcon } from "lucide-react";
import type { Selection } from "react-aria-components";
import { format as formatDate } from "date-fns";

import { ChronoSelect } from "@/components/ui/forms/chrono-select";
import { Button } from "@/components/ui/button";
import { Dropdown } from "@/components/ui/dropdown";
import { GridList, GridListItem } from "@/components/ui/forms/grid-list";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

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
  bio: "Designing bookish experiences with a soft spot for cozy sci-fi and dragon politics.",
  pronouns: ["", ""],
  links: "",
  gender: "",
  isPublic: true,
  avatar: "",
};

const fieldGroupClass = "space-y-2";
const fieldLabelClass = "text-sm font-medium text-muted-foreground";
const pronounOptions = ["He", "Him", "His", "She", "Her", "They", "Them", "Theirs"];
const genderOptions = ["Female", "Male", "Non-binary", "Transgender", "Intersex", "Prefer not to say", "Custom"];

type EditProfileFormProps = {
  profile: EditableProfile;
  onProfileChange: (profile: EditableProfile) => void;
  onSubmitProfile?: () => Promise<void> | void;
  isSubmitting?: boolean;
  submitError?: string | null;
};

export function EditProfileForm({
  profile,
  onProfileChange,
  onSubmitProfile,
  isSubmitting = false,
  submitError,
}: EditProfileFormProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [avatarError, setAvatarError] = React.useState<string | null>(null);
  const [useCustomGender, setUseCustomGender] = React.useState(
    () => profile.gender.length > 0 && !genderOptions.includes(profile.gender),
  );
  const [genderDropdownOpen, setGenderDropdownOpen] = React.useState(false);
  const pronounSelection = React.useMemo<Selection>(() => new Set(profile.pronouns), [profile.pronouns]);
  const genderSelection = React.useMemo<Selection>(() => {
    if (useCustomGender) {
      return new Set(["Custom"]);
    }
    return profile.gender ? new Set([profile.gender]) : new Set();
  }, [profile.gender, useCustomGender]);
  const birthdayDate = React.useMemo(
    () => (profile.birthday ? new Date(profile.birthday) : undefined),
    [profile.birthday],
  );

  React.useEffect(() => {
    setUseCustomGender(profile.gender.length > 0 && !genderOptions.includes(profile.gender));
  }, [profile.gender]);

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

  function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Please choose an image that is 5MB or less.");
      return;
    }
    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = (loadEvent) => {
      const result = loadEvent.target?.result;
      if (typeof result === "string") {
        updateProfile({ avatar: result });
      }
    };
    reader.readAsDataURL(file);
  }

  const handlePronounSelection = React.useCallback(
    (selection: Selection) => {
      if (selection === "all") {
        updateProfile({ pronouns: [...pronounOptions] });
        return;
      }
      const selected = Array.from(selection).map((key) => key.toString());
      updateProfile({ pronouns: selected });
    },
    [updateProfile],
  );

  const handleGenderSelection = React.useCallback(
    (selection: Selection) => {
      if (selection === "all") return;
      const [key] = Array.from(selection);
      const value = key?.toString() ?? "";
      if (value === "Custom") {
        setUseCustomGender(true);
        updateProfile({
          gender: !genderOptions.includes(profile.gender) ? profile.gender : "",
        });
        setGenderDropdownOpen(false);
        return;
      }
      setUseCustomGender(false);
      setGenderDropdownOpen(false);
      updateProfile({ gender: value });
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
      <section className="flex flex-col gap-6 rounded-3xl border border-border/60 bg-muted/20 p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Profile photo</h2>
          <p className="text-sm text-muted-foreground">I bet this nerd looks cool :p.</p>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="relative h-24 w-24 overflow-hidden rounded-2xl border border-border/70 bg-background">
            {profile.avatar ? (
              <Image src={profile.avatar} alt={profile.name} fill className="object-cover" sizes="96px" />
            ) : (
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 text-muted-foreground">
                <UploadCloud className="h-5 w-5" />
                <span className="text-xs font-medium">Upload</span>
              </div>
            )}
          </div>
          <div className="flex flex-col gap-3 text-sm text-muted-foreground">
            <p>Upload a square image (at least 400px). PNG or JPG works best.</p>
            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                variant="default"
                onClick={() => fileInputRef.current?.click()}
                className="rounded-full px-6"
              >
                Change photo
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                onClick={() => updateProfile({ avatar: "" })}
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

      <section className="grid gap-6 rounded-3xl border border-border/60 bg-background/90 p-6 shadow-sm lg:grid-cols-2">
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
                className="pl-9"
              />
              <UserIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            </div>
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
              <Dropdown.Root className="w-full">
                <Dropdown.Trigger className="flex w-full items-center justify-between rounded-2xl border border-input bg-background px-4 py-2 text-sm font-medium text-foreground shadow-sm outline-none transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                  <span className="truncate">{pronounDisplay}</span>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Dropdown.Trigger>
                <Dropdown.Popover align="start" className="w-64 p-2">
                  <GridList
                    aria-label="Pronouns"
                    selectionMode="multiple"
                    selectionBehavior="toggle"
                    selectedKeys={pronounSelection}
                    onSelectionChange={handlePronounSelection}
                    className="max-h-60"
                  >
                    {pronounOptions.map((option) => (
                      <GridListItem id={option} key={option}>
                        {option}
                      </GridListItem>
                    ))}
                  </GridList>
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
                  <GridList
                    aria-label="Gender"
                    selectionMode="single"
                    selectedKeys={genderSelection}
                    onSelectionChange={handleGenderSelection}
                    className="max-h-60"
                  >
                    {genderOptions.map((option) => (
                      <GridListItem id={option} key={option}>
                        {option}
                      </GridListItem>
                    ))}
                  </GridList>
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

          <div className="flex items-start justify-between gap-4 rounded-2xl border border-border/70 bg-muted/10 p-4">
            <div>
              <p className="text-sm font-semibold text-foreground">Public profile</p>
              <p className="text-xs text-muted-foreground">
                Toggle off to keep your profile private while you set things up.
              </p>
            </div>
            <Switch
              id="isPublic"
              name="isPublic"
              checked={profile.isPublic}
            onCheckedChange={(checked) => updateProfile({ isPublic: checked })}
            />
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-border/60 bg-background/90 p-4 shadow-sm">
        <div className="text-sm text-muted-foreground">
          Ready to share? Make sure your profile is public so that your friends can see what you're up to.
          {submitError ? (
            <p className="mt-1 text-xs.font-semibold text-destructive">{submitError}</p>
          ) : null}
        </div>
        <div className="flex gap-3">
          <Button variant="ghost" type="button" className="rounded-full px-6" disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" className="rounded-full px-6" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : "Save changes"}
          </Button>
        </div>
      </div>
    </form>
  );
}

