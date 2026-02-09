"use client";

import { useBlueprintStore } from "@/store/blueprint.store";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileText, Plus, Trash2, ChevronRight } from "lucide-react";
import type { Sheet } from "@/schemas/blueprint.schema";

export function ProjectExplorer() {
  const {
    blueprint,
    activeSheetIndex,
    setActiveSheet,
    addSheet,
    removeSheet,
  } = useBlueprintStore();

  const handleAddSheet = () => {
    // Don't allow adding sheets to SVG blueprints
    if (blueprint && 'format' in blueprint && blueprint.format === 'svg-enhanced') {
      return;
    }

    const sheetsLength = (blueprint && 'sheets' in blueprint) ? blueprint.sheets.length : 0;
    const newSheet: Sheet = {
      title: `Floor Plan ${sheetsLength + 1}`,
      number: `A-${100 + sheetsLength + 1}`,
      type: "FLOOR_PLAN",
      scale: "1:50",
      elements: {
        walls: [],
        openings: [],
        rooms: [],
        furniture: [],
      },
      metadata: {
        compliance: [],
      },
    };
    addSheet(newSheet);
  };

  if (!blueprint) {
    return (
      <div className="h-[300px] border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-zinc-400">PROJECT</h3>
        </div>
        <div className="flex items-center justify-center h-40 text-xs text-zinc-600">
          No project loaded
        </div>
      </div>
    );
  }

  // Extract properties safely from both BlueprintData and SVGBlueprint
  const isSVG = 'format' in blueprint && blueprint.format === 'svg-enhanced';
  const projectName: string = isSVG
    ? (blueprint as any).metadata.projectName
    : (blueprint as any).projectName;
  const location: string | undefined = isSVG
    ? (blueprint as any).metadata.location
    : (blueprint as any).location;
  const sheets: Sheet[] = isSVG ? [] : (blueprint as any).sheets;

  return (
    <div className="h-[300px] border-b border-zinc-800 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-zinc-800">
        <h3 className="text-xs font-semibold text-zinc-400 tracking-wide uppercase">
          Project Explorer
        </h3>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-zinc-500 hover:text-cyan-400 hover:bg-zinc-800"
          onClick={handleAddSheet}
          title="Add New Sheet"
        >
          <Plus className="h-3.5 w-3.5" />
        </Button>
      </div>

      {/* Project Name */}
      <div className="px-3 py-2 border-b border-zinc-800/50">
        <div className="flex items-center gap-2">
          <FileText className="h-4 w-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">
            {projectName}
          </span>
        </div>
        {location && (
          <div className="ml-6 text-xs text-zinc-500 mt-0.5">
            {location}
          </div>
        )}
      </div>

      {/* Sheet List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {sheets.map((sheet, index) => (
            <div
              key={index}
              className={`group flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-all ${
                index === activeSheetIndex
                  ? "bg-cyan-500/10 border border-cyan-500/30"
                  : "hover:bg-zinc-800/50 border border-transparent"
              }`}
              onClick={() => setActiveSheet(index)}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    index === activeSheetIndex
                      ? "rotate-90 text-cyan-400"
                      : "text-zinc-600"
                  }`}
                />
                <FileText
                  className={`h-3.5 w-3.5 flex-shrink-0 ${
                    index === activeSheetIndex
                      ? "text-cyan-400"
                      : "text-zinc-500"
                  }`}
                />
                <div className="flex-1 min-w-0">
                  <div
                    className={`text-xs font-medium truncate ${
                      index === activeSheetIndex
                        ? "text-cyan-400"
                        : "text-zinc-300"
                    }`}
                  >
                    {sheet.number}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate">
                    {sheet.title}
                  </div>
                </div>
              </div>

              {sheets.length > 1 && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-5 w-5 opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeSheet(index);
                  }}
                  title="Delete Sheet"
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Stats */}
      <div className="px-3 py-2 border-t border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between text-[10px] text-zinc-500">
          <span>{sheets.length} sheet{sheets.length !== 1 ? 's' : ''}</span>
          <span>{isSVG ? (blueprint as any).metadata.buildingCode : (blueprint as any).buildingCode}</span>
        </div>
      </div>
    </div>
  );
}
