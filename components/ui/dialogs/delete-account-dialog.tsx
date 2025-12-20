"use client";
import { API_BASE_URL } from '@/lib/api/client';

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/primitives/button";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { Input } from "@/components/ui/primitives/input";
import { Label } from "@/components/ui/primitives/label";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-media-query";

const deleteReasons = [
  "I'm not using this account anymore",
  "I have privacy concerns",
  "I found a better alternative",
  "The service doesn't meet my needs",
  "I'm receiving too many notifications",
  "I want to start fresh with a new account",
  "Other",
] as const;

type DeleteReason = (typeof deleteReasons)[number];

interface DeleteAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({
  open,
  onOpenChange,
}: DeleteAccountDialogProps) {
  const isMobile = useIsMobile();
  const [step, setStep] = React.useState<"reason" | "confirm" | "goodbye">("reason");
  const [selectedReasons, setSelectedReasons] = React.useState<Set<DeleteReason>>(new Set());
  const [otherReason, setOtherReason] = React.useState("");
  const [isDeleting, setIsDeleting] = React.useState(false);

  const handleReasonToggle = (reason: DeleteReason, isChecked: boolean) => {
    const newReasons = new Set(selectedReasons);
    if (isChecked) {
      newReasons.add(reason);
    } else {
      newReasons.delete(reason);
      // Clear other reason text if "Other" is deselected
      if (reason === "Other") {
        setOtherReason("");
      }
    }
    setSelectedReasons(newReasons);
  };

  // Check if form is valid (at least one reason selected, and if "Other" is selected, text must be provided)
  const isFormValid = React.useMemo(() => {
    if (selectedReasons.size === 0) return false;
    if (selectedReasons.has("Other") && !otherReason.trim()) return false;
    return true;
  }, [selectedReasons, otherReason]);

  const handleDelete = async () => {
    if (selectedReasons.size === 0) {
      toast.error("Please select at least one reason");
      return;
    }

    if (selectedReasons.has("Other") && !otherReason.trim()) {
      toast.error("Please provide a reason in the 'Other' field");
      return;
    }

    setIsDeleting(true);
    try {
      const reasons = Array.from(selectedReasons).map((reason) =>
        reason === "Other" ? `Other: ${otherReason.trim()}` : reason
      );

      const response = await fetch(API_BASE_URL + "/api/users/delete-account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reasons }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Failed to delete account");
      }

      // Show goodbye message
      setStep("goodbye");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to delete account";
      toast.error(errorMessage);
      setIsDeleting(false);
    }
  };

  const handleGoodbyeOk = async () => {
    // Sign out and redirect to auth page
    await signOut({ callbackUrl: "/auth", redirect: true });
  };

  const handleClose = () => {
    if (step === "goodbye") {
      handleGoodbyeOk();
      return;
    }
    onOpenChange(false);
    // Reset state when closing
    setTimeout(() => {
      setStep("reason");
      setSelectedReasons(new Set());
      setOtherReason("");
      setIsDeleting(false);
    }, 300);
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
          {/* Backdrop with blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={step === "goodbye" ? undefined : handleClose}
            className="absolute inset-0 bg-black/60 backdrop-blur-md"
          />

        {/* Dialog */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()} // Prevent clicks inside dialog from closing it
          className={cn(
            "relative z-10 w-full rounded-xl border border-border/50 bg-card shadow-xl",
            isMobile ? "max-w-[95vw]" : "max-w-md"
          )}
        >
        <AnimatePresence mode="wait">
          {step === "reason" && (
            <motion.div
              key="reason"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(isMobile ? "p-4" : "p-6")}
            >
              <div className={cn(isMobile ? "mb-4" : "mb-6")}>
                <div className="flex items-center justify-between mb-2">
                  <h2 className={cn("font-bold", isMobile ? "text-2xl" : "text-2xl")}>Delete Account</h2>
                  <button
                    onClick={handleClose}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className={cn(isMobile ? "h-5 w-5" : "h-4 w-4")} />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-sm")}>
                  We&apos;re sorry to see you go. Please let us know why you&apos;re deleting your account.
                </p>
              </div>

              <div className={cn(
                "space-y-3 mb-6 overflow-y-auto",
                isMobile ? "max-h-[250px]" : "max-h-[300px]"
              )}>
                {deleteReasons.map((reason) => (
                  <div 
                    key={reason} 
                    className={cn(
                      "flex items-start gap-3",
                      reason === "Other" && selectedReasons.has("Other") && "items-start"
                    )}
                  >
                    <Checkbox
                      id={`reason-${reason}`}
                      checked={selectedReasons.has(reason)}
                      onCheckedChange={(checked) => handleReasonToggle(reason, checked as boolean)}
                      className={cn(
                        "mt-0.5 flex-shrink-0",
                        reason === "Other" && selectedReasons.has("Other") && "mt-1",
                        isMobile && "h-5 w-5"
                      )}
                    />
                    {reason === "Other" ? (
                      <div className="flex-1 min-w-0 space-y-2">
                        <Label 
                          htmlFor={`reason-${reason}`}
                          className={cn(
                            "cursor-pointer",
                            isMobile ? "text-sm" : "text-sm"
                          )}
                        >
                          {reason}:
                        </Label>
                        {selectedReasons.has("Other") && (
                          <Input
                            placeholder="Please specify..."
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            className={cn("w-full", isMobile ? "text-sm" : "")}
                            autoFocus
                          />
                        )}
                      </div>
                    ) : (
                      <Label 
                        htmlFor={`reason-${reason}`}
                        className={cn(
                          "flex-1 cursor-pointer",
                          isMobile ? "text-sm" : "text-sm"
                        )}
                      >
                        {reason}
                      </Label>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className={cn("flex-1", isMobile ? "text-base h-11" : "")}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setStep("confirm")}
                  className={cn("flex-1", isMobile ? "text-base h-11" : "")}
                  disabled={!isFormValid || isDeleting}
                >
                  Continue
                </Button>
              </div>
            </motion.div>
          )}

          {step === "confirm" && (
            <motion.div
              key="confirm"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className={cn(isMobile ? "p-4" : "p-6")}
            >
              <div className={cn(isMobile ? "mb-4" : "mb-6")}>
                <div className={cn(
                  "flex items-center gap-3 mb-4",
                  isMobile && "gap-2"
                )}>
                  <div className={cn(
                    "flex items-center justify-center rounded-full bg-destructive/10",
                    isMobile ? "h-10 w-10" : "h-12 w-12"
                  )}>
                    <AlertTriangle className={cn(
                      "text-destructive",
                      isMobile ? "h-5 w-5" : "h-6 w-6"
                    )} />
                  </div>
                  <div>
                    <h2 className={cn("font-bold", isMobile ? "text-2xl" : "text-2xl")}>Are you sure?</h2>
                    <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-sm")}>
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <div className={cn(
                  "rounded-lg border border-destructive/20 bg-destructive/5",
                  isMobile ? "p-3" : "p-4"
                )}>
                  <p className={cn("text-foreground", isMobile ? "text-sm" : "text-sm")}>
                    Deleting your account will permanently remove:
                  </p>
                  <ul className={cn(
                    "mt-2 space-y-1 text-muted-foreground list-disc list-inside",
                    isMobile ? "text-sm" : "text-sm"
                  )}>
                    <li>Your profile and all personal information</li>
                    <li>All your books, lists, and reading data</li>
                    <li>Your followers and following relationships</li>
                    <li>All your activities and reviews</li>
                  </ul>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("reason")}
                  className={cn("flex-1", isMobile ? "text-base h-11" : "")}
                  disabled={isDeleting}
                >
                  Go back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className={cn("flex-1", isMobile ? "text-base h-11" : "")}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className={cn("mr-2 animate-spin", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className={cn("mr-2", isMobile ? "h-5 w-5" : "h-4 w-4")} />
                      Delete my account
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "goodbye" && (
            <motion.div
              key="goodbye"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn("text-center", isMobile ? "p-4" : "p-6")}
            >
              <div className={cn(isMobile ? "mb-4" : "mb-6")}>
                <div className={cn(
                  "mx-auto mb-4 flex items-center justify-center rounded-full bg-muted",
                  isMobile ? "h-12 w-12" : "h-16 w-16"
                )}>
                  <Trash2 className={cn(
                    "text-muted-foreground",
                    isMobile ? "h-6 w-6" : "h-8 w-8"
                  )} />
                </div>
                <h2 className={cn("font-bold mb-2", isMobile ? "text-2xl" : "text-2xl")}>We&apos;re sorry to see you go</h2>
                <p className={cn("text-muted-foreground", isMobile ? "text-sm" : "text-sm")}>
                  Your account has been successfully deleted. Thank you for being part of our community.
                </p>
              </div>

              <Button onClick={handleGoodbyeOk} className={cn("w-full", isMobile ? "text-base h-11" : "")}>
                Okay
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
      )}
    </AnimatePresence>
  );
}

