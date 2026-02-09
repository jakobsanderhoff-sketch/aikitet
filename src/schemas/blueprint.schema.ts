import { z } from 'zod';

// =====================================================
// AutoCAD Layer Standards (AIA Convention)
// =====================================================
export const AutoCADLayerSchema = z.enum([
  'A-WALL',      // Wall centerlines and fills
  'A-DOOR',      // Door symbols and swings
  'A-WIND',      // Window symbols
  'A-ANNO',      // Annotations, dimensions, room labels
  'A-FURN',      // Furniture and fixtures
  'A-GRID',      // Column grids
  'A-AREA',      // Area calculations
  'A-DETL',      // Detail references
]);

export type AutoCADLayer = z.infer<typeof AutoCADLayerSchema>;

// =====================================================
// Core Geometric Primitives
// =====================================================
export const PointSchema = z.object({
  x: z.number().describe('X coordinate in meters'),
  y: z.number().describe('Y coordinate in meters'),
});

export type Point = z.infer<typeof PointSchema>;

// =====================================================
// Wall System (Enhanced with AutoCAD Layers)
// =====================================================
export const WallTypeSchema = z.enum([
  'EXTERIOR_INSULATED',    // 400-500mm: Outer envelope with insulation
  'INTERIOR_PARTITION',    // 100-200mm: Non-load bearing dividers
  'LOAD_BEARING',          // 300-400mm: Interior structural walls
  'FIRE_RATED',            // Fire-resistance walls
]);

export const WallMaterialSchema = z.enum([
  'brick',
  'concrete',
  'insulation',
  'gasbeton',
  'timber',
  'vapor-barrier',
  'gypsum-board',
  'CLT',                   // Cross-Laminated Timber
  'steel-stud',
]);

export const WallSegmentSchema = z.object({
  id: z.string().describe('Unique wall identifier (e.g., w1, w2)'),
  start: PointSchema,
  end: PointSchema,
  thickness: z.number().min(0.1).max(1.0).describe('Wall thickness in meters (0.1m - 1.0m)'),
  type: WallTypeSchema,
  material: WallMaterialSchema,
  layer: z.literal('A-WALL'),
  materials: z.array(WallMaterialSchema).optional().describe('Multi-layer wall stack (outside to inside)'),
  isExternal: z.boolean().describe('Exterior vs interior wall'),
  fireRating: z.number().optional().describe('Fire resistance in minutes (60, 90, 120)'),
});

export type WallSegment = z.infer<typeof WallSegmentSchema>;

// =====================================================
// Openings (Doors & Windows) with AutoCAD Tags
// =====================================================
export const OpeningTypeSchema = z.enum([
  'door',
  'window',
  'sliding-door',
  'french-door',
  'pocket-door',
  'double-door',
]);

export const DoorSwingSchema = z.enum(['left', 'right', 'none']);

export const SwingDirectionSchema = z.enum(['inward', 'outward']);

export const OpeningSchema = z.object({
  id: z.string().describe('Unique identifier (e.g., d1, win1)'),
  wallId: z.string().describe('Reference to parent wall ID'),
  type: OpeningTypeSchema,
  width: z.number().min(0.6).max(3.0).describe('Width in meters (0.6m - 3.0m)'),
  height: z.number().min(1.8).max(3.5).default(2.1).describe('Height in meters'),
  distFromStart: z.number().describe('Distance from wall.start point in meters'),
  tag: z.string().describe('AutoCAD tag for scheduling (e.g., D1, W3)'),
  layer: z.enum(['A-DOOR', 'A-WIND']),
  swing: DoorSwingSchema.optional().describe('Door swing direction (left/right)'),
  swingDirection: SwingDirectionSchema.optional().describe('Door swings INTO or OUT OF the room it serves'),
  thresholdHeight: z.number().min(0).max(0.05).optional().describe('Threshold height in meters (max 0.025m for accessibility)'),
  sillHeight: z.number().min(0).max(1.2).optional().describe('Window sill height from floor'),
  glazingType: z.string().optional().describe('Window glazing specification'),
});

export type Opening = z.infer<typeof OpeningSchema>;

// =====================================================
// Room Definition with Compliance Metadata
// =====================================================
export const RoomTypeSchema = z.enum([
  'Living Room',
  'Bedroom',
  'Kitchen',
  'Bathroom',
  'Hallway',
  'Office',
  'Storage',
  'Utility',
  'Balcony',
  'Dining Room',
  'Entry',
  'Other',
]);

export const FlooringTypeSchema = z.enum([
  'oak-parquet',
  'tiles',
  'carpet',
  'concrete',
  'vinyl',
  'laminate',
  'stone',
]);

export const RoomZoneSchema = z.object({
  id: z.string(),
  label: z.string().describe('Custom room name (e.g., "Master Bedroom")'),
  type: RoomTypeSchema.optional(),
  area: z.object({
    value: z.number().positive(),
    unit: z.literal('m²'),
  }),
  flooring: FlooringTypeSchema,
  center: PointSchema.describe('Label placement coordinate'),
  polygon: z.array(PointSchema).optional().describe('Room boundary polygon'),
  ceilingHeight: z.number().min(2.3).max(4.0).optional().describe('Height in meters'),
  naturalLightArea: z.number().optional().describe('Window area in m²'),
  compliant: z.boolean().default(true),
});

export type RoomZone = z.infer<typeof RoomZoneSchema>;

// =====================================================
// Dimension Annotations (AutoCAD-style)
// =====================================================
export const DimensionSchema = z.object({
  id: z.string(),
  start: PointSchema,
  end: PointSchema,
  value: z.number().describe('Measured distance in meters'),
  offset: z.number().describe('Distance from element being dimensioned'),
  label: z.string().optional(),
  layer: z.literal('A-ANNO'),
});

export type Dimension = z.infer<typeof DimensionSchema>;

// =====================================================
// Furniture System (A-FURN Layer)
// =====================================================
export const FurnitureTypeSchema = z.enum([
  // Living Room
  'sofa-3seat',
  'sofa-lshape',
  'armchair',
  'coffee-table',

  // Dining
  'dining-set',

  // Bedroom
  'double-bed',
  'single-bed',
  'wardrobe',
  'bedside-table',

  // Kitchen
  'stove',
  'kitchen-sink',
  'refrigerator',
  'kitchen-counter',

  // Bathroom
  'toilet',
  'bathroom-sink',
  'bathtub',
  'shower',

  // Office
  'desk',
  'office-chair',
]);

export const FurnitureItemSchema = z.object({
  id: z.string().describe('Unique furniture identifier (e.g., furn1, furn2)'),
  type: FurnitureTypeSchema,
  roomId: z.string().describe('Reference to parent room ID'),
  position: PointSchema.describe('Center position in meters'),
  rotation: z.number().min(0).max(360).default(0).describe('Rotation in degrees'),
  scale: z.number().min(0.5).max(2.0).default(1.0).optional().describe('Scale multiplier'),
  layer: z.literal('A-FURN'),
  metadata: z.object({
    autoGenerated: z.boolean().default(false),
    locked: z.boolean().default(false),
  }).optional(),
});

export type FurnitureType = z.infer<typeof FurnitureTypeSchema>;
export type FurnitureItem = z.infer<typeof FurnitureItemSchema>;

// =====================================================
// Sheet/Drawing Definition (Multi-Page Support)
// =====================================================
export const SheetTypeSchema = z.enum([
  'FLOOR_PLAN',
  'ELEVATION',
  'SECTION',
  'DETAIL',
  'DOOR_SCHEDULE',
  'WINDOW_SCHEDULE',
  'AREA_SCHEDULE',
]);

export const SheetSchema = z.object({
  title: z.string().describe('Sheet title (e.g., "Ground Floor Plan")'),
  number: z.string().describe('Sheet number (e.g., A-101)'),
  type: SheetTypeSchema,
  scale: z.string().default('1:50').describe('Drawing scale'),
  elements: z.object({
    walls: z.array(WallSegmentSchema),
    openings: z.array(OpeningSchema),
    rooms: z.array(RoomZoneSchema),
    dimensions: z.array(DimensionSchema).optional(),
    furniture: z.array(FurnitureItemSchema).default([]),
  }),
  metadata: z.object({
    totalArea: z.number().optional(),
    buildingHeight: z.number().optional(),
    floorLevel: z.string().optional().describe('e.g., "Ground Floor", "+3.0m"'),
    compliance: z.array(z.string()).default([]),
  }),
});

export type Sheet = z.infer<typeof SheetSchema>;

// =====================================================
// Complete Blueprint Project
// =====================================================
export const BlueprintDataSchema = z.object({
  projectName: z.string().default('Untitled Project'),
  projectNumber: z.string().optional(),
  architect: z.string().optional(),
  client: z.string().optional(),
  location: z.string().default('Hvidovre, Denmark'),
  buildingCode: z.string().default('BR18/BR23'),
  sheets: z.array(SheetSchema).min(1).describe('Collection of drawing sheets'),
  createdAt: z.string().datetime().optional(),
  updatedAt: z.string().datetime().optional(),
});

export type BlueprintData = z.infer<typeof BlueprintDataSchema>;

// =====================================================
// Compliance Validation System
// =====================================================
export const ComplianceIssueSchema = z.object({
  type: z.enum(['violation', 'warning', 'check']),
  code: z.string().optional().describe('Building code reference (e.g., BR18-5.1.1)'),
  message: z.string(),
  elementId: z.string().optional().describe('ID of violating element'),
  elementType: z.enum(['wall', 'opening', 'room', 'general']).optional(),
  severity: z.enum(['critical', 'major', 'minor']).default('major'),
});

export type ComplianceIssue = z.infer<typeof ComplianceIssueSchema>;

export const ComplianceReportSchema = z.object({
  passing: z.boolean(),
  violations: z.array(ComplianceIssueSchema),
  warnings: z.array(ComplianceIssueSchema),
  checks: z.array(ComplianceIssueSchema),
  summary: z.object({
    totalViolations: z.number(),
    totalWarnings: z.number(),
    totalChecks: z.number(),
  }),
  egressAnalysis: z.object({
    passed: z.boolean(),
    maxDistanceToExit: z.number().describe('Maximum distance from any room to nearest door (meters)'),
    criticalRooms: z.array(z.string()).describe('Room IDs exceeding egress distance limit'),
  }).optional(),
});

export type ComplianceReport = z.infer<typeof ComplianceReportSchema>;

// =====================================================
// Door & Window Schedules (AutoCAD Tables)
// =====================================================
export const DoorScheduleEntrySchema = z.object({
  tag: z.string(),
  width: z.number(),
  height: z.number(),
  material: z.string(),
  fireRating: z.number().optional(),
  hardware: z.string().optional(),
  quantity: z.number().default(1),
});

export const WindowScheduleEntrySchema = z.object({
  tag: z.string(),
  width: z.number(),
  height: z.number(),
  sillHeight: z.number(),
  glazing: z.string(),
  uValue: z.number().optional().describe('Thermal transmittance (W/m²K)'),
  quantity: z.number().default(1),
});

export type DoorScheduleEntry = z.infer<typeof DoorScheduleEntrySchema>;
export type WindowScheduleEntry = z.infer<typeof WindowScheduleEntrySchema>;

// =====================================================
// AI Response Schema (Gemini Output Format)
// =====================================================
export const AIArchitectResponseSchema = z.object({
  message: z.string().describe('Human-friendly explanation of the design'),
  blueprint: BlueprintDataSchema,
  compliance: ComplianceReportSchema.optional(),
});

export type AIArchitectResponse = z.infer<typeof AIArchitectResponseSchema>;

// =====================================================
// Helper Validation Functions
// =====================================================

/**
 * Validate that all opening references point to existing walls
 */
export function validateOpeningReferences(
  walls: WallSegment[],
  openings: Opening[]
): { valid: boolean; errors: string[] } {
  const wallIds = new Set(walls.map(w => w.id));
  const errors: string[] = [];

  for (const opening of openings) {
    if (!wallIds.has(opening.wallId)) {
      errors.push(`Opening ${opening.id} references non-existent wall ${opening.wallId}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validate wall connectivity (all walls should form closed loops)
 */
export function validateWallConnectivity(walls: WallSegment[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const endpoints = new Map<string, number>();

  // Count endpoint occurrences
  for (const wall of walls) {
    const startKey = `${wall.start.x.toFixed(3)},${wall.start.y.toFixed(3)}`;
    const endKey = `${wall.end.x.toFixed(3)},${wall.end.y.toFixed(3)}`;

    endpoints.set(startKey, (endpoints.get(startKey) || 0) + 1);
    endpoints.set(endKey, (endpoints.get(endKey) || 0) + 1);
  }

  // Check for dangling endpoints
  for (const [point, count] of endpoints.entries()) {
    if (count < 2) {
      issues.push(`Dangling wall endpoint at ${point} (only ${count} connection)`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Calculate polygon area using Shoelace formula
 */
export function calculatePolygonArea(polygon: Point[]): number {
  if (polygon.length < 3) return 0;

  let area = 0;
  for (let i = 0; i < polygon.length; i++) {
    const j = (i + 1) % polygon.length;
    area += polygon[i].x * polygon[j].y;
    area -= polygon[j].x * polygon[i].y;
  }
  return Math.abs(area / 2);
}

/**
 * Calculate wall length
 */
export function getWallLength(wall: WallSegment): number {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate distance between two points
 */
export function getDistance(p1: Point, p2: Point): number {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two points are equal within tolerance
 */
export function pointsEqual(p1: Point, p2: Point, tolerance = 0.001): boolean {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}
