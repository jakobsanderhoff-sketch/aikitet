"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useBlueprintStore } from "@/store/blueprint.store";
import { useConversationStore, isWizardActive } from "@/store/conversation.store";
import { ChatInterface } from "@/components/architect/ChatInterface";
import { PlanCanvas } from "@/components/architect/PlanCanvas";
import { FloorPlanData } from "@/types/floorplan";
import { Loader2, Upload, MessageSquare, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { downloadEnhancedDXF } from "@/lib/dxf-export-enhanced";
import { downloadDXF } from "@/lib/dxf-export";

export default function DashboardPage() {
  return (
    <Suspense fallback={
      <div className="h-screen flex items-center justify-center bg-black">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" strokeWidth={1.5} />
      </div>
    }>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const searchParams = useSearchParams();
  const projectId = searchParams.get('projectId');

  const { blueprint, setBlueprint } = useBlueprintStore();
  const wizardState = useConversationStore((state) => state.wizardState);
  const [loading, setLoading] = useState(false);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [showChat, setShowChat] = useState(false);

  // Legacy support for old flow
  const [floorPlan, setFloorPlan] = useState<FloorPlanData | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  // Determine which phase we're in
  const wizardActive = isWizardActive(wizardState) || wizardState === 'generating';
  const blueprintReady = !!blueprint && !wizardActive;

  // Load project from database when projectId changes
  useEffect(() => {
    async function loadProject() {
      if (!projectId || projectId === currentProjectId) return;

      setLoading(true);
      try {
        const response = await fetch(`/api/projects/${projectId}`);
        if (!response.ok) {
          throw new Error('Failed to load project');
        }

        const project = await response.json();
        setBlueprint(project.blueprintData);
        setCurrentProjectId(projectId);
      } catch (error) {
        console.error('Error loading project:', error);
        alert('Failed to load project. Please try again.');
      } finally {
        setLoading(false);
      }
    }

    loadProject();
  }, [projectId, currentProjectId, setBlueprint]);

  // Auto-save every 30 seconds
  useEffect(() => {
    if (!currentProjectId || !blueprint) return;

    const saveInterval = setInterval(async () => {
      try {
        await fetch(`/api/projects/${currentProjectId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blueprintData: blueprint }),
        });
        console.log('✅ Auto-saved project');
      } catch (error) {
        console.error('❌ Auto-save failed:', error);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(saveInterval);
  }, [currentProjectId, blueprint]);

  const handleExportDXF = () => {
    try {
      if (blueprint) {
        // Check if it's an SVG blueprint
        if ('format' in blueprint && blueprint.format === 'svg-enhanced') {
          // TODO: Implement SVG-to-DXF export
          alert('SVG blueprint export coming soon!');
          return;
        }

        // Use enhanced export for BlueprintData
        const { activeSheetIndex } = useBlueprintStore.getState();
        downloadEnhancedDXF(blueprint as any, activeSheetIndex);
        console.log('✅ DXF exported successfully');
      } else if (floorPlan) {
        // Fallback to legacy export
        const filename = `floor-plan-${Date.now()}.dxf`;
        downloadDXF(floorPlan, filename);
        console.log('✅ DXF exported successfully');
      } else {
        // Should not happen due to disabled state, but handle gracefully
        alert('No floor plan to export. Please generate a floor plan first.');
      }
    } catch (error) {
      console.error('DXF export failed:', error);
      alert(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-black">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-zinc-400 mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-sm text-zinc-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Wizard phase: full-screen wizard/chat experience
  if (!blueprintReady) {
    return (
      <div className="h-screen flex bg-black text-white">
        <div className="w-full max-w-2xl mx-auto flex flex-col">
          {/* Header */}
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
            <Link href="/projects" className="text-base font-medium text-white hover:text-zinc-400 transition-colors">
              AI Architect
            </Link>
          </div>

          {/* Full-width Chat/Wizard */}
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              onFloorPlanGenerated={setFloorPlan}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </div>
        </div>
      </div>
    );
  }

  // Blueprint phase: full-screen blueprint with collapsible chat for refinements
  return (
    <div className="h-screen flex bg-black text-white relative">
      {/* Chat sidebar for refinements (togglable) */}
      {showChat && (
        <aside className="w-[380px] flex flex-col border-r border-zinc-800 shrink-0">
          <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
            <span className="text-sm font-medium text-zinc-400">Chat</span>
            <button
              onClick={() => setShowChat(false)}
              className="text-zinc-500 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" strokeWidth={1.5} />
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            <ChatInterface
              onFloorPlanGenerated={setFloorPlan}
              isGenerating={isGenerating}
              setIsGenerating={setIsGenerating}
            />
          </div>
        </aside>
      )}

      {/* Main Area - Blueprint Canvas */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar */}
        <div className="h-14 border-b border-zinc-800 flex items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link href="/projects" className="text-base font-medium text-white hover:text-zinc-400 transition-colors">
              AI Architect
            </Link>
          </div>
          <div className="flex items-center gap-2">
            {!showChat && (
              <Button
                onClick={() => setShowChat(true)}
                size="sm"
                variant="outline"
                className="border-zinc-800 text-white hover:bg-zinc-900 font-medium"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
                Chat
              </Button>
            )}
            <Button
              onClick={handleExportDXF}
              size="sm"
              variant="outline"
              className="border-zinc-800 text-white hover:bg-zinc-900 font-medium"
              disabled={!blueprint && !floorPlan}
            >
              <Upload className="h-3.5 w-3.5 mr-2" strokeWidth={1.5} />
              Export
            </Button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="flex-1 overflow-hidden bg-black">
          <PlanCanvas floorPlan={floorPlan} isGenerating={isGenerating} />
        </div>
      </main>
    </div>
  );
}
