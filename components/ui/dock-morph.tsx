"use client"

import * as React from "react"

import { cn } from "@/lib/utils"

import { Button } from "@/components/ui/primitives/button"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/primitives/tooltip"

import { motion, AnimatePresence } from "framer-motion"

import { useIsMobile } from "@/hooks/use-media-query"
import Image from "next/image"
import { DEFAULT_AVATAR } from "@/lib/utils"

interface DockMorphProps {
  className?: string
  items?: {
    icon?: React.ComponentType<{ className?: string }>
    label: string
    onClick?: () => void
    avatar?: string
  }[]
  position?: "bottom" | "top" | "left"
}

export default function DockMorph({ items, className, position = "bottom" }: DockMorphProps) {
  const [hovered, setHovered] = React.useState<number | null>(null)
  const isMobile = useIsMobile()

  // Only show on mobile devices
  if (!isMobile) {
    return null
  }

  // Items must be provided
  if (!items || items.length === 0) {
    return null
  }

  const dockItems = items

  // Position classes
  const positionClasses = {
    bottom: "fixed bottom-0 left-0 right-0",
    top: "fixed top-0 left-0 right-0",
    left: "fixed left-0 top-0 bottom-0 flex-col",
  }

  return (
    <div
      className={cn(
        "z-50 flex items-center justify-center",
        positionClasses[position],
        className
      )}
    >
      <TooltipProvider delayDuration={100}>
        <div
          className={cn(
            "relative flex items-center justify-around w-full p-3",
            position === "left" ? "flex-col gap-4 px-4 py-8 h-full" : "flex-row",
            "bg-background/95 backdrop-blur-xl border-t",
            "dark:border-white/10 border-black/10",
            "shadow-lg"
          )}
        >
          {dockItems.map((item, i) => (
            <Tooltip key={item.label}>
              <TooltipTrigger asChild>
                <div
                  className="relative flex items-center justify-center"
                  onMouseEnter={() => setHovered(i)}
                  onMouseLeave={() => setHovered(null)}
                >
                  {/* Morphic glass bubble */}
                  <AnimatePresence>
                    {hovered === i && (
                      <motion.div
                        initial={{ scale: 0.6, opacity: 0 }}
                        animate={{ scale: 1.4, opacity: 1 }}
                        exit={{ scale: 0.6, opacity: 0 }}
                        transition={{
                          type: "spring",
                          stiffness: 200,
                          damping: 20,
                        }}
                        className={cn(
                          "absolute inset-0 rounded-full -z-10",
                          "bg-gradient-to-tr from-primary/40 via-primary/20 to-transparent",
                          "backdrop-blur-2xl",
                          "shadow-md dark:shadow-primary/20"
                        )}
                      />
                    )}
                  </AnimatePresence>

                  {/* Icon button or Avatar */}
                  {item.avatar ? (
                    <button
                      className="relative z-10 rounded-full hover:scale-110 transition-transform p-0.5 border-2 border-foreground/80"
                      onClick={item.onClick}
                    >
                      <Image
                        src={item.avatar || DEFAULT_AVATAR}
                        alt={item.label}
                        width={32}
                        height={32}
                        className="size-8 rounded-full object-cover"
                      />
                    </button>
                  ) : item.icon ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative z-10 rounded-full hover:scale-110 transition-transform"
                    onClick={item.onClick}
                  >
                    <item.icon className="h-6 w-6" />
                  </Button>
                  ) : null}
                </div>
              </TooltipTrigger>
              <TooltipContent
                side={position === "left" ? "right" : "top"}
                className="text-xs"
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      </TooltipProvider>
    </div>
  )
}
