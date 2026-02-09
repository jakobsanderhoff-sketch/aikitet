"use client";

import { X } from "lucide-react";

interface RoomInfo {
  id: string;
  label: string;
  type: string;
  area: number;
  flooring: string;
  dimensions: string;
  windows: number;
}

const ROOM_DATA: Record<string, RoomInfo> = {
  r1:  { id: 'r1',  label: 'Living + Kitchen + Dining', type: 'Living Room', area: 42,   flooring: 'Oak Parquet',   dimensions: '12.0m × 5.0m (L)', windows: 5 },
  r2:  { id: 'r2',  label: 'Pantry',                    type: 'Storage',     area: 2.7,  flooring: 'Ceramic Tiles', dimensions: '1.8m × 1.5m',       windows: 1 },
  r3:  { id: 'r3',  label: 'Entry Foyer',               type: 'Entry',       area: 5,    flooring: 'Natural Stone', dimensions: '2.5m × 2.0m',       windows: 1 },
  r4:  { id: 'r4',  label: 'Hallway',                   type: 'Hallway',     area: 12,   flooring: 'Oak Parquet',   dimensions: '6.0m × 2.0m',       windows: 0 },
  r5:  { id: 'r5',  label: 'Utility Bath',              type: 'Bathroom',    area: 3,    flooring: 'Ceramic Tiles', dimensions: '1.5m × 2.0m',       windows: 1 },
  r7:  { id: 'r7',  label: 'Bedroom 1 (Master)',        type: 'Bedroom',     area: 25,   flooring: 'Oak Parquet',   dimensions: '5.0m × 5.0m',       windows: 2 },
  r8:  { id: 'r8',  label: 'Ensuite Bath',              type: 'Bathroom',    area: 10,   flooring: 'Ceramic Tiles', dimensions: '2.0m × 5.0m',       windows: 1 },
  r9:  { id: 'r9',  label: 'Bedroom 2',                 type: 'Bedroom',     area: 15,   flooring: 'Oak Parquet',   dimensions: '3.0m × 5.0m',       windows: 2 },
};

interface RoomInfoPanelProps {
  roomId: string | null;
  onClose: () => void;
  stage: 'draft' | 'approved' | 'furnished';
}

export function RoomInfoPanel({ roomId, onClose, stage }: RoomInfoPanelProps) {
  if (!roomId) return null;

  const room = ROOM_DATA[roomId];
  if (!room) return null;

  return (
    <div className="absolute top-4 right-4 w-64 bg-zinc-900 border border-white/10 rounded-xl shadow-2xl z-20 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <h3 className="text-sm font-semibold text-white">{room.label}</h3>
        <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Details */}
      <div className="p-4 space-y-4 max-h-80 overflow-y-auto">
        <div className="grid grid-cols-2 gap-3">
          <InfoItem label="Type" value={room.type} />
          <InfoItem label="Area" value={`${room.area} m²`} />
          <InfoItem label="Dimensions" value={room.dimensions} />
          <InfoItem label="Windows" value={String(room.windows)} />
          <InfoItem label="Flooring" value={room.flooring} />
          <InfoItem label="Ceiling" value="2.50m" />
        </div>

        {/* Compliance badge */}
        <div className="pt-2 border-t border-white/10">
          <div className="flex items-center gap-2 text-xs text-green-400">
            <div className="h-2 w-2 rounded-full bg-green-400" />
            BR18/BR23 Compliant
          </div>
        </div>

        {/* Stage-specific info */}
        {stage === 'draft' && (
          <div className="text-xs text-zinc-500 leading-relaxed">
            Click <span className="text-white font-medium">Approve Blueprint</span> in the toolbar to approve this layout and proceed to furnishing.
          </div>
        )}
        {stage === 'approved' && (
          <div className="text-xs text-zinc-500 leading-relaxed">
            Layout approved. Click <span className="text-white font-medium">Add Furniture</span> in the toolbar to furnish all rooms.
          </div>
        )}
        {stage === 'furnished' && (
          <div className="text-xs text-zinc-500 leading-relaxed">
            This room has been furnished with recommended items based on its type and dimensions.
          </div>
        )}
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-0.5">{label}</div>
      <div className="text-xs text-white font-medium">{value}</div>
    </div>
  );
}
