"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/primitives/dialog";
import { Button } from "@/components/ui/primitives/button";
import { BookOpen, Heart, Library } from "lucide-react";

interface SignupPromptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  action?: "bookshelf" | "like" | "tbr" | "general";
}

export function SignupPromptDialog({
  open,
  onOpenChange,
  action = "general",
}: SignupPromptDialogProps) {
  const router = useRouter();

  const getActionInfo = () => {
    switch (action) {
      case "bookshelf":
        return {
          title: "Sign up to add books to your bookshelf",
          description: "Create an account to save books you've read and track your reading journey.",
          icon: Library,
        };
      case "like":
        return {
          title: "Sign up to like books",
          description: "Create an account to like books and build your collection of favorites.",
          icon: Heart,
        };
      case "tbr":
        return {
          title: "Sign up to add books to your TBR",
          description: "Create an account to save books you want to read and organize your reading list.",
          icon: BookOpen,
        };
      default:
        return {
          title: "Sign up to get started",
          description: "Create an account to save books, track your reading, and discover new favorites.",
          icon: BookOpen,
        };
    }
  };

  const { title, description, icon: Icon } = getActionInfo();

  const handleSignUp = () => {
    onOpenChange(false);
    router.push("/auth");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4 mx-auto">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="w-full sm:w-auto"
          >
            Maybe later
          </Button>
          <Button
            onClick={handleSignUp}
            className="w-full sm:w-auto"
          >
            Sign up now
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

