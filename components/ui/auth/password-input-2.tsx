"use client";

import * as React from "react";
import { Book, BookOpen, Check, X } from "lucide-react";

import { cn } from "@/lib/utils";

const PASSWORD_REQUIREMENTS = [
  { regex: /.{8,}/, text: "At least 8 characters" },
  { regex: /[0-9]/, text: "At least 1 number" },
  { regex: /[a-z]/, text: "At least 1 lowercase letter" },
  { regex: /[A-Z]/, text: "At least 1 uppercase letter" },
  { regex: /[!-\/:-@[-`{-~]/, text: "At least 1 special character" },
] as const;

type StrengthScore = 0 | 1 | 2 | 3 | 4 | 5;

const STRENGTH_COLORS: Record<StrengthScore, string> = {
  0: "bg-gradient-to-r from-[#d9f6c2] to-[#c7e797]",
  1: "bg-gradient-to-r from-[#c7e797] to-[#a8d173]",
  2: "bg-gradient-to-r from-[#a8d173] to-[#86b659]",
  3: "bg-gradient-to-r from-[#86b659] to-[#658c58]",
  4: "bg-gradient-to-r from-[#658c58] to-[#3e6f42]",
  5: "bg-gradient-to-r from-[#3e6f42] to-[#204c38]",
};

const STRENGTH_TEXT: Record<Exclude<StrengthScore, 5>, string> = {
  0: "Enter a password",
  1: "Weak password",
  2: "Medium password!",
  3: "Strong password!!",
  4: "Very strong password!!!",
};

interface PasswordInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "className"> {
  strengthLabel?: string;
  showChecklist?: boolean;
  showStrengthLabel?: boolean;
  showStrengthMeter?: boolean;
  wrapperClassName?: string;
  inputClassName?: string;
}

type Requirement = {
  met: boolean;
  text: string;
};

type PasswordStrength = {
  score: StrengthScore;
  requirements: Requirement[];
};

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      wrapperClassName,
      inputClassName,
      strengthLabel = "Password strength",
      showChecklist = true,
      showStrengthLabel = true,
      showStrengthMeter = true,
      value,
      onChange,
      ...props
    },
    ref,
  ) => {
    const [internalValue, setInternalValue] = React.useState(
      typeof value === "string" ? value : "",
    );
    const [isVisible, setIsVisible] = React.useState(false);

    const isControlled = typeof value !== "undefined";
    const password = isControlled
      ? typeof value === "string"
        ? value
        : ""
      : internalValue;

    React.useEffect(() => {
      if (isControlled && typeof value === "string") {
        setInternalValue(value);
      }
    }, [isControlled, value]);

    const strength = React.useMemo<PasswordStrength>(() => {
      const requirements = PASSWORD_REQUIREMENTS.map((requirement) => ({
        met: requirement.regex.test(password),
        text: requirement.text,
      }));

      const score = requirements.filter((requirement) => requirement.met).length as StrengthScore;

      return {
        score,
        requirements,
      };
    }, [password]);

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) {
        setInternalValue(event.currentTarget.value);
      }
      onChange?.(event);
    };

    const handleToggleVisibility = () => {
      setIsVisible((prev) => !prev);
    };

    const strengthText = STRENGTH_TEXT[Math.min(strength.score, 4) as Exclude<StrengthScore, 5>];

    return (
      <div className={cn("space-y-3", wrapperClassName)}>
        <div className="relative">
          <input
            ref={ref}
            type={isVisible ? "text" : "password"}
            value={password}
            onChange={handleChange}
            aria-invalid={strength.score < 4}
            aria-describedby={props.id ? `${props.id}-password-strength` : undefined}
            className={cn(
              "flex h-10 w-full rounded-md border border-transparent bg-background/95 px-3 py-2 pr-12 text-sm ring-offset-background placeholder:text-muted-foreground",
              "focus-visible:border-black focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
              inputClassName,
            )}
            {...props}
          />
          <button
            type="button"
            onClick={handleToggleVisibility}
            aria-label={isVisible ? "Hide password" : "Show password"}
            className="absolute inset-y-0 right-2 flex w-8 items-center justify-center text-muted-foreground/80 transition hover:text-foreground"
          >
            {isVisible ? (
              <BookOpen className="h-4 w-4" />
            ) : (
              <Book className="h-4 w-4" />
            )}
          </button>
        </div>
        {showStrengthMeter ? (
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }, (_value, index) => {
              const threshold = (index + 1) as StrengthScore;
              const isActive = strength.score >= threshold;

              return (
                <span
                  key={threshold}
                  className={cn(
                    "h-2 w-full overflow-hidden rounded-full transition-opacity",
                    isActive
                      ? STRENGTH_COLORS[threshold]
                      : "bg-border",
                  )}
                />
              );
            })}
          </div>
        ) : null}
        {showStrengthLabel ? (
          <p
            id={props.id ? `${props.id}-password-strength` : undefined}
            className="flex justify-between text-sm font-medium text-muted-foreground"
          >
            <span>{strengthLabel}:</span>
            <span className="text-foreground">{strengthText}</span>
          </p>
        ) : null}
        {showChecklist ? (
          <ul className="space-y-1.5" aria-label="Password requirements">
            {strength.requirements.map((requirement) => (
              <li key={requirement.text} className="flex items-center space-x-2 text-xs">
                {requirement.met ? (
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                ) : (
                  <X className="h-3.5 w-3.5 text-muted-foreground/80" />
                )}
                <span
                  className={cn(
                    requirement.met ? "text-emerald-600" : "text-muted-foreground",
                  )}
                >
                  {requirement.text}
                  <span className="sr-only">
                    {requirement.met ? " - Requirement met" : " - Requirement not met"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";
