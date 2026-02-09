"use client";

import { useState, useCallback } from "react";
import { PrototypeChat } from "@/components/prototype/PrototypeChat";
import { PrototypeCanvas } from "@/components/prototype/PrototypeCanvas";
import { RoomInfoPanel } from "@/components/prototype/RoomInfoPanel";
import { PROTOTYPE_FURNITURE } from "@/data/prototype-blueprint";
import type { FurnitureType } from "@/schemas/blueprint.schema";

type Stage = "draft" | "approved" | "furnished";

export function DashboardPreview() {
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
    <div className="flex h-full w-full overflow-hidden rounded-lg bg-black text-white">
      {/* Left: Static Chat */}
      <aside className="w-[300px] shrink-0 flex flex-col border-r border-zinc-800 overflow-hidden">
        <div className="h-10 border-b border-zinc-800 flex items-center px-4">
          <span className="text-xs font-medium text-white">AI Architect</span>
        </div>
        <div className="flex-1 overflow-hidden">
          <PrototypeChat stage={stage} />
        </div>
      </aside>

      {/* Right: Interactive Blueprint */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        <PrototypeCanvas
          selectedRoomId={selectedRoomId}
          onRoomClick={handleRoomClick}
          furniture={furniture}
          showGrid={showGrid}
          onToggleGrid={() => setShowGrid((prev) => !prev)}
          stage={stage}
          onApprove={handleApprove}
          onFurnish={handleFurnish}
        />

        <RoomInfoPanel
          roomId={selectedRoomId}
          onClose={() => setSelectedRoomId(null)}
          stage={stage}
        />
      </main>
    </div>
  );
}
