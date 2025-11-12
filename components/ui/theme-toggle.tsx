"use client";

import { useEffect, useState, type KeyboardEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
}

const STORAGE_KEY = "paperboxd-theme";

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const root = window.document.documentElement;
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)");

    const resolveInitialTheme = () => {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (storedTheme === "dark" || storedTheme === "light") {
        return storedTheme === "dark";
      }
      return systemPrefersDark.matches;
    };

    const initialIsDark = resolveInitialTheme();
    root.classList.toggle("dark", initialIsDark);
    setIsDark(initialIsDark);
    setMounted(true);

    const handleSystemThemeChange = (event: MediaQueryListEvent) => {
      const storedTheme = window.localStorage.getItem(STORAGE_KEY);
      if (!storedTheme) {
        const prefersDark = event.matches;
        setIsDark(prefersDark);
        root.classList.toggle("dark", prefersDark);
      }
    };

    systemPrefersDark.addEventListener("change", handleSystemThemeChange);

    return () => {
      systemPrefersDark.removeEventListener("change", handleSystemThemeChange);
    };
  }, []);

  const applyTheme = (dark: boolean) => {
    if (typeof window === "undefined") {
      return;
    }

    const root = window.document.documentElement;
    root.classList.toggle("dark", dark);
    window.localStorage.setItem(STORAGE_KEY, dark ? "dark" : "light");
  };

  const handleToggle = () => {
    setIsDark((prev) => {
      const next = !prev;
      applyTheme(next);
      return next;
    });
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      handleToggle();
    }
  };

  if (!mounted) {
    return (
      <div
        className={cn(
          "flex h-10 w-16 rounded-full border border-transparent bg-muted/40 transition-colors",
          className,
        )}
      />
    );
  }

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      aria-pressed={isDark}
      className={cn(
        "flex h-10 w-16 items-center rounded-full border border-zinc-200 bg-white p-1 transition-all duration-300 dark:border-zinc-800 dark:bg-zinc-950",
        className,
      )}
      onClick={handleToggle}
      onKeyDown={handleKeyDown}
    >
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 transition-transform duration-300 dark:bg-zinc-800",
          isDark ? "translate-x-6" : "translate-x-0",
        )}
      >
        {isDark ? (
          <Moon className="h-4 w-4 text-white" strokeWidth={1.5} />
        ) : (
          <Sun className="h-4 w-4 text-gray-700" strokeWidth={1.5} />
        )}
      </span>
      <span className="sr-only">{isDark ? "Enable light theme" : "Enable dark theme"}</span>
    </button>
  );
}