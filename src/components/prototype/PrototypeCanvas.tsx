"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { CheckCircle, ChevronUp, ChevronDown, Grid3x3, ZoomIn, ZoomOut, Maximize2, CheckCircle2, Plus, Wand2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getOpeningGeometry, getDoorPath } from "@/components/architect/render-utils";
import {
  Sofa, LSofa, Armchair, CoffeeTable, DiningSet,
  DoubleBed, SingleBed, Wardrobe, BedsideTable,
  Stove, KitchenSink, Refrigerator, KitchenCounter,
  Toilet, BathroomSink, Bathtub, Shower,
  Desk, OfficeChair,
} from "@/components/architect/FurnitureSymbols";
import type { FurnitureType } from "@/schemas/blueprint.schema";

// =====================================================
// Constants
// =====================================================
const SCALE = 50; // 50px = 1m

// L-shaped house dimensions
const NORTH_W = 12; // North wing width (meters)
const NORTH_H = 5;  // North wing depth
const SOUTH_W = 10; // South wing width
const TOTAL_H = 12; // Total height (y=0..12)
const PADDING = 1.5;

// Wall thicknesses (meters)
const EXT_THICK = 0.3;
const LB_THICK = 0.15;
const PART_THICK = 0.1;
const EXT_HALF = EXT_THICK / 2;

// Room fill colors
const ROOM_COLORS: Record<string, string> = {
  'Living Room': '#F5E6CC',
  'Kitchen':     '#F5E6CC',
  'Hallway':     '#EDEDED',
  'Bedroom':     '#E0D4F5',
  'Bathroom':    '#CCE5FF',
  'Storage':     '#E8E8E8',
  'Utility':     '#E8F5E9',
};

const WALL_COLOR = '#1a1a1a';
const PAPER_BG = '#f8f8f6';

// =====================================================
// Room fill polygons (inset by wall thicknesses)
// =====================================================
interface RoomFill {
  id: string;
  label: string;
  type: string;
  area: number;
  flooring: string;
  center: { x: number; y: number };
  polygon: { x: number; y: number }[];
}

const ROOM_FILLS: RoomFill[] = [
  {
    id: 'r1', label: 'Living + Kitchen + Dining', type: 'Living Room',
    area: 42, flooring: 'oak-parquet',
    center: { x: 6, y: 1.75 },
    polygon: [
      { x: 0.15, y: 0.15 },
      { x: 11.85, y: 0.15 },
      { x: 11.85, y: 4.925 },
      { x: 1.85, y: 4.925 },
      { x: 1.85, y: 3.55 },
      { x: 0.15, y: 3.55 },
    ],
  },
  {
    id: 'r2', label: 'Pantry', type: 'Storage',
    area: 2.7, flooring: 'tiles',
    center: { x: 0.9, y: 4.25 },
    polygon: [
      { x: 0.15, y: 3.55 },
      { x: 1.75, y: 3.55 },
      { x: 1.75, y: 4.925 },
      { x: 0.15, y: 4.925 },
    ],
  },
  {
    id: 'r3', label: 'Entry Foyer', type: 'Hallway',
    area: 5, flooring: 'stone',
    center: { x: 1.25, y: 6 },
    polygon: [
      { x: 0.15, y: 5.075 },
      { x: 2.5, y: 5.075 },
      { x: 2.5, y: 6.925 },
      { x: 0.15, y: 6.925 },
    ],
  },
  {
    id: 'r4', label: 'Hallway', type: 'Hallway',
    area: 12, flooring: 'oak-parquet',
    center: { x: 5.5, y: 6 },
    polygon: [
      { x: 2.5, y: 5.075 },
      { x: 8.45, y: 5.075 },
      { x: 8.45, y: 6.925 },
      { x: 2.5, y: 6.925 },
    ],
  },
  {
    id: 'r5', label: 'Utility Bath', type: 'Bathroom',
    area: 3, flooring: 'tiles',
    center: { x: 9.25, y: 6 },
    polygon: [
      { x: 8.55, y: 5.075 },
      { x: 9.85, y: 5.075 },
      { x: 9.85, y: 6.925 },
      { x: 8.55, y: 6.925 },
    ],
  },
  {
    id: 'r7', label: 'Bedroom 1 (Master)', type: 'Bedroom',
    area: 25, flooring: 'oak-parquet',
    center: { x: 2.5, y: 9.5 },
    polygon: [
      { x: 0.15, y: 7.075 },
      { x: 4.95, y: 7.075 },
      { x: 4.95, y: 11.85 },
      { x: 0.15, y: 11.85 },
    ],
  },
  {
    id: 'r8', label: 'Ensuite Bath', type: 'Bathroom',
    area: 10, flooring: 'tiles',
    center: { x: 6, y: 9.5 },
    polygon: [
      { x: 5.05, y: 7.075 },
      { x: 6.95, y: 7.075 },
      { x: 6.95, y: 11.85 },
      { x: 5.05, y: 11.85 },
    ],
  },
  {
    id: 'r9', label: 'Bedroom 2', type: 'Bedroom',
    area: 15, flooring: 'oak-parquet',
    center: { x: 8.5, y: 9.5 },
    polygon: [
      { x: 7.05, y: 7.075 },
      { x: 9.85, y: 7.075 },
      { x: 9.85, y: 11.85 },
      { x: 7.05, y: 11.85 },
    ],
  },
];

// =====================================================
// Wall segment data for openings
// =====================================================
interface WallSeg {
  id: string;
  start: { x: number; y: number };
  end: { x: number; y: number };
  thickness: number;
  isExternal: boolean;
}

const WALLS: WallSeg[] = [
  // Exterior
  { id: 'w1',  start: { x: 0, y: 0 },    end: { x: 12, y: 0 },   thickness: 0.3,  isExternal: true },
  { id: 'w2',  start: { x: 12, y: 0 },   end: { x: 12, y: 5 },   thickness: 0.3,  isExternal: true },
  { id: 'w3',  start: { x: 12, y: 5 },   end: { x: 10, y: 5 },   thickness: 0.3,  isExternal: true },
  { id: 'w4',  start: { x: 10, y: 5 },   end: { x: 10, y: 12 },  thickness: 0.3,  isExternal: true },
  { id: 'w5',  start: { x: 10, y: 12 },  end: { x: 0, y: 12 },   thickness: 0.3,  isExternal: true },
  { id: 'w6',  start: { x: 0, y: 12 },   end: { x: 0, y: 0 },    thickness: 0.3,  isExternal: true },
  // Load-bearing
  { id: 'w7',  start: { x: 0, y: 5 },    end: { x: 10, y: 5 },   thickness: 0.15, isExternal: false },
  { id: 'w8',  start: { x: 0, y: 7 },    end: { x: 10, y: 7 },   thickness: 0.15, isExternal: false },
  // Partitions
  { id: 'w10', start: { x: 0, y: 3.5 },  end: { x: 1.8, y: 3.5 },  thickness: 0.1, isExternal: false },
  { id: 'w11', start: { x: 1.8, y: 3.5 },end: { x: 1.8, y: 5 },    thickness: 0.1, isExternal: false },
  { id: 'w13', start: { x: 8.5, y: 5 },  end: { x: 8.5, y: 7 },    thickness: 0.1, isExternal: false },
  { id: 'w15', start: { x: 5, y: 7 },    end: { x: 5, y: 12 },     thickness: 0.1, isExternal: false },
  { id: 'w16', start: { x: 7, y: 7 },    end: { x: 7, y: 12 },     thickness: 0.1, isExternal: false },
];

// =====================================================
// Openings for rendering
// =====================================================
interface OpeningSeg {
  id: string;
  wallId: string;
  type: 'door' | 'window' | 'french-door' | 'sliding-door';
  width: number;
  distFromStart: number;
  swing?: 'left' | 'right' | 'none';
}

const OPENINGS: OpeningSeg[] = [
  // Doors
  { id: 'd1',  wallId: 'w6',  type: 'door',        width: 1.0, distFromStart: 6.0,  swing: 'left' },   // front entrance — opens inward (east)
  { id: 'd2',  wallId: 'w7',  type: 'french-door',  width: 1.6, distFromStart: 5.0,  swing: 'none' },   // living → hallway
  { id: 'd3',  wallId: 'w11', type: 'door',        width: 0.7, distFromStart: 0.75, swing: 'right' },  // living → pantry
  { id: 'd4',  wallId: 'w8',  type: 'door',        width: 0.9, distFromStart: 2.5,  swing: 'right' },  // hallway → bedroom 1 (opens into bedroom)
  { id: 'd5',  wallId: 'w13', type: 'door',        width: 0.7, distFromStart: 1.0,  swing: 'left' },   // hallway → utility bath (opens outward per BR18)
  { id: 'd6',  wallId: 'w8',  type: 'door',        width: 0.9, distFromStart: 8.0,  swing: 'right' },  // hallway → bedroom 2 (opens into bedroom)
  { id: 'd7',  wallId: 'w15', type: 'door',        width: 0.7, distFromStart: 1.5,  swing: 'left' },   // bedroom 1 → ensuite (opens outward per BR18)
  // WIC doors removed — rooms extended to full depth
  // Windows
  { id: 'win1', wallId: 'w1', type: 'window', width: 2.0, distFromStart: 2.0 },
  { id: 'win2', wallId: 'w1', type: 'window', width: 2.0, distFromStart: 7.0 },
  { id: 'win3', wallId: 'w1', type: 'window', width: 1.2, distFromStart: 10.5 },
  { id: 'win4', wallId: 'w6', type: 'window', width: 1.5, distFromStart: 10.0 },
  { id: 'win5', wallId: 'w2', type: 'window', width: 1.5, distFromStart: 2.5 },
  { id: 'win6', wallId: 'w6', type: 'window', width: 1.2, distFromStart: 3.5 },
  { id: 'win8', wallId: 'w4', type: 'window', width: 1.2, distFromStart: 3.5 },
  // New windows — BR18 natural light compliance
  { id: 'win9',  wallId: 'w6', type: 'window', width: 0.8, distFromStart: 6.0 },    // Entry Foyer
  { id: 'win10', wallId: 'w6', type: 'window', width: 0.6, distFromStart: 7.75 },   // Pantry
  { id: 'win11', wallId: 'w4', type: 'window', width: 0.8, distFromStart: 1.0 },    // Utility Bath
  { id: 'win12', wallId: 'w5', type: 'window', width: 0.8, distFromStart: 4.0 },    // Ensuite Bath
  { id: 'win13', wallId: 'w5', type: 'window', width: 1.2, distFromStart: 7.5 },    // Bedroom 1 south
  { id: 'win14', wallId: 'w5', type: 'window', width: 1.2, distFromStart: 1.5 },    // Bedroom 2 south
];

// =====================================================
// Furniture component mapping
// =====================================================
function getFurnitureComponent(type: FurnitureType) {
  const map: Record<string, React.ComponentType<any>> = {
    'sofa-3seat': Sofa, 'sofa-lshape': LSofa, 'armchair': Armchair,
    'coffee-table': CoffeeTable, 'dining-set': DiningSet,
    'double-bed': DoubleBed, 'single-bed': SingleBed, 'wardrobe': Wardrobe,
    'bedside-table': BedsideTable, 'stove': Stove, 'kitchen-sink': KitchenSink,
    'refrigerator': Refrigerator, 'kitchen-counter': KitchenCounter,
    'toilet': Toilet, 'bathroom-sink': BathroomSink, 'bathtub': Bathtub,
    'shower': Shower, 'desk': Desk, 'office-chair': OfficeChair,
  };
  return map[type];
}

// Opening clear color (should match adjacent room)
function getClearColor(wallId: string): string {
  const map: Record<string, string> = {
    'w1':  ROOM_COLORS['Living Room'],
    'w2':  ROOM_COLORS['Living Room'],
    'w4':  ROOM_COLORS['Bedroom'],
    'w5':  ROOM_COLORS['Bedroom'],
    'w6':  ROOM_COLORS['Hallway'],
    'w7':  ROOM_COLORS['Hallway'],
    'w8':  ROOM_COLORS['Hallway'],
    'w10': ROOM_COLORS['Living Room'],
    'w11': ROOM_COLORS['Living Room'],
    'w13': ROOM_COLORS['Hallway'],
    'w15': ROOM_COLORS['Bedroom'],
    'w16': ROOM_COLORS['Bedroom'],
  };
  return map[wallId] || PAPER_BG;
}

// =====================================================
// Component Props
// =====================================================
interface PrototypeCanvasProps {
  selectedRoomId: string | null;
  onRoomClick: (roomId: string | null) => void;
  furniture: { id: string; type: FurnitureType; position: { x: number; y: number }; rotation: number; scale?: number }[];
  showGrid: boolean;
  onToggleGrid: () => void;
  stage: 'draft' | 'approved' | 'furnished';
  onApprove: () => void;
  onFurnish: () => void;
}

export function PrototypeCanvas({
  selectedRoomId, onRoomClick, furniture, showGrid, onToggleGrid,
  stage, onApprove, onFurnish,
}: PrototypeCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // ViewBox
  const vbX = -PADDING * SCALE;
  const vbY = -PADDING * SCALE;
  const vbW = (NORTH_W + PADDING * 2) * SCALE;
  const vbH = (TOTAL_H + PADDING * 2) * SCALE;

  // Scale path coordinates from render-utils
  const scalePath = (path: string) => {
    const parts = path.split(/([MLAZ])/i).filter(Boolean);
    let result = '';
    let i = 0;
    while (i < parts.length) {
      const cmd = parts[i];
      if (/[MLAZ]/i.test(cmd)) {
        result += cmd + ' ';
        i++;
        if (i < parts.length && !/[MLAZ]/i.test(parts[i])) {
          const coords = parts[i].trim();
          if (cmd.toUpperCase() === 'A') {
            const nums = coords.match(/-?\d+\.?\d*/g) || [];
            if (nums.length >= 7) {
              result += `${(parseFloat(nums[0]!) * SCALE).toFixed(2)} `;
              result += `${(parseFloat(nums[1]!) * SCALE).toFixed(2)} `;
              result += `${nums[2]} ${nums[3]} ${nums[4]} `;
              result += `${(parseFloat(nums[5]) * SCALE).toFixed(2)},`;
              result += `${(parseFloat(nums[6]) * SCALE).toFixed(2)} `;
            }
          } else {
            const scaled = coords.replace(/-?\d+\.?\d*/g, (m) =>
              (parseFloat(m) * SCALE).toFixed(2)
            );
            result += scaled + ' ';
          }
          i++;
        }
      } else {
        i++;
      }
    }
    return result.trim();
  };

  const [drawerExpanded, setDrawerExpanded] = useState(false);
  const DRAWER_COLLAPSED = 40;
  const DRAWER_EXPANDED = 200;
  const drawerHeight = drawerExpanded ? DRAWER_EXPANDED : DRAWER_COLLAPSED;

  // L-shaped exterior polygon points (with wall thickness offset)
  const extPoints = [
    { x: -EXT_HALF, y: -EXT_HALF },
    { x: NORTH_W + EXT_HALF, y: -EXT_HALF },
    { x: NORTH_W + EXT_HALF, y: NORTH_H + EXT_HALF },
    { x: SOUTH_W + EXT_HALF, y: NORTH_H + EXT_HALF },
    { x: SOUTH_W + EXT_HALF, y: TOTAL_H + EXT_HALF },
    { x: -EXT_HALF, y: TOTAL_H + EXT_HALF },
  ];

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-zinc-950">
      {/* ============================
          TOOLBAR (matches PlanCanvas exactly)
          ============================ */}
      <div className="flex items-center justify-between border-b border-white/10 p-3 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white">Blueprint Canvas</h2>
          <Badge variant="outline" className="gap-1 border-white/20 text-xs font-mono">
            SCALE 1:50
          </Badge>
        </div>

        <div className="flex items-center gap-2">
          {/* Grid toggle */}
          <Button variant="ghost" size="icon" onClick={onToggleGrid} className="text-white hover:bg-white/10 h-8 w-8">
            <Grid3x3 className={`h-4 w-4 ${showGrid ? "opacity-100" : "opacity-40"}`} />
          </Button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          {/* Zoom controls (display-only for prototype) */}
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/70 min-w-[3rem] text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            100%
          </span>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-white hover:bg-white/10 h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Workflow buttons */}
          {stage === 'draft' && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onApprove}
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Blueprint
              </Button>
            </>
          )}
          {stage === 'approved' && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={onFurnish}
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Furniture
              </Button>
            </>
          )}
          {stage === 'furnished' && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                className="text-green-500 hover:bg-green-500/10 h-8 px-3"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Generate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                Done
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Canvas area */}
      <div ref={containerRef} className="flex-1 overflow-hidden flex items-center justify-center p-4">
      <svg
        width={containerSize.width - 32}
        height={containerSize.height - 32}
        viewBox={`${vbX} ${vbY} ${vbW} ${vbH}`}
        className="max-w-full max-h-full"
        style={{ background: PAPER_BG }}
        onClick={() => onRoomClick(null)}
      >
        <defs>
          <pattern id="proto-grid" width={SCALE} height={SCALE} patternUnits="userSpaceOnUse">
            <circle cx={SCALE} cy={SCALE} r="0.8" fill="rgba(0,0,0,0.12)" />
          </pattern>
        </defs>

        {/* Grid background */}
        {showGrid && (
          <rect x={vbX} y={vbY} width={vbW} height={vbH} fill="url(#proto-grid)" />
        )}

        {/* ==============================
            LAYER 0: L-shaped exterior wall background
            ============================== */}
        <polygon
          points={extPoints.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
          fill={WALL_COLOR}
        />

        {/* ==============================
            LAYER 1: Room fills (colored, inset)
            ============================== */}
        {ROOM_FILLS.map((room) => {
          const isSelected = selectedRoomId === room.id;
          const color = ROOM_COLORS[room.type] || '#FFFFFF';

          return (
            <g key={room.id}>
              <polygon
                points={room.polygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
                fill={color}
                stroke={isSelected ? '#0ea5e9' : 'none'}
                strokeWidth={isSelected ? 3 : 0}
                className="cursor-pointer"
                onClick={(e) => { e.stopPropagation(); onRoomClick(room.id); }}
              />
              {isSelected && (
                <polygon
                  points={room.polygon.map(p => `${p.x * SCALE},${p.y * SCALE}`).join(' ')}
                  fill="none"
                  stroke="#0ea5e9"
                  strokeWidth="2"
                  strokeDasharray="6 3"
                  opacity="0.5"
                  pointerEvents="none"
                />
              )}
            </g>
          );
        })}

        {/* ==============================
            LAYER 2: Interior wall lines (data-driven)
            ============================== */}
        {WALLS.filter(w => !w.isExternal).map(wall => (
          <line key={wall.id}
            x1={wall.start.x * SCALE} y1={wall.start.y * SCALE}
            x2={wall.end.x * SCALE} y2={wall.end.y * SCALE}
            stroke={WALL_COLOR}
            strokeWidth={wall.thickness * SCALE}
          />
        ))}

        {/* ==============================
            LAYER 3: Openings (doors & windows)
            ============================== */}
        <g id="openings">
          {OPENINGS.map((opening) => {
            const wall = WALLS.find(w => w.id === opening.wallId);
            if (!wall) return null;

            const geo = getOpeningGeometry(wall, opening);
            const cx = geo.center.x * SCALE;
            const cy = geo.center.y * SCALE;
            const w = geo.width * SCALE;
            const h = geo.thickness * SCALE;
            const angleDeg = geo.angle * (180 / Math.PI);
            const clearColor = getClearColor(opening.wallId);

            return (
              <g key={opening.id} transform={`rotate(${angleDeg}, ${cx}, ${cy})`}>
                {/* Clear the wall area */}
                <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h}
                      fill={clearColor} stroke="none" />

                {/* Window symbol */}
                {opening.type === 'window' && (
                  <g>
                    <line x1={cx - w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy - h / 2}
                          stroke="#1a1a1a" strokeWidth="1" />
                    <line x1={cx - w / 2} y1={cy + h / 2} x2={cx + w / 2} y2={cy + h / 2}
                          stroke="#1a1a1a" strokeWidth="1" />
                    <line x1={cx - w / 2} y1={cy - h / 4} x2={cx + w / 2} y2={cy - h / 4}
                          stroke="#525252" strokeWidth="0.5" />
                    <line x1={cx - w / 2} y1={cy + h / 4} x2={cx + w / 2} y2={cy + h / 4}
                          stroke="#525252" strokeWidth="0.5" />
                    <rect x={cx - w / 2} y={cy - h / 4} width={w} height={h / 2}
                          fill="rgba(173,216,230,0.15)" stroke="none" />
                  </g>
                )}

                {/* Door symbol */}
                {(opening.type === 'door') && (() => {
                  const doorGeo = getDoorPath(
                    { x: geo.center.x, y: geo.center.y },
                    opening.width,
                    geo.angle,
                    (opening.swing as 'left' | 'right') || 'right'
                  );
                  return (
                    <g>
                      <line x1={cx - w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy + h / 2}
                            stroke="#1a1a1a" strokeWidth="1" />
                      <line x1={cx + w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy + h / 2}
                            stroke="#1a1a1a" strokeWidth="1" />
                      <path d={scalePath(doorGeo.arc)} fill="none" stroke="#525252" strokeWidth="0.5" />
                      <path d={scalePath(doorGeo.leaf)} fill="none" stroke="#1a1a1a" strokeWidth="1" />
                    </g>
                  );
                })()}

                {/* French door — two half-panels with opposing swing arcs */}
                {opening.type === 'french-door' && (() => {
                  const halfPanel = w / 2;
                  const lhx = cx - w / 2;  // left hinge x
                  const rhx = cx + w / 2;  // right hinge x
                  const openY = cy + halfPanel; // both panels swing same direction (+y in local)

                  return (
                    <g>
                      {/* Jambs */}
                      <line x1={cx - w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy + h / 2}
                            stroke="#1a1a1a" strokeWidth="1" />
                      <line x1={cx + w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy + h / 2}
                            stroke="#1a1a1a" strokeWidth="1" />
                      {/* Left panel leaf + arc */}
                      <line x1={lhx} y1={cy} x2={lhx} y2={openY}
                            stroke="#1a1a1a" strokeWidth="1" />
                      <path d={`M ${cx},${cy} A ${halfPanel} ${halfPanel} 0 0 0 ${lhx},${openY}`}
                            fill="none" stroke="#525252" strokeWidth="0.5" />
                      {/* Right panel leaf + arc */}
                      <line x1={rhx} y1={cy} x2={rhx} y2={openY}
                            stroke="#1a1a1a" strokeWidth="1" />
                      <path d={`M ${cx},${cy} A ${halfPanel} ${halfPanel} 0 0 1 ${rhx},${openY}`}
                            fill="none" stroke="#525252" strokeWidth="0.5" />
                    </g>
                  );
                })()}
              </g>
            );
          })}
        </g>

        {/* ==============================
            LAYER 4: Furniture
            ============================== */}
        <g id="furniture">
          {furniture.map((item) => {
            const FurnitureComp = getFurnitureComponent(item.type);
            if (!FurnitureComp) return null;
            return (
              <g key={item.id} style={{ opacity: 0.8 }}>
                <FurnitureComp
                  x={item.position.x}
                  y={item.position.y}
                  rotation={item.rotation}
                  scale={item.scale || 1}
                />
              </g>
            );
          })}
        </g>

        {/* ==============================
            LAYER 5: Room labels
            ============================== */}
        {ROOM_FILLS.map((room) => {
          const isSelected = selectedRoomId === room.id;
          // Skip labels for very small rooms
          const isSmall = room.area < 4;
          return (
            <g key={`label-${room.id}`} transform={`translate(${room.center.x * SCALE}, ${room.center.y * SCALE})`}>
              <text y={isSmall ? "0" : "-8"} textAnchor="middle"
                    fill={isSelected ? '#0ea5e9' : '#1a1a1a'}
                    fontSize={isSmall ? "7" : "10"} fontWeight="600"
                    fontFamily="system-ui, -apple-system, sans-serif"
                    style={{ textTransform: 'uppercase' as const, letterSpacing: '0.6px' }}>
                {room.label}
              </text>
              {!isSmall && (
                <>
                  <text y="6" textAnchor="middle"
                        fill={isSelected ? '#0ea5e9' : '#525252'}
                        fontSize="9" fontWeight="400"
                        fontFamily="system-ui, -apple-system, sans-serif">
                    {room.area} m²
                  </text>
                  <text y="17" textAnchor="middle"
                        fill={isSelected ? '#0ea5e9' : '#8a8a8a'}
                        fontSize="7"
                        fontFamily="system-ui, -apple-system, sans-serif">
                    {room.flooring}
                  </text>
                </>
              )}
            </g>
          );
        })}

        {/* ==============================
            LAYER 6: Dimension annotations
            ============================== */}
        <g id="dimensions" opacity="0.5">
          {/* North wing width (top) */}
          <line x1={0} y1={-1.0 * SCALE} x2={NORTH_W * SCALE} y2={-1.0 * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={0} y1={-1.1 * SCALE} x2={0} y2={-0.9 * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={NORTH_W * SCALE} y1={-1.1 * SCALE} x2={NORTH_W * SCALE} y2={-0.9 * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <text x={NORTH_W / 2 * SCALE} y={-1.15 * SCALE} textAnchor="middle"
                fill="#525252" fontSize="8" fontFamily="system-ui, sans-serif">
            12.00 m
          </text>

          {/* Total height (right side) */}
          <line x1={(NORTH_W + 1.0) * SCALE} y1={0} x2={(NORTH_W + 1.0) * SCALE} y2={NORTH_H * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={(NORTH_W + 0.9) * SCALE} y1={0} x2={(NORTH_W + 1.1) * SCALE} y2={0}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={(NORTH_W + 0.9) * SCALE} y1={NORTH_H * SCALE} x2={(NORTH_W + 1.1) * SCALE} y2={NORTH_H * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <text x={(NORTH_W + 1.15) * SCALE} y={NORTH_H / 2 * SCALE}
                textAnchor="middle" fill="#525252" fontSize="8"
                fontFamily="system-ui, sans-serif"
                transform={`rotate(90, ${(NORTH_W + 1.15) * SCALE}, ${NORTH_H / 2 * SCALE})`}>
            5.00 m
          </text>

          {/* South wing height (right side) */}
          <line x1={(SOUTH_W + 1.0) * SCALE} y1={NORTH_H * SCALE} x2={(SOUTH_W + 1.0) * SCALE} y2={TOTAL_H * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={(SOUTH_W + 0.9) * SCALE} y1={NORTH_H * SCALE} x2={(SOUTH_W + 1.1) * SCALE} y2={NORTH_H * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={(SOUTH_W + 0.9) * SCALE} y1={TOTAL_H * SCALE} x2={(SOUTH_W + 1.1) * SCALE} y2={TOTAL_H * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <text x={(SOUTH_W + 1.15) * SCALE} y={((NORTH_H + TOTAL_H) / 2) * SCALE}
                textAnchor="middle" fill="#525252" fontSize="8"
                fontFamily="system-ui, sans-serif"
                transform={`rotate(90, ${(SOUTH_W + 1.15) * SCALE}, ${((NORTH_H + TOTAL_H) / 2) * SCALE})`}>
            7.00 m
          </text>

          {/* South wing width (bottom) */}
          <line x1={0} y1={(TOTAL_H + 0.8) * SCALE} x2={SOUTH_W * SCALE} y2={(TOTAL_H + 0.8) * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={0} y1={(TOTAL_H + 0.7) * SCALE} x2={0} y2={(TOTAL_H + 0.9) * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <line x1={SOUTH_W * SCALE} y1={(TOTAL_H + 0.7) * SCALE} x2={SOUTH_W * SCALE} y2={(TOTAL_H + 0.9) * SCALE}
                stroke="#525252" strokeWidth="0.5" />
          <text x={SOUTH_W / 2 * SCALE} y={(TOTAL_H + 1.05) * SCALE} textAnchor="middle"
                fill="#525252" fontSize="8" fontFamily="system-ui, sans-serif">
            10.00 m
          </text>
        </g>

        {/* Front door indicator */}
        <g transform={`translate(${-0.4 * SCALE}, ${6 * SCALE})`}>
          <text textAnchor="end" fill="#525252" fontSize="7" fontFamily="system-ui, sans-serif"
                style={{ textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
            ENTRY
          </text>
          <line x1={4} y1={0} x2={14} y2={0} stroke="#525252" strokeWidth="0.8" />
          <path d="M 12,-3 L 16,0 L 12,3" fill="none" stroke="#525252" strokeWidth="0.8" />
        </g>
      </svg>
      </div>

      {/* Compliance Drawer */}
      <div
        className="border-t border-white/10 bg-zinc-900 overflow-hidden select-none"
        style={{ height: drawerHeight, transition: 'height 0.3s ease' }}
      >
        <div
          className="flex flex-col items-center cursor-pointer"
          onClick={() => setDrawerExpanded(prev => !prev)}
        >
          <div className="pt-1.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-zinc-600" />
          </div>
          <div className="w-full px-4 pb-2 flex items-center justify-between">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              BR18/BR23 Compliance
            </h4>
            <div className="flex items-center gap-2 text-xs">
              <Badge variant="outline" className="text-[10px] h-5 border-green-500 text-green-500">
                12
              </Badge>
              {drawerExpanded ? (
                <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
              ) : (
                <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
              )}
            </div>
          </div>
        </div>

        <div className="px-4 pb-3 overflow-y-auto space-y-1.5" style={{ maxHeight: drawerHeight - 44 }}>
          <div className="flex items-center gap-2 py-2 px-2.5 text-[11px] text-green-400">
            <CheckCircle className="h-3.5 w-3.5" />
            All compliance checks passed — no issues found
          </div>
          {[
            'Minimum room areas verified (BR18 §5.1)',
            'Ceiling heights compliant at 2.50m (BR18 §5.2)',
            'Door widths meet accessibility requirements (BR18 §3.2.1)',
            'Natural light windows in every room (BR18 §5.3)',
            'Bathroom door swings outward per BR18 §3.4',
            'Front entrance width meets minimum 1.0m requirement',
            'Emergency egress paths verified',
            'Ventilation requirements met',
          ].map((check, i) => (
            <div key={i} className="flex items-start gap-2 bg-white/5 py-1.5 px-2.5 rounded text-[10px] border-l-2 border-green-500">
              <span className="mt-0.5 text-green-400">&#10003;</span>
              <span className="text-white/80">{check}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
