"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, X, Loader2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/primitives/button";
import { Checkbox } from "@/components/ui/primitives/checkbox";
import { Input } from "@/components/ui/primitives/input";
import { cn } from "@/lib/utils";

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
  const router = useRouter();
  const { data: session } = useSession();
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

      const response = await fetch("/api/users/delete-account", {
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

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={step === "goodbye" ? undefined : handleClose}
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
      />

      {/* Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative z-10 w-full max-w-md rounded-xl border border-border/50 bg-card shadow-xl"
      >
        <AnimatePresence mode="wait">
          {step === "reason" && (
            <motion.div
              key="reason"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="p-6"
            >
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-2xl font-bold">Delete Account</h2>
                  <button
                    onClick={handleClose}
                    className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close</span>
                  </button>
                </div>
                <p className="text-sm text-muted-foreground">
                  We're sorry to see you go. Please let us know why you're deleting your account.
                </p>
              </div>

              <div className="space-y-3 mb-6 max-h-[300px] overflow-y-auto">
                {deleteReasons.map((reason) => (
                  <div key={reason} className={cn(
                    "flex items-center gap-3",
                    reason === "Other" && selectedReasons.has("Other") && "items-start"
                  )}>
                    {reason === "Other" ? (
                      <>
                        <Checkbox
                          checked={selectedReasons.has(reason)}
                          onCheckedChange={(checked) => handleReasonToggle(reason, checked as boolean)}
                          className={selectedReasons.has("Other") ? "mt-1" : ""}
                        >
                          <span className="text-sm font-normal whitespace-nowrap">{reason}:</span>
                        </Checkbox>
                        {selectedReasons.has("Other") && (
                          <Input
                            placeholder="Please specify..."
                            value={otherReason}
                            onChange={(e) => setOtherReason(e.target.value)}
                            className="flex-1"
                            autoFocus
                          />
                        )}
                      </>
                    ) : (
                      <Checkbox
                        checked={selectedReasons.has(reason)}
                        onCheckedChange={(checked) => handleReasonToggle(reason, checked as boolean)}
                        className="flex-1"
                      >
                        <span className="text-sm font-normal">{reason}</span>
                      </Checkbox>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => setStep("confirm")}
                  className="flex-1"
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
              className="p-6"
            >
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
                    <AlertTriangle className="h-6 w-6 text-destructive" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">Are you sure?</h2>
                    <p className="text-sm text-muted-foreground">
                      This action cannot be undone
                    </p>
                  </div>
                </div>
                <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                  <p className="text-sm text-foreground">
                    Deleting your account will permanently remove:
                  </p>
                  <ul className="mt-2 space-y-1 text-sm text-muted-foreground list-disc list-inside">
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
                  className="flex-1"
                  disabled={isDeleting}
                >
                  Go back
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  className="flex-1"
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    <>
                      <Trash2 className="mr-2 h-4 w-4" />
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
              className="p-6 text-center"
            >
              <div className="mb-6">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                  <Trash2 className="h-8 w-8 text-muted-foreground" />
                </div>
                <h2 className="text-2xl font-bold mb-2">We're sorry to see you go</h2>
                <p className="text-sm text-muted-foreground">
                  Your account has been successfully deleted. Thank you for being part of our community.
                </p>
              </div>

              <Button onClick={handleGoodbyeOk} className="w-full">
                Okay
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

