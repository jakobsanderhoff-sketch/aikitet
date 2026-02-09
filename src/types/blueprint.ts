// Professional "Cut Plane" Blueprint Data Model
// Represents a building as it appears when sliced at 1 meter above floor level

export interface Point {
  x: number; // meters
  y: number; // meters
}

// Wall thickness standards (meters)
export type WallThickness = 0.5 | 0.4 | 0.35 | 0.15;

export type WallMaterial = 'brick' | 'concrete' | 'insulation' | 'gasbeton' | 'timber';

export type WallType = 'external' | 'bearing' | 'partition' | 'thin';

/**
 * Physical structure - the elements that are "cut" by the plane
 * Rendered with thick lines (0.5-0.7mm) and material hatching
 */
export interface Wall {
  id: string;
  start: Point;
  end: Point;
  thickness: WallThickness;
  material: WallMaterial;
  type: WallType;
}

export type OpeningType = 'door' | 'window' | 'sliding' | 'double-door';

export type DoorSwing = 'left' | 'right';

/**
 * Openings - holes in the structure
 * Doors rendered with swing arcs (0.13mm)
 * Windows rendered with 3-line symbol (0.13mm)
 */
export interface Opening {
  id: string;
  wallId: string;
  distFromStart: number; // meters from wall start point
  width: number; // meters
  type: OpeningType;
  swing?: DoorSwing; // Required for doors
  height?: number; // For windows (typically 1.5m)
}

export type FlooringType = 'oak-parquet' | 'tiles' | 'carpet' | 'concrete' | 'vinyl';

/**
 * Room zones - spaces enclosed by walls
 * Rendered with subtle flooring textures beneath the structure
 * Labels placed at center
 */
export interface RoomZone {
  id: string;
  label: string; // "Living Room", "Bedroom 1"
  area: {
    value: number; // 24.5
    unit: 'm²';
  };
  flooring: FlooringType;
  center: Point; // Label position
  polygon?: Point[]; // Optional boundary for flooring rendering
}

/**
 * Dimension annotations
 * Thin lines (0.13mm) with arrows and text
 */
export interface Dimension {
  id: string;
  start: Point;
  end: Point;
  value: number; // meters
  offset: number; // Distance from wall (meters)
  label?: string; // Optional custom label
}

/**
 * Complete blueprint following cut plane logic
 */
export interface Blueprint {
  walls: Wall[];
  openings: Opening[];
  rooms: RoomZone[];
  dimensions?: Dimension[];
  metadata: {
    totalArea: number;
    scale: string; // "1:50"
    cutHeight: number; // Always 1.0m for floor plans
    drawingNumber?: string;
    revision?: string;
    compliance: string[];
  };
}

// Material rendering properties for SVG
export const MaterialRenderProps = {
  brick: {
    hatchId: 'hatch-brick',
    hatchPattern: 'diagonal-45',
    color: '#d97706',
    cutLineWeight: 0.7, // mm equivalent
  },
  concrete: {
    hatchId: 'hatch-concrete',
    hatchPattern: 'cross-hatch',
    color: '#71717a',
    cutLineWeight: 0.7,
  },
  gasbeton: {
    hatchId: 'hatch-gasbeton',
    hatchPattern: 'horizontal-lines',
    color: '#e5e7eb',
    cutLineWeight: 0.5,
  },
  insulation: {
    hatchId: 'hatch-insulation',
    hatchPattern: 'wave',
    color: '#fbbf24',
    cutLineWeight: 0.35,
  },
  timber: {
    hatchId: 'hatch-timber',
    hatchPattern: 'wood-grain',
    color: '#92400e',
    cutLineWeight: 0.5,
  },
} as const;

// Line weight standards for architectural drawings
export const LineWeights = {
  cutWall: 0.7, // Thick - elements cut by the plane
  partition: 0.5, // Medium - internal partitions
  detail: 0.13, // Thin - doors, windows, dimensions
  grid: 0.05, // Very thin - background grid
} as const;

// Danish building standards
export const DanishStandards = {
  wallThickness: {
    external: 0.5, // 500mm - bearing + insulation
    bearing: 0.4, // 400mm - interior bearing
    partition: 0.35, // 350mm - non-bearing
    thin: 0.15, // 150mm - bathroom/closet
  },
  openings: {
    doorStandard: 0.9, // 900mm
    doorWide: 1.0, // 1000mm
    doorDouble: 1.8, // 1800mm
    windowSmall: 0.6, // 600mm
    windowStandard: 1.2, // 1200mm
    windowLarge: 2.4, // 2400mm
    windowHeight: 1.5, // Standard sill to top
  },
  minimums: {
    ceilingHeight: 2.3, // meters
    bedroomArea: 6, // m²
    livingRoomArea: 10, // m²
    doorWidth: 0.77, // meters (accessibility)
  },
} as const;

// Type guard
export function isBlueprint(obj: any): obj is Blueprint {
  return (
    obj &&
    typeof obj === 'object' &&
    Array.isArray(obj.walls) &&
    Array.isArray(obj.openings) &&
    Array.isArray(obj.rooms) &&
    obj.metadata &&
    typeof obj.metadata.totalArea === 'number'
  );
}
