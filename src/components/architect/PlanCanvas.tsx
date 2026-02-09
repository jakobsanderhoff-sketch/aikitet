"use client";

import { useRef, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ZoomIn, ZoomOut, Download, Maximize2, Grid3x3, AlertTriangle, CheckCircle, FileDown, CheckCircle2, Plus, Wand2, ChevronUp, ChevronDown } from "lucide-react";
import { FloorPlanData } from "@/types/floorplan";
import { getWallPolygon, getOpeningGeometry, getDoorPath } from "./render-utils";
import { downloadDXF } from "@/lib/dxf-export";
import { downloadEnhancedDXF } from "@/lib/dxf-export-enhanced";
import {
  getRoomFurniture,
  Sofa,
  LSofa,
  Armchair,
  CoffeeTable,
  DiningSet,
  DoubleBed,
  SingleBed,
  Wardrobe,
  BedsideTable,
  Stove,
  KitchenSink,
  Refrigerator,
  KitchenCounter,
  Toilet,
  BathroomSink,
  Bathtub,
  Shower,
  Desk,
  OfficeChair,
} from "./FurnitureSymbols";
import { useBlueprintStore } from "@/store/blueprint.store";
import { validateCompliance as validateLegacyCompliance } from "@/lib/compliance";
import { validateCompliance } from "@/lib/compliance-engine";
import type { ComplianceIssue, FurnitureType } from "@/schemas/blueprint.schema";
import { renderSVGBlueprint } from "@/lib/svg-blueprint-renderer";
import type { SVGBlueprint } from "@/schemas/blueprint-svg.schema";

// Helper to generate compliance summary from issues array
function getComplianceSummaryFromIssues(issues: ComplianceIssue[], checkCount: number = 0) {
  const violations = issues.filter(i => i.type === 'violation').length;
  const warnings = issues.filter(i => i.type === 'warning').length;
  return {
    passing: violations === 0,
    violations,
    warnings,
    checks: checkCount,
  };
}

// Map furniture type to React component
function getFurnitureComponent(type: FurnitureType) {
  const map: Record<string, React.ComponentType<any>> = {
    'sofa-3seat': Sofa,
    'sofa-lshape': LSofa,
    'armchair': Armchair,
    'coffee-table': CoffeeTable,
    'dining-set': DiningSet,
    'double-bed': DoubleBed,
    'single-bed': SingleBed,
    'wardrobe': Wardrobe,
    'bedside-table': BedsideTable,
    'stove': Stove,
    'kitchen-sink': KitchenSink,
    'refrigerator': Refrigerator,
    'kitchen-counter': KitchenCounter,
    'toilet': Toilet,
    'bathroom-sink': BathroomSink,
    'bathtub': Bathtub,
    'shower': Shower,
    'desk': Desk,
    'office-chair': OfficeChair,
  };
  return map[type];
}

type PlanCanvasProps = {
  floorPlan: FloorPlanData | null;
  isGenerating: boolean;
};

export function PlanCanvas({ floorPlan, isGenerating }: PlanCanvasProps) {
  // Zustand state management
  const {
    blueprint,
    activeSheetIndex,
    zoom,
    setZoom,
    showGrid,
    setShowGrid,
    selectedElementId,
    selectedElementType,
    selectElement,
    clearSelection,
    blueprintStage,
    furnitureModeActive,
    approveBlueprint,
    enableFurnitureMode,
    disableFurnitureMode,
    autoGenerateFurniture,
  } = useBlueprintStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [containerSize, setContainerSize] = useState({ width: 800, height: 600 });
  const [complianceIssues, setComplianceIssues] = useState<ComplianceIssue[]>([]);
  const [complianceCheckCount, setComplianceCheckCount] = useState(0);

  // Draggable compliance drawer state
  const DRAWER_COLLAPSED = 40;
  const DRAWER_MAX = 280;
  const DRAWER_SNAP_THRESHOLD = 100;
  const [drawerHeight, setDrawerHeight] = useState(DRAWER_COLLAPSED);
  const drawerDragging = useRef(false);
  const drawerStartY = useRef(0);
  const drawerStartHeight = useRef(0);

  const drawerExpanded = drawerHeight > DRAWER_COLLAPSED + 10;

  const onDragStart = useCallback((clientY: number) => {
    drawerDragging.current = true;
    drawerStartY.current = clientY;
    drawerStartHeight.current = drawerHeight;
  }, [drawerHeight]);

  const onDragMove = useCallback((clientY: number) => {
    if (!drawerDragging.current) return;
    const delta = drawerStartY.current - clientY;
    const newHeight = Math.max(DRAWER_COLLAPSED, Math.min(DRAWER_MAX, drawerStartHeight.current + delta));
    setDrawerHeight(newHeight);
  }, []);

  const onDragEnd = useCallback(() => {
    if (!drawerDragging.current) return;
    drawerDragging.current = false;
    // Snap to collapsed or expanded
    setDrawerHeight(prev => prev > DRAWER_SNAP_THRESHOLD ? DRAWER_MAX : DRAWER_COLLAPSED);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => onDragMove(e.clientY);
    const handleMouseUp = () => onDragEnd();
    const handleTouchMove = (e: TouchEvent) => onDragMove(e.touches[0].clientY);
    const handleTouchEnd = () => onDragEnd();

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove);
    window.addEventListener('touchend', handleTouchEnd);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [onDragMove, onDragEnd]);

  // Check if this is an SVG-enhanced blueprint
  const isSVGBlueprint = blueprint && 'format' in blueprint && blueprint.format === 'svg-enhanced';

  // Use blueprint from store if available, otherwise fallback to legacy floorPlan prop
  // Only access sheets for legacy BlueprintData, not SVG blueprints
  const currentSheet = (!isSVGBlueprint && blueprint && 'sheets' in blueprint)
    ? blueprint.sheets[activeSheetIndex] || null
    : null;

  // Normalize data: extract elements from Sheet format or use legacy FloorPlanData directly
  // For new Sheet format, elements are nested under 'elements' property
  // For legacy FloorPlanData, walls/openings/rooms are at top level
  const currentData = currentSheet
    ? {
        walls: currentSheet.elements?.walls || [],
        openings: currentSheet.elements?.openings || [],
        rooms: currentSheet.elements?.rooms || [],
        dimensions: currentSheet.elements?.dimensions || [],
        metadata: currentSheet.metadata,
      }
    : floorPlan;

  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        setContainerSize({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => window.removeEventListener("resize", updateSize);
  }, []);

  // Render SVG-enhanced blueprints to canvas
  useEffect(() => {
    if (isSVGBlueprint && canvasRef.current && blueprint) {
      try {
        renderSVGBlueprint(blueprint as SVGBlueprint, canvasRef.current, {
          scale: baseScale,
          showGrid: showGrid,
          showDimensions: true,
          showRoomLabels: true,
          lineColor: '#000000',
          fillRooms: true,
          debugMode: false,
        });
        console.log('✓ SVG blueprint rendered to canvas');
      } catch (error) {
        console.error('Failed to render SVG blueprint:', error);
      }
    }
  }, [isSVGBlueprint, blueprint, showGrid, zoom]);

  // Run compliance checks when floor plan changes
  useEffect(() => {
    if (currentSheet) {
      // New Sheet format from blueprint store — only show violations & warnings in list
      const report = validateCompliance(currentSheet);
      const issuesOnly: ComplianceIssue[] = [...report.violations, ...report.warnings];
      setComplianceIssues(issuesOnly);
      setComplianceCheckCount(report.checks.length);
    } else if (floorPlan) {
      // Legacy FloorPlanData format
      const issues = validateLegacyCompliance(floorPlan);
      setComplianceIssues(issues as ComplianceIssue[]);
    } else {
      setComplianceIssues([]);
    }
  }, [currentSheet, floorPlan]);

  const handleZoomIn = () => setZoom(Math.min(zoom + 0.2, 4));
  const handleZoomOut = () => setZoom(Math.max(zoom - 0.2, 0.2));
  const handleResetZoom = () => setZoom(1);

  const handleExportPDF = () => {
    alert("PDF export coming soon!");
  };

  const handleExportDXF = () => {
    const { blueprint, activeSheetIndex } = useBlueprintStore.getState();

    if (blueprint) {
      // Check if it's an SVG blueprint
      if ('format' in blueprint && blueprint.format === 'svg-enhanced') {
        // TODO: Implement SVG-to-DXF export
        alert('SVG blueprint export coming soon!');
        return;
      }

      // Use enhanced DXF export for BlueprintData
      downloadEnhancedDXF(blueprint as any, activeSheetIndex);
    } else if (floorPlan) {
      // Fallback to legacy export
      const filename = `floor-plan-${Date.now()}.dxf`;
      downloadDXF(floorPlan, filename);
    }
  };

  const complianceSummary = getComplianceSummaryFromIssues(complianceIssues, complianceCheckCount);

  const baseScale = 50; // 50px = 1m

  // Element click handlers
  const handleElementClick = (elementId: string, elementType: 'wall' | 'opening' | 'room', event: React.MouseEvent) => {
    event.stopPropagation();
    selectElement(elementId, elementType);
  };

  const handleCanvasClick = () => {
    clearSelection();
  };

  // Calculate bounding box
  const calculateBounds = () => {
    if (!currentData || !currentData.walls || currentData.walls.length === 0) {
      return { minX: 0, minY: 0, width: 20, height: 15 };
    }

    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    currentData.walls.forEach((w: any) => {
      minX = Math.min(minX, w.start.x, w.end.x);
      minY = Math.min(minY, w.start.y, w.end.y);
      maxX = Math.max(maxX, w.start.x, w.end.x);
      maxY = Math.max(maxY, w.start.y, w.end.y);
    });

    // Add padding
    const padding = 2; // meters
    return {
      minX: minX - padding,
      minY: minY - padding,
      width: (maxX - minX) + padding * 2,
      height: (maxY - minY) + padding * 2,
    };
  };

  const bounds = calculateBounds();
  const viewBox = `${bounds.minX * baseScale} ${bounds.minY * baseScale} ${bounds.width * baseScale} ${bounds.height * baseScale}`;

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between border-b border-white/10 p-3 bg-zinc-900">
        <div className="flex items-center gap-4">
          <h2 className="text-sm font-semibold text-white">Blueprint Canvas</h2>
          {currentData && (
            <Badge variant="outline" className="gap-1 border-white/20 text-xs font-mono">
              SCALE {currentSheet?.scale || "1:100"}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => setShowGrid(!showGrid)} className="text-white hover:bg-white/10 h-8 w-8">
            <Grid3x3 className={`h-4 w-4 ${showGrid ? "opacity-100" : "opacity-40"}`} />
          </Button>
          <div className="h-4 w-[1px] bg-white/10 mx-1" />
          <Button variant="ghost" size="icon" onClick={handleZoomOut} className="text-white hover:bg-white/10 h-8 w-8">
            <ZoomOut className="h-4 w-4" />
          </Button>
          <span className="text-xs text-white/70 min-w-[3rem] text-center" style={{ fontFamily: 'JetBrains Mono, monospace' }}>
            {Math.round(zoom * 100)}%
          </span>
          <Button variant="ghost" size="icon" onClick={handleZoomIn} className="text-white hover:bg-white/10 h-8 w-8">
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleResetZoom} className="text-white hover:bg-white/10 h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>

          {/* Workflow Buttons */}
          {currentData && blueprintStage === 'draft' && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={approveBlueprint}
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Approve Blueprint
              </Button>
            </>
          )}

          {currentData && blueprintStage === 'approved' && !furnitureModeActive && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={enableFurnitureMode}
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Furniture
              </Button>
            </>
          )}

          {furnitureModeActive && (
            <>
              <div className="h-4 w-[1px] bg-white/10 mx-1" />
              <Button
                variant="ghost"
                size="sm"
                onClick={() => autoGenerateFurniture()}
                className="text-green-500 hover:bg-green-500/10 h-8 px-3"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Auto-Generate
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={disableFurnitureMode}
                className="text-white hover:bg-white/10 h-8 px-3"
              >
                Done
              </Button>
            </>
          )}

          {/* Removed redundant Export button */}
        </div>
      </div>

      {/* Canvas */}
      <div ref={containerRef} className="flex-1 overflow-auto relative flex items-center justify-center p-8" onClick={handleCanvasClick}>
        {!currentData && !isSVGBlueprint && !isGenerating && (
          <div className="text-center text-white/30">
            <Grid3x3 className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>Ready to generate drawings</p>
          </div>
        )}

        {/* Only show spinner if generating AND no blueprint yet */}
        {isGenerating && !isSVGBlueprint && !currentData && (
          <div className="text-center text-blue-400 animate-pulse">
            <div className="h-12 w-12 border-4 border-blue-400/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-3" />
            <p>Architecting...</p>
          </div>
        )}

        {/* SVG-enhanced blueprint rendering (canvas-based) */}
        {isSVGBlueprint && (
          <canvas
            ref={canvasRef}
            width={Math.min(containerSize.width - 64, 1200)}
            height={Math.min(containerSize.height - 64, 900)}
            className="bg-[#060606]"
            style={{
              transition: "all 0.3s ease",
              transform: `scale(${zoom})`,
              transformOrigin: 'center',
            }}
          />
        )}

        {/* Legacy coordinate-based blueprint rendering (SVG-based) */}
        {!isSVGBlueprint && currentData && (
          <svg
            width={Math.min(containerSize.width - 64, bounds.width * baseScale * zoom)}
            height={Math.min(containerSize.height - 64, bounds.height * baseScale * zoom)}
            viewBox={viewBox}
            className="bg-[#f8f8f6]" // Light architectural paper
            style={{ transition: "all 0.3s ease" }}
          >
            <defs>
              {/* Grid Pattern - subtle gray for light background */}
              <pattern id="grid" width={baseScale} height={baseScale} patternUnits="userSpaceOnUse">
                <path d={`M ${baseScale} 0 L 0 0 0 ${baseScale}`} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth="0.5" />
              </pattern>

              {/* Hatching: Interior wall pattern (light diagonal) */}
              <pattern id="hatch-interior" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <line x1="0" y1="0" x2="0" y2="6" stroke="#525252" strokeWidth="0.5" opacity="0.4" />
              </pattern>

              {/* Deck/Terrace: Wood plank pattern */}
              <pattern id="deck-planks" width="100" height="12" patternUnits="userSpaceOnUse">
                <rect x="0" y="0" width="100" height="10" fill="none" stroke="#a3a3a3" strokeWidth="0.5"/>
                <line x1="25" y1="0" x2="25" y2="10" stroke="#a3a3a3" strokeWidth="0.3"/>
                <line x1="60" y1="0" x2="60" y2="10" stroke="#a3a3a3" strokeWidth="0.3"/>
                <line x1="85" y1="0" x2="85" y2="10" stroke="#a3a3a3" strokeWidth="0.3"/>
              </pattern>
            </defs>

            {/* Background Grid */}
            {showGrid && (
              <rect x={bounds.minX * baseScale} y={bounds.minY * baseScale} width={bounds.width * baseScale} height={bounds.height * baseScale} fill="url(#grid)" />
            )}

            {/* LAYER 1: Room Fills (Floors) - light fills for professional look */}
            {currentData.rooms?.map((room: any, i: number) => {
              const isSelected = selectedElementType === 'room' && selectedElementId === room.id;
              // Determine fill based on room type
              let roomFill = '#ffffff'; // Default white
              if (room.type === 'Deck' || room.type === 'Terrace' || room.label?.toLowerCase().includes('terrasse') || room.label?.toLowerCase().includes('deck')) {
                roomFill = 'url(#deck-planks)';
              }
              return (
                <g key={room.id}>
                  {room.polygon && (
                    <polygon
                      points={room.polygon.map((p: any) => `${p.x * baseScale},${p.y * baseScale}`).join(" ")}
                      fill={roomFill}
                      fillOpacity="1"
                      stroke={isSelected ? "#0ea5e9" : "none"}
                      strokeWidth={isSelected ? "2" : "0"}
                      className="cursor-pointer transition-all"
                      onClick={(e) => handleElementClick(room.id, 'room', e)}
                    />
                  )}
                </g>
              );
            })}

            {/* LAYER 2: Walls (Structure) - Professional architectural rendering */}
            <g id="walls">
              {currentData.walls?.map((wall: any) => {
                const polygon = getWallPolygon(wall as any);
                const polyPoints = polygon
                  .map(p => `${p.x * baseScale},${p.y * baseScale}`)
                  .join(" ");

                // Determine if wall is exterior (solid black) or interior (thin lines)
                const isExterior = wall.isExternal || wall.type === 'EXTERIOR_INSULATED';
                const isLoadBearing = wall.type === 'LOAD_BEARING';

                // Professional architectural fill:
                // - Exterior walls: Solid black
                // - Load-bearing interior: Solid dark gray
                // - Partition walls: Light hatch or hollow
                let fillColor = '#1a1a1a'; // Solid black for exterior
                if (!isExterior && !isLoadBearing) {
                  fillColor = '#404040'; // Dark gray for interior partitions
                } else if (isLoadBearing && !isExterior) {
                  fillColor = '#2a2a2a'; // Slightly lighter for load-bearing interior
                }

                // Stroke width based on wall type
                const strokeWidth = isExterior ? 1 : 0.5;
                const isSelected = selectedElementType === 'wall' && selectedElementId === wall.id;

                return (
                  <g key={wall.id}>
                    <polygon
                      points={polyPoints}
                      fill={fillColor}
                      stroke={isSelected ? "#0ea5e9" : "#1a1a1a"}
                      strokeWidth={isSelected ? 2 : strokeWidth}
                      className="cursor-pointer transition-all"
                      onClick={(e) => handleElementClick(wall.id, 'wall', e)}
                    />
                    {isSelected && (
                      <polygon
                        points={polyPoints}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity="0.7"
                        pointerEvents="none"
                      />
                    )}
                  </g>
                );
              })}
            </g>

            {/* LAYER 3: Openings (Doors/Windows) */}
            <g id="openings">
              {currentData.openings?.map((opening: any) => {
                const wall = currentData.walls?.find((w: any) => w.id === opening.wallId);
                if (!wall) return null;

                const geo = getOpeningGeometry(wall as any, opening as any);
                const cx = geo.center.x * baseScale;
                const cy = geo.center.y * baseScale;
                const w = geo.width * baseScale;
                const h = geo.thickness * baseScale; // Wall thickness at that point
                const angleDeg = geo.angle * (180 / Math.PI);
                const isSelected = selectedElementType === 'opening' && selectedElementId === opening.id;

                return (
                  <g
                    key={opening.id}
                    transform={`rotate(${angleDeg}, ${cx}, ${cy})`}
                    className="cursor-pointer"
                    onClick={(e) => handleElementClick(opening.id, 'opening', e)}
                  >
                    {/* Clear the wall fill area - white for light background */}
                    <rect x={cx - w / 2} y={cy - h / 2} width={w} height={h} fill="#f8f8f6" stroke="none" />

                    {/* Selection indicator */}
                    {isSelected && (
                      <rect
                        x={cx - w / 2 - 5}
                        y={cy - h / 2 - 5}
                        width={w + 10}
                        height={h + 10}
                        fill="none"
                        stroke="#0ea5e9"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                        opacity="0.7"
                      />
                    )}

                    {/* Window Symbol: Professional architectural representation */}
                    {opening.type === 'window' && (
                      <g>
                        {/* Outer frame lines */}
                        <line x1={cx - w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy - h / 2} stroke={isSelected ? "#0ea5e9" : "#1a1a1a"} strokeWidth={isSelected ? "1.5" : "1"} />
                        <line x1={cx - w / 2} y1={cy + h / 2} x2={cx + w / 2} y2={cy + h / 2} stroke={isSelected ? "#0ea5e9" : "#1a1a1a"} strokeWidth={isSelected ? "1.5" : "1"} />
                        {/* Glass indication - thin center lines */}
                        <line x1={cx - w / 2} y1={cy - h / 4} x2={cx + w / 2} y2={cy - h / 4} stroke={isSelected ? "#0ea5e9" : "#525252"} strokeWidth="0.5" />
                        <line x1={cx - w / 2} y1={cy + h / 4} x2={cx + w / 2} y2={cy + h / 4} stroke={isSelected ? "#0ea5e9" : "#525252"} strokeWidth="0.5" />
                      </g>
                    )}

                    {/* Door Symbol */}
                    {opening.type === 'door' && (() => {
                      // Use proper door geometry based on wall angle and swing direction
                      const doorGeo = getDoorPath(
                        { x: geo.center.x, y: geo.center.y },
                        opening.width,
                        geo.angle,
                        (opening.swing as 'left' | 'right') || 'right'
                      );

                      // Scale the hinge point
                      const hingeX = doorGeo.hinge.x * baseScale;
                      const hingeY = doorGeo.hinge.y * baseScale;

                      // Scale door paths for SVG
                      // SVG Arc format: A rx ry x-rotation large-arc-flag sweep-flag x y
                      // We need to scale rx, ry, x, y but NOT the flags (which must be 0 or 1)
                      const scalePath = (path: string) => {
                        // Split path into commands
                        const parts = path.split(/([MLAZ])/i).filter(Boolean);
                        let result = '';
                        let i = 0;

                        while (i < parts.length) {
                          const cmd = parts[i];
                          if (/[MLAZ]/i.test(cmd)) {
                            result += cmd + ' ';
                            i++;
                            if (i < parts.length && !/[MLAZ]/i.test(parts[i])) {
                              const coords = parts[i].trim();
                              if (cmd.toUpperCase() === 'A') {
                                // Arc: rx ry x-rotation large-arc sweep-flag x y
                                const nums = coords.match(/-?\d+\.?\d*/g) || [];
                                if (nums.length >= 7) {
                                  result += `${(parseFloat(nums[0]!) * baseScale).toFixed(2)} `; // rx
                                  result += `${(parseFloat(nums[1]!) * baseScale).toFixed(2)} `; // ry
                                  result += `${nums[2]} `; // x-rotation (keep as-is)
                                  result += `${nums[3]} `; // large-arc flag (keep as 0 or 1)
                                  result += `${nums[4]} `; // sweep flag (keep as 0 or 1)
                                  result += `${(parseFloat(nums[5]) * baseScale).toFixed(2)},`; // x
                                  result += `${(parseFloat(nums[6]) * baseScale).toFixed(2)} `; // y
                                }
                              } else {
                                // M, L, Z - scale all coordinates
                                const scaled = coords.replace(/-?\d+\.?\d*/g, (m) => {
                                  return (parseFloat(m) * baseScale).toFixed(2);
                                });
                                result += scaled + ' ';
                              }
                              i++;
                            }
                          } else {
                            i++;
                          }
                        }
                        return result.trim();
                      };

                      return (
                        <g>
                          {/* Door jambs (frame sides) - black on light background */}
                          <line x1={cx - w / 2} y1={cy - h / 2} x2={cx - w / 2} y2={cy + h / 2}
                                stroke={isSelected ? "#0ea5e9" : "#1a1a1a"} strokeWidth={isSelected ? "1.5" : "1"} />
                          <line x1={cx + w / 2} y1={cy - h / 2} x2={cx + w / 2} y2={cy + h / 2}
                                stroke={isSelected ? "#0ea5e9" : "#1a1a1a"} strokeWidth={isSelected ? "1.5" : "1"} />

                          {/* Door swing arc - thin black line showing swing direction */}
                          <path
                            d={scalePath(doorGeo.arc)}
                            fill="none"
                            stroke={isSelected ? "#0ea5e9" : "#525252"}
                            strokeWidth="0.5"
                          />

                          {/* Door leaf (the door panel in open position) */}
                          <path
                            d={scalePath(doorGeo.leaf)}
                            fill="none"
                            stroke={isSelected ? "#0ea5e9" : "#1a1a1a"}
                            strokeWidth={isSelected ? "1.5" : "1"}
                          />
                        </g>
                      );
                    })()}
                  </g>
                );
              })}
            </g>

            {/* LAYER 4: Furniture Symbols - Only from persistent data */}
            <g id="furniture">
              {(currentData as any).furniture?.map((item: any) => {
                const FurnitureComponent = getFurnitureComponent(item.type);
                if (!FurnitureComponent) return null;

                const isSelected = selectedElementType === 'furniture' && selectedElementId === item.id;

                return (
                  <g
                    key={item.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      selectElement(item.id, 'furniture');
                    }}
                    className="cursor-pointer"
                    style={{
                      opacity: isSelected ? 1 : 0.85,
                      filter: isSelected ? 'drop-shadow(0 0 4px rgba(14, 165, 233, 0.8))' : 'none'
                    }}
                  >
                    <FurnitureComponent
                      x={item.position.x}
                      y={item.position.y}
                      rotation={item.rotation}
                      scale={item.scale || 1}
                    />
                  </g>
                );
              })}
            </g>

            {/* LAYER 5: Room Labels - Professional typography */}
            {currentData.rooms?.map((room: any) => {
              const isSelected = selectedElementType === 'room' && selectedElementId === room.id;
              return (
                <g key={`label-${room.id}`} transform={`translate(${room.center.x * baseScale}, ${room.center.y * baseScale})`}>
                  {/* Room name - uppercase for professional look */}
                  <text y="-6" textAnchor="middle" fill={isSelected ? "#0ea5e9" : "#1a1a1a"} fontSize="11" fontWeight="500" fontFamily="system-ui, -apple-system, sans-serif" style={{ textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>
                    {room.label}
                  </text>
                  {/* Area */}
                  <text y="8" textAnchor="middle" fill={isSelected ? "#0ea5e9" : "#525252"} fontSize="9" fontFamily="system-ui, -apple-system, sans-serif">
                    {room.area.value} {room.area.unit}
                  </text>
                  {/* Flooring type - smaller, lighter */}
                  <text y="18" textAnchor="middle" fill={isSelected ? "#0ea5e9" : "#737373"} fontSize="7" fontFamily="system-ui, -apple-system, sans-serif">
                    {room.flooring}
                  </text>
                </g>
              );
            })}

          </svg>
        )}
      </div>

      {/* Compliance Drawer - Pull up / Pull down */}
      {currentData && (complianceIssues.length > 0 || complianceCheckCount > 0) && (
        <div
          className="border-t border-white/10 bg-zinc-900 overflow-hidden select-none"
          style={{
            height: drawerHeight,
            transition: drawerDragging.current ? 'none' : 'height 0.3s ease',
          }}
        >
          {/* Drag Handle */}
          <div
            className="flex flex-col items-center cursor-grab active:cursor-grabbing"
            onMouseDown={(e) => { e.preventDefault(); onDragStart(e.clientY); }}
            onTouchStart={(e) => onDragStart(e.touches[0].clientY)}
            onClick={() => setDrawerHeight(prev => prev > DRAWER_SNAP_THRESHOLD ? DRAWER_COLLAPSED : DRAWER_MAX)}
          >
            {/* Pull bar indicator */}
            <div className="pt-1.5 pb-1">
              <div className="w-10 h-1 rounded-full bg-zinc-600" />
            </div>

            {/* Summary row */}
            <div className="w-full px-4 pb-2 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                {complianceSummary.passing ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                )}
                BR18/BR23 Compliance
              </h4>
              <div className="flex items-center gap-2 text-xs">
                {complianceSummary.violations > 0 && (
                  <Badge variant="destructive" className="text-[10px] h-5">
                    {complianceSummary.violations}
                  </Badge>
                )}
                {complianceSummary.warnings > 0 && (
                  <Badge variant="outline" className="text-[10px] h-5 border-yellow-500 text-yellow-500">
                    {complianceSummary.warnings}
                  </Badge>
                )}
                <Badge variant="outline" className="text-[10px] h-5 border-green-500 text-green-500">
                  {complianceSummary.checks}
                </Badge>
                {drawerExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5 text-zinc-500" />
                ) : (
                  <ChevronUp className="h-3.5 w-3.5 text-zinc-500" />
                )}
              </div>
            </div>
          </div>

          {/* Scrollable issue list (violations & warnings only) */}
          <div className="px-4 pb-3 overflow-y-auto space-y-1.5" style={{ maxHeight: drawerHeight - 44 }}>
            {complianceIssues.length === 0 && (
              <div className="flex items-center gap-2 py-2 px-2.5 text-[11px] text-green-400">
                <CheckCircle className="h-3.5 w-3.5" />
                All compliance checks passed — no issues found
              </div>
            )}
            {complianceIssues.map((issue, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 bg-white/5 py-1.5 px-2.5 rounded text-[10px] ${issue.type === 'violation'
                  ? 'border-l-2 border-red-500'
                  : issue.type === 'warning'
                    ? 'border-l-2 border-yellow-500'
                    : 'border-l-2 border-green-500'
                  }`}
              >
                <span
                  className={`mt-0.5 ${issue.type === 'violation'
                    ? 'text-red-400'
                    : issue.type === 'warning'
                      ? 'text-yellow-400'
                      : 'text-green-400'
                    }`}
                >
                  {issue.type === 'violation' ? '✕' : issue.type === 'warning' ? '⚠' : '✓'}
                </span>
                <div className="flex-1">
                  <span className="text-white/80">{issue.message}</span>
                  {issue.code && (
                    <span className="ml-1.5 text-white/40" style={{ fontFamily: 'JetBrains Mono, monospace' }}>({issue.code})</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
