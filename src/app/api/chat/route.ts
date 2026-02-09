import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { NextRequest, NextResponse } from "next/server";
import { BlueprintDataSchema } from "@/schemas/blueprint.schema";
import { SVGBlueprintSchema, validateSVGBlueprint } from "@/schemas/blueprint-svg.schema";
import { type BlueprintResponse } from "@/schemas/blueprint-json-schema";
import {
  ChatRequestSchema,
  ChatResponseSchema,
  type ChatResponse,
  type WizardState,
  type WizardAnswers,
  type Intent,
  toGeminiHistory,
  parseWizardResponse,
} from "@/schemas/chat.schema";
import { buildSystemPrompt, type PromptContext } from "@/lib/gemini-prompt";
import { validateWizardStep, buildConfirmationSummary } from "@/lib/wizard-validation";
import { detectLanguage, type DetectedLanguage } from "@/lib/language-detect";
import { processGeometry } from "@/lib/geometry-processor";
import { validateAndEnforce, getValidationReport } from "@/lib/blueprint-validator";
import { debugGeometry } from "@/lib/geometry-debugger";
import { ZodError } from "zod";
import { readFileSync } from "fs";
import { join } from "path";

// =====================================================
// Intent Classification
// =====================================================

function classifyIntent(
  message: string,
  wizardState: WizardState,
  hasBlueprint: boolean
): Intent {
  const lowerMsg = message.toLowerCase();

  // If in wizard mode, treat as wizard answer
  if (wizardState !== 'idle' && wizardState !== 'refining') {
    return { type: 'wizard_answer' };
  }

  // Check for new design triggers
  const newDesignTriggers = [
    'new design', 'start over', 'new house', 'new home',
    'design a house', 'design a home', 'help me design',
    'create a floor plan', 'start fresh', 'begin',
    'nyt design', 'start forfra', 'nyt hus', 'nyt hjem',
    'design et hus', 'hjælp mig med at designe', 'lav en plantegning', 'begynd',
  ];

  if (newDesignTriggers.some(t => lowerMsg.includes(t))) {
    return { type: 'new_design' };
  }

  // Check for modification intents (only if blueprint exists)
  if (hasBlueprint) {
    // Enlarge patterns
    const enlargePatterns = [
      /make\s+(?:the\s+)?(.+?)\s+(?:bigger|larger|more\s+spacious)/i,
      /expand\s+(?:the\s+)?(.+)/i,
      /increase\s+(?:the\s+)?(.+?)\s+(?:size|area)/i,
      /gør\s+(?:det\s+)?(.+?)\s+større/i,
      /udvid\s+(?:det\s+)?(.+)/i,
    ];

    for (const pattern of enlargePatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'modify', target: match[1].trim(), action: 'enlarge' };
      }
    }

    // Shrink patterns
    const shrinkPatterns = [
      /make\s+(?:the\s+)?(.+?)\s+(?:smaller|more\s+compact)/i,
      /reduce\s+(?:the\s+)?(.+)/i,
      /gør\s+(?:det\s+)?(.+?)\s+mindre/i,
    ];

    for (const pattern of shrinkPatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'modify', target: match[1].trim(), action: 'shrink' };
      }
    }

    // Add patterns
    const addPatterns = [
      /add\s+(?:a\s+)?(.+)/i,
      /tilføj\s+(?:et?\s+)?(.+)/i,
    ];

    for (const pattern of addPatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'modify', target: match[1].trim(), action: 'add' };
      }
    }

    // Remove patterns
    const removePatterns = [
      /remove\s+(?:the\s+)?(.+)/i,
      /delete\s+(?:the\s+)?(.+)/i,
      /fjern\s+(?:det\s+)?(.+)/i,
    ];

    for (const pattern of removePatterns) {
      const match = message.match(pattern);
      if (match) {
        return { type: 'modify', target: match[1].trim(), action: 'delete' };
      }
    }
  }

  // Default to general chat or query
  return { type: 'general_chat' };
}

// =====================================================
// Wizard State Transitions
// =====================================================

function getNextWizardState(currentState: WizardState): WizardState {
  const transitions: Record<WizardState, WizardState> = {
    'idle': 'ask_bedrooms',
    'ask_bedrooms': 'ask_bathrooms',
    'ask_bathrooms': 'ask_floors',
    'ask_floors': 'ask_area',
    'ask_area': 'ask_type',
    'ask_type': 'ask_lifestyle',
    'ask_lifestyle': 'ask_special',
    'ask_special': 'confirm',
    'confirm': 'generating',
    'generating': 'refining',
    'refining': 'refining',
  };
  return transitions[currentState];
}

// =====================================================
// Wall Geometry Cleanup (snap-to-grid and fix dangling walls)
// =====================================================

function cleanupWallGeometry(blueprint: any, gridSize: number = 0.1): any {
  if (!blueprint?.sheets?.[0]?.elements?.walls) return blueprint;

  const cleaned = JSON.parse(JSON.stringify(blueprint));
  const walls = cleaned.sheets[0].elements.walls;

  interface Point { x: number; y: number }

  // Helper to snap a value to grid
  const snapToGrid = (val: number): number => Math.round(val / gridSize) * gridSize;

  // Step 1: Snap ALL coordinates to 0.1m grid
  for (const wall of walls) {
    wall.start.x = snapToGrid(wall.start.x);
    wall.start.y = snapToGrid(wall.start.y);
    wall.end.x = snapToGrid(wall.end.x);
    wall.end.y = snapToGrid(wall.end.y);
  }

  // Step 2: Build a map of all unique points and their connections
  const pointKey = (p: Point): string => `${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  const pointConnections = new Map<string, number>();

  for (const wall of walls) {
    const startKey = pointKey(wall.start);
    const endKey = pointKey(wall.end);
    pointConnections.set(startKey, (pointConnections.get(startKey) || 0) + 1);
    pointConnections.set(endKey, (pointConnections.get(endKey) || 0) + 1);
  }

  // Step 3: Find dangling endpoints (connected to only 1 wall) and snap them
  const SNAP_TOLERANCE = 0.3; // 30cm tolerance for snapping dangling points

  function findBestSnapTarget(point: Point, excludeKey: string): Point | null {
    let best: Point | null = null;
    let bestDist = SNAP_TOLERANCE;

    for (const wall of walls) {
      for (const endpoint of [wall.start, wall.end]) {
        const key = pointKey(endpoint);
        if (key === excludeKey) continue;

        const dist = Math.sqrt((endpoint.x - point.x) ** 2 + (endpoint.y - point.y) ** 2);
        if (dist < bestDist && dist > 0.01) {
          bestDist = dist;
          best = endpoint;
        }
      }
    }
    return best;
  }

  // Multiple passes to fix cascading issues
  for (let pass = 0; pass < 3; pass++) {
    let fixed = 0;
    for (const wall of walls) {
      const startKey = pointKey(wall.start);
      const endKey = pointKey(wall.end);

      // If start point is dangling (only 1 connection), try to snap it
      if (pointConnections.get(startKey) === 1) {
        const target = findBestSnapTarget(wall.start, startKey);
        if (target) {
          wall.start.x = target.x;
          wall.start.y = target.y;
          fixed++;
        }
      }

      // If end point is dangling, try to snap it
      if (pointConnections.get(endKey) === 1) {
        const target = findBestSnapTarget(wall.end, endKey);
        if (target) {
          wall.end.x = target.x;
          wall.end.y = target.y;
          fixed++;
        }
      }
    }

    // Rebuild connection map for next pass
    pointConnections.clear();
    for (const wall of walls) {
      const startKey = pointKey(wall.start);
      const endKey = pointKey(wall.end);
      pointConnections.set(startKey, (pointConnections.get(startKey) || 0) + 1);
      pointConnections.set(endKey, (pointConnections.get(endKey) || 0) + 1);
    }

    if (fixed === 0) break;
    console.log(`[Geometry Pass ${pass + 1}] Fixed ${fixed} dangling endpoints`);
  }

  // Step 4: Snap room centers and polygons to grid
  if (cleaned.sheets[0].elements.rooms) {
    for (const room of cleaned.sheets[0].elements.rooms) {
      if (room.center) {
        room.center.x = snapToGrid(room.center.x);
        room.center.y = snapToGrid(room.center.y);
      }
      if (room.polygon) {
        room.polygon = room.polygon.map((p: Point) => ({
          x: snapToGrid(p.x),
          y: snapToGrid(p.y),
        }));
      }
    }
  }

  // Step 5: Snap opening positions to grid
  if (cleaned.sheets[0].elements.openings) {
    for (const opening of cleaned.sheets[0].elements.openings) {
      if (opening.distFromStart !== undefined) {
        opening.distFromStart = snapToGrid(opening.distFromStart);
      }
    }
  }

  console.log(`[Geometry Cleanup] Processed ${walls.length} walls with ${gridSize}m grid`);
  return cleaned;
}

// =====================================================
// Force-Scale Blueprint to Match Target Area
// =====================================================

function forceScaleBlueprint(blueprint: any, targetArea: number): any {
  if (!blueprint?.sheets?.[0]?.elements) return blueprint;

  const sheet = blueprint.sheets[0];
  const walls = sheet.elements.walls || [];
  const rooms = sheet.elements.rooms || [];
  const openings = sheet.elements.openings || [];

  // Calculate current total area from room areas
  let currentArea = rooms.reduce((sum: number, r: any) => sum + (r.area?.value || 0), 0);

  // If no room areas, estimate from bounding box
  if (currentArea < 10 && walls.length > 0) {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const wall of walls) {
      minX = Math.min(minX, wall.start.x, wall.end.x);
      maxX = Math.max(maxX, wall.start.x, wall.end.x);
      minY = Math.min(minY, wall.start.y, wall.end.y);
      maxY = Math.max(maxY, wall.start.y, wall.end.y);
    }
    currentArea = (maxX - minX) * (maxY - minY) * 0.85; // 85% usable
  }

  // Calculate scale factor (target is ~87% of gross area for internal space)
  const targetInternalArea = targetArea * 0.87;
  const scaleFactor = Math.sqrt(targetInternalArea / Math.max(currentArea, 1));

  // Don't scale if already close (within 20%)
  if (scaleFactor > 0.8 && scaleFactor < 1.2) {
    console.log(`[Scale] Area ${currentArea.toFixed(0)}m² is close to target ${targetArea}m², no scaling needed`);
    return blueprint;
  }

  console.log(`[Scale] Scaling from ${currentArea.toFixed(0)}m² to ~${targetArea}m² (factor: ${scaleFactor.toFixed(2)})`);

  const scaled = JSON.parse(JSON.stringify(blueprint));
  const scaledSheet = scaled.sheets[0];

  // Scale all wall coordinates
  for (const wall of scaledSheet.elements.walls) {
    wall.start.x *= scaleFactor;
    wall.start.y *= scaleFactor;
    wall.end.x *= scaleFactor;
    wall.end.y *= scaleFactor;
    // Keep thickness reasonable (don't scale)
  }

  // Scale room centers, polygons, and areas
  for (const room of scaledSheet.elements.rooms) {
    if (room.center) {
      room.center.x *= scaleFactor;
      room.center.y *= scaleFactor;
    }
    if (room.polygon) {
      room.polygon = room.polygon.map((p: any) => ({
        x: p.x * scaleFactor,
        y: p.y * scaleFactor,
      }));
    }
    if (room.area?.value) {
      room.area.value = Math.round(room.area.value * scaleFactor * scaleFactor);
    }
  }

  // Scale opening positions (but not sizes - doors stay 0.9m wide)
  for (const opening of scaledSheet.elements.openings) {
    if (opening.distFromStart !== undefined) {
      opening.distFromStart *= scaleFactor;
    }
  }

  // Update total area in metadata
  if (scaledSheet.metadata) {
    scaledSheet.metadata.totalArea = targetArea;
  }

  return scaled;
}

// =====================================================
// Blueprint Sanitization (for AI-generated output)
// =====================================================

function sanitizeBlueprint(rawBlueprint: any, targetArea?: number): any {
  // Valid room types from schema
  const validRoomTypes = [
    'Living Room', 'Bedroom', 'Kitchen', 'Bathroom', 'Hallway',
    'Office', 'Storage', 'Utility', 'Balcony', 'Dining Room', 'Entry', 'Other'
  ];

  // Map common AI-generated room types to valid ones
  const roomTypeMap: Record<string, string> = {
    'living': 'Living Room',
    'living room': 'Living Room',
    'bedroom': 'Bedroom',
    'master bedroom': 'Bedroom',
    'kitchen': 'Kitchen',
    'bathroom': 'Bathroom',
    'bath': 'Bathroom',
    'hallway': 'Hallway',
    'hall': 'Hallway',
    'corridor': 'Hallway',
    'office': 'Office',
    'home office': 'Office',
    'storage': 'Storage',
    'closet': 'Storage',
    'utility': 'Utility',
    'utility room': 'Utility',
    'technical': 'Utility',
    'technical room': 'Utility',
    'balcony': 'Balcony',
    'terrace': 'Balcony',
    'dining': 'Dining Room',
    'dining room': 'Dining Room',
    'entry': 'Entry',
    'entrance': 'Entry',
    'foyer': 'Entry',
  };

  const sanitized = JSON.parse(JSON.stringify(rawBlueprint));

  // Ensure basic structure
  if (!sanitized.projectName) sanitized.projectName = 'AI Generated Design';
  if (!sanitized.buildingCode) sanitized.buildingCode = 'BR18/BR23';
  if (!sanitized.location) sanitized.location = 'Denmark';

  // Sanitize each sheet
  if (sanitized.sheets && Array.isArray(sanitized.sheets)) {
    sanitized.sheets = sanitized.sheets.map((sheet: any) => {
      // Ensure elements structure
      if (!sheet.elements) sheet.elements = { walls: [], openings: [], rooms: [] };

      // Sanitize rooms
      if (sheet.elements.rooms) {
        sheet.elements.rooms = sheet.elements.rooms.map((room: any) => {
          const roomType = room.type?.toLowerCase() || 'other';
          const mappedType = roomTypeMap[roomType] ||
            validRoomTypes.find(t => t.toLowerCase() === roomType) ||
            'Other';
          return { ...room, type: mappedType };
        });
      }

      // Sanitize openings (fix heights and layers)
      if (sheet.elements.openings) {
        sheet.elements.openings = sheet.elements.openings.map((opening: any) => {
          const sanitizedOpening = { ...opening };

          // Fix layer based on type
          if (opening.type === 'window' || opening.type?.includes('window')) {
            sanitizedOpening.layer = 'A-WIND';
            // Windows can have smaller heights - set minimum to schema requirement
            if (!sanitizedOpening.height || sanitizedOpening.height < 1.8) {
              sanitizedOpening.height = 1.8;
            }
          } else {
            sanitizedOpening.layer = 'A-DOOR';
            // Doors should be at least 2.1m
            if (!sanitizedOpening.height || sanitizedOpening.height < 1.8) {
              sanitizedOpening.height = 2.1;
            }
          }

          return sanitizedOpening;
        });
      }

      // Sanitize walls
      if (sheet.elements.walls) {
        sheet.elements.walls = sheet.elements.walls.map((wall: any) => ({
          ...wall,
          layer: 'A-WALL',
        }));
      }

      return sheet;
    });
  }

  // Apply aggressive geometry processing with validation
  try {
    const { blueprint: processedBlueprint, report } = processGeometry(sanitized, {
      gridSize: 0.1,
      snapTolerance: 0.02,  // 2cm tight tolerance      // TIGHTER: 5cm instead of 30cm
      maxPasses: 10,             // MORE: 10 instead of 3
      angleTolerance: 2,
      enforceOrthogonal: true,
      minimumWallLength: 0.3,
      debugMode: process.env.NODE_ENV === 'development'
    });

    // Debug logging in development
    if (process.env.NODE_ENV === 'development' && processedBlueprint.sheets[0]?.elements?.walls) {
      console.log(`[Geometry Processor] Applied ${report.totalFixesApplied} fixes across ${report.stageReports.length} stages`);
      debugGeometry(processedBlueprint.sheets[0].elements.walls, 'After Processing');
    }

    let result = processedBlueprint;

    // Apply force-scaling if target area is specified
    if (targetArea && targetArea > 0) {
      result = forceScaleBlueprint(result, targetArea);

      // Re-process after scaling with fewer passes
      const { blueprint: rescaled } = processGeometry(result, {
        gridSize: 0.1,
        snapTolerance: 0.02,  // 2cm tight tolerance
        maxPasses: 5,
        angleTolerance: 2,
        enforceOrthogonal: true,
        minimumWallLength: 0.3,
        debugMode: false
      });
      result = rescaled;
    }

    // Validate geometry (non-throwing for lenient mode)
    const validation = validateAndEnforce(result, {
      rejectOnBlocker: false,
      rejectOnCritical: false,
    });

    if (!validation.valid && process.env.NODE_ENV === 'development') {
      console.warn('[Geometry Validation] Issues found after processing:');
      console.warn(getValidationReport(validation));
    }

    return result;
  } catch (error: any) {
    console.error('[Geometry Processing Error]', error.message);
    // Fallback to old cleanup if new processor fails
    let result = cleanupWallGeometry(sanitized);
    if (targetArea && targetArea > 0) {
      result = forceScaleBlueprint(result, targetArea);
      result = cleanupWallGeometry(result);
    }
    return result;
  }
}

// =====================================================
// Template Loading Helper
// =====================================================

/**
 * Load a template by ID from the public/templates directory
 */
function loadTemplate(templateId: string): any | null {
  try {
    // Template index to map IDs to file paths
    const indexPath = join(process.cwd(), 'public', 'templates', 'index.json');
    const indexData = JSON.parse(readFileSync(indexPath, 'utf-8'));

    // Find the template in the index
    let templatePath: string | null = null;
    for (const category of Object.values(indexData.categories) as any[]) {
      const template = category.templates.find((t: any) => t.id === templateId);
      if (template) {
        templatePath = join(process.cwd(), 'public', template.path);
        break;
      }
    }

    if (!templatePath) {
      console.warn(`[Template] Template ID "${templateId}" not found in index`);
      return null;
    }

    // Load the template file
    const templateData = JSON.parse(readFileSync(templatePath, 'utf-8'));
    console.log(`[Template] Loaded template: ${templateData.metadata?.projectName || templateId}`);
    return templateData;

  } catch (error: any) {
    console.error(`[Template] Error loading template "${templateId}":`, error.message);
    return null;
  }
}

// =====================================================
// Demo/Mock Response
// =====================================================

function createMockBlueprint(lang: DetectedLanguage) {
  // Perfect geometry demo: 12m x 10m = 120m² (100m² usable after walls)
  // Layout:
  //   Top half (y=0 to y=5): Kitchen (left) | Living Room (right)
  //   Bottom half (y=5 to y=10): Bedroom1 (left) | Bedroom2 (center) | Bathroom (right)
  // All interior walls connect precisely to exterior walls or other interior walls

  const roomNames = lang === 'da' ? {
    living: 'Stue',
    kitchen: 'Køkken',
    bedroom1: 'Soveværelse 1',
    bedroom2: 'Soveværelse 2',
    bathroom: 'Badeværelse',
  } : {
    living: 'Living Room',
    kitchen: 'Kitchen',
    bedroom1: 'Bedroom 1',
    bedroom2: 'Bedroom 2',
    bathroom: 'Bathroom',
  };

  return {
    projectName: lang === 'da' ? 'Demo Hus' : 'Demo House',
    location: 'Hvidovre, Denmark',
    buildingCode: 'BR18/BR23',
    sheets: [{
      title: lang === 'da' ? 'Stueplan' : 'Ground Floor Plan',
      number: 'A-101',
      type: 'FLOOR_PLAN' as const,
      scale: '1:50',
      elements: {
        walls: [
          // Exterior walls - closed rectangle (clockwise from top-left)
          { id: 'w-ext-top', start: { x: 0, y: 0 }, end: { x: 12, y: 0 }, thickness: 0.3, type: 'EXTERIOR_INSULATED' as const, material: 'brick' as const, layer: 'A-WALL' as const, isExternal: true },
          { id: 'w-ext-right', start: { x: 12, y: 0 }, end: { x: 12, y: 10 }, thickness: 0.3, type: 'EXTERIOR_INSULATED' as const, material: 'brick' as const, layer: 'A-WALL' as const, isExternal: true },
          { id: 'w-ext-bottom', start: { x: 12, y: 10 }, end: { x: 0, y: 10 }, thickness: 0.3, type: 'EXTERIOR_INSULATED' as const, material: 'brick' as const, layer: 'A-WALL' as const, isExternal: true },
          { id: 'w-ext-left', start: { x: 0, y: 10 }, end: { x: 0, y: 0 }, thickness: 0.3, type: 'EXTERIOR_INSULATED' as const, material: 'brick' as const, layer: 'A-WALL' as const, isExternal: true },

          // Interior walls - all endpoints connect to other walls
          // Vertical wall dividing kitchen/living (x=5, from y=0 to y=5)
          { id: 'w-int-v1', start: { x: 5, y: 0 }, end: { x: 5, y: 5 }, thickness: 0.12, type: 'INTERIOR_PARTITION' as const, material: 'gypsum-board' as const, layer: 'A-WALL' as const, isExternal: false },
          // Horizontal wall dividing top/bottom halves (y=5, from x=0 to x=12)
          { id: 'w-int-h1', start: { x: 0, y: 5 }, end: { x: 12, y: 5 }, thickness: 0.12, type: 'INTERIOR_PARTITION' as const, material: 'gypsum-board' as const, layer: 'A-WALL' as const, isExternal: false },
          // Vertical wall dividing bedroom1/bedroom2 (x=5, from y=5 to y=10)
          { id: 'w-int-v2', start: { x: 5, y: 5 }, end: { x: 5, y: 10 }, thickness: 0.12, type: 'INTERIOR_PARTITION' as const, material: 'gypsum-board' as const, layer: 'A-WALL' as const, isExternal: false },
          // Vertical wall dividing bedroom2/bathroom (x=9, from y=5 to y=10)
          { id: 'w-int-v3', start: { x: 9, y: 5 }, end: { x: 9, y: 10 }, thickness: 0.12, type: 'INTERIOR_PARTITION' as const, material: 'gypsum-board' as const, layer: 'A-WALL' as const, isExternal: false },
        ],
        openings: [
          // Entry door on top exterior wall - BR18: swings inward into dwelling
          { id: 'd-entry', wallId: 'w-ext-top', type: 'door' as const, width: 1.0, height: 2.1, distFromStart: 1.5, tag: 'D1', layer: 'A-DOOR' as const, swing: 'left' as const },
          // Door from kitchen to living - BR18: either direction OK (both primary spaces)
          { id: 'd-kl', wallId: 'w-int-v1', type: 'door' as const, width: 0.9, height: 2.1, distFromStart: 2.0, tag: 'D2', layer: 'A-DOOR' as const, swing: 'left' as const },
          // Door from living to bedroom2 - BR18-6.2: swings into bedroom (less critical space)
          { id: 'd-lb2', wallId: 'w-int-h1', type: 'door' as const, width: 0.9, height: 2.1, distFromStart: 6.5, tag: 'D3', layer: 'A-DOOR' as const, swing: 'right' as const },
          // Door from kitchen to bedroom1 - BR18-6.2: swings into bedroom (less critical space)
          { id: 'd-kb1', wallId: 'w-int-h1', type: 'door' as const, width: 0.9, height: 2.1, distFromStart: 2.0, tag: 'D4', layer: 'A-DOOR' as const, swing: 'left' as const },
          // Door between bedroom2 and bathroom - BR18-6.4 CRITICAL: MUST swing OUTWARD from bathroom for emergency rescue
          { id: 'd-b2bath', wallId: 'w-int-v3', type: 'door' as const, width: 0.8, height: 2.1, distFromStart: 2.5, tag: 'D5', layer: 'A-DOOR' as const, swing: 'right' as const },

          // Windows - positioned on exterior walls
          // Living room window (right wall)
          { id: 'win-living', wallId: 'w-ext-right', type: 'window' as const, width: 1.8, height: 1.4, distFromStart: 1.5, tag: 'W1', layer: 'A-WIND' as const, sillHeight: 0.9 },
          // Kitchen window (top wall)
          { id: 'win-kitchen', wallId: 'w-ext-top', type: 'window' as const, width: 1.2, height: 1.2, distFromStart: 7.5, tag: 'W2', layer: 'A-WIND' as const, sillHeight: 1.0 },
          // Bedroom1 window (left wall)
          { id: 'win-bed1', wallId: 'w-ext-left', type: 'window' as const, width: 1.4, height: 1.4, distFromStart: 2.5, tag: 'W3', layer: 'A-WIND' as const, sillHeight: 0.9 },
          // Bedroom2 window (bottom wall)
          { id: 'win-bed2', wallId: 'w-ext-bottom', type: 'window' as const, width: 1.2, height: 1.4, distFromStart: 5.5, tag: 'W4', layer: 'A-WIND' as const, sillHeight: 0.9 },
          // Bathroom window (bottom wall, smaller for privacy)
          { id: 'win-bath', wallId: 'w-ext-bottom', type: 'window' as const, width: 0.8, height: 0.8, distFromStart: 1.5, tag: 'W5', layer: 'A-WIND' as const, sillHeight: 1.4 },
        ],
        rooms: [
          // Areas calculated from geometry: Kitchen 5x5=25m², Living 7x5=35m², Bed1 5x5=25m², Bed2 4x5=20m², Bath 3x5=15m²
          { id: 'r-kitchen', label: roomNames.kitchen, type: 'Kitchen' as const, area: { value: 25, unit: 'm²' as const }, flooring: 'tiles' as const, center: { x: 2.5, y: 2.5 }, ceilingHeight: 2.5, compliant: true },
          { id: 'r-living', label: roomNames.living, type: 'Living Room' as const, area: { value: 35, unit: 'm²' as const }, flooring: 'oak-parquet' as const, center: { x: 8.5, y: 2.5 }, ceilingHeight: 2.5, compliant: true },
          { id: 'r-bed1', label: roomNames.bedroom1, type: 'Bedroom' as const, area: { value: 25, unit: 'm²' as const }, flooring: 'oak-parquet' as const, center: { x: 2.5, y: 7.5 }, ceilingHeight: 2.5, compliant: true },
          { id: 'r-bed2', label: roomNames.bedroom2, type: 'Bedroom' as const, area: { value: 20, unit: 'm²' as const }, flooring: 'oak-parquet' as const, center: { x: 7, y: 7.5 }, ceilingHeight: 2.5, compliant: true },
          { id: 'r-bath', label: roomNames.bathroom, type: 'Bathroom' as const, area: { value: 15, unit: 'm²' as const }, flooring: 'tiles' as const, center: { x: 10.5, y: 7.5 }, ceilingHeight: 2.5, compliant: true },
        ],
        dimensions: [],
        furniture: [],
      },
      metadata: {
        totalArea: 120,
        floorLevel: lang === 'da' ? 'Stueplan' : 'Ground Floor',
        compliance: [],
      },
    }],
  };
}

// =====================================================
// Main API Handler
// =====================================================

export async function POST(request: NextRequest) {
  // Parse body early so we can use it in error handlers
  let rawBody: any = {};
  let message = '';
  let conversationHistory: any[] = [];
  let currentBlueprint: any = null;
  let wizardState: WizardState = 'idle';
  let wizardAnswers: WizardAnswers = {};
  let apiKey: string | undefined;
  let detectedLanguage: DetectedLanguage = 'en';
  let templateId: string | undefined;

  try {
    rawBody = await request.json();

    // Parse and validate request
    const parsed = ChatRequestSchema.parse(rawBody);
    message = parsed.message;
    conversationHistory = parsed.conversationHistory || [];
    currentBlueprint = parsed.currentBlueprint || null;
    wizardState = parsed.wizardState || 'idle';
    wizardAnswers = parsed.wizardAnswers || {};
    apiKey = parsed.apiKey;
    templateId = parsed.templateId;

    // Detect language early for error messages
    detectedLanguage = detectLanguage(message);

    // Classify intent
    const intent = classifyIntent(message, wizardState, !!currentBlueprint);

    console.log(`[Chat API] Language: ${detectedLanguage}, Intent: ${intent.type}, Wizard: ${wizardState}`);

    // Handle wizard flow
    let nextWizardState = wizardState;
    let updatedWizardAnswers = { ...wizardAnswers };
    let wizardAction: ChatResponse['wizardAction'] = undefined;

    if (intent.type === 'new_design' && wizardState === 'idle') {
      // Start wizard - AI will generate the greeting and first question
      nextWizardState = 'ask_bedrooms';
      wizardAction = 'advance';
      // No early return - let AI generate a personalized response
    } else if (intent.type === 'wizard_answer' && wizardState !== 'idle' && wizardState !== 'refining') {
      // Process wizard answer
      const { answers, understood } = parseWizardResponse(wizardState, message);

      if (understood) {
        updatedWizardAnswers = { ...updatedWizardAnswers, ...answers };

        // Run bullshit filter validation
        const validation = validateWizardStep(wizardState, updatedWizardAnswers);

        if (validation.severity === 'error' && !validation.isValid) {
          // Block advancement — stay on current step
          wizardAction = 'stay';
          nextWizardState = wizardState;
        } else {
          nextWizardState = getNextWizardState(wizardState);
          wizardAction = nextWizardState === 'generating' ? 'complete' : 'advance';
        }
      } else {
        wizardAction = 'stay';
      }
      // No early return - let AI generate natural responses for wizard steps
    }

    // Demo mode check
    const lowerMessage = message.toLowerCase().trim();
    if (lowerMessage === 'demo' || lowerMessage.includes('test mode')) {
      const mockBlueprint = createMockBlueprint(detectedLanguage);
      const demoMessage = detectedLanguage === 'da'
        ? 'Her er en demo-plantegning af et 100m² hus med 2 soveværelser. Du kan nu bede mig om at ændre det!'
        : "Here's a demo floor plan of a 100m² house with 2 bedrooms. You can now ask me to modify it!";

      return NextResponse.json({
        message: demoMessage,
        blueprint: mockBlueprint,
        detectedLanguage,
        wizardAction: 'complete',
        nextWizardState: 'refining',
      } satisfies ChatResponse);
    }

    // Get API key
    const effectiveApiKey = apiKey || process.env.GEMINI_API_KEY || "AIzaSyDW8Sx7bxkFJ8aXdcO4HPEJqa82SPohvkY";

    if (!effectiveApiKey) {
      // No API key - cannot generate real AI responses
      // Don't fake it with hardcoded messages - ask user to configure API key
      const noKeyMessage = detectedLanguage === 'da'
        ? 'Jeg har brug for en Gemini API-nøgle for at generere designs. Tilføj din API-nøgle med knappen nedenfor, eller skriv "demo" for at se et eksempel på en plantegning.'
        : 'I need a Gemini API key to generate designs. Please add your API key using the button below, or type "demo" to see a sample floor plan.';

      return NextResponse.json({
        message: noKeyMessage,
        detectedLanguage,
        wizardAction: 'stay', // Don't advance wizard without real AI
        nextWizardState: wizardState, // Stay in current state
      } satisfies ChatResponse);
    }

    // Load template if templateId is provided
    let templateData: any = null;
    if (templateId) {
      templateData = loadTemplate(templateId);
      if (!templateData) {
        const templateNotFoundMsg = detectedLanguage === 'da'
          ? `Kunne ikke finde skabelon "${templateId}". Fortsætter uden skabelon.`
          : `Could not find template "${templateId}". Continuing without template.`;
        console.warn(templateNotFoundMsg);
      }
    }

    // Build context-aware system prompt
    const promptContext: PromptContext = {
      language: detectedLanguage,
      wizardState: nextWizardState,
      wizardAnswers: updatedWizardAnswers,
      currentBlueprint: currentBlueprint,
      isModification: intent.type === 'modify',
      templateData: templateData,
    };

    const systemPrompt = buildSystemPrompt(promptContext);

    // Determine if we're generating a blueprint (use GPT-4o) or just chatting (use Gemini)
    const isGeneratingBlueprint = nextWizardState === 'generating' || intent.type === 'modify';

    let responseText: string;

    if (isGeneratingBlueprint && process.env.OPENAI_API_KEY) {
      // =====================================================
      // GPT-4o for Blueprint Generation (Best Structured Output)
      // =====================================================
      console.log('[Chat API] Using GPT-4o for blueprint generation');

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
      });

      // Build conversation history for OpenAI
      const openaiMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-8).map(m => ({
          role: m.role as 'user' | 'assistant',
          content: m.content,
        })),
        { role: 'user', content: message },
      ];

      // Retry logic for rate limiting
      let completion: OpenAI.Chat.ChatCompletion | undefined;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          completion = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: openaiMessages,
            response_format: {
              type: 'json_object',
            },
            max_tokens: 16000,
            temperature: 0.7,
          });
          break;
        } catch (error: any) {
          if ((error.status === 429 || error.status === 503) && retries < maxRetries - 1) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.log(`[GPT-4o] Retry ${retries}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      if (!completion?.choices?.[0]?.message?.content) {
        throw new Error('GPT-4o failed to generate content');
      }

      responseText = completion.choices[0].message.content;
      console.log('[GPT-4o] Response received, length:', responseText.length);

    } else {
      // =====================================================
      // Gemini Flash for Chat/Wizard (Cost-Effective)
      // =====================================================
      const useJsonMode = isGeneratingBlueprint; // Force JSON when generating blueprints
      console.log('[Chat API] Using Gemini Flash for chat', useJsonMode ? '(JSON mode)' : '');

      const genAI = new GoogleGenerativeAI(effectiveApiKey);

      // Configure model - use JSON mode when generating blueprints
      const modelConfig: any = { model: 'gemini-2.5-flash' };
      if (useJsonMode) {
        modelConfig.generationConfig = {
          responseMimeType: 'application/json',
          temperature: 0.7,
          maxOutputTokens: 16000,
        };
      }
      const chatModel = genAI.getGenerativeModel(modelConfig);

      // Build conversation history for Gemini
      const geminiHistory = [
        { role: 'user' as const, parts: [{ text: systemPrompt }] },
        { role: 'model' as const, parts: [{ text: detectedLanguage === 'da'
          ? 'Forstået. Jeg er klar til at designe plantegninger med præcise data i JSON-format.'
          : 'Understood. I am ready to design floor plans with precise data in JSON format.' }] },
        ...toGeminiHistory(conversationHistory.slice(-8)),
      ];

      const chat = chatModel.startChat({ history: geminiHistory });

      // Retry logic for rate limiting
      let result;
      let retries = 0;
      const maxRetries = 3;

      while (retries < maxRetries) {
        try {
          result = await chat.sendMessage(message);
          break;
        } catch (error: any) {
          if ((error.status === 503 || error.message?.includes('overloaded')) && retries < maxRetries - 1) {
            retries++;
            const delay = Math.pow(2, retries) * 1000;
            console.log(`[Gemini] Retry ${retries}/${maxRetries} after ${delay}ms...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          } else {
            throw error;
          }
        }
      }

      if (!result) {
        throw new Error('Gemini failed to generate content');
      }

      responseText = result.response.text();
    }

    console.log('AI Response preview:', responseText.substring(0, 300) + '...');

    // Parse AI response
    let parsedResponse: Partial<ChatResponse> = {
      message: responseText,
      detectedLanguage,
      wizardAction,
      nextWizardState,
    };

    // Try to extract JSON blueprint from response
    console.log('=== BLUEPRINT EXTRACTION START ===');
    console.log('Response text length:', responseText?.length);
    console.log('nextWizardState:', nextWizardState);
    console.log('wizardState:', wizardState);

    try {
      // Try multiple JSON extraction patterns
      let jsonString: string | null = null;
      let extractionMethod = 'none';

      // Pattern 1: ```json ... ``` format
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        const candidate = codeBlockMatch[1].trim();
        try {
          JSON.parse(candidate);
          jsonString = candidate;
          extractionMethod = 'code_block';
        } catch {
          // Not valid JSON, try next pattern
        }
      }

      // Pattern 2: Object with "sheets" property (legacy format)
      if (!jsonString) {
        const sheetsMatch = responseText.match(/(\{[\s\S]*"sheets"[\s\S]*\})/);
        if (sheetsMatch) {
          try {
            JSON.parse(sheetsMatch[1]);
            jsonString = sheetsMatch[1];
            extractionMethod = 'sheets_object';
          } catch {
            // Not valid JSON
          }
        }
      }

      // Pattern 3: Object with "format" property (SVG-enhanced)
      if (!jsonString) {
        const formatMatch = responseText.match(/(\{[\s\S]*"format"[\s\S]*"svg-enhanced"[\s\S]*\})/);
        if (formatMatch) {
          try {
            JSON.parse(formatMatch[1]);
            jsonString = formatMatch[1];
            extractionMethod = 'svg_enhanced';
          } catch {
            // Not valid JSON
          }
        }
      }

      // Pattern 4: Object with "blueprint" nested
      if (!jsonString) {
        const blueprintMatch = responseText.match(/(\{[\s\S]*"blueprint"\s*:\s*\{[\s\S]*\}[\s\S]*\})/);
        if (blueprintMatch) {
          try {
            JSON.parse(blueprintMatch[1]);
            jsonString = blueprintMatch[1];
            extractionMethod = 'nested_blueprint';
          } catch {
            // Not valid JSON
          }
        }
      }

      // Pattern 5: Any JSON object (last resort)
      if (!jsonString) {
        const anyJsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (anyJsonMatch) {
          try {
            JSON.parse(anyJsonMatch[0]);
            jsonString = anyJsonMatch[0];
            extractionMethod = 'any_object';
          } catch {
            // Not valid JSON
          }
        }
      }

      console.log('JSON extraction method:', extractionMethod);
      console.log('JSON string found:', jsonString ? 'YES' : 'NO');
      if (!jsonString && (nextWizardState === 'generating' || wizardState === 'generating')) {
        console.log('⚠️ NO JSON FOUND during generating state!');
        console.log('Response preview (first 800 chars):', responseText?.substring(0, 800));
      }

      if (jsonString) {
        console.log("Attempting to parse JSON blueprint, length:", jsonString.length);
        const rawJson = JSON.parse(jsonString);

        // Extract the blueprint data (could be nested or direct)
        let blueprintData = rawJson.blueprint || (rawJson.sheets ? rawJson : null) || (rawJson.format === 'svg-enhanced' ? rawJson : null);
        console.log('Blueprint data found:', blueprintData ? 'YES' : 'NO');
        if (blueprintData) {
          console.log('Blueprint format:', blueprintData.format || 'legacy');
        }

        if (blueprintData) {
          // Get target area from wizard answers for force-scaling
          const targetArea = updatedWizardAnswers.totalArea || 0;

          // Try SVG-enhanced format first (new format)
          if (blueprintData.format === 'svg-enhanced') {
            try {
              const svgBlueprint = SVGBlueprintSchema.parse(blueprintData);

              // Simple validation for SVG blueprints
              const svgValidation = validateSVGBlueprint(svgBlueprint);

              if (!svgValidation.valid) {
                console.error('SVG blueprint validation failed:', svgValidation.errors);
                throw new Error(`SVG validation failed: ${svgValidation.errors.join(', ')}`);
              }

              if (svgValidation.warnings.length > 0) {
                console.warn('SVG blueprint warnings:', svgValidation.warnings);
              }

              parsedResponse.blueprint = svgBlueprint;
              console.log('✓ SVG blueprint validated successfully (0 geometry errors)');

            } catch (svgError: any) {
              console.error('SVG blueprint parsing failed:', svgError.message);

              // Force AI to regenerate with proper SVG format
              const errorMessage = detectedLanguage === 'da'
                ? `SVG-formatet var ugyldigt. Genererer ny tegning...`
                : `SVG format was invalid. Generating new drawing...`;

              parsedResponse.message = errorMessage;
              parsedResponse.wizardAction = 'stay';
              parsedResponse.nextWizardState = wizardState;

              // Add error details for debugging
              (parsedResponse as any).blueprintError = {
                stage: 'svg_validation',
                message: svgError.message,
                hint: 'AI generated SVG-format blueprint but it failed validation.',
              };
            }
          } else {
            // Legacy coordinate format - try strict parsing with geometry processing
            try {
              let blueprint = BlueprintDataSchema.parse(blueprintData);

              // Apply force-scaling if needed
              if (targetArea > 0) {
                blueprint = forceScaleBlueprint(blueprint, targetArea);
              }

              // Apply geometry processing
              const { blueprint: processed, report } = processGeometry(blueprint, {
                gridSize: 0.1,
                snapTolerance: 0.02,  // 2cm tight tolerance
                maxPasses: 10,
                angleTolerance: 2,
                enforceOrthogonal: true,
                minimumWallLength: 0.3,
                debugMode: process.env.NODE_ENV === 'development'
              });

              // Enforce validation (will throw if blockers found)
              // Pass targetArea for area validation
              const validation = validateAndEnforce(processed, {
                rejectOnBlocker: true,
                rejectOnCritical: true,  // ← REJECT critical issues (dangling walls)
                checkAreas: true,
                targetArea: targetArea > 0 ? targetArea : undefined,
              });

              if (!validation.valid) {
                throw new Error(`Geometry validation failed: ${validation.summary}`);
              }

              parsedResponse.blueprint = processed;
              console.log(`✓ Strict validation + geometry processing successful (${report.totalFixesApplied} fixes)`);

            } catch (validationError: any) {
            console.log("Strict validation failed, trying lenient parsing with enforcement");

            try {
              // Lenient parsing with aggressive geometry processing
              const sanitized = sanitizeBlueprint(blueprintData, targetArea);

              // Enforce validation even in lenient mode
              // Pass targetArea for area validation
              const validation = validateAndEnforce(sanitized, {
                rejectOnBlocker: true,
                rejectOnCritical: true,  // ← REJECT critical issues (dangling walls)
                checkAreas: true,
                targetArea: targetArea > 0 ? targetArea : undefined,
              });

              if (!validation.valid) {
                throw new Error(`Geometry validation failed even with lenient mode: ${validation.summary}`);
              }

              parsedResponse.blueprint = sanitized;
              console.log("✓ Lenient parsing successful with validation");

            } catch (sanitizeError: any) {
              // GEOMETRY TOTALLY BROKEN - Ask AI to regenerate
              console.error("✗ CRITICAL: Geometry processing failed even with lenient mode");
              console.error('Validation errors:', sanitizeError.message);

              // Add geometry error context to response - forces regeneration
              const errorMessage = detectedLanguage === 'da'
                ? `Jeg havde problemer med væggeometrien i tegningen. Lad mig generere en ny med korrekt tilsluttede vægge.`
                : `I had trouble with wall geometry in the drawing. Let me generate a new one with properly connected walls.`;

              parsedResponse.message = errorMessage;
              parsedResponse.wizardAction = 'stay';
              parsedResponse.nextWizardState = wizardState;

              // Add error details for debugging
              (parsedResponse as any).blueprintError = {
                stage: 'geometry_validation',
                message: sanitizeError.message,
                hint: 'AI generated a floor plan but wall geometry was invalid. Walls may not be connected properly.',
              };

              // NO blueprint returned - forces user to see error and AI to regenerate
              // Don't set parsedResponse.blueprint
              console.log('Returning error message to trigger AI regeneration');
            }
          }
          }

          if (rawJson.message) {
            parsedResponse.message = rawJson.message;
          }
        }  // closes if (blueprintData)

        // If we got a blueprint during wizard, complete it
        if (parsedResponse.blueprint && wizardState !== 'refining') {
          parsedResponse.wizardAction = 'complete';
          parsedResponse.nextWizardState = 'refining';
        }
      } else if (nextWizardState === 'generating' || wizardState === 'generating') {
        // No JSON found during generating state - this is a problem
        console.log('⚠️ No JSON extracted during generating state');
        parsedResponse.message = detectedLanguage === 'da'
          ? 'Jeg kunne ikke generere plantegningen korrekt. Lad mig prøve igen.'
          : 'I could not generate the floor plan correctly. Let me try again.';
        parsedResponse.wizardAction = 'stay';
        parsedResponse.nextWizardState = wizardState;

        // Add error details for debugging
        (parsedResponse as any).blueprintError = {
          stage: 'json_extraction',
          message: 'No valid JSON found in AI response',
          hint: 'AI returned text without a blueprint JSON object.',
          responsePreview: responseText?.substring(0, 300),
        };
      }
    } catch (parseError: any) {
      console.log("JSON parse error:", parseError.message);
      // If JSON parsing failed, inform user but don't fake it with mock blueprint
      if (nextWizardState === 'generating' || wizardState === 'confirm') {
        console.log("Blueprint generation failed - AI didn't return valid JSON");
        parsedResponse.message = detectedLanguage === 'da'
          ? 'Jeg havde problemer med at generere plantegningen. Lad mig prøve igen - kan du gentage dine krav?'
          : "I had trouble generating the floor plan. Let me try again - can you repeat your requirements?";
        parsedResponse.wizardAction = 'stay';
        parsedResponse.nextWizardState = wizardState;

        // Add error details for debugging
        (parsedResponse as any).blueprintError = {
          stage: 'json_parse',
          message: parseError.message,
          hint: 'AI response could not be parsed as JSON. The AI may have returned text instead of structured data.',
        };
      }
    }

    // Clean up message if it contains JSON
    if (parsedResponse.message && parsedResponse.message.includes('{')) {
      // Try to extract just the text message
      const textOnly = parsedResponse.message.split(/\{[\s\S]*\}/)[0].trim();
      if (textOnly) {
        parsedResponse.message = textOnly;
      }
    }

    return NextResponse.json(parsedResponse as ChatResponse);

  } catch (error: any) {
    console.error("API Error:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({
        message: "Invalid request format",
        error: "Validation failed",
        details: error.issues,
        detectedLanguage: 'en',
      }, { status: 400 });
    }

    // Check if quota exceeded
    const isQuotaError = error.message?.includes('quota') ||
                         error.message?.includes('RESOURCE_EXHAUSTED') ||
                         error.status === 429;

    if (isQuotaError) {
      const quotaMessage = detectedLanguage === 'da'
        ? 'API quota er midlertidigt opbrugt. Vent venligst et minut og prøv igen, eller skriv "demo" for at se et eksempel.'
        : 'API quota temporarily exceeded. Please wait a minute and try again, or type "demo" to see a sample floor plan.';

      return NextResponse.json({
        message: quotaMessage,
        detectedLanguage,
        wizardAction: 'stay',
        nextWizardState: wizardState,
      } satisfies ChatResponse);
    }

    // Check if it's an API key error (Gemini or OpenAI)
    const isApiKeyError = error.message?.includes('API key') ||
                          error.message?.includes('API_KEY_INVALID') ||
                          error.message?.includes('Incorrect API key') ||
                          error.code === 'invalid_api_key' ||
                          error.status === 401 ||
                          error.status === 403;

    if (isApiKeyError) {
      const helpMessage = detectedLanguage === 'da'
        ? 'Jeg har brug for gyldige API-nøgler for at generere designs. Kontroller dine Gemini og OpenAI API-nøgler, eller skriv "demo" for at se et eksempel.'
        : 'I need valid API keys to generate designs. Please check your Gemini and OpenAI API keys, or type "demo" to see a sample floor plan.';

      return NextResponse.json({
        message: helpMessage,
        detectedLanguage,
        wizardAction: 'stay',
        nextWizardState: wizardState,
      } satisfies ChatResponse);
    }

    // Generic error - stay in character
    const errorMessage = detectedLanguage === 'da'
      ? 'Jeg beklager, men der opstod en uventet fejl. Prøv venligst igen, eller skriv "demo" for at se et eksempel.'
      : "I apologize, but something unexpected happened on my end. Please try again, or type \"demo\" to see an example.";

    return NextResponse.json({
      message: errorMessage,
      detectedLanguage,
    } satisfies ChatResponse);
  }
}

// =====================================================
// Helper: Generate wizard messages without API
// =====================================================

function getWizardMessage(
  state: WizardState,
  answers: WizardAnswers,
  lang: DetectedLanguage
): string {
  const beds = answers.bedrooms || 0;
  const baths = answers.bathrooms || 0;
  const floors = answers.floors || 1;
  const areaSuggestion = getSmartAreaSuggestion(answers, lang);

  if (lang === 'da') {
    switch (state) {
      case 'ask_bedrooms':
        return 'Hej! Jeg er Levi, din AI-arkitekt.\n\nHvor mange soveværelser har du brug for? (1-5 anbefales)';
      case 'ask_bathrooms':
        return `${beds} soveværelse${beds !== 1 ? 'r' : ''} - noteret!\n\nHvor mange badeværelser har du brug for? (1-4)`;
      case 'ask_floors':
        return `${baths} badeværelse${baths !== 1 ? 'r' : ''}.\n\nHvor mange etager? (1-3)\n• 1 etage - alt på ét plan\n• 2 etager\n• 3 etager`;
      case 'ask_area':
        return `${floors} etage${floors !== 1 ? 'r' : ''}.\n\nHvad er dit mål for det samlede boligareal i kvadratmeter?\n\n(Jeg anbefaler ${areaSuggestion})`;
      case 'ask_type':
        return `${answers.totalArea}m² - lyder godt!\n\nHvilken type bygning er det?\n• Enfamiliehus\n• Rækkehus\n• Fleretageshus`;
      case 'ask_lifestyle':
        return `Fortæl mig lidt om din livsstil:\n• Hjemmearbejde\n• Børn/familie\n• Ældre beboere\n• Kæledyr\n• Underholdning/gæster\n\n(Vælg de der passer, eller skriv "ingen")`;
      case 'ask_special':
        return `Har du nogen særlige krav?\n• Kørestolsadgang\n• Hjemmekontor\n• Åbent køkken/stue\n• Garage\n• Kælder\n• Terrasse\n\n(Skriv "ingen" hvis du ikke har særlige krav)`;
      case 'confirm':
        return buildConfirmationSummary(answers, 'da');
      case 'generating':
        return 'Perfekt! Jeg designer nu din plantegning...';
      default:
        return 'Hvordan kan jeg hjælpe dig med dit design?';
    }
  }

  // English
  switch (state) {
    case 'ask_bedrooms':
      return "Hi! I'm Levi, your AI architect.\n\nHow many bedrooms do you need? (1-5 recommended)";
    case 'ask_bathrooms':
      return `${beds} bedroom${beds !== 1 ? 's' : ''} - noted!\n\nHow many bathrooms would you like? (1-4)`;
    case 'ask_floors':
      return `${baths} bathroom${baths !== 1 ? 's' : ''}.\n\nHow many floors? (1-3)\n• 1 floor - single story\n• 2 floors\n• 3 floors`;
    case 'ask_area':
      return `${floors} floor${floors !== 1 ? 's' : ''}.\n\nWhat is your target total floor area in square meters?\n\n(I recommend ${areaSuggestion})`;
    case 'ask_type':
      return `${answers.totalArea}m² - sounds good!\n\nWhat type of building is this?\n• Single-family house\n• Townhouse\n• Multi-story house`;
    case 'ask_lifestyle':
      return `Tell me about your lifestyle:\n• Work from home\n• Kids / family\n• Elderly residents\n• Pets\n• Entertaining guests\n\n(Pick any that apply, or type "none")`;
    case 'ask_special':
      return `Any special requirements?\n• Wheelchair accessibility\n• Home office\n• Open-plan kitchen/living\n• Garage\n• Basement\n• Terrace\n\n(Type "none" if no special requirements)`;
    case 'confirm':
      return buildConfirmationSummary(answers, 'en');
    case 'generating':
      return "Perfect! I'm now designing your floor plan...";
    default:
      return 'How can I help you with your design?';
  }
}

function getSmartAreaSuggestion(answers: WizardAnswers, lang: DetectedLanguage): string {
  const beds = answers.bedrooms || 2;
  const baths = answers.bathrooms || 1;
  const floors = answers.floors || 1;
  const minNet = beds * 12 + baths * 5 + 25;
  const minArea = Math.ceil((minNet * 1.15) / 0.87);
  const recommended = Math.ceil(minArea * 1.3);
  const perFloor = Math.ceil(recommended / floors);

  if (lang === 'da') {
    return floors > 1
      ? `${minArea}-${recommended}m² samlet (ca. ${perFloor}m² per etage)`
      : `${minArea}-${recommended}m²`;
  }
  return floors > 1
    ? `${minArea}-${recommended}m² total (about ${perFloor}m² per floor)`
    : `${minArea}-${recommended}m²`;
}

function translateBuildingType(type: string | undefined, lang: DetectedLanguage): string {
  if (!type) return lang === 'da' ? 'Ikke angivet' : 'Not specified';

  const translations: Record<string, { en: string; da: string }> = {
    'house': { en: 'Single-family house', da: 'Enfamiliehus' },
    'townhouse': { en: 'Townhouse', da: 'Rækkehus' },
    'multi-story': { en: 'Multi-story house', da: 'Fleretageshus' },
  };

  return translations[type]?.[lang] || type;
}
