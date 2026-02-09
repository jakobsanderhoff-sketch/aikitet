/**
 * Enhanced Professional AutoCAD DXF Export Engine
 * Generates DXF R12 format with full AIA layer standards and BlueprintData schema support
 * Features: Line weights, title blocks, proper hatching, blocks for doors/windows
 */

import type { BlueprintData, Sheet, WallSegment, Opening, RoomZone } from "@/schemas/blueprint.schema";

// Enhanced DXF Layer definitions following strict AIA standards
const DXF_LAYERS = {
  WALL: { name: "A-WALL", color: 7, lineweight: 70, lineType: "CONTINUOUS" }, // White, 0.70mm
  DOOR: { name: "A-DOOR", color: 4, lineweight: 35, lineType: "CONTINUOUS" }, // Cyan, 0.35mm
  WIND: { name: "A-WIND", color: 5, lineweight: 35, lineType: "CONTINUOUS" }, // Blue, 0.35mm
  ANNO: { name: "A-ANNO", color: 2, lineweight: 13, lineType: "CONTINUOUS" }, // Yellow, 0.13mm
  FURN: { name: "A-FURN", color: 6, lineweight: 25, lineType: "CONTINUOUS" }, // Magenta, 0.25mm
  GRID: { name: "A-GRID", color: 1, lineweight: 13, lineType: "CENTER2" },    // Red, 0.13mm
};

// Professional DXF Hatch patterns
const DXF_HATCHES: Record<string, { pattern: string; scale: number; angle: number }> = {
  brick: { pattern: "ANSI31", scale: 0.5, angle: 45 },        // Diagonal 45°
  concrete: { pattern: "AR-CONC", scale: 1.0, angle: 0 },     // Concrete texture
  insulation: { pattern: "INSUL", scale: 0.3, angle: 0 },     // Insulation batting
  gasbeton: { pattern: "ANSI37", scale: 0.4, angle: 0 },      // Horizontal lines
  timber: { pattern: "WOOD", scale: 0.6, angle: 0 },          // Wood grain
  "vapor-barrier": { pattern: "ANSI31", scale: 0.2, angle: 0 },
  "gypsum-board": { pattern: "SOLID", scale: 1.0, angle: 0 },
  CLT: { pattern: "WOOD", scale: 0.5, angle: 90 },
  "steel-stud": { pattern: "ANSI32", scale: 0.3, angle: 0 },
};

/**
 * Generate enhanced DXF file from BlueprintData
 */
export function generateEnhancedDXF(blueprint: BlueprintData, sheetIndex: number = 0): string {
  const sheet = blueprint.sheets[sheetIndex];
  if (!sheet) {
    throw new Error(`Sheet ${sheetIndex} not found in blueprint`);
  }

  const dxf: string[] = [];

  // DXF Header with enhanced metadata
  addDXFHeader(dxf, blueprint, sheet);

  // Tables Section (Layers, Linetypes, Text Styles)
  addDXFTables(dxf);

  // Blocks Section (Door and Window blocks)
  addDXFBlocks(dxf);

  // Entities Section (the actual drawing)
  dxf.push("0", "SECTION");
  dxf.push("2", "ENTITIES");

  // Add sheet border and title block
  addSheetBorder(dxf, sheet);
  addTitleBlock(dxf, blueprint, sheet);

  // Export Walls with hatching
  sheet.elements.walls.forEach((wall) => {
    addWall(dxf, wall);
  });

  // Export Openings (Doors and Windows)
  sheet.elements.openings.forEach((opening) => {
    const wall = sheet.elements.walls.find((w) => w.id === opening.wallId);
    if (wall) {
      addOpening(dxf, opening, wall);
    }
  });

  // Export Room Labels
  sheet.elements.rooms.forEach((room) => {
    addRoomLabel(dxf, room);
  });

  // Export Dimensions (if present)
  if (sheet.elements.dimensions) {
    sheet.elements.dimensions.forEach((dim) => {
      addDimension(dxf, dim);
    });
  }

  dxf.push("0", "ENDSEC");
  dxf.push("0", "EOF");

  return dxf.join("\n");
}

/**
 * Add DXF Header with metadata
 */
function addDXFHeader(dxf: string[], blueprint: BlueprintData, sheet: Sheet): void {
  dxf.push("0", "SECTION");
  dxf.push("2", "HEADER");

  // AutoCAD version
  dxf.push("9", "$ACADVER");
  dxf.push("1", "AC1009"); // AutoCAD R12 (most compatible)

  // Units (meters)
  dxf.push("9", "$INSUNITS");
  dxf.push("70", "6"); // 6 = Meters

  // Drawing limits
  dxf.push("9", "$LIMMIN");
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");

  dxf.push("9", "$LIMMAX");
  dxf.push("10", "420.0"); // A3 width (mm)
  dxf.push("20", "297.0"); // A3 height (mm)

  // Title
  dxf.push("9", "$TITLE");
  dxf.push("1", `${sheet.number} ${sheet.title}`);

  dxf.push("0", "ENDSEC");
}

/**
 * Add Tables (Layers, Linetypes, Text Styles)
 */
function addDXFTables(dxf: string[]): void {
  dxf.push("0", "SECTION");
  dxf.push("2", "TABLES");

  // Linetypes
  dxf.push("0", "TABLE");
  dxf.push("2", "LTYPE");
  dxf.push("70", "2"); // 2 linetypes

  // CONTINUOUS
  dxf.push("0", "LTYPE");
  dxf.push("2", "CONTINUOUS");
  dxf.push("70", "0");
  dxf.push("3", "Solid line");
  dxf.push("72", "65");
  dxf.push("73", "0");
  dxf.push("40", "0.0");

  // CENTER2 (for grid lines)
  dxf.push("0", "LTYPE");
  dxf.push("2", "CENTER2");
  dxf.push("70", "0");
  dxf.push("3", "Center ____ _ ____ _ ____ _ ____ _ ____");
  dxf.push("72", "65");
  dxf.push("73", "4");
  dxf.push("40", "3.0");
  dxf.push("49", "1.25");
  dxf.push("49", "-0.25");
  dxf.push("49", "0.25");
  dxf.push("49", "-0.25");

  dxf.push("0", "ENDTAB");

  // Layers with line weights
  dxf.push("0", "TABLE");
  dxf.push("2", "LAYER");
  dxf.push("70", Object.keys(DXF_LAYERS).length.toString());

  Object.values(DXF_LAYERS).forEach((layer) => {
    dxf.push("0", "LAYER");
    dxf.push("2", layer.name);
    dxf.push("70", "0");
    dxf.push("62", layer.color.toString());
    dxf.push("6", layer.lineType);
    dxf.push("370", layer.lineweight.toString()); // Line weight in 1/100mm
  });

  dxf.push("0", "ENDTAB");

  // Text Styles
  dxf.push("0", "TABLE");
  dxf.push("2", "STYLE");
  dxf.push("70", "1");

  dxf.push("0", "STYLE");
  dxf.push("2", "STANDARD");
  dxf.push("70", "0");
  dxf.push("40", "0.0"); // Fixed height (0 = variable)
  dxf.push("41", "1.0"); // Width factor
  dxf.push("50", "0.0"); // Oblique angle
  dxf.push("71", "0");   // Text generation flags
  dxf.push("42", "0.2"); // Last height used
  dxf.push("3", "txt");  // Font filename
  dxf.push("4", "");     // Bigfont filename

  dxf.push("0", "ENDTAB");
  dxf.push("0", "ENDSEC");
}

/**
 * Add Blocks Section (Door and Window blocks)
 */
function addDXFBlocks(dxf: string[]): void {
  dxf.push("0", "SECTION");
  dxf.push("2", "BLOCKS");

  // Door Block (90° swing)
  dxf.push("0", "BLOCK");
  dxf.push("8", "0");
  dxf.push("2", "DOOR_90");
  dxf.push("70", "0");
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");
  dxf.push("30", "0.0");

  // Door leaf line
  dxf.push("0", "LINE");
  dxf.push("8", DXF_LAYERS.DOOR.name);
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");
  dxf.push("11", "0.9");
  dxf.push("21", "0.0");

  // Swing arc
  dxf.push("0", "ARC");
  dxf.push("8", DXF_LAYERS.DOOR.name);
  dxf.push("10", "0.0"); // Center X
  dxf.push("20", "0.0"); // Center Y
  dxf.push("40", "0.9"); // Radius
  dxf.push("50", "0.0"); // Start angle
  dxf.push("51", "90.0"); // End angle

  dxf.push("0", "ENDBLK");

  // Window Block (3-line symbol)
  dxf.push("0", "BLOCK");
  dxf.push("8", "0");
  dxf.push("2", "WINDOW_STD");
  dxf.push("70", "0");
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");
  dxf.push("30", "0.0");

  // Outer lines
  dxf.push("0", "LINE");
  dxf.push("8", DXF_LAYERS.WIND.name);
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");
  dxf.push("11", "1.2");
  dxf.push("21", "0.0");

  dxf.push("0", "LINE");
  dxf.push("8", DXF_LAYERS.WIND.name);
  dxf.push("10", "0.0");
  dxf.push("20", "0.15");
  dxf.push("11", "1.2");
  dxf.push("21", "0.15");

  // Middle glass line (thicker)
  dxf.push("0", "LINE");
  dxf.push("8", DXF_LAYERS.WIND.name);
  dxf.push("10", "0.0");
  dxf.push("20", "0.075");
  dxf.push("11", "1.2");
  dxf.push("21", "0.075");

  dxf.push("0", "ENDBLK");

  dxf.push("0", "ENDSEC");
}

/**
 * Add wall with hatching
 */
function addWall(dxf: string[], wall: WallSegment): void {
  const polygon = getWallPolygon(wall);

  // Wall outline
  dxf.push("0", "LWPOLYLINE");
  dxf.push("8", DXF_LAYERS.WALL.name);
  dxf.push("90", polygon.length.toString());
  dxf.push("70", "1"); // Closed

  polygon.forEach((point) => {
    dxf.push("10", point.x.toFixed(6));
    dxf.push("20", point.y.toFixed(6));
  });

  // Add hatch pattern
  const hatch = DXF_HATCHES[wall.material];
  if (hatch) {
    dxf.push("0", "HATCH");
    dxf.push("8", DXF_LAYERS.WALL.name);
    dxf.push("2", hatch.pattern);
    dxf.push("70", "0"); // Solid fill
    dxf.push("71", "0"); // Non-associative
    dxf.push("41", hatch.scale.toFixed(3)); // Pattern scale
    dxf.push("52", hatch.angle.toFixed(3)); // Pattern angle
    dxf.push("91", "1"); // Number of boundary paths
    dxf.push("92", "1"); // Polyline boundary
    dxf.push("72", "0"); // Has bulge
    dxf.push("73", "1"); // Closed
    dxf.push("93", polygon.length.toString());

    polygon.forEach((point) => {
      dxf.push("10", point.x.toFixed(6));
      dxf.push("20", point.y.toFixed(6));
    });

    dxf.push("75", "0"); // Hatch style (normal)
    dxf.push("76", "1"); // Hatch pattern type (predefined)
    dxf.push("98", "0"); // Seed points
  }
}

/**
 * Get wall polygon (4 corners)
 */
function getWallPolygon(wall: WallSegment): Array<{ x: number; y: number }> {
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
 * Add opening (door or window)
 */
function addOpening(dxf: string[], opening: Opening, wall: WallSegment): void {
  const position = calculateOpeningPosition(opening, wall);
  const rotation = getWallAngle(wall) * (180 / Math.PI);

  if (opening.type === 'door' || opening.type === 'sliding-door') {
    // Insert door block
    dxf.push("0", "INSERT");
    dxf.push("8", DXF_LAYERS.DOOR.name);
    dxf.push("2", "DOOR_90");
    dxf.push("10", position.x.toFixed(6));
    dxf.push("20", position.y.toFixed(6));
    dxf.push("41", (opening.width / 0.9).toFixed(6)); // X scale
    dxf.push("42", "1.0"); // Y scale
    dxf.push("50", rotation.toFixed(3)); // Rotation

    // Add tag
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.ANNO.name);
    dxf.push("10", position.x.toFixed(6));
    dxf.push("20", (position.y + 0.3).toFixed(6));
    dxf.push("40", "0.15"); // Text height
    dxf.push("1", opening.tag);
    dxf.push("50", rotation.toFixed(3));

  } else if (opening.type === 'window') {
    // Insert window block
    dxf.push("0", "INSERT");
    dxf.push("8", DXF_LAYERS.WIND.name);
    dxf.push("2", "WINDOW_STD");
    dxf.push("10", position.x.toFixed(6));
    dxf.push("20", position.y.toFixed(6));
    dxf.push("41", (opening.width / 1.2).toFixed(6)); // X scale
    dxf.push("42", "1.0"); // Y scale
    dxf.push("50", rotation.toFixed(3));

    // Add tag
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.ANNO.name);
    dxf.push("10", position.x.toFixed(6));
    dxf.push("20", (position.y - 0.3).toFixed(6));
    dxf.push("40", "0.15");
    dxf.push("1", opening.tag);
    dxf.push("50", rotation.toFixed(3));
  }
}

/**
 * Calculate opening position on wall
 */
function calculateOpeningPosition(opening: Opening, wall: WallSegment): { x: number; y: number } {
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const t = opening.distFromStart / length;

  return {
    x: wall.start.x + t * dx,
    y: wall.start.y + t * dy,
  };
}

/**
 * Get wall angle in radians
 */
function getWallAngle(wall: WallSegment): number {
  return Math.atan2(wall.end.y - wall.start.y, wall.end.x - wall.start.x);
}

/**
 * Add room label
 */
function addRoomLabel(dxf: string[], room: RoomZone): void {
  // Room name
  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", room.center.x.toFixed(6));
  dxf.push("20", (room.center.y + 0.6).toFixed(6));
  dxf.push("40", "0.35"); // Text height
  dxf.push("1", room.label.toUpperCase());
  dxf.push("72", "1"); // Horizontal center
  dxf.push("11", room.center.x.toFixed(6));
  dxf.push("21", (room.center.y + 0.6).toFixed(6));

  // Area
  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", room.center.x.toFixed(6));
  dxf.push("20", room.center.y.toFixed(6));
  dxf.push("40", "0.25");
  dxf.push("1", `${room.area.value.toFixed(1)} ${room.area.unit}`);
  dxf.push("72", "1");
  dxf.push("11", room.center.x.toFixed(6));
  dxf.push("21", room.center.y.toFixed(6));

  // Flooring
  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", room.center.x.toFixed(6));
  dxf.push("20", (room.center.y - 0.5).toFixed(6));
  dxf.push("40", "0.20");
  dxf.push("1", room.flooring.replace('-', ' '));
  dxf.push("72", "1");
  dxf.push("11", room.center.x.toFixed(6));
  dxf.push("21", (room.center.y - 0.5).toFixed(6));
}

/**
 * Add dimension
 */
function addDimension(dxf: string[], dim: any): void {
  // Simplified linear dimension
  dxf.push("0", "LINE");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", dim.start.x.toFixed(6));
  dxf.push("20", dim.start.y.toFixed(6));
  dxf.push("11", dim.end.x.toFixed(6));
  dxf.push("21", dim.end.y.toFixed(6));

  // Dimension text
  const midX = (dim.start.x + dim.end.x) / 2;
  const midY = (dim.start.y + dim.end.y) / 2;

  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", midX.toFixed(6));
  dxf.push("20", midY.toFixed(6));
  dxf.push("40", "0.20");
  dxf.push("1", `${dim.value.toFixed(2)}m`);
  dxf.push("72", "1");
  dxf.push("11", midX.toFixed(6));
  dxf.push("21", midY.toFixed(6));
}

/**
 * Add sheet border (A3 format)
 */
function addSheetBorder(dxf: string[], sheet: Sheet): void {
  // Outer border
  dxf.push("0", "LWPOLYLINE");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("90", "4");
  dxf.push("70", "1");
  dxf.push("10", "0.0");
  dxf.push("20", "0.0");
  dxf.push("10", "420.0");
  dxf.push("20", "0.0");
  dxf.push("10", "420.0");
  dxf.push("20", "297.0");
  dxf.push("10", "0.0");
  dxf.push("20", "297.0");

  // Inner border (10mm margin)
  dxf.push("0", "LWPOLYLINE");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("90", "4");
  dxf.push("70", "1");
  dxf.push("10", "10.0");
  dxf.push("20", "10.0");
  dxf.push("10", "410.0");
  dxf.push("20", "10.0");
  dxf.push("10", "410.0");
  dxf.push("20", "287.0");
  dxf.push("10", "10.0");
  dxf.push("20", "287.0");

  // Scale indicator (bottom left)
  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", "15.0");
  dxf.push("20", "15.0");
  dxf.push("40", "3.0");
  dxf.push("1", `SCALE ${sheet.scale}`);

  // Sheet number (top right)
  dxf.push("0", "TEXT");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("10", "380.0");
  dxf.push("20", "280.0");
  dxf.push("40", "4.0");
  dxf.push("1", sheet.number);
  dxf.push("72", "2"); // Right aligned
  dxf.push("11", "380.0");
  dxf.push("21", "280.0");
}

/**
 * Add title block (bottom right)
 */
function addTitleBlock(dxf: string[], blueprint: BlueprintData, sheet: Sheet): void {
  const x = 280.0; // Starting X
  const y = 10.0;  // Starting Y
  const width = 120.0;
  const height = 40.0;

  // Title block border
  dxf.push("0", "LWPOLYLINE");
  dxf.push("8", DXF_LAYERS.ANNO.name);
  dxf.push("90", "4");
  dxf.push("70", "1");
  dxf.push("10", x.toFixed(1));
  dxf.push("20", y.toFixed(1));
  dxf.push("10", (x + width).toFixed(1));
  dxf.push("20", y.toFixed(1));
  dxf.push("10", (x + width).toFixed(1));
  dxf.push("20", (y + height).toFixed(1));
  dxf.push("10", x.toFixed(1));
  dxf.push("20", (y + height).toFixed(1));

  // Fields
  const fields = [
    { label: "PROJECT:", value: blueprint.projectName, y: y + 35 },
    { label: "SHEET:", value: `${sheet.number} ${sheet.title}`, y: y + 29 },
    { label: "SCALE:", value: sheet.scale, y: y + 23 },
    { label: "DATE:", value: new Date().toISOString().split('T')[0], y: y + 17 },
    { label: "CODE:", value: blueprint.buildingCode, y: y + 11 },
  ];

  fields.forEach(field => {
    // Label
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.ANNO.name);
    dxf.push("10", (x + 2).toFixed(1));
    dxf.push("20", field.y.toFixed(1));
    dxf.push("40", "2.0");
    dxf.push("1", field.label);

    // Value
    dxf.push("0", "TEXT");
    dxf.push("8", DXF_LAYERS.ANNO.name);
    dxf.push("10", (x + 25).toFixed(1));
    dxf.push("20", field.y.toFixed(1));
    dxf.push("40", "2.0");
    dxf.push("1", field.value);
  });
}

/**
 * Trigger browser download of enhanced DXF file
 */
export function downloadEnhancedDXF(
  blueprint: BlueprintData,
  sheetIndex: number = 0,
  filename?: string
): void {
  const sheet = blueprint.sheets[sheetIndex];
  const defaultFilename = `${sheet.number.replace('-', '_')}_${blueprint.projectName.replace(/\s+/g, '_')}.dxf`;

  const dxfContent = generateEnhancedDXF(blueprint, sheetIndex);
  const blob = new Blob([dxfContent], { type: "application/dxf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || defaultFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
