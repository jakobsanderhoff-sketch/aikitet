/**
 * Geometry Debugger - Visual Debugging System
 *
 * Provides instant visual feedback during development with:
 * - ASCII art visualization showing walls in 40x30 character grid
 * - Endpoint connection analysis
 * - JSON debug reports with detailed geometry information
 * - Environment-based logging (prod: errors, dev: full debug)
 *
 * Used to quickly identify geometry issues like:
 * - Dangling wall endpoints
 * - Off-grid coordinates
 * - Open loops
 * - Wall connectivity problems
 */

import type { WallSegment, Point } from '@/schemas/blueprint.schema';

// =====================================================
// Types
// =====================================================

export interface Bounds {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  width: number;
  height: number;
}

export interface EndpointAnalysis {
  point: Point;
  key: string;
  connections: number;
  wallIds: string[];
  status: 'normal' | 'dangling' | 'junction';
}

export interface GeometryIssue {
  type: 'dangling' | 'off-grid' | 'short-wall' | 'degenerate';
  severity: 'error' | 'warning';
  wallId?: string;
  point?: Point;
  message: string;
}

export interface GeometryDebugReport {
  timestamp: string;
  wallCount: number;
  bounds: Bounds;
  endpoints: EndpointAnalysis[];
  issues: GeometryIssue[];
  closedLoops: {
    isExteriorClosed: boolean;
    exteriorGap?: number;
    exteriorWallCount: number;
  };
  gridCompliance: {
    onGrid: number;
    offGrid: number;
    percentage: number;
  };
}

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

// =====================================================
// Bounds Calculation
// =====================================================

function calculateBounds(walls: WallSegment[]): Bounds {
  if (walls.length === 0) {
    return { minX: 0, maxX: 10, minY: 0, maxY: 10, width: 10, height: 10 };
  }

  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  walls.forEach(wall => {
    [wall.start, wall.end].forEach(point => {
      minX = Math.min(minX, point.x);
      maxX = Math.max(maxX, point.x);
      minY = Math.min(minY, point.y);
      maxY = Math.max(maxY, point.y);
    });
  });

  // Add padding (10%)
  const width = maxX - minX;
  const height = maxY - minY;
  const padding = Math.max(width, height) * 0.1;

  return {
    minX: minX - padding,
    maxX: maxX + padding,
    minY: minY - padding,
    maxY: maxY + padding,
    width: maxX - minX + 2 * padding,
    height: maxY - minY + 2 * padding,
  };
}

// =====================================================
// Endpoint Analysis
// =====================================================

function analyzeEndpoints(walls: WallSegment[]): EndpointAnalysis[] {
  const endpointMap = new Map<string, { point: Point; wallIds: string[] }>();

  // Collect all endpoints
  walls.forEach(wall => {
    [wall.start, wall.end].forEach(point => {
      const key = pointKey(point, 1);
      if (!endpointMap.has(key)) {
        endpointMap.set(key, { point, wallIds: [] });
      }
      endpointMap.get(key)!.wallIds.push(wall.id);
    });
  });

  // Analyze each endpoint
  const analyses: EndpointAnalysis[] = [];

  endpointMap.forEach(({ point, wallIds }, key) => {
    const connections = wallIds.length;
    let status: 'normal' | 'dangling' | 'junction' = 'normal';

    if (connections === 1) {
      status = 'dangling';
    } else if (connections > 2) {
      status = 'junction';
    }

    analyses.push({
      point,
      key,
      connections,
      wallIds,
      status,
    });
  });

  return analyses;
}

// =====================================================
// ASCII Art Visualization
// =====================================================

export function createASCIIGrid(
  walls: WallSegment[],
  bounds: Bounds,
  width: number = 60,
  height: number = 30
): string {
  // Initialize grid with spaces
  const grid: string[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => ' ')
  );

  // Helper to convert world coordinates to grid coordinates
  const worldToGrid = (x: number, y: number): { gx: number; gy: number } => {
    const gx = Math.floor(((x - bounds.minX) / bounds.width) * (width - 1));
    const gy = Math.floor(((bounds.maxY - y) / bounds.height) * (height - 1)); // Flip Y
    return { gx: Math.max(0, Math.min(width - 1, gx)), gy: Math.max(0, Math.min(height - 1, gy)) };
  };

  // Draw border
  for (let x = 0; x < width; x++) {
    grid[0][x] = '#';
    grid[height - 1][x] = '#';
  }
  for (let y = 0; y < height; y++) {
    grid[y][0] = '#';
    grid[y][width - 1] = '#';
  }

  // Draw walls using Bresenham's line algorithm
  walls.forEach(wall => {
    const start = worldToGrid(wall.start.x, wall.start.y);
    const end = worldToGrid(wall.end.x, wall.end.y);

    // Bresenham's line algorithm
    let x0 = start.gx;
    let y0 = start.gy;
    const x1 = end.gx;
    const y1 = end.gy;

    const dx = Math.abs(x1 - x0);
    const dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;

    while (true) {
      // Determine character based on direction
      let char = '·';
      if (Math.abs(x1 - x0) > Math.abs(y1 - y0)) {
        char = '─'; // Horizontal
      } else if (Math.abs(y1 - y0) > Math.abs(x1 - x0)) {
        char = '│'; // Vertical
      } else {
        char = '┼'; // Diagonal or junction
      }

      // Check if it's a junction (multiple walls meet)
      const currentChar = grid[y0][x0];
      if (currentChar === '─' || currentChar === '│') {
        char = '┼';
      }

      grid[y0][x0] = char;

      if (x0 === x1 && y0 === y1) break;

      const e2 = 2 * err;
      if (e2 > -dy) {
        err -= dy;
        x0 += sx;
      }
      if (e2 < dx) {
        err += dx;
        y0 += sy;
      }
    }
  });

  // Mark dangling endpoints
  const endpoints = analyzeEndpoints(walls);
  endpoints.forEach(ep => {
    if (ep.status === 'dangling') {
      const pos = worldToGrid(ep.point.x, ep.point.y);
      if (pos.gx > 0 && pos.gx < width - 1 && pos.gy > 0 && pos.gy < height - 1) {
        grid[pos.gy][pos.gx] = '!'; // Mark dangling endpoints
      }
    }
  });

  // Convert grid to string
  return grid.map(row => row.join('')).join('\n');
}

// =====================================================
// Debug Logging
// =====================================================

export function logGeometryDebug(walls: WallSegment[], title: string = 'Geometry Analysis'): void {
  const bounds = calculateBounds(walls);
  const endpoints = analyzeEndpoints(walls);

  console.log('\n' + '═'.repeat(70));
  console.log(`GEOMETRY DEBUG: ${title}`);
  console.log('═'.repeat(70));

  // ASCII visualization
  console.log('\nVISUAL MAP:');
  console.log(createASCIIGrid(walls, bounds, 60, 25));
  console.log('Legend: ─ Horizontal │ Vertical ┼ Junction ! Dangling # Border');

  // Bounds info
  console.log('\nBOUNDS:');
  console.log(`  X: ${bounds.minX.toFixed(1)}m to ${bounds.maxX.toFixed(1)}m (${bounds.width.toFixed(1)}m)`);
  console.log(`  Y: ${bounds.minY.toFixed(1)}m to ${bounds.maxY.toFixed(1)}m (${bounds.height.toFixed(1)}m)`);

  // Wall count
  console.log('\nWALLS:');
  console.log(`  Total: ${walls.length}`);
  console.log(`  Exterior: ${walls.filter(w => w.isExternal).length}`);
  console.log(`  Interior: ${walls.filter(w => !w.isExternal).length}`);

  // Endpoint analysis
  const dangling = endpoints.filter(ep => ep.status === 'dangling');
  const junctions = endpoints.filter(ep => ep.status === 'junction');

  console.log('\nENDPOINTS:');
  console.log(`  Total unique: ${endpoints.length}`);
  console.log(`  Normal (2 connections): ${endpoints.filter(ep => ep.status === 'normal').length}`);
  console.log(`  Dangling (1 connection): ${dangling.length}`);
  console.log(`  Junctions (3+ connections): ${junctions.length}`);

  if (dangling.length > 0) {
    console.log('\n  ⚠️  DANGLING ENDPOINTS:');
    dangling.slice(0, 5).forEach(ep => {
      console.log(`    • (${ep.point.x.toFixed(1)}, ${ep.point.y.toFixed(1)}) - Wall ${ep.wallIds[0]}`);
    });
    if (dangling.length > 5) {
      console.log(`    ... and ${dangling.length - 5} more`);
    }
  }

  if (junctions.length > 0) {
    console.log('\n  ℹ️  JUNCTIONS (T or X intersections):');
    junctions.slice(0, 5).forEach(ep => {
      console.log(
        `    • (${ep.point.x.toFixed(1)}, ${ep.point.y.toFixed(1)}) - ${ep.connections} walls: ${ep.wallIds.join(', ')}`
      );
    });
    if (junctions.length > 5) {
      console.log(`    ... and ${junctions.length - 5} more`);
    }
  }

  // Grid compliance
  let onGridCount = 0;
  let offGridCount = 0;

  walls.forEach(wall => {
    [wall.start, wall.end].forEach(point => {
      if (isOnGrid(point.x) && isOnGrid(point.y)) {
        onGridCount++;
      } else {
        offGridCount++;
      }
    });
  });

  const totalPoints = onGridCount + offGridCount;
  const gridCompliance = totalPoints > 0 ? (onGridCount / totalPoints) * 100 : 0;

  console.log('\nGRID COMPLIANCE:');
  console.log(`  On 0.1m grid: ${onGridCount}/${totalPoints} (${gridCompliance.toFixed(1)}%)`);

  if (offGridCount > 0) {
    console.log(`  ⚠️  ${offGridCount} points off grid`);
  } else {
    console.log(`  ✓ All points on grid`);
  }

  // Exterior loop check
  const exteriorWalls = walls.filter(w => w.isExternal);
  if (exteriorWalls.length > 0) {
    const firstWall = exteriorWalls[0];
    const lastWall = exteriorWalls[exteriorWalls.length - 1];
    const loopClosed = pointsEqual(lastWall.end, firstWall.start, 0.05);
    const gap = loopClosed ? 0 : distance(lastWall.end, firstWall.start);

    console.log('\nEXTERIOR LOOP:');
    if (loopClosed) {
      console.log('  ✓ Closed');
    } else {
      console.log(`  ✗ Open - ${gap.toFixed(3)}m gap`);
    }
  }

  console.log('═'.repeat(70) + '\n');
}

// =====================================================
// JSON Debug Report
// =====================================================

export function generateDebugReport(walls: WallSegment[]): GeometryDebugReport {
  const bounds = calculateBounds(walls);
  const endpoints = analyzeEndpoints(walls);
  const issues: GeometryIssue[] = [];

  // Detect issues
  endpoints.forEach(ep => {
    if (ep.status === 'dangling') {
      issues.push({
        type: 'dangling',
        severity: 'error',
        wallId: ep.wallIds[0],
        point: ep.point,
        message: `Dangling endpoint at (${ep.point.x}, ${ep.point.y})`,
      });
    }
  });

  // Check grid compliance
  let onGridCount = 0;
  let offGridCount = 0;

  walls.forEach(wall => {
    [wall.start, wall.end].forEach(point => {
      if (isOnGrid(point.x) && isOnGrid(point.y)) {
        onGridCount++;
      } else {
        offGridCount++;
        issues.push({
          type: 'off-grid',
          severity: 'error',
          wallId: wall.id,
          point,
          message: `Off-grid point: (${point.x}, ${point.y})`,
        });
      }
    });
  });

  // Check wall lengths
  walls.forEach(wall => {
    const len = distance(wall.start, wall.end);

    if (len < 0.001) {
      issues.push({
        type: 'degenerate',
        severity: 'error',
        wallId: wall.id,
        message: `Degenerate wall (zero length): ${wall.id}`,
      });
    } else if (len < 0.3) {
      issues.push({
        type: 'short-wall',
        severity: 'warning',
        wallId: wall.id,
        message: `Short wall: ${wall.id} (${len.toFixed(3)}m)`,
      });
    }
  });

  // Check exterior loop
  const exteriorWalls = walls.filter(w => w.isExternal);
  let isExteriorClosed = false;
  let exteriorGap: number | undefined;

  if (exteriorWalls.length > 0) {
    const firstWall = exteriorWalls[0];
    const lastWall = exteriorWalls[exteriorWalls.length - 1];
    isExteriorClosed = pointsEqual(lastWall.end, firstWall.start, 0.05);

    if (!isExteriorClosed) {
      exteriorGap = distance(lastWall.end, firstWall.start);
    }
  }

  return {
    timestamp: new Date().toISOString(),
    wallCount: walls.length,
    bounds,
    endpoints,
    issues,
    closedLoops: {
      isExteriorClosed,
      exteriorGap,
      exteriorWallCount: exteriorWalls.length,
    },
    gridCompliance: {
      onGrid: onGridCount,
      offGrid: offGridCount,
      percentage: (onGridCount / (onGridCount + offGridCount)) * 100,
    },
  };
}

// =====================================================
// Environment-based Logging
// =====================================================

export function debugLog(
  walls: WallSegment[],
  title: string,
  mode: 'production' | 'development' | 'test' = 'development'
): void {
  if (mode === 'production') {
    // Production: Only log errors
    const report = generateDebugReport(walls);
    const errors = report.issues.filter(i => i.severity === 'error');
    if (errors.length > 0) {
      console.error(`[Geometry] ${errors.length} errors found in ${title}`);
    }
  } else if (mode === 'development') {
    // Development: Full ASCII art + analysis
    logGeometryDebug(walls, title);
  } else if (mode === 'test') {
    // Test: JSON report only
    const report = generateDebugReport(walls);
    console.log(JSON.stringify(report, null, 2));
  }
}

// =====================================================
// Export convenience function
// =====================================================

export function debugGeometry(walls: WallSegment[], title?: string): void {
  const mode = process.env.NODE_ENV === 'production' ? 'production' : 'development';
  debugLog(walls, title || 'Geometry Check', mode);
}
