/**
 * Blueprint Validator - Enforcing Validation Pipeline
 *
 * This validator makes validation enforce fixes instead of just warning.
 * Replaces passive validation with active enforcement using severity levels:
 * - Blocker: Cannot proceed (off-grid coordinates, broken loops, invalid references)
 * - Critical: Major issue (dangling walls, missing elements)
 * - Warning: Should fix but non-fatal (short walls, unusual dimensions)
 *
 * Enforcement mechanism:
 * - If validation fails with blockers → REJECT blueprint
 * - Return error to chat API
 * - API tells AI to regenerate with error context
 * - Prevents broken blueprints from reaching user
 */

import type { BlueprintData, WallSegment, Opening, Point } from '@/schemas/blueprint.schema';

// =====================================================
// Types
// =====================================================

export type ValidationSeverity = 'blocker' | 'critical' | 'warning';

export interface ValidationIssue {
  id: string;           // e.g., 'GEO-001'
  name: string;         // Human-readable rule name
  severity: ValidationSeverity;
  elementId?: string;   // Wall ID, opening ID, etc.
  elementType?: 'wall' | 'opening' | 'room' | 'general';
  message: string;      // Detailed error message
  location?: Point;     // Where the issue occurred
}

export interface ValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
  blockers: number;
  critical: number;
  warnings: number;
  summary: string;
}

export interface ValidationOptions {
  rejectOnBlocker: boolean;   // Throw error if blockers found (default: true)
  rejectOnCritical: boolean;  // Throw error if critical found (default: false)
  checkDangling: boolean;     // Check for dangling endpoints (default: true)
  checkGrid: boolean;         // Check grid alignment (default: true)
  checkLoops: boolean;        // Check exterior loop closure (default: true)
  checkReferences: boolean;   // Check opening references (default: true)
  checkAreas: boolean;        // Check room areas are sensible (default: true)
  targetArea?: number;        // Target total area for area validation
}

const DEFAULT_OPTIONS: ValidationOptions = {
  rejectOnBlocker: true,
  rejectOnCritical: false,
  checkDangling: true,
  checkGrid: true,
  checkLoops: true,
  checkReferences: true,
  checkAreas: true,
  targetArea: undefined,
};

// =====================================================
// Helper Functions
// =====================================================

function pointsEqual(p1: Point, p2: Point, tolerance: number = 0.001): boolean {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function pointKey(p: Point, decimals: number = 3): string {
  return `${p.x.toFixed(decimals)},${p.y.toFixed(decimals)}`;
}

function isOnGrid(value: number, gridSize: number = 0.1, tolerance: number = 0.001): boolean {
  const rounded = Math.round(value / gridSize) * gridSize;
  return Math.abs(value - rounded) < tolerance;
}

function hasCorrectPrecision(value: number, expectedDecimals: number = 1): boolean {
  const str = value.toString();
  if (!str.includes('.')) {
    // No decimal point - check if it's a whole number that should be formatted with decimal
    return value === Math.floor(value);
  }
  const decimals = str.split('.')[1].length;
  return decimals <= expectedDecimals;
}

// =====================================================
// Validation Rules
// =====================================================

/**
 * GEO-001: All coordinates must be on 0.1m grid
 */
function validateGridAlignment(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach(sheet => {
    sheet.elements.walls.forEach(wall => {
      const points = [
        { point: wall.start, label: 'start' },
        { point: wall.end, label: 'end' },
      ];

      points.forEach(({ point, label }) => {
        if (!isOnGrid(point.x) || !isOnGrid(point.y)) {
          issues.push({
            id: 'GEO-001',
            name: 'Grid Alignment',
            severity: 'blocker',
            elementId: wall.id,
            elementType: 'wall',
            location: point,
            message: `Wall ${wall.id} ${label} point (${point.x}, ${point.y}) is not on 0.1m grid`,
          });
        }

        // Check precision (should have exactly 1 decimal place)
        if (!hasCorrectPrecision(point.x) || !hasCorrectPrecision(point.y)) {
          issues.push({
            id: 'GEO-001',
            name: 'Coordinate Precision',
            severity: 'blocker',
            elementId: wall.id,
            elementType: 'wall',
            location: point,
            message: `Wall ${wall.id} ${label} point has incorrect precision (use exactly 1 decimal place)`,
          });
        }
      });
    });
  });

  return issues;
}

/**
 * GEO-002: Exterior walls must form closed loop
 */
function validateExteriorLoopClosure(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach((sheet, sheetIndex) => {
    const exteriorWalls = sheet.elements.walls.filter(w => w.isExternal);

    if (exteriorWalls.length === 0) {
      // No exterior walls - warning but not blocker
      issues.push({
        id: 'GEO-002',
        name: 'Exterior Loop',
        severity: 'warning',
        elementType: 'general',
        message: `Sheet ${sheetIndex + 1} has no exterior walls marked`,
      });
      return;
    }

    if (exteriorWalls.length < 3) {
      issues.push({
        id: 'GEO-002',
        name: 'Exterior Loop',
        severity: 'blocker',
        elementType: 'general',
        message: `Sheet ${sheetIndex + 1} has only ${exteriorWalls.length} exterior walls (minimum 3 required for closed loop)`,
      });
      return;
    }

    // Check if first and last walls connect
    const firstWall = exteriorWalls[0];
    const lastWall = exteriorWalls[exteriorWalls.length - 1];

    if (!pointsEqual(lastWall.end, firstWall.start, 0.05)) {
      const gap = distance(lastWall.end, firstWall.start);
      issues.push({
        id: 'GEO-002',
        name: 'Exterior Loop',
        severity: 'blocker',
        elementId: lastWall.id,
        elementType: 'wall',
        location: lastWall.end,
        message: `Exterior loop not closed: ${gap.toFixed(3)}m gap between last wall ${lastWall.id} and first wall ${firstWall.id}`,
      });
    }

    // Check if all exterior walls chain together
    for (let i = 0; i < exteriorWalls.length - 1; i++) {
      const current = exteriorWalls[i];
      const next = exteriorWalls[i + 1];

      if (!pointsEqual(current.end, next.start, 0.05)) {
        const gap = distance(current.end, next.start);
        issues.push({
          id: 'GEO-002',
          name: 'Exterior Loop',
          severity: 'blocker',
          elementId: current.id,
          elementType: 'wall',
          location: current.end,
          message: `Exterior walls ${current.id} and ${next.id} not connected: ${gap.toFixed(3)}m gap`,
        });
      }
    }
  });

  return issues;
}

/**
 * GEO-003: No dangling wall endpoints
 */
function validateNoDanglingEndpoints(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach((sheet, sheetIndex) => {
    const walls = sheet.elements.walls;

    // Build endpoint connection map
    const endpointMap = new Map<string, { point: Point; wallIds: string[] }>();

    walls.forEach(wall => {
      [wall.start, wall.end].forEach(point => {
        const key = pointKey(point, 1);
        if (!endpointMap.has(key)) {
          endpointMap.set(key, { point, wallIds: [] });
        }
        endpointMap.get(key)!.wallIds.push(wall.id);
      });
    });

    // Find dangling endpoints (only 1 connection)
    endpointMap.forEach(({ point, wallIds }, key) => {
      if (wallIds.length === 1) {
        // This is a dangling endpoint
        const wallId = wallIds[0];
        const wall = walls.find(w => w.id === wallId);

        // Check if it's an endpoint of exterior wall (might be intentional edge)
        const isExteriorEndpoint = wall?.isExternal;

        issues.push({
          id: 'GEO-003',
          name: 'Dangling Endpoint',
          severity: isExteriorEndpoint ? 'warning' : 'critical',
          elementId: wallId,
          elementType: 'wall',
          location: point,
          message: `Wall ${wallId} has dangling endpoint at (${point.x}, ${point.y}) with only 1 connection`,
        });
      }
    });
  });

  return issues;
}

/**
 * GEO-004: All openings must reference valid walls
 */
function validateOpeningReferences(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach((sheet, sheetIndex) => {
    const walls = sheet.elements.walls;
    const wallIds = new Set(walls.map(w => w.id));
    const openings = sheet.elements.openings;

    openings.forEach(opening => {
      // Check if wallId exists
      if (!wallIds.has(opening.wallId)) {
        issues.push({
          id: 'GEO-004',
          name: 'Opening Reference',
          severity: 'blocker',
          elementId: opening.id,
          elementType: 'opening',
          message: `Opening ${opening.id} references non-existent wall ${opening.wallId}`,
        });
        return;
      }

      // Check if position is valid (within wall length)
      const wall = walls.find(w => w.id === opening.wallId)!;
      const wallLength = distance(wall.start, wall.end);

      if (opening.distFromStart < 0 || opening.distFromStart > wallLength) {
        issues.push({
          id: 'GEO-004',
          name: 'Opening Position',
          severity: 'critical',
          elementId: opening.id,
          elementType: 'opening',
          message: `Opening ${opening.id} position ${opening.distFromStart.toFixed(2)}m is outside wall ${opening.wallId} length ${wallLength.toFixed(2)}m`,
        });
      }

      // Check if opening width fits on wall
      if (opening.distFromStart + opening.width > wallLength) {
        issues.push({
          id: 'GEO-004',
          name: 'Opening Width',
          severity: 'warning',
          elementId: opening.id,
          elementType: 'opening',
          message: `Opening ${opening.id} extends beyond wall ${opening.wallId} (${opening.distFromStart + opening.width}m > ${wallLength.toFixed(2)}m)`,
        });
      }
    });
  });

  return issues;
}

/**
 * GEO-005: Walls must have minimum length
 */
function validateMinimumWallLength(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const MIN_LENGTH = 0.3; // 30cm

  blueprint.sheets.forEach(sheet => {
    sheet.elements.walls.forEach(wall => {
      const len = distance(wall.start, wall.end);

      if (len < MIN_LENGTH) {
        issues.push({
          id: 'GEO-005',
          name: 'Minimum Wall Length',
          severity: 'warning',
          elementId: wall.id,
          elementType: 'wall',
          message: `Wall ${wall.id} is too short: ${len.toFixed(3)}m (minimum ${MIN_LENGTH}m)`,
        });
      }
    });
  });

  return issues;
}

/**
 * GEO-006: Zero-length walls (degenerate)
 */
function validateNoDegenerateWalls(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach(sheet => {
    sheet.elements.walls.forEach(wall => {
      if (pointsEqual(wall.start, wall.end, 0.001)) {
        issues.push({
          id: 'GEO-006',
          name: 'Degenerate Wall',
          severity: 'blocker',
          elementId: wall.id,
          elementType: 'wall',
          location: wall.start,
          message: `Wall ${wall.id} has zero length (start equals end at ${wall.start.x}, ${wall.start.y})`,
        });
      }
    });
  });

  return issues;
}

/**
 * AREA-001: Total room area must be reasonable relative to target
 */
function validateTotalArea(blueprint: BlueprintData, targetArea?: number): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  blueprint.sheets.forEach((sheet, sheetIndex) => {
    const rooms = sheet.elements.rooms;
    if (rooms.length === 0) {
      issues.push({
        id: 'AREA-001',
        name: 'No Rooms',
        severity: 'blocker',
        elementType: 'general',
        message: `Sheet ${sheetIndex + 1} has no rooms defined`,
      });
      return;
    }

    const totalRoomArea = rooms.reduce((sum, r) => sum + (r.area?.value || 0), 0);

    // Check against target area if provided
    if (targetArea && targetArea > 0) {
      const minAcceptable = targetArea * 0.6; // 60% of target is minimum
      const maxAcceptable = targetArea * 1.2; // 120% of target is maximum

      if (totalRoomArea < minAcceptable) {
        issues.push({
          id: 'AREA-001',
          name: 'Total Area Too Small',
          severity: 'blocker',
          elementType: 'general',
          message: `Total room area (${totalRoomArea.toFixed(1)}m²) is less than 60% of target (${targetArea}m²). Minimum acceptable: ${minAcceptable.toFixed(1)}m²`,
        });
      }

      if (totalRoomArea > maxAcceptable) {
        issues.push({
          id: 'AREA-001',
          name: 'Total Area Too Large',
          severity: 'warning',
          elementType: 'general',
          message: `Total room area (${totalRoomArea.toFixed(1)}m²) exceeds 120% of target (${targetArea}m²)`,
        });
      }
    }

    // Absolute minimum - no house should have less than 20m² total
    if (totalRoomArea < 20) {
      issues.push({
        id: 'AREA-001',
        name: 'Total Area Critically Small',
        severity: 'blocker',
        elementType: 'general',
        message: `Total room area (${totalRoomArea.toFixed(1)}m²) is unrealistically small. Minimum is 20m²`,
      });
    }
  });

  return issues;
}

/**
 * AREA-002: Individual room sizes must be sensible
 */
function validateRoomSizes(blueprint: BlueprintData): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  // Minimum room sizes by type (BR18 compliance)
  const minSizes: Record<string, number> = {
    'Living Room': 10,
    'Bedroom': 6,
    'Kitchen': 4,
    'Bathroom': 3,
    'Hallway': 2,
    'Entry': 2,
    'Office': 5,
    'Storage': 1,
    'Utility': 2,
    'Balcony': 2,
    'Dining Room': 6,
    'Other': 2,
  };

  blueprint.sheets.forEach(sheet => {
    sheet.elements.rooms.forEach(room => {
      const area = room.area?.value || 0;
      const roomType = room.type || 'Other';
      const minSize = minSizes[roomType] || 2;

      if (area < minSize) {
        issues.push({
          id: 'AREA-002',
          name: 'Room Too Small',
          severity: 'blocker',
          elementId: room.id,
          elementType: 'room',
          message: `${room.label} (${roomType}) is only ${area.toFixed(1)}m², minimum for this type is ${minSize}m²`,
        });
      }

      // Maximum sensible room size (no single room should be > 100m² except open plan)
      if (area > 100 && !room.label.toLowerCase().includes('open') && !room.label.toLowerCase().includes('+')) {
        issues.push({
          id: 'AREA-002',
          name: 'Room Unusually Large',
          severity: 'warning',
          elementId: room.id,
          elementType: 'room',
          message: `${room.label} is ${area.toFixed(1)}m² which is unusually large for a single room`,
        });
      }
    });
  });

  return issues;
}

// =====================================================
// Main Validator
// =====================================================

export function validateAndEnforce(
  blueprint: BlueprintData,
  options: Partial<ValidationOptions> = {}
): ValidationResult {
  const opts: ValidationOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const allIssues: ValidationIssue[] = [];

  // Run all validation rules
  if (opts.checkGrid) {
    allIssues.push(...validateGridAlignment(blueprint));
  }

  if (opts.checkLoops) {
    allIssues.push(...validateExteriorLoopClosure(blueprint));
  }

  if (opts.checkDangling) {
    allIssues.push(...validateNoDanglingEndpoints(blueprint));
  }

  if (opts.checkReferences) {
    allIssues.push(...validateOpeningReferences(blueprint));
  }

  // Always check for degenerate walls and minimum length
  allIssues.push(...validateNoDegenerateWalls(blueprint));
  allIssues.push(...validateMinimumWallLength(blueprint));

  // Area validation (critical for preventing tiny room issues)
  if (opts.checkAreas) {
    allIssues.push(...validateTotalArea(blueprint, opts.targetArea));
    allIssues.push(...validateRoomSizes(blueprint));
  }

  // Count by severity
  const blockerCount = allIssues.filter(i => i.severity === 'blocker').length;
  const criticalCount = allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = allIssues.filter(i => i.severity === 'warning').length;

  // Determine if valid
  const valid = blockerCount === 0 && (opts.rejectOnCritical ? criticalCount === 0 : true);

  // Build summary
  let summary = '';
  if (valid) {
    summary = `✓ Validation passed`;
    if (warningCount > 0) {
      summary += ` with ${warningCount} warnings`;
    }
  } else {
    const parts: string[] = [];
    if (blockerCount > 0) parts.push(`${blockerCount} blockers`);
    if (criticalCount > 0 && opts.rejectOnCritical) parts.push(`${criticalCount} critical`);
    summary = `✗ Validation failed: ${parts.join(', ')}`;
  }

  const result: ValidationResult = {
    valid,
    issues: allIssues,
    blockers: blockerCount,
    critical: criticalCount,
    warnings: warningCount,
    summary,
  };

  // Enforce: throw error if validation failed
  if (!valid && (opts.rejectOnBlocker || opts.rejectOnCritical)) {
    const errorMessage = [
      `Blueprint validation failed: ${result.summary}`,
      '',
      'Issues:',
      ...allIssues
        .filter(i => i.severity === 'blocker' || (opts.rejectOnCritical && i.severity === 'critical'))
        .slice(0, 10) // Limit to first 10 issues
        .map(i => `  [${i.id}] ${i.message}`),
    ].join('\n');

    throw new Error(errorMessage);
  }

  return result;
}

/**
 * Non-throwing version for reporting only (use getValidationReport for display)
 * NOTE: For enforcement, use validateAndEnforce directly
 */
export function validateBlueprint(
  blueprint: BlueprintData,
  options: Partial<ValidationOptions> = {}
): ValidationResult {
  // This version is for reporting ONLY - does not throw
  // Use validateAndEnforce with rejectOnBlocker: true for actual enforcement
  return validateAndEnforce(blueprint, {
    rejectOnBlocker: false,
    rejectOnCritical: false,
    ...options, // Allow caller to override if they want
  });
}

/**
 * Get human-readable validation report
 */
export function getValidationReport(result: ValidationResult): string {
  const lines: string[] = [
    '═'.repeat(60),
    'BLUEPRINT VALIDATION REPORT',
    '═'.repeat(60),
    '',
    `Status: ${result.valid ? '✓ PASSED' : '✗ FAILED'}`,
    `Blockers: ${result.blockers}`,
    `Critical: ${result.critical}`,
    `Warnings: ${result.warnings}`,
    '',
  ];

  if (result.issues.length > 0) {
    lines.push('Issues by Severity:');
    lines.push('');

    // Group by severity
    const grouped = {
      blocker: result.issues.filter(i => i.severity === 'blocker'),
      critical: result.issues.filter(i => i.severity === 'critical'),
      warning: result.issues.filter(i => i.severity === 'warning'),
    };

    if (grouped.blocker.length > 0) {
      lines.push('🚫 BLOCKERS:');
      grouped.blocker.forEach(issue => {
        lines.push(`  [${issue.id}] ${issue.message}`);
      });
      lines.push('');
    }

    if (grouped.critical.length > 0) {
      lines.push('⚠️  CRITICAL:');
      grouped.critical.forEach(issue => {
        lines.push(`  [${issue.id}] ${issue.message}`);
      });
      lines.push('');
    }

    if (grouped.warning.length > 0) {
      lines.push('ℹ️  WARNINGS:');
      grouped.warning.slice(0, 5).forEach(issue => {
        lines.push(`  [${issue.id}] ${issue.message}`);
      });
      if (grouped.warning.length > 5) {
        lines.push(`  ... and ${grouped.warning.length - 5} more warnings`);
      }
      lines.push('');
    }
  } else {
    lines.push('✓ No issues found');
    lines.push('');
  }

  lines.push('═'.repeat(60));

  return lines.join('\n');
}
