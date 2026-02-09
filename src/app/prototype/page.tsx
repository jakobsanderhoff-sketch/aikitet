"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Settings, History, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { PrototypeChat } from "@/components/prototype/PrototypeChat";
import { PrototypeCanvas } from "@/components/prototype/PrototypeCanvas";
import { RoomInfoPanel } from "@/components/prototype/RoomInfoPanel";
import { PROTOTYPE_FURNITURE } from "@/data/prototype-blueprint";
import type { FurnitureType } from "@/schemas/blueprint.schema";

type Stage = "draft" | "approved" | "furnished";

export default function PrototypePage() {
  const [stage, setStage] = useState<Stage>("draft");
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [furniture, setFurniture] = useState<
    { id: string; type: FurnitureType; position: { x: number; y: number }; rotation: number; scale?: number }[]
  >([]);

  const handleApprove = useCallback(() => {
    setStage("approved");
  }, []);

  const handleFurnish = useCallback(() => {
    setFurniture(
      PROTOTYPE_FURNITURE.map((f) => ({
        id: f.id,
        type: f.type,
        position: f.position,
        rotation: f.rotation,
        scale: f.scale,
      }))
    );
    setStage("furnished");
  }, []);

  const handleRoomClick = useCallback((roomId: string | null) => {
    setSelectedRoomId(roomId);
  }, []);

  return (
    <div className="dark h-screen overflow-hidden bg-black text-foreground relative p-4">
      <div className="flex h-full relative z-10 border border-zinc-600 rounded-xl overflow-hidden">
        {/* ============================
            LEFT: Icon Sidebar
            ============================ */}
        <aside className="flex w-16 flex-col items-center border-r border-zinc-800 bg-black py-4">
          <TooltipProvider>
            <div className="mb-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/">
                    <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-900">
                      <Home className="h-5 w-5" strokeWidth={1.5} />
                    </Button>
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Home</p></TooltipContent>
              </Tooltip>
            </div>

            <Separator className="mb-4 w-8" />

            <nav className="flex flex-1 flex-col gap-4 mt-4">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-12 w-12 rounded-xl text-white hover:bg-zinc-900">
                    <History className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Project History</p></TooltipContent>
              </Tooltip>
            </nav>

            <div className="mt-auto">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10 hover:bg-zinc-900">
                    <Settings className="h-5 w-5" strokeWidth={1.5} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="right"><p>Settings</p></TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </aside>

        {/* ============================
            MIDDLE: Chat Panel (380px)
            ============================ */}
        <aside className="w-[380px] flex flex-col border-r border-zinc-800">
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
            <span className="text-base font-medium text-white">
              AI Architect
            </span>
          </div>
          <div className="flex-1 overflow-hidden">
            <PrototypeChat stage={stage} />
          </div>
        </aside>

        {/* ============================
            RIGHT: Main Canvas Area
            ============================ */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-hidden bg-black relative">
            <PrototypeCanvas
              selectedRoomId={selectedRoomId}
              onRoomClick={handleRoomClick}
              furniture={furniture}
              showGrid={showGrid}
              onToggleGrid={() => setShowGrid(prev => !prev)}
              stage={stage}
              onApprove={handleApprove}
              onFurnish={handleFurnish}
            />

            {/* Floating Room Info Panel */}
            <RoomInfoPanel
              roomId={selectedRoomId}
              onClose={() => setSelectedRoomId(null)}
              stage={stage}
            />
          </div>
        </main>
      </div>
    </div>
  );
}
