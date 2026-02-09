import type { BlueprintData } from '@/schemas/blueprint.schema';

/**
 * Demo Blueprint: 140m² Danish Family Home
 *
 * Inspired by American ranch-style plans adapted for Danish BR18/BR23.
 * The open-plan kitchen/living/dining dominates the upper half.
 * Master suite with en-suite and walk-in closet on the right.
 * Three bedrooms, family bathroom, bryggers, and home office below.
 *
 * 14m wide x 10m deep. Entry on west wall of central hallway.
 *
 * Layout (y-down SVG convention):
 *
 *   x=0                x=9        x=12   x=14
 *   +------------------+----------+------+ y=0
 *   |                  |          |En-   |
 *   |  Open-Plan       |  Master  |suite |
 *   |  Kitchen +       |  Bedroom |Bath  |
 *   |  Living +        |  3x5     |2x2.5 |
 *   |  Dining          |  =15m²   |=5m²  |
 *   |  9x5 = 45m²      |          +------+ y=2.5
 *   |                  |          |WIC   |
 *   |                  |          |2x2.5 |
 *   |                  |          |=5m²  |
 *   +------------------+----------+------+ y=5
 *   | FRONT  Hallway 14x1.5 = 21m²      |
 *   | DOOR                               |
 *   +--------+-----+------+------+------+ y=6.5
 *   |        |     |      |      |Home  |
 *   |Bryggers|Bed 2|Family|Bed 3 |Office|
 *   |3.5x3.5 |3x3.5|Bath  |3x3.5 |2x3.5 |
 *   |=12.25m²|=10.5|2.5x  |=10.5 |=7m²  |
 *   |        |     |3.5   |      |      |
 *   |        |     |=8.75 |      |      |
 *   +--------+-----+------+------+------+ y=10
 */

// =====================================================
// Wall Definitions (31 segments)
// Every endpoint shared by >= 2 walls
// =====================================================

const WALLS: BlueprintData['sheets'][0]['elements']['walls'] = [
  // -- EXTERIOR WALLS (0.3m brick, insulated) --
  // North perimeter (y=0)
  { id: 'w1',  start: { x: 0, y: 0 },     end: { x: 9, y: 0 },     thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w2',  start: { x: 9, y: 0 },     end: { x: 12, y: 0 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w3',  start: { x: 12, y: 0 },    end: { x: 14, y: 0 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  // East perimeter (x=14)
  { id: 'w4',  start: { x: 14, y: 0 },    end: { x: 14, y: 2.5 },  thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w5',  start: { x: 14, y: 2.5 },  end: { x: 14, y: 5 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w6',  start: { x: 14, y: 5 },    end: { x: 14, y: 6.5 },  thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w7',  start: { x: 14, y: 6.5 },  end: { x: 14, y: 10 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  // South perimeter (y=10)
  { id: 'w8',  start: { x: 14, y: 10 },   end: { x: 12, y: 10 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w9',  start: { x: 12, y: 10 },   end: { x: 9, y: 10 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w10', start: { x: 9, y: 10 },    end: { x: 6.5, y: 10 },  thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w11', start: { x: 6.5, y: 10 },  end: { x: 3.5, y: 10 },  thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w12', start: { x: 3.5, y: 10 },  end: { x: 0, y: 10 },    thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  // West perimeter (x=0)
  { id: 'w13', start: { x: 0, y: 10 },    end: { x: 0, y: 6.5 },   thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w14', start: { x: 0, y: 6.5 },   end: { x: 0, y: 5 },     thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },
  { id: 'w15', start: { x: 0, y: 5 },     end: { x: 0, y: 0 },     thickness: 0.3, type: 'EXTERIOR_INSULATED', material: 'brick', layer: 'A-WALL', isExternal: true },

  // -- HALLWAY SPINE (load-bearing, 0.15m concrete) --
  // North wall of hallway (y=5)
  { id: 'w16', start: { x: 0, y: 5 },     end: { x: 9, y: 5 },     thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w17', start: { x: 9, y: 5 },     end: { x: 12, y: 5 },    thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w18', start: { x: 12, y: 5 },    end: { x: 14, y: 5 },    thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  // South wall of hallway (y=6.5)
  { id: 'w19', start: { x: 0, y: 6.5 },   end: { x: 3.5, y: 6.5 }, thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w20', start: { x: 3.5, y: 6.5 }, end: { x: 6.5, y: 6.5 }, thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w21', start: { x: 6.5, y: 6.5 }, end: { x: 9, y: 6.5 },   thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w22', start: { x: 9, y: 6.5 },   end: { x: 12, y: 6.5 },  thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },
  { id: 'w23', start: { x: 12, y: 6.5 },  end: { x: 14, y: 6.5 },  thickness: 0.15, type: 'LOAD_BEARING', material: 'concrete', layer: 'A-WALL', isExternal: false },

  // -- UPPER INTERIOR (master suite partitions, 0.1m gypsum) --
  // Open-plan | Master vertical wall
  { id: 'w24', start: { x: 9, y: 0 },     end: { x: 9, y: 5 },     thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  // Master | En-suite / WIC vertical wall
  { id: 'w25', start: { x: 12, y: 0 },    end: { x: 12, y: 2.5 },  thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w26', start: { x: 12, y: 2.5 },  end: { x: 12, y: 5 },    thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  // En-suite | WIC horizontal divider
  { id: 'w27', start: { x: 12, y: 2.5 },  end: { x: 14, y: 2.5 },  thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },

  // -- LOWER INTERIOR (bedroom partitions, 0.1m gypsum) --
  { id: 'w28', start: { x: 3.5, y: 6.5 }, end: { x: 3.5, y: 10 },  thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w29', start: { x: 6.5, y: 6.5 }, end: { x: 6.5, y: 10 },  thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w30', start: { x: 9, y: 6.5 },   end: { x: 9, y: 10 },    thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
  { id: 'w31', start: { x: 12, y: 6.5 },  end: { x: 12, y: 10 },   thickness: 0.1, type: 'INTERIOR_PARTITION', material: 'gypsum-board', layer: 'A-WALL', isExternal: false },
];

// =====================================================
// Openings (9 doors + 10 windows = 19)
// =====================================================

const OPENINGS: BlueprintData['sheets'][0]['elements']['openings'] = [
  // -- DOORS --
  // D1: Front entrance on west hallway wall
  { id: 'd1',  wallId: 'w14', type: 'door',         width: 1.0, height: 2.1, distFromStart: 0.25, tag: 'D1', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0.02 },
  // D2: Wide french doors — hallway to open-plan living
  { id: 'd2',  wallId: 'w16', type: 'french-door',  width: 2.0, height: 2.1, distFromStart: 3.5,  tag: 'D2', layer: 'A-DOOR', swing: 'none', thresholdHeight: 0 },
  // D3: Master bedroom from hallway
  { id: 'd3',  wallId: 'w17', type: 'door',         width: 0.9, height: 2.1, distFromStart: 1.05, tag: 'D3', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0 },
  // D4: Bryggers from hallway
  { id: 'd4',  wallId: 'w19', type: 'door',         width: 0.9, height: 2.1, distFromStart: 1.3,  tag: 'D4', layer: 'A-DOOR', swing: 'right', swingDirection: 'inward', thresholdHeight: 0 },
  // D5: Bedroom 2 from hallway (swings outward into hallway)
  { id: 'd5',  wallId: 'w20', type: 'door',         width: 0.9, height: 2.1, distFromStart: 1.05, tag: 'D5', layer: 'A-DOOR', swing: 'right', swingDirection: 'outward', thresholdHeight: 0 },
  // D6: Family Bathroom from hallway — swing OUTWARD per BR18
  { id: 'd6',  wallId: 'w21', type: 'door',         width: 0.9, height: 2.1, distFromStart: 0.8,  tag: 'D6', layer: 'A-DOOR', swing: 'left', swingDirection: 'outward', thresholdHeight: 0 },
  // D7: Bedroom 3 from hallway (swings outward into hallway)
  { id: 'd7',  wallId: 'w22', type: 'door',         width: 0.9, height: 2.1, distFromStart: 1.5,  tag: 'D7', layer: 'A-DOOR', swing: 'right', swingDirection: 'outward', thresholdHeight: 0 },
  // D8: Home Office from hallway
  { id: 'd8',  wallId: 'w23', type: 'door',         width: 0.9, height: 2.1, distFromStart: 0.55, tag: 'D8', layer: 'A-DOOR', swing: 'right', swingDirection: 'outward', thresholdHeight: 0 },
  // D9: Garden sliding door — west wall of open-plan
  { id: 'd9',  wallId: 'w15', type: 'sliding-door', width: 2.4, height: 2.1, distFromStart: 1.3,  tag: 'D9', layer: 'A-DOOR', swing: 'none', thresholdHeight: 0.015 },
  // D10: En-suite bathroom door from master bedroom — swing outward
  { id: 'd10', wallId: 'w25', type: 'door',         width: 0.9, height: 2.1, distFromStart: 0.8,  tag: 'D10', layer: 'A-DOOR', swing: 'left', swingDirection: 'outward', thresholdHeight: 0 },

  // -- WINDOWS --
  // W1: Open-plan — large north window (garden view)
  { id: 'win1',  wallId: 'w1',  type: 'window', width: 2.0, height: 2.1, distFromStart: 2.0,  tag: 'W1', layer: 'A-WIND', sillHeight: 0.3 },
  // W2: Open-plan — second north window
  { id: 'win2',  wallId: 'w1',  type: 'window', width: 2.0, height: 2.1, distFromStart: 6.0,  tag: 'W2', layer: 'A-WIND', sillHeight: 0.3 },
  // W3: Open-plan — west window (cross-ventilation)
  { id: 'win3',  wallId: 'w15', type: 'window', width: 1.5, height: 1.8, distFromStart: 4.0,  tag: 'W3', layer: 'A-WIND', sillHeight: 0.6 },
  // W4: Master bedroom — north window
  { id: 'win4',  wallId: 'w2',  type: 'window', width: 1.5, height: 1.8, distFromStart: 0.75, tag: 'W4', layer: 'A-WIND', sillHeight: 0.6 },
  // W5: En-suite — east window (frosted)
  { id: 'win5',  wallId: 'w4',  type: 'window', width: 0.6, height: 1.0, distFromStart: 1.0,  tag: 'W5', layer: 'A-WIND', sillHeight: 0.9 },
  // W6: Bryggers — south window
  { id: 'win6',  wallId: 'w12', type: 'window', width: 1.0, height: 1.8, distFromStart: 1.25, tag: 'W6', layer: 'A-WIND', sillHeight: 0.6 },
  // W7: Bedroom 2 — south window
  { id: 'win7',  wallId: 'w11', type: 'window', width: 1.2, height: 1.8, distFromStart: 1.5,  tag: 'W7', layer: 'A-WIND', sillHeight: 0.6 },
  // W8: Bedroom 3 — south window
  { id: 'win8',  wallId: 'w9',  type: 'window', width: 1.2, height: 1.8, distFromStart: 1.5,  tag: 'W8', layer: 'A-WIND', sillHeight: 0.6 },
  // W9: Home Office — east window
  { id: 'win9',  wallId: 'w7',  type: 'window', width: 1.0, height: 1.8, distFromStart: 1.75, tag: 'W9', layer: 'A-WIND', sillHeight: 0.6 },
  // W10: Family Bathroom — south window (frosted)
  { id: 'win10', wallId: 'w10', type: 'window', width: 0.8, height: 1.0, distFromStart: 1.25, tag: 'W10', layer: 'A-WIND', sillHeight: 0.9 },
];

// =====================================================
// Room Definitions (10 rooms)
// =====================================================

const ROOMS: BlueprintData['sheets'][0]['elements']['rooms'] = [
  {
    id: 'r1', label: 'Open-Plan Living + Kitchen', type: 'Living Room',
    area: { value: 45.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 4.5, y: 2.5 },
    polygon: [{ x: 0, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 5 }, { x: 0, y: 5 }],
    ceilingHeight: 2.5, naturalLightArea: 11.1, compliant: true,
  },
  {
    id: 'r2', label: 'Master Bedroom', type: 'Bedroom',
    area: { value: 15.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 10.5, y: 2.5 },
    polygon: [{ x: 9, y: 0 }, { x: 12, y: 0 }, { x: 12, y: 5 }, { x: 9, y: 5 }],
    ceilingHeight: 2.5, naturalLightArea: 2.7, compliant: true,
  },
  {
    id: 'r3', label: 'En-suite Bathroom', type: 'Bathroom',
    area: { value: 5.0, unit: 'm²' }, flooring: 'tiles',
    center: { x: 13, y: 1.25 },
    polygon: [{ x: 12, y: 0 }, { x: 14, y: 0 }, { x: 14, y: 2.5 }, { x: 12, y: 2.5 }],
    ceilingHeight: 2.5, naturalLightArea: 0.6, compliant: true,
  },
  {
    id: 'r4', label: 'Walk-in Closet', type: 'Storage',
    area: { value: 5.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 13, y: 3.75 },
    polygon: [{ x: 12, y: 2.5 }, { x: 14, y: 2.5 }, { x: 14, y: 5 }, { x: 12, y: 5 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r5', label: 'Hallway', type: 'Hallway',
    area: { value: 21.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 7, y: 5.75 },
    polygon: [{ x: 0, y: 5 }, { x: 14, y: 5 }, { x: 14, y: 6.5 }, { x: 0, y: 6.5 }],
    ceilingHeight: 2.5, compliant: true,
  },
  {
    id: 'r6', label: 'Bryggers', type: 'Entry',
    area: { value: 12.25, unit: 'm²' }, flooring: 'vinyl',
    center: { x: 1.75, y: 8.25 },
    polygon: [{ x: 0, y: 6.5 }, { x: 3.5, y: 6.5 }, { x: 3.5, y: 10 }, { x: 0, y: 10 }],
    ceilingHeight: 2.5, naturalLightArea: 1.8, compliant: true,
  },
  {
    id: 'r7', label: 'Bedroom 2', type: 'Bedroom',
    area: { value: 10.5, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 5, y: 8.25 },
    polygon: [{ x: 3.5, y: 6.5 }, { x: 6.5, y: 6.5 }, { x: 6.5, y: 10 }, { x: 3.5, y: 10 }],
    ceilingHeight: 2.5, naturalLightArea: 2.16, compliant: true,
  },
  {
    id: 'r8', label: 'Family Bathroom', type: 'Bathroom',
    area: { value: 8.75, unit: 'm²' }, flooring: 'tiles',
    center: { x: 7.75, y: 8.25 },
    polygon: [{ x: 6.5, y: 6.5 }, { x: 9, y: 6.5 }, { x: 9, y: 10 }, { x: 6.5, y: 10 }],
    ceilingHeight: 2.5, naturalLightArea: 0.8, compliant: true,
  },
  {
    id: 'r9', label: 'Bedroom 3', type: 'Bedroom',
    area: { value: 10.5, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 10.5, y: 8.25 },
    polygon: [{ x: 9, y: 6.5 }, { x: 12, y: 6.5 }, { x: 12, y: 10 }, { x: 9, y: 10 }],
    ceilingHeight: 2.5, naturalLightArea: 2.16, compliant: true,
  },
  {
    id: 'r10', label: 'Home Office', type: 'Office',
    area: { value: 7.0, unit: 'm²' }, flooring: 'oak-parquet',
    center: { x: 13, y: 8.25 },
    polygon: [{ x: 12, y: 6.5 }, { x: 14, y: 6.5 }, { x: 14, y: 10 }, { x: 12, y: 10 }],
    ceilingHeight: 2.5, naturalLightArea: 1.8, compliant: true,
  },
];

// =====================================================
// Export Complete Blueprint
// =====================================================

export const demoBlueprint: BlueprintData = {
  projectName: 'Danish Family Home \u2014 140m\u00B2',
  projectNumber: 'DEMO-001',
  architect: 'AI Architect',
  client: 'Demo',
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
        totalArea: 140,
        floorLevel: 'Ground Floor',
        compliance: ['BR18', 'BR23'],
      },
    },
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};
