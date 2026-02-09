/**
 * SVG-Enhanced Blueprint Schema
 *
 * This schema replaces coordinate-based blueprints with SVG path notation,
 * which naturally enforces wall connectivity and prevents dangling endpoints.
 *
 * Key Benefits:
 * - Closed loops guaranteed by construction (Z command)
 * - Topology explicitly defined (divisions reference connections)
 * - No geometry processing needed (valid by design)
 * - Natural for GPT-4o to generate (SVG well-represented in training data)
 */

import { z } from 'zod';

// =====================================================
// SVG Path Validators
// =====================================================

/**
 * SVG closed path - must start with M and end with Z
 * Example: "M 0,0 L 12,0 L 12,10 L 0,10 Z"
 */
const SVGClosedPathSchema = z.string()
  .regex(/^M\s+[\d.,-\s]+(?:\s*[LHVCSQTA]\s+[\d.,-\s]+)*\s*Z\s*$/i, 'Must be a closed SVG path starting with M and ending with Z')
  .describe('SVG path that forms a closed loop (must end with Z command)');

/**
 * SVG path segment - must start with M but doesn't need to close
 * Example: "M 5,0 L 5,10"
 */
const SVGSegmentSchema = z.string()
  .regex(/^M\s+[\d.,-\s]+(?:\s*[LHVCSQTA]\s+[\d.,-\s]+)*$/i, 'Must be a valid SVG path segment starting with M')
  .describe('SVG path segment (wall division)');

// =====================================================
// Core Blueprint Types
// =====================================================

/**
 * Exterior boundary of the building
 * Must be a closed loop defining the outer envelope
 */
export const ExteriorBoundarySchema = z.object({
  path: SVGClosedPathSchema,
  thickness: z.number()
    .min(0.3, 'Exterior walls must be at least 0.3m thick')
    .max(0.6, 'Exterior walls cannot exceed 0.6m thick')
    .describe('Wall thickness in meters'),
  material: z.enum(['brick', 'concrete', 'CLT', 'gasbeton', 'timber'])
    .describe('Primary exterior wall material'),
  insulated: z.boolean()
    .default(true)
    .describe('Whether wall includes insulation'),
});

export type ExteriorBoundary = z.infer<typeof ExteriorBoundarySchema>;

/**
 * Interior division (wall)
 * Must explicitly reference what it connects to
 */
export const InteriorDivisionSchema = z.object({
  id: z.string()
    .regex(/^div-[\w-]+$/, 'Division ID must start with "div-"')
    .describe('Unique identifier for this division'),
  path: SVGSegmentSchema
    .describe('SVG path defining the wall segment'),
  thickness: z.number()
    .min(0.08, 'Interior walls must be at least 0.08m thick')
    .max(0.25, 'Interior walls cannot exceed 0.25m thick')
    .describe('Wall thickness in meters'),
  material: z.enum(['gypsum-board', 'brick', 'concrete', 'timber', 'CLT'])
    .default('gypsum-board')
    .describe('Interior wall material'),
  connects: z.array(z.string())
    .min(2, 'Each division must connect to at least 2 points (start and end)')
    .describe('References to connection points (e.g., ["exterior:north", "exterior:south"])'),
  structural: z.boolean()
    .default(false)
    .describe('Whether this is a load-bearing wall'),
});

export type InteriorDivision = z.infer<typeof InteriorDivisionSchema>;

/**
 * Room definition
 * Boundary derived from walls, must be closed
 */
export const RoomSchema = z.object({
  id: z.string()
    .regex(/^room-[\w-]+$/, 'Room ID must start with "room-"')
    .describe('Unique identifier for this room'),
  name: z.string()
    .min(1, 'Room must have a name')
    .describe('Human-readable room name (e.g., "Living Room")'),
  type: z.enum([
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
    'Other'
  ]).describe('Standard room type for compliance checking'),
  boundary: SVGClosedPathSchema
    .describe('SVG path defining the room perimeter (must be closed)'),
  area: z.number()
    .positive('Room area must be positive')
    .max(200, 'Single room cannot exceed 200m²')
    .describe('Room area in square meters'),
  ceilingHeight: z.number()
    .min(2.3, 'Minimum ceiling height is 2.3m for houses (BR18)')
    .max(4.0, 'Ceiling height cannot exceed 4.0m')
    .optional()
    .describe('Ceiling height in meters (defaults to 2.5m)'),
  features: z.array(z.string())
    .describe('References to openings and features in this room (e.g., ["door:d1", "window:w1"])'),
  flooring: z.enum(['oak-parquet', 'tiles', 'carpet', 'concrete', 'vinyl', 'laminate'])
    .optional()
    .describe('Flooring material'),
});

export type Room = z.infer<typeof RoomSchema>;

/**
 * Opening (door or window)
 * Placed parametrically on a path (position 0-1)
 */
export const OpeningSchema = z.object({
  id: z.string()
    .regex(/^(door|window|d|w)-[\w-]+$/, 'Opening ID must start with "door-", "window-", "d-", or "w-"')
    .describe('Unique identifier for this opening'),
  type: z.enum([
    'door',
    'window',
    'sliding-door',
    'french-door',
    'pocket-door',
    'double-door'
  ]).describe('Type of opening'),
  onPath: z.string()
    .describe('Reference to path this opening is on (e.g., "exterior", "div-1")'),
  atPosition: z.number()
    .min(0, 'Position must be between 0 and 1')
    .max(1, 'Position must be between 0 and 1')
    .describe('Parametric position along the path (0=start, 1=end)'),
  width: z.number()
    .min(0.6, 'Minimum opening width is 0.6m')
    .max(3.0, 'Maximum opening width is 3.0m')
    .describe('Opening width in meters'),
  height: z.number()
    .min(1.8, 'Minimum opening height is 1.8m')
    .max(3.5, 'Maximum opening height is 3.5m')
    .optional()
    .describe('Opening height in meters (defaults by type)'),
  swing: z.enum(['left', 'right', 'none'])
    .optional()
    .describe('Door swing direction (for doors only)'),
  sillHeight: z.number()
    .min(0)
    .max(1.2)
    .optional()
    .describe('Window sill height from floor (for windows only)'),
});

export type Opening = z.infer<typeof OpeningSchema>;

// =====================================================
// Complete SVG Blueprint
// =====================================================

export const SVGBlueprintSchema = z.object({
  format: z.literal('svg-enhanced')
    .describe('Format identifier for SVG-enhanced blueprints'),

  metadata: z.object({
    projectName: z.string().default('Untitled Project'),
    projectNumber: z.string().optional(),
    architect: z.string().optional(),
    client: z.string().optional(),
    location: z.string().default('Hvidovre, Denmark'),
    buildingCode: z.literal('BR18/BR23'),
    totalArea: z.number().positive().describe('Total floor area in square meters'),
    buildingType: z.enum(['house', 'apartment', 'townhouse', 'villa'])
      .default('house')
      .describe('Type of building'),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
  }).describe('Project metadata and compliance information'),

  exterior: ExteriorBoundarySchema
    .describe('Exterior building boundary (must be closed loop)'),

  divisions: z.array(InteriorDivisionSchema)
    .describe('Interior wall divisions (must reference connection points)'),

  rooms: z.array(RoomSchema)
    .min(1, 'Blueprint must have at least one room')
    .describe('Room definitions with boundaries and metadata'),

  openings: z.array(OpeningSchema)
    .describe('Doors and windows placed parametrically on walls'),

  // Optional features for future expansion
  annotations: z.array(z.object({
    id: z.string(),
    type: z.enum(['dimension', 'label', 'note', 'arrow']),
    position: z.object({ x: z.number(), y: z.number() }),
    text: z.string().optional(),
  })).optional().describe('Annotations and dimensions'),

  compliance: z.object({
    validated: z.boolean().default(false),
    issues: z.array(z.string()).default([]),
    lastChecked: z.string().datetime().optional(),
  }).optional().describe('BR18/BR23 compliance validation results'),
});

export type SVGBlueprint = z.infer<typeof SVGBlueprintSchema>;

// =====================================================
// Validation Helpers
// =====================================================

/**
 * Validate that exterior path is actually closed
 */
export function validateExteriorClosed(exterior: ExteriorBoundary): boolean {
  return exterior.path.trim().toUpperCase().endsWith('Z');
}

/**
 * Validate that all divisions have valid connection references
 */
export function validateDivisionConnections(divisions: InteriorDivision[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  divisions.forEach(div => {
    if (div.connects.length < 2) {
      issues.push(`Division ${div.id} has only ${div.connects.length} connection(s), needs at least 2`);
    }

    // Check connection format (should be like "exterior:north" or "div-1:start")
    div.connects.forEach(conn => {
      if (!conn.includes(':')) {
        issues.push(`Division ${div.id} has invalid connection format: "${conn}" (should be "path:point")`);
      }
    });
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate that all room boundaries are closed
 */
export function validateRoomsClosed(rooms: Room[]): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  rooms.forEach(room => {
    if (!room.boundary.trim().toUpperCase().endsWith('Z')) {
      issues.push(`Room ${room.name} (${room.id}) has unclosed boundary (missing Z command)`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Validate that all openings reference valid paths
 */
export function validateOpeningReferences(
  openings: Opening[],
  validPaths: Set<string>
): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  openings.forEach(opening => {
    if (!validPaths.has(opening.onPath)) {
      issues.push(`Opening ${opening.id} references non-existent path: "${opening.onPath}"`);
    }

    if (opening.atPosition < 0 || opening.atPosition > 1) {
      issues.push(`Opening ${opening.id} has invalid position: ${opening.atPosition} (must be 0-1)`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Comprehensive validation for entire SVG blueprint
 */
export function validateSVGBlueprint(blueprint: SVGBlueprint): {
  valid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Check exterior is closed
  if (!validateExteriorClosed(blueprint.exterior)) {
    errors.push('Exterior boundary is not closed (missing Z command)');
  }

  // 2. Check division connections
  const divisionCheck = validateDivisionConnections(blueprint.divisions);
  if (!divisionCheck.valid) {
    errors.push(...divisionCheck.issues);
  }

  // 3. Check room boundaries are closed
  const roomsCheck = validateRoomsClosed(blueprint.rooms);
  if (!roomsCheck.valid) {
    errors.push(...roomsCheck.issues);
  }

  // 4. Check opening references
  const validPaths = new Set<string>(['exterior']);
  blueprint.divisions.forEach(div => validPaths.add(div.id));

  const openingsCheck = validateOpeningReferences(blueprint.openings, validPaths);
  if (!openingsCheck.valid) {
    errors.push(...openingsCheck.issues);
  }

  // 5. Check total area matches room areas
  const roomAreaSum = blueprint.rooms.reduce((sum, room) => sum + room.area, 0);
  const totalArea = blueprint.metadata.totalArea;

  if (Math.abs(roomAreaSum - totalArea) > totalArea * 0.15) {
    warnings.push(
      `Room areas sum to ${roomAreaSum.toFixed(1)}m² but total area is ${totalArea.toFixed(1)}m² (>15% difference)`
    );
  }

  // 6. Check minimum room count for building type
  const minRooms = blueprint.metadata.buildingType === 'house' ? 3 : 1;
  if (blueprint.rooms.length < minRooms) {
    warnings.push(`${blueprint.metadata.buildingType} should have at least ${minRooms} rooms`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// Types are exported inline above via z.infer
