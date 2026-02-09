// Use minimal type definitions to be compatible with both floorplan and blueprint types
interface Point {
  x: number;
  y: number;
}

interface WallLike {
  start: Point;
  end: Point;
  thickness: number;
}

interface OpeningLike {
  width: number;
  distFromStart: number;
}

// --- Math Helpers ---

export function rotatePoint(p: Point, center: Point, angleRad: number): Point {
  const cos = Math.cos(angleRad);
  const sin = Math.sin(angleRad);
  const dx = p.x - center.x;
  const dy = p.y - center.y;
  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

export function angleOf(start: Point, end: Point): number {
  return Math.atan2(end.y - start.y, end.x - start.x);
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

export function addPoints(p1: Point, p2: Point): Point {
  return { x: p1.x + p2.x, y: p1.y + p2.y };
}

export function scaleVector(v: Point, s: number): Point {
  return { x: v.x * s, y: v.y * s };
}

// --- Wall Geometry ---

// Returns the 4 corners of a wall segment (rect) based on thickness
export function getWallPolygon(wall: WallLike): Point[] {
  const angle = angleOf(wall.start, wall.end);
  const halfThick = wall.thickness / 2;

  // Perpendicular vector for thickness
  const perpAngle = angle + Math.PI / 2;
  const dx = Math.cos(perpAngle) * halfThick;
  const dy = Math.sin(perpAngle) * halfThick;

  const p1 = { x: wall.start.x + dx, y: wall.start.y + dy };
  const p2 = { x: wall.end.x + dx, y: wall.end.y + dy };
  const p3 = { x: wall.end.x - dx, y: wall.end.y - dy };
  const p4 = { x: wall.start.x - dx, y: wall.start.y - dy };

  return [p1, p2, p3, p4];
}

// --- Symbol Helpers ---

export function getOpeningGeometry(wall: WallLike, opening: OpeningLike) {
  const angle = angleOf(wall.start, wall.end);
  const totalLength = distance(wall.start, wall.end);

  // Calculate center of opening along the wall
  // opening.distFromStart is in meters
  const ratio = Math.min(1, Math.max(0, opening.distFromStart / totalLength));

  const cx = wall.start.x + (wall.end.x - wall.start.x) * ratio;
  const cy = wall.start.y + (wall.end.y - wall.start.y) * ratio;
  const center = { x: cx, y: cy };

  return {
    center,
    angle,
    width: opening.width,
    thickness: wall.thickness,
  };
}

// Generate SVG path for a door swing (local space — caller's group rotation handles wall alignment)
export function getDoorPath(center: Point, width: number, _wallAngle: number, swing: 'left' | 'right' = 'left'): { leaf: string; arc: string; hinge: Point } {
  // Compute in LOCAL space (wall runs along x-axis, horizontal).
  // The caller wraps the result in <g transform="rotate(angleDeg, cx, cy)">,
  // so we must NOT incorporate the wall angle here — it would be applied twice.

  const halfWidth = width / 2;

  // Hinge at left side of the opening (along the wall)
  const hinge: Point = {
    x: center.x - halfWidth,
    y: center.y,
  };

  // Closed position at right side of the opening
  const latchClosed: Point = {
    x: center.x + halfWidth,
    y: center.y,
  };

  // Open position: 90° perpendicular to wall
  // 'left'  → swings into -y (after group rotation: "left" side of wall direction)
  // 'right' → swings into +y (after group rotation: "right" side of wall direction)
  const latchOpen: Point = {
    x: hinge.x,
    y: swing === 'left' ? center.y - width : center.y + width,
  };

  // Door leaf: line from hinge to open position
  const leafPath = `M ${hinge.x},${hinge.y} L ${latchOpen.x},${latchOpen.y}`;

  // Arc from closed to open position
  const sweepFlag = swing === 'left' ? 0 : 1;
  const arcPath = `M ${latchClosed.x},${latchClosed.y} A ${width} ${width} 0 0 ${sweepFlag} ${latchOpen.x},${latchOpen.y}`;

  return { leaf: leafPath, arc: arcPath, hinge };
}

export function polygonToPath(points: Point[], scale: number = 1): string {
  if (!points || points.length === 0) return "";

  const s = (val: number) => val * scale;

  const start = points[0];
  const rest = points.slice(1);
  return `M ${s(start.x)},${s(start.y)} ${rest.map((p) => `L ${s(p.x)},${s(p.y)}`).join(" ")} Z`;
}

/**
 * Generate window geometry for rendering
 * Returns opening polygon (to cut through wall) and frame path
 */
export function getWindowPath(
  wall: { start: Point; end: Point; thickness: number },
  opening: { width: number; position: number },
  scale: number = 1
): { opening: Point[]; frame: string } {
  const angle = angleOf(wall.start, wall.end);
  const totalLength = distance(wall.start, wall.end);

  // Calculate center of window along the wall
  const ratio = Math.min(1, Math.max(0, opening.position));
  const cx = wall.start.x + (wall.end.x - wall.start.x) * ratio;
  const cy = wall.start.y + (wall.end.y - wall.start.y) * ratio;

  const halfWidth = opening.width / 2;
  const halfThick = wall.thickness / 2;

  // Direction vectors
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);
  const px = Math.cos(angle + Math.PI / 2);
  const py = Math.sin(angle + Math.PI / 2);

  // Opening polygon (rectangular cut through wall)
  const openingPolygon: Point[] = [
    { x: cx - dx * halfWidth + px * halfThick, y: cy - dy * halfWidth + py * halfThick },
    { x: cx + dx * halfWidth + px * halfThick, y: cy + dy * halfWidth + py * halfThick },
    { x: cx + dx * halfWidth - px * halfThick, y: cy + dy * halfWidth - py * halfThick },
    { x: cx - dx * halfWidth - px * halfThick, y: cy - dy * halfWidth - py * halfThick },
  ];

  // Frame path (3 parallel lines representing glass in wall)
  const glassOffset = halfThick * 0.3; // Glass position within wall
  const s = (val: number) => val * scale;

  const frame = [
    // Top line (outer wall edge)
    `M ${s(cx - dx * halfWidth + px * halfThick)},${s(cy - dy * halfWidth + py * halfThick)}`,
    `L ${s(cx + dx * halfWidth + px * halfThick)},${s(cy + dy * halfWidth + py * halfThick)}`,
    // Middle line (glass)
    `M ${s(cx - dx * halfWidth)},${s(cy - dy * halfWidth)}`,
    `L ${s(cx + dx * halfWidth)},${s(cy + dy * halfWidth)}`,
    // Bottom line (inner wall edge)
    `M ${s(cx - dx * halfWidth - px * halfThick)},${s(cy - dy * halfWidth - py * halfThick)}`,
    `L ${s(cx + dx * halfWidth - px * halfThick)},${s(cy + dy * halfWidth - py * halfThick)}`,
  ].join(' ');

  return { opening: openingPolygon, frame };
}
