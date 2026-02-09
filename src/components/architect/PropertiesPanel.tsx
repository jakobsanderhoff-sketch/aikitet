"use client";

import { useBlueprintStore } from "@/store/blueprint.store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Settings2, Save } from "lucide-react";
import { useState, useEffect } from "react";
import type { WallSegment, Opening, RoomZone } from "@/schemas/blueprint.schema";

export function PropertiesPanel() {
  const {
    selectedElementId,
    selectedElementType,
    getSelectedElement,
    updateWall,
    updateOpening,
    updateRoom,
    clearSelection,
  } = useBlueprintStore();

  const selectedElement = getSelectedElement();
  const [editedValues, setEditedValues] = useState<any>({});

  // Reset edited values when selection changes
  useEffect(() => {
    if (selectedElement) {
      setEditedValues(selectedElement);
    }
  }, [selectedElement]);

  const handleSave = () => {
    if (!selectedElementId || !selectedElementType) return;

    switch (selectedElementType) {
      case 'wall':
        updateWall(selectedElementId, editedValues);
        break;
      case 'opening':
        updateOpening(selectedElementId, editedValues);
        break;
      case 'room':
        updateRoom(selectedElementId, editedValues);
        break;
    }
  };

  if (!selectedElement) {
    return (
      <div className="flex-1 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Settings2 className="h-4 w-4 text-zinc-500" />
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
            Properties
          </h3>
        </div>
        <div className="flex flex-col items-center justify-center h-40 text-center">
          <div className="text-zinc-600 text-xs mb-2">No element selected</div>
          <div className="text-zinc-700 text-[10px] max-w-[180px]">
            Click on a wall, door, window, or room in the canvas to edit its properties
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <div className="flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
            Properties
          </h3>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-zinc-400 hover:bg-zinc-800"
          onClick={clearSelection}
          title="Clear Selection"
        >
          ✕
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-4">
          {/* Element ID & Type */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-zinc-400">
                {selectedElement.id}
              </span>
              <Badge variant="outline" className="text-[10px] border-cyan-500/30 text-cyan-400">
                {selectedElementType}
              </Badge>
            </div>
          </div>

          {/* Wall Properties */}
          {selectedElementType === 'wall' && (
            <WallProperties
              wall={selectedElement as WallSegment}
              editedValues={editedValues}
              setEditedValues={setEditedValues}
            />
          )}

          {/* Opening Properties */}
          {selectedElementType === 'opening' && (
            <OpeningProperties
              opening={selectedElement as Opening}
              editedValues={editedValues}
              setEditedValues={setEditedValues}
            />
          )}

          {/* Room Properties */}
          {selectedElementType === 'room' && (
            <RoomProperties
              room={selectedElement as RoomZone}
              editedValues={editedValues}
              setEditedValues={setEditedValues}
            />
          )}
        </div>
      </ScrollArea>

      {/* Save Button */}
      <div className="p-3 border-t border-zinc-800">
        <Button
          onClick={handleSave}
          className="w-full h-8 bg-cyan-600 hover:bg-cyan-700 text-xs"
        >
          <Save className="h-3 w-3 mr-2" />
          Update {selectedElementType}
        </Button>
      </div>
    </div>
  );
}

// Wall Properties Component
function WallProperties({
  wall,
  editedValues,
  setEditedValues,
}: {
  wall: WallSegment;
  editedValues: any;
  setEditedValues: (val: any) => void;
}) {
  return (
    <>
      <PropertyField label="Thickness (m)">
        <Input
          type="number"
          step="0.05"
          min="0.1"
          max="1.0"
          value={editedValues.thickness || wall.thickness}
          onChange={(e) =>
            setEditedValues({ ...editedValues, thickness: parseFloat(e.target.value) })
          }
          className="h-7 text-xs bg-zinc-900 border-zinc-700"
        />
      </PropertyField>

      <PropertyField label="Material">
        <select
          value={editedValues.material || wall.material}
          onChange={(e) => setEditedValues({ ...editedValues, material: e.target.value })}
          className="w-full h-7 text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 text-zinc-300"
        >
          <option value="brick">Brick</option>
          <option value="concrete">Concrete</option>
          <option value="insulation">Insulation</option>
          <option value="gasbeton">Gasbeton</option>
          <option value="timber">Timber</option>
        </select>
      </PropertyField>

      <PropertyField label="Type">
        <select
          value={editedValues.type || wall.type}
          onChange={(e) => setEditedValues({ ...editedValues, type: e.target.value })}
          className="w-full h-7 text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 text-zinc-300"
        >
          <option value="EXTERIOR_INSULATED">Exterior Insulated</option>
          <option value="LOAD_BEARING">Load Bearing</option>
          <option value="INTERIOR_PARTITION">Interior Partition</option>
          <option value="FIRE_RATED">Fire Rated</option>
        </select>
      </PropertyField>

      <PropertyField label="External">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={editedValues.isExternal ?? wall.isExternal}
            onChange={(e) =>
              setEditedValues({ ...editedValues, isExternal: e.target.checked })
            }
            className="h-4 w-4 bg-zinc-900 border-zinc-700 rounded"
          />
          <span className="text-xs text-zinc-400">Exterior wall</span>
        </label>
      </PropertyField>

      <PropertyField label="Coordinates">
        <div className="text-[10px] font-mono text-zinc-500 space-y-1">
          <div>Start: ({wall.start.x.toFixed(2)}m, {wall.start.y.toFixed(2)}m)</div>
          <div>End: ({wall.end.x.toFixed(2)}m, {wall.end.y.toFixed(2)}m)</div>
          <div>Length: {Math.sqrt(Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)).toFixed(2)}m</div>
        </div>
      </PropertyField>
    </>
  );
}

// Opening Properties Component
function OpeningProperties({
  opening,
  editedValues,
  setEditedValues,
}: {
  opening: Opening;
  editedValues: any;
  setEditedValues: (val: any) => void;
}) {
  return (
    <>
      <PropertyField label="Tag">
        <Input
          type="text"
          value={editedValues.tag || opening.tag}
          onChange={(e) => setEditedValues({ ...editedValues, tag: e.target.value })}
          className="h-7 text-xs bg-zinc-900 border-zinc-700 font-mono"
        />
      </PropertyField>

      <PropertyField label="Width (m)">
        <Input
          type="number"
          step="0.1"
          min="0.6"
          max="3.0"
          value={editedValues.width || opening.width}
          onChange={(e) =>
            setEditedValues({ ...editedValues, width: parseFloat(e.target.value) })
          }
          className="h-7 text-xs bg-zinc-900 border-zinc-700"
        />
      </PropertyField>

      <PropertyField label="Height (m)">
        <Input
          type="number"
          step="0.1"
          min="1.8"
          max="3.5"
          value={editedValues.height || opening.height || 2.1}
          onChange={(e) =>
            setEditedValues({ ...editedValues, height: parseFloat(e.target.value) })
          }
          className="h-7 text-xs bg-zinc-900 border-zinc-700"
        />
      </PropertyField>

      <PropertyField label="Type">
        <select
          value={editedValues.type || opening.type}
          onChange={(e) => setEditedValues({ ...editedValues, type: e.target.value })}
          className="w-full h-7 text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 text-zinc-300"
        >
          <option value="door">Door</option>
          <option value="window">Window</option>
          <option value="sliding-door">Sliding Door</option>
          <option value="french-door">French Door</option>
          <option value="double-door">Double Door</option>
        </select>
      </PropertyField>

      {(opening.type === 'door' || editedValues.type === 'door') && (
        <PropertyField label="Swing Direction">
          <select
            value={editedValues.swing || opening.swing || 'right'}
            onChange={(e) => setEditedValues({ ...editedValues, swing: e.target.value })}
            className="w-full h-7 text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 text-zinc-300"
          >
            <option value="left">Left</option>
            <option value="right">Right</option>
            <option value="none">None</option>
          </select>
        </PropertyField>
      )}

      <PropertyField label="Location">
        <div className="text-[10px] font-mono text-zinc-500">
          {editedValues.distFromStart || opening.distFromStart}m from wall start
        </div>
      </PropertyField>
    </>
  );
}

// Room Properties Component
function RoomProperties({
  room,
  editedValues,
  setEditedValues,
}: {
  room: RoomZone;
  editedValues: any;
  setEditedValues: (val: any) => void;
}) {
  return (
    <>
      <PropertyField label="Name">
        <Input
          type="text"
          value={editedValues.label || room.label}
          onChange={(e) => setEditedValues({ ...editedValues, label: e.target.value })}
          className="h-7 text-xs bg-zinc-900 border-zinc-700"
        />
      </PropertyField>

      <PropertyField label="Area">
        <div className="text-xs font-mono text-zinc-300">
          {room.area.value} {room.area.unit}
        </div>
      </PropertyField>

      <PropertyField label="Flooring">
        <select
          value={editedValues.flooring || room.flooring}
          onChange={(e) => setEditedValues({ ...editedValues, flooring: e.target.value })}
          className="w-full h-7 text-xs bg-zinc-900 border border-zinc-700 rounded-md px-2 text-zinc-300"
        >
          <option value="oak-parquet">Oak Parquet</option>
          <option value="tiles">Tiles</option>
          <option value="carpet">Carpet</option>
          <option value="concrete">Concrete</option>
          <option value="vinyl">Vinyl</option>
          <option value="laminate">Laminate</option>
        </select>
      </PropertyField>

      {room.ceilingHeight && (
        <PropertyField label="Ceiling Height (m)">
          <Input
            type="number"
            step="0.1"
            min="2.1"
            max="4.0"
            value={editedValues.ceilingHeight || room.ceilingHeight}
            onChange={(e) =>
              setEditedValues({ ...editedValues, ceilingHeight: parseFloat(e.target.value) })
            }
            className="h-7 text-xs bg-zinc-900 border-zinc-700"
          />
        </PropertyField>
      )}

      <PropertyField label="Center Point">
        <div className="text-[10px] font-mono text-zinc-500">
          ({room.center.x.toFixed(2)}m, {room.center.y.toFixed(2)}m)
        </div>
      </PropertyField>
    </>
  );
}

// Helper Component
function PropertyField({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[10px] font-medium text-zinc-500 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}
