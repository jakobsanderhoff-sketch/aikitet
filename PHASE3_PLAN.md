# 🎨 Phase 3: Enhanced DXF Export with AutoCAD Layers

**Goal:** Generate AutoCAD-compatible .dxf files with professional layer standards, blocks, line weights, and annotations.

**Status:** 🚧 In Progress
**Started:** January 12, 2026

---

## 🎯 Objective

Transform the basic DXF export into **professional AutoCAD-quality output** that:
- Opens perfectly in AutoCAD 2024, DraftSight, and LibreCAD
- Uses proper AIA layer standards (A-WALL, A-DOOR, A-WIND, A-ANNO)
- Includes material hatching patterns
- Has correct line weights (0.7mm walls, 0.13mm annotations)
- Contains reusable blocks for doors/windows
- Includes text annotations and dimensions
- Has a professional title block

---

## 📋 Master Checklist (11 Tasks)

### **Foundation** (1 task)
- [ ] **Task 1:** Read and analyze existing DXF export implementation

### **Layer System** (1 task)
- [ ] **Task 2:** Implement AutoCAD layer creation with colors and line types

### **Geometry Rendering** (3 tasks)
- [ ] **Task 3:** Add wall rendering with material hatching patterns
- [ ] **Task 4:** Implement door blocks with swing arcs
- [ ] **Task 5:** Implement window blocks with proper symbols

### **Annotations** (2 tasks)
- [ ] **Task 6:** Add room labels on A-ANNO layer
- [ ] **Task 7:** Add dimensions on A-ANNO layer

### **Professional Features** (3 tasks)
- [ ] **Task 8:** Implement proper line weights
- [ ] **Task 9:** Add title block with project metadata
- [ ] **Task 10:** Add sheet border and scale indicator

### **Testing** (1 task)
- [ ] **Task 11:** Test DXF in AutoCAD/DraftSight/LibreCAD

---

## 🏗️ AutoCAD Standards Reference

### **AIA Layer Naming Convention**

```
A-WALL    → Walls (cut elements)
A-DOOR    → Doors
A-WIND    → Windows
A-ANNO    → Annotations (text, dimensions)
A-FURN    → Furniture
A-GRID    → Column grids
A-AREA    → Area calculations
A-DETL    → Detail references
```

### **Layer Properties**

| Layer | Color | Lineweight | Linetype |
|-------|-------|------------|----------|
| A-WALL | White (7) | 0.70mm | CONTINUOUS |
| A-DOOR | Cyan (4) | 0.35mm | CONTINUOUS |
| A-WIND | Blue (5) | 0.35mm | CONTINUOUS |
| A-ANNO | Yellow (2) | 0.13mm | CONTINUOUS |
| A-FURN | Magenta (6) | 0.25mm | CONTINUOUS |
| A-GRID | Red (1) | 0.13mm | CENTER2 |

### **Line Weights (ISO Standards)**

```
0.70mm → Cut walls (thick, prominent)
0.50mm → Partitions (medium)
0.35mm → Doors/Windows (visible)
0.25mm → Furniture (light)
0.13mm → Annotations, dimensions (thin)
0.05mm → Grid lines (very thin)
```

### **Text Heights (at 1:50 scale)**

```
Room Names:       3.5mm (will print at 175mm)
Room Areas:       2.5mm (will print at 125mm)
Dimensions:       2.0mm (will print at 100mm)
Door/Window Tags: 2.0mm (will print at 100mm)
Notes:            1.8mm (will print at 90mm)
```

---

## 📐 Detailed Task Breakdown

### **Task 1: Analyze Existing Implementation** ⏱️ Est: 15 min

**File to Review:** `src/lib/dxf-export.ts`

**What to Check:**
- Current DXF structure
- Existing entity types
- Coordinate system
- Scaling logic
- Dependencies

**Progress:** 0/1 ☐

---

### **Task 2: Layer System** ⏱️ Est: 30 min

**Implementation:**
```typescript
function createLayers(doc: DxfWriter): void {
  // A-WALL Layer
  doc.addLayer('A-WALL', 7, 'CONTINUOUS'); // White, continuous
  doc.setLineWeight('A-WALL', 0.70);

  // A-DOOR Layer
  doc.addLayer('A-DOOR', 4, 'CONTINUOUS'); // Cyan
  doc.setLineWeight('A-DOOR', 0.35);

  // A-WIND Layer
  doc.addLayer('A-WIND', 5, 'CONTINUOUS'); // Blue
  doc.setLineWeight('A-WIND', 0.35);

  // A-ANNO Layer
  doc.addLayer('A-ANNO', 2, 'CONTINUOUS'); // Yellow
  doc.setLineWeight('A-ANNO', 0.13);

  // A-FURN Layer (future)
  doc.addLayer('A-FURN', 6, 'CONTINUOUS'); // Magenta
  doc.setLineWeight('A-FURN', 0.25);
}
```

**AutoCAD Color Index:**
```
1 = Red
2 = Yellow
3 = Green
4 = Cyan
5 = Blue
6 = Magenta
7 = White/Black (depends on background)
```

**Progress:** 0/1 ☐

---

### **Task 3: Wall Rendering with Hatching** ⏱️ Est: 60 min

**Hatch Patterns by Material:**

```typescript
const HATCH_PATTERNS = {
  brick: {
    name: 'ANSI31',     // 45° diagonal lines
    scale: 0.5,
    angle: 45,
  },
  concrete: {
    name: 'AR-CONC',    // Concrete pattern
    scale: 1.0,
    angle: 0,
  },
  insulation: {
    name: 'INSUL',      // Insulation batting
    scale: 0.3,
    angle: 0,
  },
  gasbeton: {
    name: 'ANSI37',     // Horizontal lines
    scale: 0.4,
    angle: 0,
  },
  timber: {
    name: 'WOOD',       // Wood grain
    scale: 0.6,
    angle: 0,
  },
};
```

**Wall Rendering Logic:**
```typescript
function renderWall(wall: WallSegment, doc: DxfWriter): void {
  // 1. Calculate wall polygon (4 corners)
  const polygon = getWallPolygon(wall);

  // 2. Draw outer boundary on A-WALL layer
  doc.setLayer('A-WALL');
  doc.drawPolyline(polygon, true); // closed=true

  // 3. Add hatch pattern based on material
  const hatch = HATCH_PATTERNS[wall.material];
  doc.addHatch('A-WALL', polygon, hatch.name, hatch.scale, hatch.angle);

  // 4. Draw centerline (optional, for reference)
  doc.drawLine(wall.start, wall.end, 'BYLAYER');
}
```

**Progress:** 0/1 ☐

---

### **Task 4: Door Blocks** ⏱️ Est: 45 min

**Door Block Components:**
1. Door leaf (rectangle)
2. Swing arc (90° arc)
3. Door jamb (two lines)
4. Tag (D1, D2, etc.)

**Implementation:**
```typescript
function createDoorBlock(doc: DxfWriter): void {
  doc.startBlock('DOOR_90'); // 90° swing door

  // Door leaf (0.04m thick)
  doc.drawRectangle(0, 0, 0.9, 0.04, 'A-DOOR');

  // Swing arc (90°)
  doc.drawArc(0, 0, 0.9, 0, 90, 'A-DOOR');

  // Jambs
  doc.drawLine({x: 0, y: 0}, {x: 0, y: 0.04}, 'A-DOOR');
  doc.drawLine({x: 0.9, y: 0}, {x: 0.9, y: 0.04}, 'A-DOOR');

  doc.endBlock();
}

function placeDoor(opening: Opening, wall: WallSegment, doc: DxfWriter): void {
  // Calculate insertion point
  const insertPoint = calculateOpeningPosition(opening, wall);

  // Calculate rotation (perpendicular to wall)
  const rotation = getWallAngle(wall) + 90;

  // Insert block
  doc.insertBlock('DOOR_90', insertPoint, rotation, 1.0);

  // Add tag (D1, D2, etc.)
  doc.setLayer('A-ANNO');
  doc.drawText(opening.tag, insertPoint, 2.0, rotation);
}
```

**Progress:** 0/1 ☐

---

### **Task 5: Window Blocks** ⏱️ Est: 45 min

**Window Symbol (3-line representation):**
```
║─────────────║  ← Jambs
║━━━━━━━━━━━━━║  ← Glass (thick middle line)
║─────────────║  ← Jambs
```

**Implementation:**
```typescript
function createWindowBlock(doc: DxfWriter): void {
  doc.startBlock('WINDOW_STD'); // Standard window

  const width = 1.2; // Will be scaled
  const depth = 0.15; // Wall thickness at window

  // Outer jambs
  doc.drawLine({x: 0, y: 0}, {x: width, y: 0}, 'A-WIND');
  doc.drawLine({x: 0, y: depth}, {x: width, y: depth}, 'A-WIND');

  // Glass line (thicker, in middle)
  doc.setLineWeight(0.5);
  doc.drawLine({x: 0, y: depth/2}, {x: width, y: depth/2}, 'A-WIND');
  doc.setLineWeight(0.35);

  // Vertical jambs
  doc.drawLine({x: 0, y: 0}, {x: 0, y: depth}, 'A-WIND');
  doc.drawLine({x: width, y: 0}, {x: width, y: depth}, 'A-WIND');

  doc.endBlock();
}

function placeWindow(opening: Opening, wall: WallSegment, doc: DxfWriter): void {
  const insertPoint = calculateOpeningPosition(opening, wall);
  const rotation = getWallAngle(wall);
  const scale = opening.width / 1.2; // Scale to actual width

  doc.insertBlock('WINDOW_STD', insertPoint, rotation, scale);

  // Add tag
  doc.setLayer('A-ANNO');
  doc.drawText(opening.tag, insertPoint, 2.0, rotation + 90);
}
```

**Progress:** 0/1 ☐

---

### **Task 6: Room Labels** ⏱️ Est: 30 min

**Label Format:**
```
    LIVING ROOM
     24.5 m²
   Oak Parquet
```

**Implementation:**
```typescript
function addRoomLabel(room: RoomZone, doc: DxfWriter): void {
  doc.setLayer('A-ANNO');
  const center = room.center;

  // Room name (larger, bold)
  doc.drawText(
    room.label.toUpperCase(),
    {x: center.x, y: center.y + 1.5},
    3.5, // text height
    0,   // rotation
    'MIDDLE' // justification
  );

  // Area
  doc.drawText(
    `${room.area.value} ${room.area.unit}`,
    {x: center.x, y: center.y},
    2.5,
    0,
    'MIDDLE'
  );

  // Flooring
  doc.drawText(
    room.flooring.replace('-', ' '),
    {x: center.x, y: center.y - 1.5},
    2.0,
    0,
    'MIDDLE'
  );
}
```

**Progress:** 0/1 ☐

---

### **Task 7: Dimensions** ⏱️ Est: 45 min

**Dimension Types:**
- Linear dimensions (wall lengths)
- Angular dimensions (corners)
- Radial dimensions (arcs)

**Implementation:**
```typescript
function addWallDimensions(walls: WallSegment[], doc: DxfWriter): void {
  doc.setLayer('A-ANNO');

  for (const wall of walls) {
    if (!wall.isExternal) continue; // Only dimension exterior

    const length = getWallLength(wall);
    const midpoint = {
      x: (wall.start.x + wall.end.x) / 2,
      y: (wall.start.y + wall.end.y) / 2,
    };

    // Offset dimension line from wall
    const angle = getWallAngle(wall);
    const offset = 1.5; // 1.5m outside wall
    const dimPoint = {
      x: midpoint.x + offset * Math.cos(angle + Math.PI/2),
      y: midpoint.y + offset * Math.sin(angle + Math.PI/2),
    };

    // Draw dimension
    doc.drawLinearDimension(
      wall.start,
      wall.end,
      dimPoint,
      `${length.toFixed(2)}m`,
      2.0 // text height
    );
  }
}
```

**Progress:** 0/1 ☐

---

### **Task 8: Line Weights** ⏱️ Est: 30 min

**DXF Line Weight Codes:**
```typescript
const LINE_WEIGHTS = {
  0.05: 5,   // Grid lines
  0.13: 13,  // Annotations
  0.25: 25,  // Furniture
  0.35: 35,  // Doors/Windows
  0.50: 50,  // Partitions
  0.70: 70,  // Cut walls
};

function setLineWeight(layer: string, weight: number): void {
  const code = LINE_WEIGHTS[weight];
  // Add to layer definition
  doc.addLayerProperty(layer, 'LINEWEIGHT', code);
}
```

**Progress:** 0/1 ☐

---

### **Task 9: Title Block** ⏱️ Est: 45 min

**Title Block Layout (A3 landscape, bottom right):**
```
┌──────────────────────────────────────┐
│ PROJECT: Modern Residence            │
│ SHEET:   A-101 Ground Floor Plan     │
│ SCALE:   1:50                        │
│ DATE:    2026-01-12                  │
│ CODE:    BR18/BR23                   │
│ ARCH:    AI Architect                │
└──────────────────────────────────────┘
```

**Implementation:**
```typescript
function addTitleBlock(blueprint: BlueprintData, sheet: Sheet, doc: DxfWriter): void {
  doc.setLayer('A-ANNO');

  const origin = {x: 380, y: 10}; // Bottom right for A3 (420mm wide)
  const width = 120;
  const height = 40;

  // Draw border
  doc.drawRectangle(origin.x, origin.y, width, height, 'A-ANNO');

  // Add text fields
  const fields = [
    {label: 'PROJECT:', value: blueprint.projectName, y: 35},
    {label: 'SHEET:', value: `${sheet.number} ${sheet.title}`, y: 29},
    {label: 'SCALE:', value: sheet.scale, y: 23},
    {label: 'DATE:', value: new Date().toISOString().split('T')[0], y: 17},
    {label: 'CODE:', value: blueprint.buildingCode, y: 11},
  ];

  fields.forEach(field => {
    doc.drawText(field.label, {x: origin.x + 2, y: origin.y + field.y}, 2.0);
    doc.drawText(field.value, {x: origin.x + 25, y: origin.y + field.y}, 2.0);
  });
}
```

**Progress:** 0/1 ☐

---

### **Task 10: Sheet Border** ⏱️ Est: 15 min

**A3 Sheet Dimensions:**
- Width: 420mm
- Height: 297mm
- Margin: 10mm

**Implementation:**
```typescript
function addSheetBorder(doc: DxfWriter): void {
  doc.setLayer('A-ANNO');

  // Outer border (sheet edge)
  doc.drawRectangle(0, 0, 420, 297, 'A-ANNO');

  // Inner border (printable area)
  doc.drawRectangle(10, 10, 400, 277, 'A-ANNO');

  // Scale indicator (bottom left)
  doc.drawText('SCALE 1:50', {x: 15, y: 15}, 3.0);

  // Sheet number (top right)
  doc.drawText('A-101', {x: 380, y: 280}, 4.0, 0, 'RIGHT');
}
```

**Progress:** 0/1 ☐

---

### **Task 11: Testing** ⏱️ Est: 30 min

**Test Checklist:**
```
[ ] DXF file opens in AutoCAD 2024
[ ] All layers are visible
[ ] Layer colors are correct
[ ] Line weights display properly
[ ] Hatching patterns render correctly
[ ] Door blocks show with swing arcs
[ ] Window symbols are clear
[ ] Text is readable at 1:50 scale
[ ] Dimensions are accurate
[ ] Title block displays all info
[ ] File exports without errors
```

**Test Files:**
- AutoCAD 2024 (Windows)
- DraftSight (cross-platform)
- LibreCAD (open-source)
- Online: https://sharecad.org

**Progress:** 0/11 ☐

---

## 📊 Progress Tracking

### Overall Progress: 0/11 tasks (0%)

```
[░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░] 0%
```

### By Category:
- Foundation: 0/1 (0%)
- Layer System: 0/1 (0%)
- Geometry Rendering: 0/3 (0%)
- Annotations: 0/2 (0%)
- Professional Features: 0/3 (0%)
- Testing: 0/1 (0%)

### Estimated Time:
- **Total:** ~6 hours
- **Completed:** 0 hours
- **Remaining:** ~6 hours

---

## 🛠️ DXF Writer Library Options

### Option 1: dxf-writer (Existing?)
```bash
npm install dxf-writer
```

### Option 2: dxf (More comprehensive)
```bash
npm install dxf
```

### Option 3: Custom Implementation
- Write DXF text format directly
- Full control over output
- No dependencies

---

## 📖 DXF File Structure

```
0
SECTION
2
HEADER
...
0
SECTION
2
TABLES
  0
  TABLE
  2
  LAYER
    0
    LAYER
    2
    A-WALL
    62
    7
    370
    70
  0
  ENDTAB
0
ENDSEC
0
SECTION
2
BLOCKS
  ... (door/window blocks)
0
ENDSEC
0
SECTION
2
ENTITIES
  ... (walls, lines, text, etc.)
0
ENDSEC
0
EOF
```

---

## 🎯 Success Criteria

Phase 3 is **complete** when:
1. ✅ DXF exports with proper AutoCAD layers
2. ✅ Walls have material-specific hatching
3. ✅ Doors show as blocks with swing arcs
4. ✅ Windows show as 3-line symbols
5. ✅ Room labels are positioned correctly
6. ✅ Dimensions show wall lengths
7. ✅ Line weights are correct (0.7mm, 0.35mm, 0.13mm)
8. ✅ Title block displays project info
9. ✅ File opens perfectly in AutoCAD 2024
10. ✅ All layers can be toggled on/off

---

## 💡 Enhancement Ideas (Phase 3+)

- Column grid system (A-GRID layer)
- Furniture blocks (A-FURN layer)
- Door/window schedules (tables)
- Elevation views (A-201 sheets)
- Section cuts (A-301 sheets)
- Detail callouts (A-DETL layer)
- PDF export with layers

---

**Ready to transform basic DXF into professional AutoCAD drawings! 🚀**
