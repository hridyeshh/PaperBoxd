"use client";

import { GripHorizontal } from "lucide-react";
import {
  Button as AriaButton,
  GridList as AriaGridList,
  GridListItem as AriaGridListItem,
  type GridListItemProps as AriaGridListItemProps,
  type GridListProps as AriaGridListProps,
  composeRenderProps,
} from "react-aria-components";

import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

export function GridList<T extends object>({ children, ...props }: AriaGridListProps<T>) {
  return (
    <AriaGridList
      {...props}
      className={composeRenderProps(props.className, (className) =>
        cn(
          "jolly-GridList group flex max-h-60 flex-col gap-2 overflow-auto rounded-md border bg-popover p-1 text-popover-foreground shadow-md outline-none",
          "data-[empty]:p-6 data-[empty]:text-center data-[empty]:text-sm",
          className,
        ),
      )}
    >
      {children}
    </AriaGridList>
  );
}

export function GridListItem({ children, className, ...props }: AriaGridListItemProps) {
  const textValue = typeof children === "string" ? children : undefined;

  return (
    <AriaGridListItem
      textValue={textValue}
      className={composeRenderProps(className, (className) =>
        cn(
          "jolly-GridListItem relative flex w-full cursor-default select-none items-center gap-3 rounded-sm px-2 py-1.5 text-sm outline-none",
          "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
          "data-[focus-visible]:z-10 data-[focus-visible]:outline-none data-[focus-visible]:ring-2 data-[focus-visible]:ring-ring data-[focus-visible]:ring-offset-2 data-[focus-visible]:ring-offset-background",
          "data-[hovered]:bg-accent data-[hovered]:text-accent-foreground",
          "data-[selected]:bg-accent data-[selected]:text-accent-foreground",
          "data-[dragging]:opacity-60",
          className,
        ),
      )}
      {...props}
    >
      {composeRenderProps(children, (childNodes, renderProps) => (
        <>
          {renderProps.allowsDragging ? (
            <AriaButton slot="drag">
              <GripHorizontal className="size-4" />
            </AriaButton>
          ) : null}
          {renderProps.selectionMode === "multiple" && renderProps.selectionBehavior === "toggle" ? (
            <Checkbox slot="selection" />
          ) : null}
          {childNodes}
        </>
      ))}
    </AriaGridListItem>
  );
}
