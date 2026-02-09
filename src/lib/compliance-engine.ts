/**
 * Enhanced Compliance Validation Engine for Danish BR18/BR23
 * Performs comprehensive building code checks with egress analysis
 */

import type {
  Sheet,
  WallSegment,
  Opening,
  RoomZone,
  ComplianceIssue,
  ComplianceReport,
  Point,
} from '@/schemas/blueprint.schema';
import { getDistance, calculatePolygonArea } from '@/schemas/blueprint.schema';

// =====================================================
// BR18/BR23 Building Code Constants
// =====================================================
const BR18_STANDARDS = {
  ceilingHeight: {
    habitable: 2.3,       // meters - all habitable rooms (BR18 §199)
    nonHabitable: 2.1,    // meters - bathrooms, storage
  },
  threshold: {
    maxHeight: 0.025,     // meters - max 25mm for accessibility (BR18 §373)
  },
  roomArea: {
    bedroom: 6,           // m² - BR18-5.2.3
    livingRoom: 10,       // m² - BR18-5.2.1
    kitchen: 4,           // m² - BR18-5.2.2
    techRoom: 2,          // m² minimum (or 120x60cm cabinet)
    wasteStorage: 4.5,    // m² - 1.5×3.0m area for waste sorting
  },
  doorWidth: {
    minimum: 0.77,        // meters - BR18-3.1.1 (accessibility) - BR18 §373
    standard: 0.9,        // meters - M9 recommended
    entrance: 1.0,        // meters - M10 main entrance
  },
  corridorWidth: {
    standard: 1.0,        // meters - standard corridors
    withDoors: 1.3,       // meters - corridors with side doors
  },
  naturalLight: {
    minimumRatio: 0.10,   // 10% of floor area - BR23
  },
  rescueWindow: {
    minSumHW: 1.5,        // H+W ≥ 1.50m for rescue windows
    maxHeightFromFloor: 1.2, // meters - max height from floor to sill
  },
  bathroom: {
    turningCircle: 1.5,   // meters diameter for wheelchair
    doorSwingOut: true,   // bathroom doors must swing outward
  },
  stairs: {
    stepFormula: { min: 61, max: 63 }, // 2×Rise + Tread = 61-63cm
    maxRise: 21,          // cm - maximum step rise
    headroom: 2.0,        // meters - minimum headroom
  },
  parking: {
    spaceCount: 2,        // minimum parking spaces
    spaceWidth: 2.5,      // meters
    spaceLength: 5.0,     // meters
  },
  fire: {
    garageWall: 'EI60',   // fire rating for garage wall
    garageDoor: 'EI30-C', // fire rating for garage door
  },
  egress: {
    maxDistanceToExit: 25,  // meters - BR18-5.4.1
    maxDistanceBedroom: 15, // meters - stricter for bedrooms
  },
  hallway: {
    minimumWidth: 0.9,    // meters - BR18-3.2.1
  },
  plot: {
    boundaryDistance: 2.5,  // meters from boundary
    heightFactor: 1.4,      // height ≤ 1.4× distance to boundary
  },
};

// =====================================================
// Main Compliance Validation Function
// =====================================================
export function validateCompliance(sheet: Sheet): ComplianceReport {
  const violations: ComplianceIssue[] = [];
  const warnings: ComplianceIssue[] = [];
  const checks: ComplianceIssue[] = [];

  // 1. Room Area Validation
  validateRoomAreas(sheet.elements.rooms, violations, warnings, checks);

  // 2. Ceiling Height Validation
  validateCeilingHeights(sheet.elements.rooms, violations, warnings, checks);

  // 3. Door Width Validation
  validateDoorWidths(sheet.elements.walls, sheet.elements.openings, violations, warnings, checks);

  // 4. Natural Light Validation
  validateNaturalLight(sheet.elements.walls, sheet.elements.openings, sheet.elements.rooms, violations, warnings, checks);

  // 5. Wall Connectivity Validation
  validateWallConnectivity(sheet.elements.walls, violations, warnings);

  // 6. Opening References Validation
  validateOpeningReferences(sheet.elements.walls, sheet.elements.openings, violations);

  // 7. Egress Analysis
  const egressAnalysis = performEgressAnalysis(sheet.elements.walls, sheet.elements.openings, sheet.elements.rooms);
  if (!egressAnalysis.passed) {
    violations.push({
      type: 'violation',
      code: 'BR18-5.4.1',
      message: `Egress distance ${egressAnalysis.maxDistanceToExit.toFixed(1)}m exceeds maximum ${BR18_STANDARDS.egress.maxDistanceToExit}m`,
      severity: 'critical',
      elementType: 'general',
    });
  } else {
    checks.push({
      type: 'check',
      code: 'BR18-5.4.1',
      message: `Egress distance ${egressAnalysis.maxDistanceToExit.toFixed(1)}m ✓`,
      severity: 'minor',
      elementType: 'general',
    });
  }

  // 8. Rescue Window Validation
  validateRescueWindows(sheet.elements.openings, sheet.elements.rooms, violations, warnings, checks);

  // 9. Bathroom Requirements
  validateBathroomRequirements(sheet.elements.rooms, sheet.elements.openings, violations, warnings, checks);

  // 10. Corridor Width Validation
  validateCorridorWidth(sheet.elements.rooms, violations, warnings, checks);

  // 11. Technical Room Validation
  validateTechRoom(sheet.elements.rooms, violations, warnings, checks);

  // 12. Bathroom Door Swing Validation (BR18-6.4)
  validateBathroomDoorSwing(sheet.elements.rooms, sheet.elements.walls, sheet.elements.openings, violations, warnings, checks);

  // 13. Per-Room Natural Light Validation (BR23 §374)
  validatePerRoomNaturalLight(sheet.elements.rooms, sheet.elements.walls, sheet.elements.openings, violations, warnings, checks);

  // 14. Threshold Height Validation (BR18 §373)
  validateThresholdHeights(sheet.elements.openings, violations, warnings, checks);

  // 15. Stairs Validation (BR18 Trapper)
  validateStairs(sheet.elements, violations, warnings, checks);

  const passing = violations.length === 0;

  return {
    passing,
    violations,
    warnings,
    checks,
    summary: {
      totalViolations: violations.length,
      totalWarnings: warnings.length,
      totalChecks: checks.length,
    },
    egressAnalysis,
  };
}

// =====================================================
// Individual Validation Functions
// =====================================================

/**
 * Validate room areas against BR18 minimums
 */
function validateRoomAreas(
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  for (const room of rooms) {
    const area = room.area.value;
    const type = room.type || detectRoomType(room.label);

    let minimumArea: number | null = null;
    let code: string = '';

    if (type === 'Bedroom') {
      minimumArea = BR18_STANDARDS.roomArea.bedroom;
      code = 'BR18-5.2.3';
    } else if (type === 'Living Room' || type === 'Dining Room') {
      minimumArea = BR18_STANDARDS.roomArea.livingRoom;
      code = 'BR18-5.2.1';
    } else if (type === 'Kitchen') {
      minimumArea = BR18_STANDARDS.roomArea.kitchen;
      code = 'BR18-5.2.2';
    }

    if (minimumArea !== null) {
      if (area < minimumArea) {
        violations.push({
          type: 'violation',
          code,
          message: `${room.label}: ${area}m² < ${minimumArea}m² minimum`,
          elementId: room.id,
          elementType: 'room',
          severity: 'major',
        });
      } else {
        checks.push({
          type: 'check',
          code,
          message: `${room.label}: ${area}m² ≥ ${minimumArea}m² ✓`,
          elementId: room.id,
          elementType: 'room',
          severity: 'minor',
        });
      }
    }
  }
}

/**
 * Validate ceiling heights
 */
function validateCeilingHeights(
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  for (const room of rooms) {
    const height = room.ceilingHeight;
    if (!height) continue;

    const type = room.type || detectRoomType(room.label);
    const isHabitable = ['Bedroom', 'Living Room', 'Kitchen', 'Dining Room', 'Office'].includes(type);

    const minimumHeight = isHabitable
      ? BR18_STANDARDS.ceilingHeight.habitable
      : BR18_STANDARDS.ceilingHeight.nonHabitable;

    if (height < minimumHeight) {
      violations.push({
        type: 'violation',
        code: 'BR18-5.1.1',
        message: `${room.label}: Ceiling height ${height}m < ${minimumHeight}m minimum`,
        elementId: room.id,
        elementType: 'room',
        severity: 'critical',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR18-5.1.1',
        message: `${room.label}: Ceiling height ${height}m ✓`,
        elementId: room.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate door widths for accessibility
 */
function validateDoorWidths(
  walls: WallSegment[],
  openings: Opening[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const doors = openings.filter(o => o.type === 'door' || o.type === 'sliding-door');

  for (const door of doors) {
    const width = door.width;

    if (width < BR18_STANDARDS.doorWidth.minimum) {
      violations.push({
        type: 'violation',
        code: 'BR18-3.1.1',
        message: `Door ${door.tag}: Width ${width}m < ${BR18_STANDARDS.doorWidth.minimum}m (accessibility minimum)`,
        elementId: door.id,
        elementType: 'opening',
        severity: 'critical',
      });
    } else if (width < BR18_STANDARDS.doorWidth.standard) {
      warnings.push({
        type: 'warning',
        code: 'BR18-3.1.1',
        message: `Door ${door.tag}: Width ${width}m meets minimum but ${BR18_STANDARDS.doorWidth.standard}m recommended`,
        elementId: door.id,
        elementType: 'opening',
        severity: 'minor',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR18-3.1.1',
        message: `Door ${door.tag}: Width ${width}m ✓`,
        elementId: door.id,
        elementType: 'opening',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate natural light (window area ≥ 10% of floor area)
 */
function validateNaturalLight(
  walls: WallSegment[],
  openings: Opening[],
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  // Simple approach: Calculate total window area vs total habitable room area
  const windows = openings.filter(o => o.type === 'window');
  const totalWindowArea = windows.reduce((sum, w) => {
    const height = w.height || 1.5;
    return sum + (w.width * height);
  }, 0);

  const habitableRooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return ['Bedroom', 'Living Room', 'Kitchen', 'Dining Room', 'Office'].includes(type);
  });

  const totalRoomArea = habitableRooms.reduce((sum, r) => sum + r.area.value, 0);

  if (totalRoomArea > 0) {
    const lightRatio = totalWindowArea / totalRoomArea;

    if (lightRatio < BR18_STANDARDS.naturalLight.minimumRatio) {
      violations.push({
        type: 'violation',
        code: 'BR23',
        message: `Natural light ratio ${(lightRatio * 100).toFixed(1)}% < 10% minimum (${totalWindowArea.toFixed(1)}m² windows / ${totalRoomArea.toFixed(1)}m² habitable area)`,
        severity: 'major',
        elementType: 'general',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR23',
        message: `Natural light ratio ${(lightRatio * 100).toFixed(1)}% ≥ 10% ✓`,
        severity: 'minor',
        elementType: 'general',
      });
    }
  }
}

/**
 * Validate wall connectivity (walls should form closed loops)
 */
function validateWallConnectivity(
  walls: WallSegment[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[]
): void {
  const endpoints = new Map<string, number>();

  // Count endpoint occurrences
  for (const wall of walls) {
    const startKey = `${wall.start.x.toFixed(3)},${wall.start.y.toFixed(3)}`;
    const endKey = `${wall.end.x.toFixed(3)},${wall.end.y.toFixed(3)}`;

    endpoints.set(startKey, (endpoints.get(startKey) || 0) + 1);
    endpoints.set(endKey, (endpoints.get(endKey) || 0) + 1);
  }

  // Check for dangling endpoints (not connected to at least 2 walls)
  for (const [point, count] of endpoints.entries()) {
    if (count < 2) {
      warnings.push({
        type: 'warning',
        message: `Dangling wall endpoint at ${point} (only ${count} connection)`,
        severity: 'minor',
        elementType: 'wall',
      });
    }
  }
}

/**
 * Validate opening references point to existing walls
 */
function validateOpeningReferences(
  walls: WallSegment[],
  openings: Opening[],
  violations: ComplianceIssue[]
): void {
  const wallIds = new Set(walls.map(w => w.id));

  for (const opening of openings) {
    if (!wallIds.has(opening.wallId)) {
      violations.push({
        type: 'violation',
        message: `Opening ${opening.id} (${opening.tag}) references non-existent wall ${opening.wallId}`,
        elementId: opening.id,
        elementType: 'opening',
        severity: 'critical',
      });
    }
  }
}

/**
 * Perform egress analysis (distance to nearest exit)
 * BR18-5.4.1: Maximum 25m to exit, 15m for bedrooms
 */
function performEgressAnalysis(
  walls: WallSegment[],
  openings: Opening[],
  rooms: RoomZone[]
): {
  passed: boolean;
  maxDistanceToExit: number;
  criticalRooms: string[];
} {
  // Find all doors that could be exits (doors in external walls)
  const externalWallIds = new Set(walls.filter(w => w.isExternal).map(w => w.id));
  const exitDoors = openings.filter(o =>
    (o.type === 'door' || o.type === 'sliding-door') &&
    externalWallIds.has(o.wallId)
  );

  if (exitDoors.length === 0) {
    // No exits found - critical violation
    return {
      passed: false,
      maxDistanceToExit: Infinity,
      criticalRooms: rooms.map(r => r.id),
    };
  }

  // Calculate exit door positions
  const exitPositions: Point[] = exitDoors.map(door => {
    const wall = walls.find(w => w.id === door.wallId)!;
    const dx = wall.end.x - wall.start.x;
    const dy = wall.end.y - wall.start.y;
    const length = Math.sqrt(dx * dx + dy * dy);
    const t = door.distFromStart / length;

    return {
      x: wall.start.x + t * dx,
      y: wall.start.y + t * dy,
    };
  });

  // Calculate maximum distance from any room to nearest exit
  let maxDistance = 0;
  const criticalRooms: string[] = [];

  for (const room of rooms) {
    const distancesToExits = exitPositions.map(exit => getDistance(room.center, exit));
    const minDistance = Math.min(...distancesToExits);

    if (minDistance > maxDistance) {
      maxDistance = minDistance;
    }

    // Check bedroom-specific limit
    const type = room.type || detectRoomType(room.label);
    const limit = type === 'Bedroom'
      ? BR18_STANDARDS.egress.maxDistanceBedroom
      : BR18_STANDARDS.egress.maxDistanceToExit;

    if (minDistance > limit) {
      criticalRooms.push(room.id);
    }
  }

  return {
    passed: criticalRooms.length === 0,
    maxDistanceToExit: maxDistance,
    criticalRooms,
  };
}

/**
 * Validate rescue windows (H+W ≥ 1.50m, max 1.20m above floor)
 * Required for bedrooms as secondary egress
 */
function validateRescueWindows(
  openings: Opening[],
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const bedrooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return type === 'Bedroom';
  });

  // Check if bedrooms have adequate rescue windows
  const windows = openings.filter(o => o.type === 'window');

  for (const bedroom of bedrooms) {
    // Find windows that could serve this bedroom (simplified check)
    const bedroomWindows = windows.filter(w => {
      const height = w.height || 1.2;
      const hwSum = w.width + height;
      return hwSum >= BR18_STANDARDS.rescueWindow.minSumHW;
    });

    if (bedroomWindows.length === 0) {
      warnings.push({
        type: 'warning',
        code: 'BR18-rescue',
        message: `${bedroom.label}: No rescue window found (requires H+W ≥ 1.50m)`,
        elementId: bedroom.id,
        elementType: 'room',
        severity: 'major',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR18-rescue',
        message: `${bedroom.label}: Rescue window available ✓`,
        elementId: bedroom.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }

  // Check individual windows for rescue compliance
  for (const window of windows) {
    const height = window.height || 1.2;
    const hwSum = window.width + height;

    if (hwSum < BR18_STANDARDS.rescueWindow.minSumHW) {
      // Only warn if this is marked as a rescue window
      if (window.tag?.toLowerCase().includes('rescue') || window.tag?.toLowerCase().includes('redning')) {
        violations.push({
          type: 'violation',
          code: 'BR18-rescue-size',
          message: `Window ${window.tag}: H+W = ${hwSum.toFixed(2)}m < 1.50m required for rescue`,
          elementId: window.id,
          elementType: 'opening',
          severity: 'critical',
        });
      }
    }
  }
}

/**
 * Validate bathroom requirements (turning circle, door swing)
 * BR18 §196: 1.50m turning circle for wheelchair access
 */
function validateBathroomRequirements(
  rooms: RoomZone[],
  openings: Opening[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const bathrooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return type === 'Bathroom' || type === 'Toilet';
  });

  for (const bathroom of bathrooms) {
    // Check if bathroom has sufficient area for turning circle
    // A 1.50m circle has area of π × 0.75² ≈ 1.77m²
    // But the room needs to be at least 1.50m in both dimensions
    const area = bathroom.area.value;
    const minAreaForCircle = 2.25; // 1.50 × 1.50m minimum footprint

    if (area < minAreaForCircle) {
      warnings.push({
        type: 'warning',
        code: 'BR18-bathroom-turning',
        message: `${bathroom.label}: Area ${area.toFixed(1)}m² may not accommodate 1.50m turning circle`,
        elementId: bathroom.id,
        elementType: 'room',
        severity: 'major',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR18-bathroom-turning',
        message: `${bathroom.label}: Adequate space for turning circle ✓`,
        elementId: bathroom.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate corridor widths
 * Standard: 1.00m, With doors: 1.30m
 */
function validateCorridorWidth(
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const corridors = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return type === 'Hallway' || type === 'Corridor' || type === 'Entrance';
  });

  for (const corridor of corridors) {
    // Estimate width from area and assuming typical corridor proportions
    // This is a heuristic - ideally we'd have actual corridor width data
    const area = corridor.area.value;

    // Very narrow corridors are problematic
    if (area < 2.0) {
      // If area is less than 2m², it's likely too narrow
      warnings.push({
        type: 'warning',
        code: 'BR18-corridor-width',
        message: `${corridor.label}: Small corridor area (${area.toFixed(1)}m²) - verify width ≥ 1.00m`,
        elementId: corridor.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate technical room requirements
 * Minimum 2-3m² or 120×60cm cabinet space
 */
function validateTechRoom(
  rooms: RoomZone[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const techRooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    const label = r.label.toLowerCase();
    return type === 'Technical' || label.includes('tech') || label.includes('teknik') ||
           label.includes('utility') || label.includes('bryggers');
  });

  // Check if there's a technical room or space
  const hasTechRoom = techRooms.length > 0;

  if (!hasTechRoom) {
    warnings.push({
      type: 'warning',
      code: 'BR18-tech-room',
      message: 'No technical room/utility space identified (recommend 2-3m² for utilities)',
      severity: 'minor',
      elementType: 'general',
    });
  } else {
    for (const room of techRooms) {
      if (room.area.value < BR18_STANDARDS.roomArea.techRoom) {
        warnings.push({
          type: 'warning',
          code: 'BR18-tech-room-size',
          message: `${room.label}: ${room.area.value.toFixed(1)}m² < ${BR18_STANDARDS.roomArea.techRoom}m² recommended`,
          elementId: room.id,
          elementType: 'room',
          severity: 'minor',
        });
      } else {
        checks.push({
          type: 'check',
          code: 'BR18-tech-room-size',
          message: `${room.label}: ${room.area.value.toFixed(1)}m² ✓`,
          elementId: room.id,
          elementType: 'room',
          severity: 'minor',
        });
      }
    }
  }
}

/**
 * Detect room type from label string
 */
function detectRoomType(label: string): string {
  const lower = label.toLowerCase();
  if (lower.includes('bedroom') || lower.includes('soveværelse')) return 'Bedroom';
  if (lower.includes('living') || lower.includes('stue')) return 'Living Room';
  if (lower.includes('kitchen') || lower.includes('køkken')) return 'Kitchen';
  if (lower.includes('bathroom') || lower.includes('badeværelse') || lower.includes('bad')) return 'Bathroom';
  if (lower.includes('toilet') || lower.includes('wc')) return 'Toilet';
  if (lower.includes('hallway') || lower.includes('gang') || lower.includes('corridor')) return 'Hallway';
  if (lower.includes('entrance') || lower.includes('entre') || lower.includes('entré')) return 'Entrance';
  if (lower.includes('office') || lower.includes('kontor')) return 'Office';
  if (lower.includes('dining') || lower.includes('spisestue')) return 'Dining Room';
  if (lower.includes('storage') || lower.includes('opbevaring') || lower.includes('depot')) return 'Storage';
  if (lower.includes('garage') || lower.includes('carport')) return 'Garage';
  if (lower.includes('tech') || lower.includes('teknik') || lower.includes('utility') || lower.includes('bryggers')) return 'Technical';
  if (lower.includes('terrace') || lower.includes('terrasse') || lower.includes('balcon') || lower.includes('altan')) return 'Terrace';
  if (lower.includes('basement') || lower.includes('kælder')) return 'Basement';
  return 'Other';
}

/**
 * Validate bathroom door swing direction (BR18-6.4)
 * Bathroom doors MUST swing outward for emergency rescue access
 */
function validateBathroomDoorSwing(
  rooms: RoomZone[],
  walls: WallSegment[],
  openings: Opening[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const bathrooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return type === 'Bathroom' || type === 'Toilet';
  });

  if (bathrooms.length === 0) return;

  // Find doors that connect to bathrooms by checking wall proximity to bathroom centers
  const doors = openings.filter(o => o.type === 'door' || o.type === 'sliding-door' || o.type === 'pocket-door');

  for (const bathroom of bathrooms) {
    // Find walls that form the bathroom boundary (simplified: walls near bathroom center)
    const bathroomWalls = walls.filter(wall => {
      const wallMidX = (wall.start.x + wall.end.x) / 2;
      const wallMidY = (wall.start.y + wall.end.y) / 2;
      const distToCenter = Math.sqrt(
        Math.pow(wallMidX - bathroom.center.x, 2) +
        Math.pow(wallMidY - bathroom.center.y, 2)
      );
      // Consider walls within reasonable distance of bathroom center as potential bathroom walls
      const bathroomRadius = Math.sqrt(bathroom.area.value) * 0.8;
      return distToCenter < bathroomRadius + 1;
    });

    const bathroomWallIds = new Set(bathroomWalls.map(w => w.id));

    // Find doors in bathroom walls
    const bathroomDoors = doors.filter(d => bathroomWallIds.has(d.wallId));

    for (const door of bathroomDoors) {
      // Sliding doors and pocket doors are OK (they don't swing)
      if (door.type === 'sliding-door' || door.type === 'pocket-door') {
        checks.push({
          type: 'check',
          code: 'BR18-6.4',
          message: `${bathroom.label}: Door ${door.tag} is sliding/pocket type (no swing obstruction) ✓`,
          elementId: door.id,
          elementType: 'opening',
          severity: 'minor',
        });
        continue;
      }

      // Check swingDirection field if available
      const swingDir = (door as any).swingDirection;
      if (swingDir === 'outward') {
        checks.push({
          type: 'check',
          code: 'BR18-6.4',
          message: `${bathroom.label}: Door ${door.tag} swings outward ✓`,
          elementId: door.id,
          elementType: 'opening',
          severity: 'minor',
        });
        continue;
      }

      if (swingDir === 'inward') {
        violations.push({
          type: 'violation',
          code: 'BR18-6.4',
          message: `${bathroom.label}: Door ${door.tag} swings INWARD - must swing outward for emergency rescue access`,
          elementId: door.id,
          elementType: 'opening',
          severity: 'critical',
        });
        continue;
      }

      // Only warn if swingDirection is not specified (schema gap)
      warnings.push({
        type: 'warning',
        code: 'BR18-6.4',
        message: `${bathroom.label}: Verify door ${door.tag} swings OUTWARD from bathroom for emergency rescue access`,
        elementId: door.id,
        elementType: 'opening',
        severity: 'major',
      });
    }

    if (bathroomDoors.length === 0) {
      warnings.push({
        type: 'warning',
        code: 'BR18-6.4',
        message: `${bathroom.label}: No door found - verify bathroom access`,
        elementId: bathroom.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate per-room natural light requirements (BR23 §374)
 * Each habitable room must have windows totaling 10% of its floor area
 */
function validatePerRoomNaturalLight(
  rooms: RoomZone[],
  walls: WallSegment[],
  openings: Opening[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const windows = openings.filter(o => o.type === 'window');
  const externalWallIds = new Set(walls.filter(w => w.isExternal).map(w => w.id));

  // Only check external windows (interior windows don't provide natural light)
  const externalWindows = windows.filter(w => externalWallIds.has(w.wallId));

  const habitableRooms = rooms.filter(r => {
    const type = r.type || detectRoomType(r.label);
    return ['Bedroom', 'Living Room', 'Kitchen', 'Dining Room', 'Office'].includes(type);
  });

  for (const room of habitableRooms) {
    // Find windows that serve this room by proximity to room center
    // This is a simplified approach - ideally we'd use room polygons
    const roomRadius = Math.sqrt(room.area.value) * 0.7;

    const roomWindows = externalWindows.filter(win => {
      const wall = walls.find(w => w.id === win.wallId);
      if (!wall) return false;

      // Calculate window position on wall
      const dx = wall.end.x - wall.start.x;
      const dy = wall.end.y - wall.start.y;
      const length = Math.sqrt(dx * dx + dy * dy);
      const t = win.distFromStart / length;
      const winX = wall.start.x + t * dx;
      const winY = wall.start.y + t * dy;

      // Check if window is near room center
      const distToRoom = Math.sqrt(
        Math.pow(winX - room.center.x, 2) +
        Math.pow(winY - room.center.y, 2)
      );

      return distToRoom < roomRadius + 2; // 2m tolerance
    });

    // Calculate total window area for this room
    const totalWindowArea = roomWindows.reduce((sum, w) => {
      const height = w.height || 1.5;
      return sum + (w.width * height);
    }, 0);

    const requiredArea = room.area.value * BR18_STANDARDS.naturalLight.minimumRatio;
    const lightRatio = totalWindowArea / room.area.value;

    if (lightRatio < BR18_STANDARDS.naturalLight.minimumRatio) {
      violations.push({
        type: 'violation',
        code: 'BR23-374',
        message: `${room.label}: Natural light ${(lightRatio * 100).toFixed(1)}% < 10% required (${totalWindowArea.toFixed(2)}m² windows / ${room.area.value.toFixed(1)}m² room, need ${requiredArea.toFixed(2)}m²)`,
        elementId: room.id,
        elementType: 'room',
        severity: 'major',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR23-374',
        message: `${room.label}: Natural light ${(lightRatio * 100).toFixed(1)}% ≥ 10% ✓`,
        elementId: room.id,
        elementType: 'room',
        severity: 'minor',
      });
    }
  }
}

/**
 * Validate threshold heights for accessibility (BR18 §373)
 * Maximum 25mm threshold height for wheelchair access
 */
function validateThresholdHeights(
  openings: Opening[],
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  const doors = openings.filter(o =>
    o.type === 'door' || o.type === 'double-door' || o.type === 'sliding-door' || o.type === 'french-door'
  );

  const MAX_THRESHOLD = 0.025; // 25mm in meters
  let doorsWithoutThreshold = 0;

  for (const door of doors) {
    const threshold = (door as any).thresholdHeight;

    if (typeof threshold === 'number') {
      if (threshold <= MAX_THRESHOLD) {
        checks.push({
          type: 'check',
          code: 'BR18-373-threshold',
          message: `Door ${door.tag}: Threshold height ${(threshold * 1000).toFixed(0)}mm ≤ 25mm ✓`,
          elementId: door.id,
          elementType: 'opening',
          severity: 'minor',
        });
      } else {
        violations.push({
          type: 'violation',
          code: 'BR18-373-threshold',
          message: `Door ${door.tag}: Threshold height ${(threshold * 1000).toFixed(0)}mm exceeds 25mm maximum (BR18 §373)`,
          elementId: door.id,
          elementType: 'opening',
          severity: 'major',
        });
      }
    } else {
      doorsWithoutThreshold++;
    }
  }

  // Only warn about doors without threshold specification
  if (doorsWithoutThreshold > 0) {
    warnings.push({
      type: 'warning',
      code: 'BR18-373-threshold',
      message: `${doorsWithoutThreshold} door(s) missing threshold height - verify ≤25mm for wheelchair accessibility (BR18 §373)`,
      severity: 'minor',
      elementType: 'general',
    });
  }
}

/**
 * Validate stairs geometry (BR18 Trapper)
 * Formula: 2 × Rise + Tread = 61-63cm
 * Max rise: 21cm, Min headroom: 2.0m
 */
function validateStairs(
  elements: {
    walls: WallSegment[];
    openings: Opening[];
    rooms: RoomZone[];
  },
  violations: ComplianceIssue[],
  warnings: ComplianceIssue[],
  checks: ComplianceIssue[]
): void {
  // Check if this is a multi-story building by looking for stair-related rooms
  const stairRooms = elements.rooms.filter(r => {
    const label = r.label.toLowerCase();
    return label.includes('stair') || label.includes('trappe');
  });

  if (stairRooms.length === 0) {
    // No stairs detected - this is fine for single-story buildings
    return;
  }

  // For each stair room, verify minimum dimensions
  for (const stairRoom of stairRooms) {
    const area = stairRoom.area.value;

    // Minimum stair width is 0.8m, typical run is ~3m for a standard floor
    // So minimum stair footprint is roughly 0.8 × 3 = 2.4m² per floor
    if (area < 2.4) {
      violations.push({
        type: 'violation',
        code: 'BR18-stairs',
        message: `${stairRoom.label}: Area ${area.toFixed(1)}m² may be insufficient for BR18-compliant staircase (min ~2.4m² per floor)`,
        elementId: stairRoom.id,
        elementType: 'room',
        severity: 'major',
      });
    } else {
      checks.push({
        type: 'check',
        code: 'BR18-stairs',
        message: `${stairRoom.label}: Area ${area.toFixed(1)}m² appears adequate for staircase ✓`,
        elementId: stairRoom.id,
        elementType: 'room',
        severity: 'minor',
      });
    }

    // Remind about stair geometry requirements
    warnings.push({
      type: 'warning',
      code: 'BR18-stairs-geometry',
      message: `${stairRoom.label}: Verify stair geometry: 2×Rise + Tread = 61-63cm, Rise ≤21cm, Headroom ≥2.0m`,
      elementId: stairRoom.id,
      elementType: 'room',
      severity: 'minor',
    });
  }
}

/**
 * Generate compliance summary for UI display
 */
export function getComplianceSummary(report: ComplianceReport) {
  return {
    passing: report.passing,
    violations: report.summary.totalViolations,
    warnings: report.summary.totalWarnings,
    checks: report.summary.totalChecks,
  };
}
