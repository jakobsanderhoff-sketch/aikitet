"use client";

import React from 'react';

// Base scale: 50px = 1 meter (same as PlanCanvas)
const SCALE = 50;

// Stroke style for furniture - thin professional lines
const FURNITURE_STROKE = "#525252";
const FURNITURE_STROKE_WIDTH = 0.5;

interface FurnitureProps {
  x: number;      // Center X in meters
  y: number;      // Center Y in meters
  rotation?: number; // Rotation in degrees
  scale?: number;    // Additional scale factor
}

// ============================================
// LIVING ROOM FURNITURE
// ============================================

// 3-Seater Sofa (approx 2.2m x 0.9m)
export function Sofa({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 2.2 * SCALE * scale;
  const h = 0.9 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Main body */}
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Back cushion */}
      <rect x={-w/2 + 2} y={-h/2 + 2} width={w - 4} height={h * 0.35} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      {/* Seat cushion divisions */}
      <line x1={-w/6} y1={-h/2 + h * 0.35 + 4} x2={-w/6} y2={h/2 - 2} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
      <line x1={w/6} y1={-h/2 + h * 0.35 + 4} x2={w/6} y2={h/2 - 2} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// L-Shaped Sofa (corner sofa)
export function LSofa({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const cx = x * SCALE;
  const cy = y * SCALE;
  const s = SCALE * scale;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Main L-shape outline */}
      <path
        d={`M ${-1.4*s} ${-0.45*s}
            L ${1.0*s} ${-0.45*s}
            L ${1.0*s} ${0.9*s}
            L ${0.1*s} ${0.9*s}
            L ${0.1*s} ${0.45*s}
            L ${-1.4*s} ${0.45*s} Z`}
        fill="none"
        stroke={FURNITURE_STROKE}
        strokeWidth={FURNITURE_STROKE_WIDTH}
      />
      {/* Back cushion lines */}
      <line x1={-1.35*s} y1={-0.35*s} x2={0.95*s} y2={-0.35*s} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
      <line x1={0.2*s} y1={0.55*s} x2={0.95*s} y2={0.55*s} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// Armchair (0.8m x 0.8m)
export function Armchair({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const size = 0.8 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-size/2} y={-size/2} width={size} height={size} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Back cushion */}
      <rect x={-size/2 + 2} y={-size/2 + 2} width={size - 4} height={size * 0.3} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
    </g>
  );
}

// Coffee Table (1.2m x 0.6m)
export function CoffeeTable({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 1.2 * SCALE * scale;
  const h = 0.6 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// ============================================
// DINING FURNITURE
// ============================================

// Dining Table with Chairs (2.0m x 1.0m table + chairs)
export function DiningSet({ x, y, rotation = 0, scale = 1, chairs = 6 }: FurnitureProps & { chairs?: number }) {
  const tw = 2.0 * SCALE * scale;
  const th = 1.0 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;
  const chairSize = 0.4 * SCALE * scale;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Table */}
      <rect x={-tw/2} y={-th/2} width={tw} height={th} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />

      {/* Chairs - distributed around table */}
      {chairs >= 2 && (
        <>
          {/* Head chairs */}
          <rect x={-tw/2 - chairSize - 3} y={-chairSize/2} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
          <rect x={tw/2 + 3} y={-chairSize/2} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
        </>
      )}
      {chairs >= 4 && (
        <>
          {/* Side chairs */}
          <rect x={-tw/4 - chairSize/2} y={-th/2 - chairSize - 3} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
          <rect x={tw/4 - chairSize/2} y={-th/2 - chairSize - 3} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
        </>
      )}
      {chairs >= 6 && (
        <>
          {/* More side chairs */}
          <rect x={-tw/4 - chairSize/2} y={th/2 + 3} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
          <rect x={tw/4 - chairSize/2} y={th/2 + 3} width={chairSize} height={chairSize} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
        </>
      )}
    </g>
  );
}

// ============================================
// BEDROOM FURNITURE
// ============================================

// Double Bed (2.0m x 1.8m including frame)
export function DoubleBed({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 1.8 * SCALE * scale;  // Width
  const h = 2.0 * SCALE * scale;  // Length
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Bed frame */}
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Pillows */}
      <rect x={-w/2 + 4} y={-h/2 + 4} width={w/2 - 6} height={h * 0.2} rx="2" fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      <rect x={4} y={-h/2 + 4} width={w/2 - 6} height={h * 0.2} rx="2" fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      {/* Blanket line */}
      <line x1={-w/2 + 3} y1={-h/2 + h * 0.35} x2={w/2 - 3} y2={-h/2 + h * 0.35} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// Single Bed (2.0m x 0.9m)
export function SingleBed({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.9 * SCALE * scale;
  const h = 2.0 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Bed frame */}
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Pillow */}
      <rect x={-w/2 + 4} y={-h/2 + 4} width={w - 8} height={h * 0.15} rx="2" fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      {/* Blanket line */}
      <line x1={-w/2 + 3} y1={-h/2 + h * 0.3} x2={w/2 - 3} y2={-h/2 + h * 0.3} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// Wardrobe (2.0m x 0.6m)
export function Wardrobe({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 2.0 * SCALE * scale;
  const h = 0.6 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Door divisions */}
      <line x1={-w/4} y1={-h/2} x2={-w/4} y2={h/2} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
      <line x1={0} y1={-h/2} x2={0} y2={h/2} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
      <line x1={w/4} y1={-h/2} x2={w/4} y2={h/2} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// Bedside Table (0.5m x 0.4m)
export function BedsideTable({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.5 * SCALE * scale;
  const h = 0.4 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// ============================================
// KITCHEN FIXTURES
// ============================================

// Stove/Cooktop (0.6m x 0.6m with 4 burners)
export function Stove({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const size = 0.6 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;
  const burnerR = size * 0.15;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-size/2} y={-size/2} width={size} height={size} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* 4 burners */}
      <circle cx={-size/4} cy={-size/4} r={burnerR} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      <circle cx={size/4} cy={-size/4} r={burnerR} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      <circle cx={-size/4} cy={size/4} r={burnerR * 0.8} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      <circle cx={size/4} cy={size/4} r={burnerR * 0.8} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
    </g>
  );
}

// Kitchen Sink (0.8m x 0.5m)
export function KitchenSink({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.8 * SCALE * scale;
  const h = 0.5 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Counter */}
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Sink basin */}
      <ellipse cx={0} cy={0} rx={w * 0.35} ry={h * 0.35} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      {/* Drain */}
      <circle cx={0} cy={0} r={3} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.5} />
    </g>
  );
}

// Refrigerator (0.7m x 0.7m)
export function Refrigerator({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.7 * SCALE * scale;
  const h = 0.7 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Door line */}
      <line x1={-w/2} y1={-h/6} x2={w/2} y2={-h/6} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
    </g>
  );
}

// Kitchen Counter Run (variable width x 0.6m depth)
export function KitchenCounter({ x, y, width = 2, rotation = 0, scale = 1 }: FurnitureProps & { width?: number }) {
  const w = width * SCALE * scale;
  const h = 0.6 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// ============================================
// BATHROOM FIXTURES
// ============================================

// Toilet (0.7m x 0.4m)
export function Toilet({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.4 * SCALE * scale;
  const h = 0.7 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Tank */}
      <rect x={-w/2} y={-h/2} width={w} height={h * 0.25} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Bowl */}
      <ellipse cx={0} cy={h * 0.15} rx={w * 0.45} ry={h * 0.32} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// Bathroom Sink/Vanity (0.6m x 0.45m)
export function BathroomSink({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.6 * SCALE * scale;
  const h = 0.45 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Vanity */}
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Basin */}
      <ellipse cx={0} cy={0} rx={w * 0.3} ry={h * 0.35} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
    </g>
  );
}

// Bathtub (1.7m x 0.75m)
export function Bathtub({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 0.75 * SCALE * scale;
  const h = 1.7 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Outer edge */}
      <rect x={-w/2} y={-h/2} width={w} height={h} rx={w * 0.15} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Inner tub */}
      <rect x={-w/2 + 4} y={-h/2 + 4} width={w - 8} height={h - 8} rx={w * 0.1} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
    </g>
  );
}

// Shower (0.9m x 0.9m)
export function Shower({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const size = 0.9 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      {/* Enclosure */}
      <rect x={-size/2} y={-size/2} width={size} height={size} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
      {/* Drain */}
      <circle cx={0} cy={0} r={size * 0.08} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.7} />
      {/* Tile indication - diagonal lines */}
      <line x1={-size/2 + 3} y1={-size/2 + 3} x2={-size/4} y2={-size/4} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.3} opacity="0.5" />
      <line x1={size/4} y1={size/4} x2={size/2 - 3} y2={size/2 - 3} stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH * 0.3} opacity="0.5" />
    </g>
  );
}

// ============================================
// OFFICE FURNITURE
// ============================================

// Desk (1.4m x 0.7m)
export function Desk({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const w = 1.4 * SCALE * scale;
  const h = 0.7 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <rect x={-w/2} y={-h/2} width={w} height={h} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// Office Chair (shown from above as circle)
export function OfficeChair({ x, y, rotation = 0, scale = 1 }: FurnitureProps) {
  const size = 0.5 * SCALE * scale;
  const cx = x * SCALE;
  const cy = y * SCALE;

  return (
    <g transform={`translate(${cx}, ${cy}) rotate(${rotation})`}>
      <circle cx={0} cy={0} r={size/2} fill="none" stroke={FURNITURE_STROKE} strokeWidth={FURNITURE_STROKE_WIDTH} />
    </g>
  );
}

// ============================================
// HELPER: Get default furniture for room type
// ============================================
export function getRoomFurniture(roomType: string, center: { x: number; y: number }, areaM2: number) {
  const furniture: React.ReactNode[] = [];
  const { x, y } = center;

  switch (roomType.toLowerCase()) {
    case 'living room':
    case 'stue':
      furniture.push(<LSofa key="sofa" x={x - 1} y={y + 0.5} rotation={0} />);
      furniture.push(<CoffeeTable key="table" x={x - 1} y={y - 0.5} />);
      if (areaM2 > 20) {
        furniture.push(<Armchair key="chair" x={x + 1.5} y={y} rotation={-90} />);
      }
      break;

    case 'kitchen':
    case 'køkken':
      furniture.push(<KitchenSink key="sink" x={x - 1} y={y - 1} />);
      furniture.push(<Stove key="stove" x={x} y={y - 1} />);
      furniture.push(<Refrigerator key="fridge" x={x + 1.2} y={y - 1} />);
      break;

    case 'bedroom':
    case 'soveværelse':
    case 'soveværelse 1':
    case 'soveværelse 2':
    case 'master bedroom':
    case 'master soveværelse':
      furniture.push(<DoubleBed key="bed" x={x} y={y} rotation={0} />);
      furniture.push(<BedsideTable key="nightstand1" x={x - 1.2} y={y - 0.6} />);
      furniture.push(<BedsideTable key="nightstand2" x={x + 1.2} y={y - 0.6} />);
      break;

    case 'bathroom':
    case 'badeværelse':
    case 'bad':
      furniture.push(<Toilet key="toilet" x={x - 0.8} y={y + 0.5} rotation={0} />);
      furniture.push(<BathroomSink key="sink" x={x + 0.5} y={y - 0.8} rotation={0} />);
      if (areaM2 > 5) {
        furniture.push(<Bathtub key="tub" x={x + 0.5} y={y + 0.3} rotation={0} />);
      } else {
        furniture.push(<Shower key="shower" x={x + 0.5} y={y + 0.3} />);
      }
      break;

    case 'office':
    case 'kontor':
    case 'hjemmekontor':
      furniture.push(<Desk key="desk" x={x} y={y - 0.5} />);
      furniture.push(<OfficeChair key="chair" x={x} y={y + 0.3} />);
      break;

    case 'dining room':
    case 'spisestue':
      furniture.push(<DiningSet key="dining" x={x} y={y} chairs={6} />);
      break;
  }

  return furniture;
}
