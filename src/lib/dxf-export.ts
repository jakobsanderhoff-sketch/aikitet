/**
 * Professional AutoCAD DXF Export Engine
 * Generates DXF R12 format compatible with AutoCAD and all major CAD software
 * Follows AIA layer naming standards and proper architectural conventions
 */

import { FloorPlanData } from "@/types/floorplan";

// DXF Layer definitions following AIA standards
const DXF_LAYERS = {
  WALL_EXT: { name: "A-WALL-EXT", color: 4, lineType: "CONTINUOUS" }, // Cyan
  WALL_INT: { name: "A-WALL-INT", color: 5, lineType: "CONTINUOUS" }, // Blue
  WALL_PRT: { name: "A-WALL-PRT", color: 7, lineType: "CONTINUOUS" }, // White
  GLAZ: { name: "A-GLAZ", color: 150, lineType: "CONTINUOUS" }, // Light blue
  DOOR: { name: "A-DOOR", color: 2, lineType: "CONTINUOUS" }, // Yellow
  FLOOR: { name: "A-FLOR", color: 8, lineType: "CONTINUOUS" }, // Gray
  TEXT: { name: "A-ANNO-TEXT", color: 7, lineType: "CONTINUOUS" }, // White
  DIMS: { name: "A-ANNO-DIMS", color: 1, lineType: "CONTINUOUS" }, // Red
};

// DXF Hatch patterns
const DXF_HATCHES = {
  BRICK: "ANSI31", // Diagonal 45°
  CONCRETE: "ANSI32", // Cross-hatch
  INSULATION: "HONEY", // Hexagonal
  PARTITION: "SOLID", // Solid fill (light)
};

/**
 * Generate DXF file from floor plan data
 */
export function generateDXF(floorPlan: FloorPlanData): string {
  const dxf: string[] = [];

  // DXF Header
  dxf.push("0", "SECTION");
  dxf.push("2", "HEADER");
  dxf.push("9", "$ACADVER");
  dxf.push("1", "AC1009"); // AutoCAD R12
  dxf.push("9", "$INSUNITS");
  dxf.push("70", "6"); // Meters
  dxf.push("0", "ENDSEC");

  // Tables Section (Layers, Linetypes)
  dxf.push("0", "SECTION");
  dxf.push("2", "TABLES");

  // Linetypes
  dxf.push("0", "TABLE");
  dxf.push("2", "LTYPE");
  dxf.push("70", "1");
  dxf.push("0", "LTYPE");
  dxf.push("2", "CONTINUOUS");
  dxf.push("70", "0");
  dxf.push("3", "Solid line");
  dxf.push("72", "65");
  dxf.push("73", "0");
  dxf.push("40", "0.0");
  dxf.push("0", "ENDTAB");

  // Layers
  dxf.push("0", "TABLE");
  dxf.push("2", "LAYER");
  dxf.push("70", Object.keys(DXF_LAYERS).length.toString());

  Object.values(DXF_LAYERS).forEach((layer) => {
    dxf.push("0", "LAYER");
    dxf.push("2", layer.name);
    dxf.push("70", "0");
    dxf.push("62", layer.color.toString());
    dxf.push("6", layer.lineType);
  });

  dxf.push("0", "ENDTAB");
  dxf.push("0", "ENDSEC");

  // Entities Section
  dxf.push("0", "SECTION");
  dxf.push("2", "ENTITIES");

  // Export Walls
  floorPlan.walls.forEach((wall) => {
    const polygon = getWallPolygonPoints(wall);
    const layerName = getWallLayer(wall);

    // Wall as closed polyline
    dxf.push("0", "LWPOLYLINE");
    dxf.push("8", layerName);
    dxf.push("90", polygon.length.toString()); // Number of vertices
    dxf.push("70", "1"); // Closed polyline

    polygon.forEach((point) => {
      dxf.push("10", point.x.toFixed(6));
      dxf.push("20", point.y.toFixed(6));
    });

    // Add hatch pattern for wall material
    const hatchPattern = getHatchPattern(wall.material);
    if (hatchPattern) {
      dxf.push("0", "HATCH");
      dxf.push("8", layerName);
      dxf.push("2", hatchPattern);
      dxf.push("70", "1"); // Solid fill
      dxf.push("71", "0"); // Non-associative
      dxf.push("91", "1"); // Number of boundary paths
      dxf.push("92", "1"); // Polyline boundary
      dxf.push("72", "0"); // Has bulge
      dxf.push("73", "1"); // Closed
      dxf.push("93", polygon.length.toString());

      polygon.forEach((point) => {
        dxf.push("10", point.x.toFixed(6));
        dxf.push("20", point.y.toFixed(6));
      });

      dxf.push("47", "0.05"); // Pattern scale
      dxf.push("98", "0"); // Seed points
    }
  });

  // Export Doors
  floorPlan.openings
    .filter((o) => o.type === "door")
    .forEach((opening) => {
      const wall = floorPlan.walls.find((w) => w.id === opening.wallId);
      if (!wall) return;

      const doorGeometry = calculateDoorGeometry(wall, opening);

      // Door opening (clear area)
      dxf.push("0", "LWPOLYLINE");
      dxf.push("8", DXF_LAYERS.DOOR.name);
      dxf.push("90", "4");
      dxf.push("70", "1");

      doorGeometry.opening.forEach((point) => {
        dxf.push("10", point.x.toFixed(6));
        dxf.push("20", point.y.toFixed(6));
      });

      // Door swing arc
      dxf.push("0", "ARC");
      dxf.push("8", DXF_LAYERS.DOOR.name);
      dxf.push("10", doorGeometry.hinge.x.toFixed(6));
      dxf.push("20", doorGeometry.hinge.y.toFixed(6));
      dxf.push("40", opening.width.toFixed(6)); // Radius
      dxf.push("50", "0"); // Start angle
      dxf.push("51", "90"); // End angle

      // Door leaf
      dxf.push("0", "LINE");
      dxf.push("8", DXF_LAYERS.DOOR.name);
      dxf.push("10", doorGeometry.hinge.x.toFixed(6));
      dxf.push("20", doorGeometry.hinge.y.toFixed(6));
      dxf.push("11", doorGeometry.leaf.x.toFixed(6));
      dxf.push("21", doorGeometry.leaf.y.toFixed(6));
    });

  // Export Windows
  floorPlan.openings
    .filter((o) => o.type === "window")
    .forEach((opening) => {
      const wall = floorPlan.walls.find((w) => w.id === opening.wallId);
      if (!wall) return;

      const windowGeometry = calculateWindowGeometry(wall, opening);

      // Window opening
      dxf.push("0", "LWPOLYLINE");
      dxf.push("8", DXF_LAYERS.GLAZ.name);
      dxf.push("90", "4");
      dxf.push("70", "1");

      windowGeometry.opening.forEach((point) => {
        dxf.push("10", point.x.toFixed(6));
        dxf.push("20", point.y.toFixed(6));
      });

      // Window frame lines (3 parallel lines)
      windowGeometry.frameLines.forEach((line) => {
        dxf.push("0", "LINE");
        dxf.push("8", DXF_LAYERS.GLAZ.name);
        dxf.push("10", line.start.x.toFixed(6));
        dxf.push("20", line.start.y.toFixed(6));
        dxf.push("11", line.end.x.toFixed(6));
        dxf.push("21", line.end.y.toFixed(6));
      });
    });

  // Export Room Labels
  floorPlan.rooms?.forEach((room) => {
    // Room name
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.TEXT.name);
    dxf.push("10", room.center.x.toFixed(6));
    dxf.push("20", room.center.y.toFixed(6));
    dxf.push("40", "0.3"); // Text height
    dxf.push("1", room.label); // Text content
    dxf.push("72", "1"); // Horizontal alignment (center)
    dxf.push("11", room.center.x.toFixed(6)); // Alignment point
    dxf.push("21", room.center.y.toFixed(6));

    // Room area
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.TEXT.name);
    dxf.push("10", room.center.x.toFixed(6));
    dxf.push("20", (room.center.y - 0.4).toFixed(6));
    dxf.push("40", "0.2");
    dxf.push("1", `${room.area.value.toFixed(1)} ${room.area.unit}`);
    dxf.push("72", "1");
    dxf.push("11", room.center.x.toFixed(6));
    dxf.push("21", (room.center.y - 0.4).toFixed(6));
  });

  // Export Dimensions (exterior bounds)
  const bounds = calculateBounds(floorPlan.walls);

  // Horizontal dimension (bottom)
  dxf.push("0", "DIMENSION");
  dxf.push("8", DXF_LAYERS.DIMS.name);
  dxf.push("2", "*D1");
  dxf.push("10", ((bounds.minX + bounds.maxX) / 2).toFixed(6)); // Dimension line location
  dxf.push("20", (bounds.minY - 0.5).toFixed(6));
  dxf.push("30", "0.0");
  dxf.push("13", bounds.minX.toFixed(6)); // First extension line
  dxf.push("23", bounds.minY.toFixed(6));
  dxf.push("14", bounds.maxX.toFixed(6)); // Second extension line
  dxf.push("24", bounds.minY.toFixed(6));

  // Vertical dimension (left)
  dxf.push("0", "DIMENSION");
  dxf.push("8", DXF_LAYERS.DIMS.name);
  dxf.push("2", "*D2");
  dxf.push("10", (bounds.minX - 0.5).toFixed(6));
  dxf.push("20", ((bounds.minY + bounds.maxY) / 2).toFixed(6));
  dxf.push("30", "0.0");
  dxf.push("13", bounds.minX.toFixed(6));
  dxf.push("23", bounds.minY.toFixed(6));
  dxf.push("14", bounds.minX.toFixed(6));
  dxf.push("24", bounds.maxY.toFixed(6));

  dxf.push("0", "ENDSEC");
  dxf.push("0", "EOF");

  return dxf.join("\n");
}

/**
 * Helper: Get wall polygon points (4 corners)
 */
function getWallPolygonPoints(wall: any): Array<{ x: number; y: number }> {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const perpX = (-dy / length) * (wall.thickness / 2);
  const perpY = (dx / length) * (wall.thickness / 2);

  return [
    { x: wall.start.x + perpX, y: wall.start.y + perpY },
    { x: wall.end.x + perpX, y: wall.end.y + perpY },
    { x: wall.end.x - perpX, y: wall.end.y - perpY },
    { x: wall.start.x - perpX, y: wall.start.y - perpY },
  ];
}

/**
 * Helper: Determine wall layer based on type
 */
function getWallLayer(wall: any): string {
  if (wall.isExternal || wall.material === "brick") return DXF_LAYERS.WALL_EXT.name;
  if (wall.thickness >= 0.3) return DXF_LAYERS.WALL_INT.name;
  return DXF_LAYERS.WALL_PRT.name;
}

/**
 * Helper: Get hatch pattern for material
 */
function getHatchPattern(material: string): string | null {
  const patterns: Record<string, string> = {
    brick: DXF_HATCHES.BRICK,
    concrete: DXF_HATCHES.CONCRETE,
    insulation: DXF_HATCHES.INSULATION,
    partition: DXF_HATCHES.PARTITION,
  };
  return patterns[material] || null;
}

/**
 * Helper: Calculate door geometry
 */
function calculateDoorGeometry(wall: any, opening: any) {
  const wallLength = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)
  );

  const t = opening.distFromStart / wallLength;
  const centerX = wall.start.x + t * (wall.end.x - wall.start.x);
  const centerY = wall.start.y + t * (wall.end.y - wall.start.y);

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const dirX = dx / wallLength;
  const dirY = dy / wallLength;
  const perpX = -dirY;
  const perpY = dirX;

  const halfWidth = opening.width / 2;
  const halfThickness = wall.thickness / 2;

  return {
    opening: [
      { x: centerX - dirX * halfWidth + perpX * halfThickness, y: centerY - dirY * halfWidth + perpY * halfThickness },
      { x: centerX + dirX * halfWidth + perpX * halfThickness, y: centerY + dirY * halfWidth + perpY * halfThickness },
      { x: centerX + dirX * halfWidth - perpX * halfThickness, y: centerY + dirY * halfWidth - perpY * halfThickness },
      { x: centerX - dirX * halfWidth - perpX * halfThickness, y: centerY - dirY * halfWidth - perpY * halfThickness },
    ],
    hinge: { x: centerX - dirX * halfWidth, y: centerY - dirY * halfWidth },
    leaf: { x: centerX - dirX * halfWidth + perpX * opening.width, y: centerY - dirY * halfWidth + perpY * opening.width },
  };
}

/**
 * Helper: Calculate window geometry
 */
function calculateWindowGeometry(wall: any, opening: any) {
  const wallLength = Math.sqrt(
    Math.pow(wall.end.x - wall.start.x, 2) + Math.pow(wall.end.y - wall.start.y, 2)
  );

  const t = opening.distFromStart / wallLength;
  const centerX = wall.start.x + t * (wall.end.x - wall.start.x);
  const centerY = wall.start.y + t * (wall.end.y - wall.start.y);

  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const dirX = dx / wallLength;
  const dirY = dy / wallLength;
  const perpX = -dirY;
  const perpY = dirX;

  const halfWidth = opening.width / 2;
  const halfThickness = wall.thickness / 2;

  return {
    opening: [
      { x: centerX - dirX * halfWidth + perpX * halfThickness, y: centerY - dirY * halfWidth + perpY * halfThickness },
      { x: centerX + dirX * halfWidth + perpX * halfThickness, y: centerY + dirY * halfWidth + perpY * halfThickness },
      { x: centerX + dirX * halfWidth - perpX * halfThickness, y: centerY + dirY * halfWidth - perpY * halfThickness },
      { x: centerX - dirX * halfWidth - perpX * halfThickness, y: centerY - dirY * halfWidth - perpY * halfThickness },
    ],
    frameLines: [
      {
        start: { x: centerX - dirX * halfWidth + perpX * halfThickness, y: centerY - dirY * halfWidth + perpY * halfThickness },
        end: { x: centerX + dirX * halfWidth + perpX * halfThickness, y: centerY + dirY * halfWidth + perpY * halfThickness },
      },
      {
        start: { x: centerX - dirX * halfWidth, y: centerY - dirY * halfWidth },
        end: { x: centerX + dirX * halfWidth, y: centerY + dirY * halfWidth },
      },
      {
        start: { x: centerX - dirX * halfWidth - perpX * halfThickness, y: centerY - dirY * halfWidth - perpY * halfThickness },
        end: { x: centerX + dirX * halfWidth - perpX * halfThickness, y: centerY + dirY * halfWidth - perpY * halfThickness },
      },
    ],
  };
}

/**
 * Helper: Calculate bounding box
 */
function calculateBounds(walls: any[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

  walls.forEach((w) => {
    minX = Math.min(minX, w.start.x, w.end.x);
    minY = Math.min(minY, w.start.y, w.end.y);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    maxY = Math.max(maxY, w.start.y, w.end.y);
  });

  return { minX, minY, maxX, maxY };
}

/**
 * Trigger browser download of DXF file
 */
export function downloadDXF(floorPlan: FloorPlanData, filename: string = "floor-plan.dxf") {
  const dxfContent = generateDXF(floorPlan);
  const blob = new Blob([dxfContent], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
