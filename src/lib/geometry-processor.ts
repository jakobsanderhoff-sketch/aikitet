/**
 * Geometry Processor - Multi-stage blueprint geometry correction
 *
 * This processor replaces the weak 3-pass cleanup with aggressive 6-stage processing:
 * 1. Grid Snapping - Round all coordinates to 0.1m grid
 * 2. Angle Normalization - Snap near-90° walls to exact 90°
 * 3. Duplicate Merging - Merge nearby points to single grid point
 * 4. Iterative Dangling Correction - Up to 10 passes with adaptive tolerance
 * 5. Exterior Loop Closure - Force first/last wall connection
 * 6. Short Wall Elimination - Remove walls < 0.3m
 *
 * Key improvements:
 * - 6x tighter tolerance (0.05m vs 0.3m)
 * - 10 iterations vs 3
 * - Adaptive tolerance
 * - Early exit when converged
 * - Angle normalization for professional orthogonal layouts
 */

import type { BlueprintData, WallSegment, Point } from '@/schemas/blueprint.schema';

// =====================================================
// Configuration
// =====================================================

export interface GeometryProcessorConfig {
  gridSize: number;           // 0.1m - Danish standard grid
  snapTolerance: number;      // 0.05m - Half grid for aggressive snapping
  maxPasses: number;          // 10 - More iterations for complex geometries
  angleTolerance: number;     // 2 degrees - Snap near-90° walls to exact 90°
  enforceOrthogonal: boolean; // true - Force orthogonal walls where possible
  minimumWallLength: number;  // 0.3m - Remove walls shorter than this
  debugMode: boolean;         // true in dev - Enable debug logging
}

export const DEFAULT_CONFIG: GeometryProcessorConfig = {
  gridSize: 0.1,
  snapTolerance: 0.02,  // 2cm - tight tolerance for precision
  maxPasses: 10,
  angleTolerance: 2,
  enforceOrthogonal: true,
  minimumWallLength: 0.3,
  debugMode: false,
};

// =====================================================
// Reporting
// =====================================================

export interface GeometryIssue {
  stage: string;
  type: 'dangling' | 'off-grid' | 'short-wall' | 'open-loop' | 'duplicate';
  severity: 'fixed' | 'warning';
  wallId?: string;
  point?: Point;
  message: string;
}

export interface StageReport {
  stage: string;
  fixesApplied: number;
  issues: GeometryIssue[];
}

export interface GeometryReport {
  totalFixesApplied: number;
  stageReports: StageReport[];
  finalWallCount: number;
  convergedAfterPasses: number;
  warnings: string[];
}

// =====================================================
// Helper Functions
// =====================================================

function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

function toFixedDecimal(value: number, decimals: number = 1): number {
  return parseFloat(value.toFixed(decimals));
}

function pointsEqual(p1: Point, p2: Point, tolerance: number = 0.001): boolean {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

function angle(p1: Point, p2: Point): number {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

function normalizeAngle(angleRad: number): number {
  // Normalize to [0, 2π)
  let normalized = angleRad % (2 * Math.PI);
  if (normalized < 0) normalized += 2 * Math.PI;
  return normalized;
}

function pointKey(p: Point, decimals: number = 3): string {
  return `${p.x.toFixed(decimals)},${p.y.toFixed(decimals)}`;
}

// =====================================================
// Stage 1: Grid Snapping
// =====================================================

function stageGridSnapping(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  const issues: GeometryIssue[] = [];
  let fixCount = 0;

  const snapped = walls.map(wall => {
    const startSnapped = {
      x: toFixedDecimal(snapToGrid(wall.start.x, config.gridSize)),
      y: toFixedDecimal(snapToGrid(wall.start.y, config.gridSize)),
    };
    const endSnapped = {
      x: toFixedDecimal(snapToGrid(wall.end.x, config.gridSize)),
      y: toFixedDecimal(snapToGrid(wall.end.y, config.gridSize)),
    };

    if (!pointsEqual(startSnapped, wall.start) || !pointsEqual(endSnapped, wall.end)) {
      fixCount++;
      issues.push({
        stage: 'Grid Snapping',
        type: 'off-grid',
        severity: 'fixed',
        wallId: wall.id,
        message: `Snapped wall ${wall.id} to 0.1m grid`,
      });
    }

    return {
      ...wall,
      start: startSnapped,
      end: endSnapped,
    };
  });

  return {
    walls: snapped,
    report: {
      stage: 'Grid Snapping',
      fixesApplied: fixCount,
      issues,
    },
  };
}

// =====================================================
// Stage 2: Angle Normalization
// =====================================================

function stageAngleNormalization(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  if (!config.enforceOrthogonal) {
    return {
      walls,
      report: { stage: 'Angle Normalization', fixesApplied: 0, issues: [] },
    };
  }

  const issues: GeometryIssue[] = [];
  let fixCount = 0;
  const toleranceRad = (config.angleTolerance * Math.PI) / 180;

  const normalized = walls.map(wall => {
    const wallAngle = angle(wall.start, wall.end);
    const normalizedAngle = normalizeAngle(wallAngle);

    // Check if close to 0°, 90°, 180°, or 270°
    const targets = [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2];

    for (const target of targets) {
      const diff = Math.abs(normalizedAngle - target);
      if (diff < toleranceRad || Math.abs(diff - 2 * Math.PI) < toleranceRad) {
        // Wall is close to orthogonal - snap it
        const len = distance(wall.start, wall.end);
        let newEnd: Point;

        if (Math.abs(target) < 0.01 || Math.abs(target - Math.PI) < 0.01) {
          // Horizontal (0° or 180°)
          newEnd = {
            x: wall.start.x + (target < Math.PI / 2 || target > (3 * Math.PI) / 2 ? len : -len),
            y: wall.start.y,
          };
        } else {
          // Vertical (90° or 270°)
          newEnd = {
            x: wall.start.x,
            y: wall.start.y + (target < Math.PI ? len : -len),
          };
        }

        // Snap to grid
        newEnd = {
          x: toFixedDecimal(snapToGrid(newEnd.x, config.gridSize)),
          y: toFixedDecimal(snapToGrid(newEnd.y, config.gridSize)),
        };

        if (!pointsEqual(newEnd, wall.end)) {
          fixCount++;
          issues.push({
            stage: 'Angle Normalization',
            type: 'off-grid',
            severity: 'fixed',
            wallId: wall.id,
            message: `Normalized wall ${wall.id} to orthogonal (${Math.round((target * 180) / Math.PI)}°)`,
          });

          return { ...wall, end: newEnd };
        }

        break;
      }
    }

    return wall;
  });

  return {
    walls: normalized,
    report: {
      stage: 'Angle Normalization',
      fixesApplied: fixCount,
      issues,
    },
  };
}

// =====================================================
// Stage 3: Duplicate Merging
// =====================================================

function stageDuplicateMerging(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  const issues: GeometryIssue[] = [];
  let fixCount = 0;

  // Build map of all endpoints
  const pointClusters = new Map<string, Point[]>();

  walls.forEach(wall => {
    [wall.start, wall.end].forEach(point => {
      const key = pointKey(point, 1); // Group by 0.1m precision
      if (!pointClusters.has(key)) {
        pointClusters.set(key, []);
      }
      pointClusters.get(key)!.push(point);
    });
  });

  // For each cluster, find centroid and snap all points to it
  const pointMapping = new Map<string, Point>();

  pointClusters.forEach((cluster, key) => {
    if (cluster.length > 1) {
      // Calculate centroid
      const centroid = {
        x: cluster.reduce((sum, p) => sum + p.x, 0) / cluster.length,
        y: cluster.reduce((sum, p) => sum + p.y, 0) / cluster.length,
      };

      // Snap centroid to grid
      const snappedCentroid = {
        x: toFixedDecimal(snapToGrid(centroid.x, config.gridSize)),
        y: toFixedDecimal(snapToGrid(centroid.y, config.gridSize)),
      };

      // Map all points in cluster to this centroid
      cluster.forEach(point => {
        const pKey = pointKey(point);
        pointMapping.set(pKey, snappedCentroid);
      });

      fixCount++;
      issues.push({
        stage: 'Duplicate Merging',
        type: 'duplicate',
        severity: 'fixed',
        point: snappedCentroid,
        message: `Merged ${cluster.length} nearby points to ${key}`,
      });
    }
  });

  // Apply mapping to walls
  const merged = walls.map(wall => {
    const startKey = pointKey(wall.start);
    const endKey = pointKey(wall.end);

    return {
      ...wall,
      start: pointMapping.get(startKey) || wall.start,
      end: pointMapping.get(endKey) || wall.end,
    };
  });

  return {
    walls: merged,
    report: {
      stage: 'Duplicate Merging',
      fixesApplied: fixCount,
      issues,
    },
  };
}

// =====================================================
// Stage 4: Iterative Dangling Correction
// =====================================================

function stageIterativeDanglingCorrection(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  const issues: GeometryIssue[] = [];
  let totalFixes = 0;
  let currentWalls = [...walls];
  let passNumber = 0;

  for (passNumber = 0; passNumber < config.maxPasses; passNumber++) {
    let fixesThisPass = 0;
    // Keep tolerance constant - don't let it drift with passes
    // This ensures precision is maintained throughout processing
    const tolerance = config.snapTolerance;

    // Build endpoint connection map
    const endpointMap = new Map<string, Point[]>();
    currentWalls.forEach(wall => {
      [wall.start, wall.end].forEach(point => {
        const key = pointKey(point, 1);
        if (!endpointMap.has(key)) {
          endpointMap.set(key, []);
        }
        endpointMap.get(key)!.push(point);
      });
    });

    // Find dangling endpoints (points with only 1 connection)
    const danglingPoints: Point[] = [];
    endpointMap.forEach((points, key) => {
      if (points.length === 1) {
        danglingPoints.push(points[0]);
      }
    });

    if (danglingPoints.length === 0) {
      // Converged - no dangling points
      break;
    }

    // Try to snap each dangling point to nearest non-dangling point
    const updated = currentWalls.map(wall => {
      let newStart = wall.start;
      let newEnd = wall.end;
      let modified = false;

      // Check if start is dangling
      const startKey = pointKey(wall.start, 1);
      const startConnections = endpointMap.get(startKey) || [];
      if (startConnections.length === 1) {
        // Find nearest non-dangling point
        let minDist = Infinity;
        let nearest: Point | null = null;

        endpointMap.forEach((points, key) => {
          if (points.length > 1) {
            const candidatePoint = points[0];
            const dist = distance(wall.start, candidatePoint);
            if (dist > 0.001 && dist < tolerance && dist < minDist) {
              minDist = dist;
              nearest = candidatePoint;
            }
          }
        });

        if (nearest) {
          newStart = nearest;
          modified = true;
          fixesThisPass++;
        }
      }

      // Check if end is dangling
      const endKey = pointKey(wall.end, 1);
      const endConnections = endpointMap.get(endKey) || [];
      if (endConnections.length === 1) {
        let minDist = Infinity;
        let nearest: Point | null = null;

        endpointMap.forEach((points, key) => {
          if (points.length > 1) {
            const candidatePoint = points[0];
            const dist = distance(wall.end, candidatePoint);
            if (dist > 0.001 && dist < tolerance && dist < minDist) {
              minDist = dist;
              nearest = candidatePoint;
            }
          }
        });

        if (nearest) {
          newEnd = nearest;
          modified = true;
          fixesThisPass++;
        }
      }

      if (modified) {
        issues.push({
          stage: 'Dangling Correction',
          type: 'dangling',
          severity: 'fixed',
          wallId: wall.id,
          message: `Fixed dangling endpoint on wall ${wall.id} (pass ${passNumber + 1})`,
        });
      }

      return modified ? { ...wall, start: newStart, end: newEnd } : wall;
    });

    currentWalls = updated;
    totalFixes += fixesThisPass;

    if (fixesThisPass === 0) {
      // No fixes this pass - converged
      break;
    }
  }

  return {
    walls: currentWalls,
    report: {
      stage: 'Dangling Correction',
      fixesApplied: totalFixes,
      issues,
    },
  };
}

// =====================================================
// Stage 5: Exterior Loop Closure
// =====================================================

function stageExteriorLoopClosure(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  const issues: GeometryIssue[] = [];
  let fixCount = 0;

  // Find exterior walls
  const exteriorWalls = walls.filter(w => w.isExternal);

  if (exteriorWalls.length === 0) {
    return {
      walls,
      report: {
        stage: 'Exterior Loop Closure',
        fixesApplied: 0,
        issues: [],
      },
    };
  }

  // Check if loop is closed
  const firstWall = exteriorWalls[0];
  const lastWall = exteriorWalls[exteriorWalls.length - 1];

  if (!pointsEqual(lastWall.end, firstWall.start, config.snapTolerance)) {
    // Loop not closed - force closure
    const dist = distance(lastWall.end, firstWall.start);

    if (dist < config.snapTolerance * 10) {
      // Close enough to fix - snap last wall end to first wall start
      const updatedWalls = walls.map(wall => {
        if (wall.id === lastWall.id) {
          return { ...wall, end: firstWall.start };
        }
        return wall;
      });

      fixCount++;
      issues.push({
        stage: 'Exterior Loop Closure',
        type: 'open-loop',
        severity: 'fixed',
        wallId: lastWall.id,
        message: `Closed exterior loop by snapping wall ${lastWall.id} end to first wall start`,
      });

      return {
        walls: updatedWalls,
        report: {
          stage: 'Exterior Loop Closure',
          fixesApplied: fixCount,
          issues,
        },
      };
    } else {
      issues.push({
        stage: 'Exterior Loop Closure',
        type: 'open-loop',
        severity: 'warning',
        message: `Exterior loop has ${dist.toFixed(2)}m gap - too large to auto-fix`,
      });
    }
  }

  return {
    walls,
    report: {
      stage: 'Exterior Loop Closure',
      fixesApplied: fixCount,
      issues,
    },
  };
}

// =====================================================
// Stage 6: Short Wall Elimination
// =====================================================

function stageShortWallElimination(
  walls: WallSegment[],
  config: GeometryProcessorConfig
): { walls: WallSegment[]; report: StageReport } {
  const issues: GeometryIssue[] = [];
  let removedCount = 0;

  const filtered = walls.filter(wall => {
    const len = distance(wall.start, wall.end);
    if (len < config.minimumWallLength) {
      removedCount++;
      issues.push({
        stage: 'Short Wall Elimination',
        type: 'short-wall',
        severity: 'fixed',
        wallId: wall.id,
        message: `Removed short wall ${wall.id} (${len.toFixed(3)}m < ${config.minimumWallLength}m)`,
      });
      return false;
    }
    return true;
  });

  return {
    walls: filtered,
    report: {
      stage: 'Short Wall Elimination',
      fixesApplied: removedCount,
      issues,
    },
  };
}

// =====================================================
// Main Processor
// =====================================================

export function processGeometry(
  blueprint: BlueprintData,
  config: Partial<GeometryProcessorConfig> = {}
): { blueprint: BlueprintData; report: GeometryReport } {
  const finalConfig: GeometryProcessorConfig = {
    ...DEFAULT_CONFIG,
    ...config,
  };

  const stageReports: StageReport[] = [];
  const warnings: string[] = [];
  let totalFixes = 0;

  // Process each sheet
  const processedSheets = blueprint.sheets.map(sheet => {
    let walls = sheet.elements.walls;

    if (finalConfig.debugMode) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Processing sheet: ${sheet.title}`);
      console.log(`Initial wall count: ${walls.length}`);
    }

    // Stage 1: Grid Snapping
    const stage1 = stageGridSnapping(walls, finalConfig);
    walls = stage1.walls;
    stageReports.push(stage1.report);
    totalFixes += stage1.report.fixesApplied;

    // Stage 2: Angle Normalization
    const stage2 = stageAngleNormalization(walls, finalConfig);
    walls = stage2.walls;
    stageReports.push(stage2.report);
    totalFixes += stage2.report.fixesApplied;

    // Stage 3: Duplicate Merging
    const stage3 = stageDuplicateMerging(walls, finalConfig);
    walls = stage3.walls;
    stageReports.push(stage3.report);
    totalFixes += stage3.report.fixesApplied;

    // Stage 4: Iterative Dangling Correction
    const stage4 = stageIterativeDanglingCorrection(walls, finalConfig);
    walls = stage4.walls;
    stageReports.push(stage4.report);
    totalFixes += stage4.report.fixesApplied;

    // Stage 5: Exterior Loop Closure
    const stage5 = stageExteriorLoopClosure(walls, finalConfig);
    walls = stage5.walls;
    stageReports.push(stage5.report);
    totalFixes += stage5.report.fixesApplied;

    // Stage 6: Short Wall Elimination
    const stage6 = stageShortWallElimination(walls, finalConfig);
    walls = stage6.walls;
    stageReports.push(stage6.report);
    totalFixes += stage6.report.fixesApplied;

    if (finalConfig.debugMode) {
      console.log(`Final wall count: ${walls.length}`);
      console.log(`Total fixes applied: ${totalFixes}`);
    }

    return {
      ...sheet,
      elements: {
        ...sheet.elements,
        walls,
      },
    };
  });

  const report: GeometryReport = {
    totalFixesApplied: totalFixes,
    stageReports,
    finalWallCount: processedSheets.reduce((sum, sheet) => sum + sheet.elements.walls.length, 0),
    convergedAfterPasses: Math.max(
      ...stageReports
        .filter(r => r.stage === 'Dangling Correction')
        .map(r => r.issues.length || 0)
    ),
    warnings,
  };

  return {
    blueprint: {
      ...blueprint,
      sheets: processedSheets,
    },
    report,
  };
}
