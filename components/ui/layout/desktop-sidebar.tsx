"use client";

import Image from "next/image";
import React from "react";
import { Home, Sparkles, List, NotebookPen, Bell } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import { GeneralDiaryEditorDialog } from "@/components/ui/dialogs/general-diary-editor-dialog";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";

export function DesktopSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const [writeDialogOpen, setWriteDialogOpen] = React.useState(false);

  const sidebarItems = [
    {
      icon: Home,
      label: "Home",
      onClick: () => {
        if (pathname !== "/") {
          router.push("/");
        } else {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }
      },
      isActive: pathname === "/",
    },
    {
      icon: Sparkles,
      label: "Recommendations",
      onClick: () => router.push("/recommendations"),
      isActive: pathname === "/recommendations",
    },
    {
      icon: List,
      label: "Lists",
      onClick: () => router.push("/lists"),
      isActive: pathname === "/lists",
    },
    {
      icon: NotebookPen,
      label: "Write",
      onClick: () => setWriteDialogOpen(true),
      isActive: false,
    },
    {
      icon: Bell,
      label: "Updates",
      onClick: () => router.push("/activity"),
      isActive: pathname === "/activity",
    },
  ];

  return (
    <>
      <TooltipProvider delayDuration={200}>
        <aside className="hidden md:flex fixed left-0 top-0 h-full w-16 flex-col items-center py-4 pl-2 pr-2 border-r border-gray-200 dark:border-gray-800 bg-white dark:bg-black z-50">
          {/* Logo at top */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => {
                  if (pathname !== "/") {
                    router.push("/");
                  } else {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }
                }}
                className="mb-8 flex items-center justify-center rounded-full p-2 transition hover:bg-gray-100 dark:hover:bg-gray-900"
              >
                <Image
                  src="/icon.jpg"
                  alt="PaperBoxd"
                  width={32}
                  height={32}
                  className="rounded-full"
                  priority
                />
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Home</p>
            </TooltipContent>
          </Tooltip>

          {/* Navigation items */}
          <nav className="flex flex-col items-center gap-6 flex-1">
            {sidebarItems.map((item) => {
              const Icon = item.icon;
              return (
                <Tooltip key={item.label}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={item.onClick}
                      className={cn(
                        "flex items-center justify-center w-12 h-12 rounded-full transition-colors",
                        item.isActive
                          ? "bg-black dark:bg-white text-white dark:text-black"
                          : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-900"
                      )}
                    >
                      <Icon className="w-6 h-6" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>{item.label}</p>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </nav>
        </aside>
      </TooltipProvider>

      {/* Write Dialog */}
      {session?.user?.username && (
        <GeneralDiaryEditorDialog
          open={writeDialogOpen}
          onOpenChange={setWriteDialogOpen}
          username={session.user.username}
        />
      )}
    </>
  );
}

