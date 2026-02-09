import type { BlueprintData, FurnitureItem } from '@/schemas/blueprint.schema';

/**
 * Prototype Blueprint: L-Shaped 2-Bedroom House — 110m²
 *
 * A realistic single-storey L-shaped home for the YC demo.
 * North wing: 12m wide × 5m deep  (Living + Kitchen + Dining + Pantry)
 * South wing: 10m wide × 7m deep  (Entry, Hallway, Bedrooms, Baths, WICs)
 * L-notch: x=10..12, y=5..12 (exterior)
 *
 * Layout (y-down SVG convention):
 *
 *   x=0    x=1.8       x=5     x=7   x=8.5 x=10  x=12
 *   +------+-----------+-------+------+-----+-----+ y=0
 *   |                                              |
 *   |        Living + Kitchen + Dining  (open plan)|
 *   |                                42m²          |
 *   +--+                                           | y=3.5
 *   |Pa|                                           |
 *   +--+-----------+-------+------+------+  L-jog  + y=5
 *   | Entry        Hallway 12m²  |UtilBa|         |
 *   +-----------+--+-------+-----+------+ y=7
 *   |              |        |              |
 *   |  Bedroom 1   |Ensuite | Bedroom 2    |
 *   |  (Master)    | Bath   |              |
 *   |   25m²       | 10m²  |   15m²       |
 *   +-------+------+-------+--------------+ y=12
 */

// =====================================================
// Wall Definitions (14 segments)
// =====================================================

const WALLS: BlueprintData['sheets'][0]['elements']['walls'] = [
  // -- EXTERIOR WALLS (0.3m brick, insulated) --
  { id: 'w1',  start: { x: 0, y: 0 },    end: { x: 12, y: 0 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w2',  start: { x: 12, y: 0 },   end: { x: 12, y: 5 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w3',  start: { x: 12, y: 5 },   end: { x: 10, y: 5 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w4',  start: { x: 10, y: 5 },   end: { x: 10, y: 12 },  thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w5',  start: { x: 10, y: 12 },  end: { x: 0, y: 12 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w6',  start: { x: 0, y: 12 },   end: { x: 0, y: 0 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },

  // -- INTERIOR: load-bearing (0.15m concrete) --
  { id: 'w7',  start: { x: 0, y: 5 },    end: { x: 10, y: 5 },   thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w8',  start: { x: 0, y: 7 },    end: { x: 10, y: 7 },   thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },

  // -- INTERIOR: partitions (0.1m gypsum) --
  { id: 'w10', start: { x: 0, y: 3.5 },  end: { x: 1.8, y: 3.5 },  thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w11', start: { x: 1.8, y: 3.5 },end: { x: 1.8, y: 5 },    thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w13', start: { x: 8.5, y: 5 },  end: { x: 8.5, y: 7 },    thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w15', start: { x: 5, y: 7 },    end: { x: 5, y: 12 },     thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w16', start: { x: 7, y: 7 },    end: { x: 7, y: 12 },     thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
];

// =====================================================
// Openings (9 doors + 7 windows = 16)
// =====================================================

const OPENINGS: BlueprintData['sheets'][0]['elements']['openings'] = [
  // -- DOORS --
  // D1: Front entrance — west wall at entry foyer level (y≈6)
  { id: 'd1',  wallId: 'w6',  type: 'door',        width: 1.0, height: 2.1, distFromStart: 6.0,  tag: 'D1', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0.02 },
  // D2: Living → Hallway (wide french door)
  { id: 'd2',  wallId: 'w7',  type: 'french-door',  width: 1.6, height: 2.1, distFromStart: 5.0,  tag: 'D2', layer: 'A-DOOR', swing: 'none', thresholdHeight: 0 },
  // D3: Living → Pantry
  { id: 'd3',  wallId: 'w11', type: 'door',        width: 0.7, height: 2.1, distFromStart: 0.75, tag: 'D3', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0 },
  // D4: Hallway → Bedroom 1
  { id: 'd4',  wallId: 'w8',  type: 'door',        width: 0.9, height: 2.1, distFromStart: 2.5,  tag: 'D4', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0 },
  // D5: Hallway → Utility Bath
  { id: 'd5',  wallId: 'w13', type: 'door',        width: 0.7, height: 2.1, distFromStart: 1.0,  tag: 'D5', layer: 'A-DOOR', swing: 'left', swingDirection: 'inward', thresholdHeight: 0 },
  // D6: Hallway → Bedroom 2
  { id: 'd6',  wallId: 'w8',  type: 'door',        width: 0.9, height: 2.1, distFromStart: 8.0,  tag: 'D6', layer: 'A-DOOR', swing: 'left', swingDirection: 'inward', thresholdHeight: 0 },
  // D7: Bedroom 1 → Ensuite (private)
  { id: 'd7',  wallId: 'w15', type: 'door',        width: 0.7, height: 2.1, distFromStart: 1.5,  tag: 'D7', layer: 'A-DOOR', swing: 'left', swingDirection: 'inward', thresholdHeight: 0 },
  // D8: Bedroom 1 → south window (bottom wall)
  // (removed — WIC doors no longer needed)

  // -- WINDOWS --
  // W1: Living room — north window (left)
  { id: 'win1', wallId: 'w1', type: 'window', width: 2.0, height: 2.1, distFromStart: 2.0,  tag: 'W1', layer: 'A-WIND', sillHeight: 0.3 },
  // W2: Kitchen — north window (center)
  { id: 'win2', wallId: 'w1', type: 'window', width: 2.0, height: 2.1, distFromStart: 7.0,  tag: 'W2', layer: 'A-WIND', sillHeight: 0.3 },
  // W3: Kitchen — north window (right)
  { id: 'win3', wallId: 'w1', type: 'window', width: 1.2, height: 1.8, distFromStart: 10.5, tag: 'W3', layer: 'A-WIND', sillHeight: 0.6 },
  // W4: Living room — west window
  { id: 'win4', wallId: 'w6', type: 'window', width: 1.5, height: 1.8, distFromStart: 10.0, tag: 'W4', layer: 'A-WIND', sillHeight: 0.6 },
  // W5: Living room — east window
  { id: 'win5', wallId: 'w2', type: 'window', width: 1.5, height: 1.8, distFromStart: 2.5,  tag: 'W5', layer: 'A-WIND', sillHeight: 0.6 },
  // W6: Bedroom 1 — west window
  { id: 'win6', wallId: 'w6', type: 'window', width: 1.2, height: 1.8, distFromStart: 3.5,  tag: 'W6', layer: 'A-WIND', sillHeight: 0.6 },
  // W7: Bedroom 2 — east window
  { id: 'win7', wallId: 'w4', type: 'window', width: 1.2, height: 1.8, distFromStart: 3.5,  tag: 'W7', layer: 'A-WIND', sillHeight: 0.6 },
  // W8: Entry Foyer — west window (small sidelight)
  { id: 'win8', wallId: 'w6', type: 'window', width: 0.8, height: 1.4, distFromStart: 6.0,  tag: 'W8', layer: 'A-WIND', sillHeight: 0.9 },
  // W9: Pantry — west window (small ventilation)
  { id: 'win9', wallId: 'w6', type: 'window', width: 0.6, height: 0.8, distFromStart: 7.75, tag: 'W9', layer: 'A-WIND', sillHeight: 1.2 },
  // W10: Utility Bath — east window (ventilation + light)
  { id: 'win10', wallId: 'w4', type: 'window', width: 0.8, height: 1.0, distFromStart: 1.0, tag: 'W10', layer: 'A-WIND', sillHeight: 1.0 },
  // W11: Ensuite Bath — south window (ventilation + light)
  { id: 'win11', wallId: 'w5', type: 'window', width: 0.8, height: 1.0, distFromStart: 4.0, tag: 'W11', layer: 'A-WIND', sillHeight: 1.0 },
  // W12: Bedroom 1 — south window (additional daylight)
  { id: 'win12', wallId: 'w5', type: 'window', width: 1.2, height: 1.8, distFromStart: 7.5, tag: 'W12', layer: 'A-WIND', sillHeight: 0.6 },
  // W13: Bedroom 2 — south window (additional daylight)
  { id: 'win13', wallId: 'w5', type: 'window', width: 1.2, height: 1.8, distFromStart: 1.5, tag: 'W13', layer: 'A-WIND', sillHeight: 0.6 },
];

// =====================================================
// Room Definitions (10 rooms)
// =====================================================

const ROOMS: BlueprintData['sheets'][0]['elements']['rooms'] = [
  {
    id: 'r1', label: 'Living + Kitchen + Dining', type: 'Living Room',
    area: { value: 42.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 6, y: 2.5 },
    polygon: [{ x: 0, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 5 }, { x: 1.8, y: 5 }, { x: 1.8, y: 3.5 }, { x: 0, y: 3.5 }],
    ceilingHeight: 2.5, naturalLightArea: 12.0, compliant: true,
  },
  {
    id: 'r2', label: 'Pantry', type: 'Storage',
    area: { value: 2.7, unit: 'm²' }, flooring: 'tiles',
    center: { x: 0.9, y: 4.25 },
    polygon: [{ x: 0, y: 3.5 }, { x: 1.8, y: 3.5 }, { x: 1.8, y: 5 }, { x: 0, y: 5 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r3', label: 'Entry Foyer', type: 'Hallway',
    area: { value: 5.0, unit: 'm²' }, flooring: 'stone',
    center: { x: 1.25, y: 6 },
    polygon: [{ x: 0, y: 5 }, { x: 2.5, y: 5 }, { x: 2.5, y: 7 }, { x: 0, y: 7 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r4', label: 'Hallway', type: 'Hallway',
    area: { value: 12.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 5.5, y: 6 },
    polygon: [{ x: 2.5, y: 5 }, { x: 8.5, y: 5 }, { x: 8.5, y: 7 }, { x: 2.5, y: 7 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r5', label: 'Utility Bath', type: 'Bathroom',
    area: { value: 3.0, unit: 'm²' }, flooring: 'tiles',
    center: { x: 9.25, y: 6 },
    polygon: [{ x: 8.5, y: 5 }, { x: 10, y: 5 }, { x: 10, y: 7 }, { x: 8.5, y: 7 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r7', label: 'Bedroom 1 (Master)', type: 'Bedroom',
    area: { value: 25.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 2.5, y: 9.5 },
    polygon: [{ x: 0, y: 7 }, { x: 5, y: 7 }, { x: 5, y: 12 }, { x: 0, y: 12 }],
    ceilingHeight: 2.5, naturalLightArea: 4.32, compliant: true,
  },
  {
    id: 'r8', label: 'Ensuite Bath', type: 'Bathroom',
    area: { value: 10.0, unit: 'm²' }, flooring: 'tiles',
    center: { x: 6, y: 9.5 },
    polygon: [{ x: 5, y: 7 }, { x: 7, y: 7 }, { x: 7, y: 12 }, { x: 5, y: 12 }],
    ceilingHeight: 2.5, naturalLightArea: 0.8, compliant: true,
  },
  {
    id: 'r9', label: 'Bedroom 2', type: 'Bedroom',
    area: { value: 15.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 8.5, y: 9.5 },
    polygon: [{ x: 7, y: 7 }, { x: 10, y: 7 }, { x: 10, y: 12 }, { x: 7, y: 12 }],
    ceilingHeight: 2.5, naturalLightArea: 4.32, compliant: true,
  },
];

// =====================================================
// Pre-computed Furniture (added after "Furnish" click)
// =====================================================

export const PROTOTYPE_FURNITURE: FurnitureItem[] = [
  // -- Living + Kitchen + Dining --
  // Living zone: L-sofa facing north windows, coffee table in front, armchair beside
  // L-sofa extends -1.4m left, +1.0m right, -0.45m up, +0.9m down from center
  { id: 'pf1',  type: 'sofa-lshape',    roomId: 'r1', position: { x: 3.5, y: 2.8 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf2',  type: 'coffee-table',   roomId: 'r1', position: { x: 3.5, y: 1.6 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf3',  type: 'armchair',       roomId: 'r1', position: { x: 5.2, y: 2.5 },    rotation: 270, layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Dining zone: centered between living and kitchen
  { id: 'pf4',  type: 'dining-set',     roomId: 'r1', position: { x: 7.0, y: 2.5 },    rotation: 0,   scale: 0.85, layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Kitchen zone: stove away from window, sink under window, fridge at end, counter along east wall
  { id: 'pf6',  type: 'stove',          roomId: 'r1', position: { x: 9.2, y: 0.55 },   rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf5',  type: 'kitchen-sink',   roomId: 'r1', position: { x: 10.2, y: 0.55 },  rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf7',  type: 'refrigerator',   roomId: 'r1', position: { x: 11.3, y: 0.55 },  rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf21', type: 'kitchen-counter', roomId: 'r1', position: { x: 11.55, y: 2.5 }, rotation: 90,  layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },

  // -- Bedroom 1 (Master) --
  // Bed centered, headboard toward north; wardrobe against north wall east of door
  { id: 'pf8',  type: 'double-bed',     roomId: 'r7', position: { x: 2.5, y: 9.8 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf9',  type: 'bedside-table',  roomId: 'r7', position: { x: 1.3, y: 9.0 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf10', type: 'bedside-table',  roomId: 'r7', position: { x: 3.7, y: 9.0 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf11', type: 'wardrobe',       roomId: 'r7', position: { x: 4.1, y: 7.4 },    rotation: 0,   scale: 0.85, layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },

  // -- Ensuite Bath (10m²) -- fixtures pushed against walls
  { id: 'pf13', type: 'bathroom-sink',  roomId: 'r8', position: { x: 5.5, y: 7.45 },   rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf14', type: 'toilet',         roomId: 'r8', position: { x: 6.5, y: 7.5 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf22', type: 'bathtub',        roomId: 'r8', position: { x: 6.55, y: 9.5 },   rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf12', type: 'shower',         roomId: 'r8', position: { x: 5.55, y: 11.3 },  rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },

  // -- Utility Bath --
  { id: 'pf15', type: 'toilet',         roomId: 'r5', position: { x: 9.2, y: 5.5 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  { id: 'pf16', type: 'bathroom-sink',  roomId: 'r5', position: { x: 9.2, y: 6.5 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },

  // -- Bedroom 2 (15m², 3m wide — study/guest room) --
  // Room bounds: x: 7.05-9.85, y: 7.075-11.85
  // Door d6: north wall at x=8.0, swings left/inward
  // Windows: east wall y≈8.5 (1.2m), south wall x≈8.5 (1.2m)
  //
  // Layout: single bed along west wall, desk on east wall near windows,
  //         small wardrobe on north wall right of door
  //
  // Single bed (0.9×2.0m) against west partition: x: 7.05-7.95, y: 8.5-10.5
  { id: 'pf17', type: 'single-bed',     roomId: 'r9', position: { x: 7.5, y: 9.5 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Bedside table (0.5×0.4m) at headboard, right side: x: 7.95-8.45, y: 8.5-8.9
  { id: 'pf18', type: 'bedside-table',  roomId: 'r9', position: { x: 8.2, y: 8.7 },    rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Wardrobe (1.4×0.42m @0.7) north wall right of door: x: 8.45-9.85, y: 7.09-7.51
  { id: 'pf19', type: 'wardrobe',       roomId: 'r9', position: { x: 9.15, y: 7.3 },   rotation: 0,   scale: 0.7, layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Desk (0.7×1.4m rotated) against east wall: x: 9.15-9.85, y: 9.8-11.2
  { id: 'pf23', type: 'desk',           roomId: 'r9', position: { x: 9.5, y: 10.5 },   rotation: 90,  layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
  // Office chair in front of desk: centered at x: 8.45-8.95, y: 10.25-10.75
  { id: 'pf24', type: 'office-chair',   roomId: 'r9', position: { x: 8.7, y: 10.5 },   rotation: 0,   layer: 'A-FURN', metadata: { autoGenerated: true, locked: false } },
];

// =====================================================
// Export Complete Blueprint
// =====================================================

export const prototypeBlueprint: BlueprintData = {
  projectName: 'L-Shaped 2-Bedroom House — 110m²',
  projectNumber: 'PROTO-001',
  architect: 'AI Architect',
  client: 'Prototype Demo',
  location: 'Copenhagen, Denmark',
  buildingCode: 'BR18/BR23',
  sheets: [
    {
      title: 'Ground Floor Plan',
      number: 'A-101',
      type: 'FLOOR_PLAN',
      scale: '1:50',
      elements: {
        walls: WALLS,
        openings: OPENINGS,
        rooms: ROOMS,
        furniture: [],
      },
      metadata: {
        totalArea: 108,
        floorLevel: 'Ground Floor',
        compliance: ['BR18', 'BR23'],
      },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
