import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type {
  BlueprintData,
  Sheet,
  WallSegment,
  Opening,
  RoomZone,
  FurnitureItem,
  FurnitureType,
  ComplianceReport,
  Point,
} from '@/schemas/blueprint.schema';
import type { SVGBlueprint } from '@/schemas/blueprint-svg.schema';
import { migrateBlueprintToV2, needsMigration } from '@/lib/blueprint-migration';

/** Type guard: returns the blueprint as BlueprintData if it has sheets, else null */
function asBlueprintData(bp: BlueprintData | SVGBlueprint | null): BlueprintData | null {
  if (!bp) return null;
  if ('sheets' in bp) return bp as BlueprintData;
  return null;
}

// =====================================================
// Blueprint Store State Interface
// =====================================================
interface BlueprintState {
  // Project Data
  // Can be either legacy coordinate-based or new SVG-enhanced format
  blueprint: BlueprintData | SVGBlueprint | null;
  activeSheetIndex: number;

  // Selection State
  selectedElementId: string | null;
  selectedElementType: 'wall' | 'opening' | 'room' | 'furniture' | null;

  // UI State
  isGenerating: boolean;
  showGrid: boolean;
  zoom: number;
  panOffset: Point;

  // Compliance
  complianceReport: ComplianceReport | null;

  // Workflow State
  blueprintStage: 'draft' | 'approved' | 'furnished';
  furnitureModeActive: boolean;

  // History (for undo/redo)
  history: BlueprintData[];
  historyIndex: number;
  maxHistorySize: number;
}

// =====================================================
// Blueprint Store Actions
// =====================================================
interface BlueprintActions {
  // Project Management
  setBlueprint: (blueprint: BlueprintData | SVGBlueprint) => void;
  clearBlueprint: () => void;
  updateProjectMetadata: (metadata: Partial<BlueprintData>) => void;

  // Sheet Management
  setActiveSheet: (index: number) => void;
  addSheet: (sheet: Sheet) => void;
  removeSheet: (index: number) => void;
  updateSheet: (index: number, sheet: Partial<Sheet>) => void;

  // Element Management (Current Active Sheet)
  addWall: (wall: WallSegment) => void;
  updateWall: (wallId: string, updates: Partial<WallSegment>) => void;
  removeWall: (wallId: string) => void;

  addOpening: (opening: Opening) => void;
  updateOpening: (openingId: string, updates: Partial<Opening>) => void;
  removeOpening: (openingId: string) => void;

  addRoom: (room: RoomZone) => void;
  updateRoom: (roomId: string, updates: Partial<RoomZone>) => void;
  removeRoom: (roomId: string) => void;

  // Workflow Management
  approveBlueprint: () => void;
  enableFurnitureMode: () => void;
  disableFurnitureMode: () => void;
  setBlueprintStage: (stage: 'draft' | 'approved' | 'furnished') => void;

  // Furniture Management
  addFurniture: (furniture: FurnitureItem) => void;
  updateFurniture: (furnitureId: string, updates: Partial<FurnitureItem>) => void;
  removeFurniture: (furnitureId: string) => void;
  autoGenerateFurniture: (roomId?: string) => void;
  clearAllFurniture: () => void;

  // Selection
  selectElement: (elementId: string, elementType: 'wall' | 'opening' | 'room' | 'furniture') => void;
  clearSelection: () => void;

  // UI Controls
  setIsGenerating: (isGenerating: boolean) => void;
  setShowGrid: (show: boolean) => void;
  setZoom: (zoom: number) => void;
  setPanOffset: (offset: Point) => void;
  resetView: () => void;

  // Compliance
  setComplianceReport: (report: ComplianceReport) => void;

  // History
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Utility
  getActiveSheet: () => Sheet | null;
  getSelectedElement: () => WallSegment | Opening | RoomZone | null;
  exportToJSON: () => string;
  importFromJSON: (json: string) => void;
}

type BlueprintStore = BlueprintState & BlueprintActions;

// =====================================================
// Initial State
// =====================================================
const initialState: BlueprintState = {
  blueprint: null,
  activeSheetIndex: 0,
  selectedElementId: null,
  selectedElementType: null,
  isGenerating: false,
  showGrid: true,
  zoom: 1,
  panOffset: { x: 0, y: 0 },
  complianceReport: null,
  blueprintStage: 'draft',
  furnitureModeActive: false,
  history: [],
  historyIndex: -1,
  maxHistorySize: 50,
};

// =====================================================
// Zustand Store with DevTools (no persistence - fresh start each session)
// =====================================================
export const useBlueprintStore = create<BlueprintStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

        // Project Management
        setBlueprint: (blueprint) => {
          // Check if it's an SVG blueprint
          const isSVGBlueprint = 'format' in blueprint && blueprint.format === 'svg-enhanced';

          if (isSVGBlueprint) {
            // SVG blueprint - no migration needed, no furniture mode
            set({
              blueprint,
              activeSheetIndex: 0,
              blueprintStage: 'draft',
              furnitureModeActive: false,
            }, false, 'setBlueprint:svg');
            // Don't push to history for SVG blueprints (they're immutable from UI)
          } else {
            // Legacy coordinate-based blueprint - auto-migrate if needed
            const migratedBlueprint = needsMigration(blueprint as BlueprintData)
              ? migrateBlueprintToV2(blueprint as BlueprintData)
              : blueprint as BlueprintData;

            set({
              blueprint: migratedBlueprint,
              activeSheetIndex: 0,
              blueprintStage: (migratedBlueprint as any).blueprintStage || 'draft',
              furnitureModeActive: (migratedBlueprint as any).furnitureModeActive || false,
            }, false, 'setBlueprint:legacy');
            get().pushHistory();
          }
        },

        clearBlueprint: () => {
          set({
            blueprint: null,
            activeSheetIndex: 0,
            selectedElementId: null,
            selectedElementType: null,
            complianceReport: null,
            history: [],
            historyIndex: -1,
          }, false, 'clearBlueprint');
        },

        updateProjectMetadata: (metadata) => {
          const { blueprint } = get();
          if (!blueprint) return;

          set({
            blueprint: {
              ...blueprint,
              ...metadata,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateProjectMetadata');
          get().pushHistory();
        },

        // Sheet Management
        setActiveSheet: (index) => {
          set({ activeSheetIndex: index }, false, 'setActiveSheet');
        },

        addSheet: (sheet) => {
          const { blueprint } = get();
          if (!blueprint) return;

          set({
            blueprint: {
              ...blueprint,
              sheets: [...(blueprint as BlueprintData).sheets, sheet],
              updatedAt: new Date().toISOString(),
            },
          }, false, 'addSheet');
          get().pushHistory();
        },

        removeSheet: (index) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint || (blueprint as BlueprintData).sheets.length <= 1) return;

          const newSheets = (blueprint as BlueprintData).sheets.filter((_, i) => i !== index);
          const newActiveIndex = activeSheetIndex >= newSheets.length
            ? newSheets.length - 1
            : activeSheetIndex;

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
            activeSheetIndex: newActiveIndex,
          }, false, 'removeSheet');
          get().pushHistory();
        },

        updateSheet: (index, updates) => {
          const { blueprint } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[index] = { ...newSheets[index], ...updates };

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateSheet');
          get().pushHistory();
        },

        // Element Management
        addWall: (wall) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.walls.push(wall);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'addWall');
          get().pushHistory();
        },

        updateWall: (wallId, updates) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          const wallIndex = newSheets[activeSheetIndex].elements.walls.findIndex(w => w.id === wallId);
          if (wallIndex === -1) return;

          newSheets[activeSheetIndex].elements.walls[wallIndex] = {
            ...newSheets[activeSheetIndex].elements.walls[wallIndex],
            ...updates,
          };

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateWall');
          get().pushHistory();
        },

        removeWall: (wallId) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.walls =
            newSheets[activeSheetIndex].elements.walls.filter(w => w.id !== wallId);

          // Also remove any openings attached to this wall
          newSheets[activeSheetIndex].elements.openings =
            newSheets[activeSheetIndex].elements.openings.filter(o => o.wallId !== wallId);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'removeWall');
          get().pushHistory();
        },

        addOpening: (opening) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.openings.push(opening);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'addOpening');
          get().pushHistory();
        },

        updateOpening: (openingId, updates) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          const openingIndex = newSheets[activeSheetIndex].elements.openings.findIndex(o => o.id === openingId);
          if (openingIndex === -1) return;

          newSheets[activeSheetIndex].elements.openings[openingIndex] = {
            ...newSheets[activeSheetIndex].elements.openings[openingIndex],
            ...updates,
          };

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateOpening');
          get().pushHistory();
        },

        removeOpening: (openingId) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.openings =
            newSheets[activeSheetIndex].elements.openings.filter(o => o.id !== openingId);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'removeOpening');
          get().pushHistory();
        },

        addRoom: (room) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.rooms.push(room);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'addRoom');
          get().pushHistory();
        },

        updateRoom: (roomId, updates) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          const roomIndex = newSheets[activeSheetIndex].elements.rooms.findIndex(r => r.id === roomId);
          if (roomIndex === -1) return;

          newSheets[activeSheetIndex].elements.rooms[roomIndex] = {
            ...newSheets[activeSheetIndex].elements.rooms[roomIndex],
            ...updates,
          };

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateRoom');
          get().pushHistory();
        },

        removeRoom: (roomId) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.rooms =
            newSheets[activeSheetIndex].elements.rooms.filter(r => r.id !== roomId);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'removeRoom');
          get().pushHistory();
        },

        // Selection
        selectElement: (elementId, elementType) => {
          set({
            selectedElementId: elementId,
            selectedElementType: elementType
          }, false, 'selectElement');
        },

        clearSelection: () => {
          set({
            selectedElementId: null,
            selectedElementType: null
          }, false, 'clearSelection');
        },

        // UI Controls
        setIsGenerating: (isGenerating) => {
          set({ isGenerating }, false, 'setIsGenerating');
        },

        setShowGrid: (show) => {
          set({ showGrid: show }, false, 'setShowGrid');
        },

        setZoom: (zoom) => {
          set({ zoom: Math.max(0.1, Math.min(zoom, 5)) }, false, 'setZoom');
        },

        setPanOffset: (offset) => {
          set({ panOffset: offset }, false, 'setPanOffset');
        },

        resetView: () => {
          set({
            zoom: 1,
            panOffset: { x: 0, y: 0 }
          }, false, 'resetView');
        },

        // Compliance
        setComplianceReport: (report) => {
          set({ complianceReport: report }, false, 'setComplianceReport');
        },

        // Workflow Management
        approveBlueprint: () => {
          set({ blueprintStage: 'approved' }, false, 'approveBlueprint');
        },

        enableFurnitureMode: () => {
          const { blueprintStage } = get();
          if (blueprintStage !== 'approved' && blueprintStage !== 'furnished') {
            console.warn('Cannot enable furniture mode: blueprint not approved');
            return;
          }
          set({ furnitureModeActive: true }, false, 'enableFurnitureMode');
        },

        disableFurnitureMode: () => {
          set({ furnitureModeActive: false }, false, 'disableFurnitureMode');
        },

        setBlueprintStage: (stage) => {
          set({ blueprintStage: stage }, false, 'setBlueprintStage');
        },

        // Furniture Management
        addFurniture: (furniture) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          if (!newSheets[activeSheetIndex].elements.furniture) {
            newSheets[activeSheetIndex].elements.furniture = [];
          }
          newSheets[activeSheetIndex].elements.furniture.push(furniture);

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
            blueprintStage: 'furnished',
          }, false, 'addFurniture');
          get().pushHistory();
        },

        updateFurniture: (furnitureId, updates) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          const furnitureIndex = newSheets[activeSheetIndex].elements.furniture?.findIndex(
            f => f.id === furnitureId
          );
          if (furnitureIndex === undefined || furnitureIndex === -1) return;

          newSheets[activeSheetIndex].elements.furniture![furnitureIndex] = {
            ...newSheets[activeSheetIndex].elements.furniture![furnitureIndex],
            ...updates,
          };

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'updateFurniture');
          get().pushHistory();
        },

        removeFurniture: (furnitureId) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.furniture =
            newSheets[activeSheetIndex].elements.furniture?.filter(f => f.id !== furnitureId) || [];

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
          }, false, 'removeFurniture');
          get().pushHistory();
        },

        autoGenerateFurniture: (roomId) => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const sheet = (blueprint as BlueprintData).sheets[activeSheetIndex];
          const rooms = roomId
            ? sheet.elements.rooms.filter(r => r.id === roomId)
            : sheet.elements.rooms;

          const newFurniture: FurnitureItem[] = [];

          rooms.forEach(room => {
            const generated = generateDefaultFurniture(room);
            newFurniture.push(...generated);
          });

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.furniture = [
            ...(newSheets[activeSheetIndex].elements.furniture || []),
            ...newFurniture,
          ];

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
            blueprintStage: 'furnished',
          }, false, 'autoGenerateFurniture');
          get().pushHistory();
        },

        clearAllFurniture: () => {
          const { blueprint, activeSheetIndex } = get();
          if (!blueprint) return;

          const newSheets = [...(blueprint as BlueprintData).sheets];
          newSheets[activeSheetIndex].elements.furniture = [];

          set({
            blueprint: {
              ...blueprint,
              sheets: newSheets,
              updatedAt: new Date().toISOString(),
            },
            blueprintStage: 'approved',
          }, false, 'clearAllFurniture');
          get().pushHistory();
        },

        // History
        pushHistory: () => {
          const { blueprint, history, historyIndex, maxHistorySize } = get();
          if (!blueprint) return;

          const newHistory = history.slice(0, historyIndex + 1);
          newHistory.push(JSON.parse(JSON.stringify(blueprint)));

          if (newHistory.length > maxHistorySize) {
            newHistory.shift();
          }

          set({
            history: newHistory,
            historyIndex: newHistory.length - 1,
          }, false, 'pushHistory');
        },

        undo: () => {
          const { history, historyIndex } = get();
          if (historyIndex <= 0) return;

          const newIndex = historyIndex - 1;
          set({
            blueprint: JSON.parse(JSON.stringify(history[newIndex])),
            historyIndex: newIndex,
          }, false, 'undo');
        },

        redo: () => {
          const { history, historyIndex } = get();
          if (historyIndex >= history.length - 1) return;

          const newIndex = historyIndex + 1;
          set({
            blueprint: JSON.parse(JSON.stringify(history[newIndex])),
            historyIndex: newIndex,
          }, false, 'redo');
        },

        canUndo: () => {
          const { historyIndex } = get();
          return historyIndex > 0;
        },

        canRedo: () => {
          const { history, historyIndex } = get();
          return historyIndex < history.length - 1;
        },

        // Utility
        getActiveSheet: () => {
          const { blueprint, activeSheetIndex } = get();
          return (blueprint as BlueprintData | null)?.sheets[activeSheetIndex] || null;
        },

        getSelectedElement: () => {
          const { selectedElementId, selectedElementType } = get();
          const sheet = get().getActiveSheet();
          if (!sheet || !selectedElementId || !selectedElementType) return null;

          switch (selectedElementType) {
            case 'wall':
              return sheet.elements.walls.find(w => w.id === selectedElementId) || null;
            case 'opening':
              return sheet.elements.openings.find(o => o.id === selectedElementId) || null;
            case 'room':
              return sheet.elements.rooms.find(r => r.id === selectedElementId) || null;
            case 'furniture':
              return sheet.elements.furniture?.find(f => f.id === selectedElementId) || null;
            default:
              return null;
          }
        },

        exportToJSON: () => {
          const { blueprint } = get();
          return JSON.stringify(blueprint, null, 2);
        },

        importFromJSON: (json) => {
          try {
            const blueprint = JSON.parse(json);
            set({ blueprint }, false, 'importFromJSON');
            get().pushHistory();
          } catch (error) {
            console.error('Failed to import JSON:', error);
          }
        },
      }),
    { name: 'blueprint-store' }
  )
);

// =====================================================
// Helper Functions
// =====================================================

/**
 * Generate default furniture layout for a room based on type and area
 */
function generateDefaultFurniture(room: RoomZone): FurnitureItem[] {
  const furniture: FurnitureItem[] = [];
  const { x, y } = room.center;
  const areaM2 = room.area.value;
  let counter = 0;

  const makeId = () => `furn-${room.id}-${counter++}`;

  const roomTypeKey = (room.type || room.label).toLowerCase();

  if (roomTypeKey.includes('living') || roomTypeKey === 'stue') {
    furniture.push({
      id: makeId(),
      type: 'sofa-lshape',
      roomId: room.id,
      position: { x: x - 1, y: y + 0.5 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'coffee-table',
      roomId: room.id,
      position: { x: x - 1, y: y - 0.5 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    if (areaM2 > 20) {
      furniture.push({
        id: makeId(),
        type: 'armchair',
        roomId: room.id,
        position: { x: x + 1.5, y },
        rotation: 270,
        layer: 'A-FURN',
        metadata: { autoGenerated: true, locked: false },
      });
    }
  } else if (roomTypeKey.includes('bedroom') || roomTypeKey === 'soveværelse' || roomTypeKey.includes('master')) {
    furniture.push({
      id: makeId(),
      type: 'double-bed',
      roomId: room.id,
      position: { x, y },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'bedside-table',
      roomId: room.id,
      position: { x: x - 1.2, y: y - 0.6 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'bedside-table',
      roomId: room.id,
      position: { x: x + 1.2, y: y - 0.6 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    if (areaM2 > 15) {
      furniture.push({
        id: makeId(),
        type: 'wardrobe',
        roomId: room.id,
        position: { x: x - 1.5, y: y + 1 },
        rotation: 0,
        layer: 'A-FURN',
        metadata: { autoGenerated: true, locked: false },
      });
    }
  } else if (roomTypeKey.includes('kitchen') || roomTypeKey === 'køkken') {
    furniture.push({
      id: makeId(),
      type: 'kitchen-sink',
      roomId: room.id,
      position: { x: x - 1, y: y - 1 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'stove',
      roomId: room.id,
      position: { x, y: y - 1 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'refrigerator',
      roomId: room.id,
      position: { x: x + 1.2, y: y - 1 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
  } else if (roomTypeKey.includes('bathroom') || roomTypeKey === 'badeværelse' || roomTypeKey === 'bad') {
    furniture.push({
      id: makeId(),
      type: 'toilet',
      roomId: room.id,
      position: { x: x - 0.8, y: y + 0.5 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'bathroom-sink',
      roomId: room.id,
      position: { x: x + 0.5, y: y - 0.8 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: areaM2 > 5 ? 'bathtub' : 'shower',
      roomId: room.id,
      position: { x: x + 0.5, y: y + 0.3 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
  } else if (roomTypeKey.includes('office') || roomTypeKey === 'kontor' || roomTypeKey.includes('hjemmekontor')) {
    furniture.push({
      id: makeId(),
      type: 'desk',
      roomId: room.id,
      position: { x, y: y - 0.5 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
    furniture.push({
      id: makeId(),
      type: 'office-chair',
      roomId: room.id,
      position: { x, y: y + 0.3 },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
  } else if (roomTypeKey.includes('dining') || roomTypeKey === 'spisestue') {
    furniture.push({
      id: makeId(),
      type: 'dining-set',
      roomId: room.id,
      position: { x, y },
      rotation: 0,
      layer: 'A-FURN',
      metadata: { autoGenerated: true, locked: false },
    });
  }

  return furniture;
}

// =====================================================
// Selector Hooks (for optimized re-renders)
// =====================================================
export const useActiveSheet = () => useBlueprintStore(state => state.getActiveSheet());
export const useWalls = () => useBlueprintStore(state => state.getActiveSheet()?.elements.walls || []);
export const useOpenings = () => useBlueprintStore(state => state.getActiveSheet()?.elements.openings || []);
export const useRooms = () => useBlueprintStore(state => state.getActiveSheet()?.elements.rooms || []);
export const useFurniture = () => useBlueprintStore(state => state.getActiveSheet()?.elements.furniture || []);
export const useIsGenerating = () => useBlueprintStore(state => state.isGenerating);
export const useZoom = () => useBlueprintStore(state => state.zoom);
export const useShowGrid = () => useBlueprintStore(state => state.showGrid);
