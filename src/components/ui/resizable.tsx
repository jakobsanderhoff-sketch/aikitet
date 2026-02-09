"use client"

import * as React from "react"
import { GripVerticalIcon } from "lucide-react"
import { Group, Panel, Separator } from "react-resizable-panels"

import { cn } from "@/lib/utils"

interface ResizablePanelGroupProps extends React.ComponentPropsWithoutRef<typeof Group> {
  orientation?: "horizontal" | "vertical"
}

function ResizablePanelGroup({
  className,
  orientation = "horizontal",
  ...props
}: ResizablePanelGroupProps) {
  return (
    <Group
      {...{ direction: orientation } as any}
      className={cn(
        "flex h-full w-full",
        orientation === "vertical" && "flex-col",
        className
      )}
      {...props}
    />
  )
}

function ResizablePanel(props: React.ComponentPropsWithoutRef<typeof Panel>) {
  return <Panel {...props} />
}

interface ResizableHandleProps extends React.ComponentPropsWithoutRef<typeof Separator> {
  withHandle?: boolean
}

function ResizableHandle({
  withHandle = true,
  className,
  ...props
}: ResizableHandleProps) {
  return (
    <Separator
      className={cn(
        "relative flex w-2 items-center justify-center bg-border transition-colors hover:bg-primary/20",
        "after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2",
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1",
        "[&[data-orientation=vertical]]:h-2 [&[data-orientation=vertical]]:w-full",
        "[&[data-orientation=vertical]]:after:left-0 [&[data-orientation=vertical]]:after:h-1",
        "[&[data-orientation=vertical]]:after:w-full [&[data-orientation=vertical]]:after:-translate-y-1/2 [&[data-orientation=vertical]]:after:translate-x-0",
        className
      )}
      {...props}
    >
      {withHandle && (
        <div className="z-10 flex h-4 w-3 items-center justify-center rounded-sm border border-border bg-background">
          <GripVerticalIcon className="h-2.5 w-2.5" />
        </div>
      )}
    </Separator>
  )
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle }
