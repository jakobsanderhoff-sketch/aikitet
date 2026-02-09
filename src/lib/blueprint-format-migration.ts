/**
 * Blueprint Format Migration
 *
 * Converts legacy coordinate-based blueprints to SVG-enhanced format.
 * This migration ensures older blueprints can benefit from the SVG rendering system.
 */

import type { BlueprintData, WallSegment, Opening, RoomZone } from '@/schemas/blueprint.schema';
import type { SVGBlueprint, InteriorDivision, Room, Opening as SVGOpening } from '@/schemas/blueprint-svg.schema';

/**
 * Convert legacy coordinate-based blueprint to SVG-enhanced format
 */
export function convertCoordinatesToSVG(legacy: BlueprintData): SVGBlueprint {
  const sheet = legacy.sheets[0];

  // Separate exterior and interior walls
  const exteriorWalls = sheet.elements.walls.filter(w => w.isExternal);
  const interiorWalls = sheet.elements.walls.filter(w => !w.isExternal);

  // Build exterior path from exterior walls
  const exteriorPath = buildExteriorPath(exteriorWalls);

  // Build interior divisions from interior walls
  const divisions = buildInteriorDivisions(interiorWalls, exteriorWalls);

  // Convert rooms to SVG format
  const rooms = buildRooms(sheet.elements.rooms, sheet.elements.walls);

  // Convert openings to parametric positions
  const openings = buildOpenings(sheet.elements.openings, sheet.elements.walls, exteriorWalls);

  return {
    format: 'svg-enhanced',
    metadata: {
      projectName: legacy.projectName,
      location: legacy.location || 'Denmark',
      buildingCode: 'BR18/BR23',
      totalArea: sheet.metadata.totalArea || calculateTotalArea(rooms),
      buildingType: determineBuildingType((legacy as any).buildingType),
      projectNumber: (legacy as any).projectNumber,
      architect: (legacy as any).architect,
      client: (legacy as any).client,
      createdAt: (legacy as any).createdAt,
      updatedAt: new Date().toISOString(),
    },
    exterior: {
      path: exteriorPath,
      thickness: 0.3,
      material: 'brick',
      insulated: true,
    },
    divisions,
    rooms,
    openings,
  };
}

/**
 * Build exterior SVG path from exterior walls
 */
function buildExteriorPath(exteriorWalls: WallSegment[]): string {
  if (exteriorWalls.length === 0) {
    return 'M 0,0 L 10,0 L 10,10 L 0,10 Z';
  }

  // Sort walls to form a connected loop
  const sortedWalls = sortWallsIntoLoop(exteriorWalls);

  // Build SVG path
  const pathCommands: string[] = [];

  if (sortedWalls.length > 0) {
    const firstWall = sortedWalls[0];
    pathCommands.push(`M ${firstWall.start.x},${firstWall.start.y}`);

    for (const wall of sortedWalls) {
      pathCommands.push(`L ${wall.end.x},${wall.end.y}`);
    }

    // Close the loop
    pathCommands.push('Z');
  }

  return pathCommands.join(' ');
}

/**
 * Sort walls into a connected loop (exterior boundary)
 */
function sortWallsIntoLoop(walls: WallSegment[]): WallSegment[] {
  if (walls.length === 0) return [];

  const sorted: WallSegment[] = [walls[0]];
  const remaining = walls.slice(1);

  while (remaining.length > 0) {
    const lastWall = sorted[sorted.length - 1];
    const lastPoint = lastWall.end;

    // Find wall that starts where last wall ended
    const nextIndex = remaining.findIndex(w =>
      pointsMatch(w.start, lastPoint)
    );

    if (nextIndex >= 0) {
      sorted.push(remaining[nextIndex]);
      remaining.splice(nextIndex, 1);
    } else {
      // Try reversed wall
      const reversedIndex = remaining.findIndex(w =>
        pointsMatch(w.end, lastPoint)
      );

      if (reversedIndex >= 0) {
        const wall = remaining[reversedIndex];
        sorted.push({
          ...wall,
          start: wall.end,
          end: wall.start,
        });
        remaining.splice(reversedIndex, 1);
      } else {
        break;
      }
    }
  }

  return sorted;
}

/**
 * Build interior divisions from interior walls
 */
function buildInteriorDivisions(
  interiorWalls: WallSegment[],
  exteriorWalls: WallSegment[]
): InteriorDivision[] {
  return interiorWalls.map((wall, index) => {
    const path = `M ${wall.start.x},${wall.start.y} L ${wall.end.x},${wall.end.y}`;

    // Find what this wall connects to
    const connections = findWallConnections(wall, [...exteriorWalls, ...interiorWalls]);

    return {
      id: wall.id || `div-${index + 1}`,
      path,
      thickness: wall.thickness || 0.12,
      connects: connections,
      material: 'gypsum-board' as const,
      structural: wall.type === 'LOAD_BEARING',
    };
  });
}

/**
 * Find what a wall connects to
 */
function findWallConnections(wall: WallSegment, allWalls: WallSegment[]): string[] {
  const connections: string[] = [];
  const tolerance = 0.1;

  // Check if start connects to any wall
  for (const otherWall of allWalls) {
    if (otherWall.id === wall.id) continue;

    if (pointsMatch(wall.start, otherWall.start, tolerance) ||
        pointsMatch(wall.start, otherWall.end, tolerance)) {
      const label = otherWall.isExternal ? 'exterior' : otherWall.id;
      if (label && !connections.includes(label)) {
        connections.push(label);
      }
    }
  }

  // Check if end connects to any wall
  for (const otherWall of allWalls) {
    if (otherWall.id === wall.id) continue;

    if (pointsMatch(wall.end, otherWall.start, tolerance) ||
        pointsMatch(wall.end, otherWall.end, tolerance)) {
      const label = otherWall.isExternal ? 'exterior' : otherWall.id;
      if (label && !connections.includes(label)) {
        connections.push(label);
      }
    }
  }

  return connections;
}

/**
 * Build rooms from legacy room data
 */
function buildRooms(rooms: RoomZone[], walls: WallSegment[]): Room[] {
  return rooms.map((room, index) => {
    // Convert polygon to SVG path
    const boundary = room.polygon && room.polygon.length > 0
      ? polygonToSVGPath(room.polygon)
      : deriveRoomBoundary(room, walls);

    return {
      id: room.id || `room-${index + 1}`,
      name: room.label,
      type: room.type || 'Other',
      boundary,
      area: room.area?.value || 0,
      features: [],
      compliance: (room as any).compliance || [],
    };
  });
}

/**
 * Convert polygon points to SVG path
 */
function polygonToSVGPath(polygon: Array<{ x: number; y: number }>): string {
  if (polygon.length === 0) return 'M 0,0 Z';

  const commands: string[] = [];
  commands.push(`M ${polygon[0].x},${polygon[0].y}`);

  for (let i = 1; i < polygon.length; i++) {
    commands.push(`L ${polygon[i].x},${polygon[i].y}`);
  }

  commands.push('Z');
  return commands.join(' ');
}

/**
 * Derive room boundary from walls (fallback)
 */
function deriveRoomBoundary(room: RoomZone, walls: WallSegment[]): string {
  // Simple rectangular boundary based on room center and area
  const area = room.area?.value || 10;
  const width = Math.sqrt(area);
  const height = area / width;

  const x = room.center.x - width / 2;
  const y = room.center.y - height / 2;

  return `M ${x},${y} L ${x + width},${y} L ${x + width},${y + height} L ${x},${y + height} Z`;
}

/**
 * Build openings with parametric positions
 */
function buildOpenings(
  openings: Opening[],
  walls: WallSegment[],
  exteriorWalls: WallSegment[]
): SVGOpening[] {
  return openings.reduce<SVGOpening[]>((acc, opening, index) => {
    const wall = walls.find(w => w.id === opening.wallId);
    if (!wall) return acc;

    const wallLength = Math.sqrt(
      Math.pow(wall.end.x - wall.start.x, 2) +
      Math.pow(wall.end.y - wall.start.y, 2)
    );

    const positionFromStart = opening.distFromStart || 0;
    const atPosition = Math.min(1, Math.max(0, positionFromStart / wallLength));

    acc.push({
      id: opening.id || `opening-${index + 1}`,
      type: opening.type,
      onPath: wall.isExternal ? 'exterior' : wall.id,
      atPosition,
      width: opening.width,
      swing: (opening.swingDirection === 'inward' ? 'left' : 'right') as 'left' | 'right',
    });
    return acc;
  }, []);
}

/**
 * Helper: Check if two points match within tolerance
 */
function pointsMatch(
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  tolerance: number = 0.05
): boolean {
  return Math.abs(p1.x - p2.x) < tolerance && Math.abs(p1.y - p2.y) < tolerance;
}

/**
 * Calculate total area from rooms
 */
function calculateTotalArea(rooms: Room[]): number {
  return rooms.reduce((sum, room) => sum + room.area, 0);
}

/**
 * Determine building type from legacy format
 */
function determineBuildingType(legacyType?: string): 'house' | 'apartment' | 'townhouse' | 'villa' {
  if (!legacyType) return 'house';

  const lower = legacyType.toLowerCase();
  if (lower.includes('apartment') || lower.includes('lejlighed')) return 'apartment';
  if (lower.includes('townhouse') || lower.includes('rækkehus')) return 'townhouse';
  if (lower.includes('villa')) return 'villa';

  return 'house';
}
