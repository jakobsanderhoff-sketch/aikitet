"use client";

import { useBlueprintStore } from "@/store/blueprint.store";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { AlertTriangle, CheckCircle, XCircle, Info } from "lucide-react";

export function ComplianceView() {
  const { complianceReport } = useBlueprintStore();

  if (!complianceReport) {
    return (
      <div className="flex h-full items-center justify-center bg-zinc-950">
        <div className="text-center">
          <Info className="h-12 w-12 mx-auto mb-3 text-zinc-700" />
          <p className="text-zinc-500 text-sm">No compliance report available</p>
          <p className="text-zinc-700 text-xs mt-1">Generate a floor plan to see compliance checks</p>
        </div>
      </div>
    );
  }

  const { passing, violations, warnings, checks, summary, egressAnalysis } = complianceReport;

  return (
    <div className="flex h-full flex-col bg-zinc-950">
      {/* Header */}
      <div className="border-b border-zinc-800 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold text-white">BR18/BR23 Compliance Report</h2>
          <Badge
            variant={passing ? "default" : "destructive"}
            className={passing ? "bg-green-600" : ""}
          >
            {passing ? "✓ Passing" : "✕ Violations Found"}
          </Badge>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="bg-red-500/10 border-red-500/30 p-3">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-400" />
              <div>
                <div className="text-2xl font-bold text-red-400">{summary.totalViolations}</div>
                <div className="text-xs text-red-400/70">Violations</div>
              </div>
            </div>
          </Card>

          <Card className="bg-yellow-500/10 border-yellow-500/30 p-3">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-400" />
              <div>
                <div className="text-2xl font-bold text-yellow-400">{summary.totalWarnings}</div>
                <div className="text-xs text-yellow-400/70">Warnings</div>
              </div>
            </div>
          </Card>

          <Card className="bg-green-500/10 border-green-500/30 p-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-400" />
              <div>
                <div className="text-2xl font-bold text-green-400">{summary.totalChecks}</div>
                <div className="text-xs text-green-400/70">Passed</div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Egress Analysis */}
      {egressAnalysis && (
        <div className="border-b border-zinc-800 p-4 bg-zinc-900/50">
          <h3 className="text-sm font-semibold text-zinc-400 mb-2 flex items-center gap-2">
            <Info className="h-4 w-4" />
            Egress Analysis (BR18-5.4.1)
          </h3>
          <div className="space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-zinc-500">Max Distance to Exit:</span>
              <span className={`font-mono ${egressAnalysis.passed ? 'text-green-400' : 'text-red-400'}`}>
                {egressAnalysis.maxDistanceToExit.toFixed(1)}m
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-zinc-500">Limit:</span>
              <span className="font-mono text-zinc-400">25.0m</span>
            </div>
            {egressAnalysis.criticalRooms.length > 0 && (
              <div className="mt-2 text-red-400">
                ⚠️ {egressAnalysis.criticalRooms.length} room(s) exceed limit
              </div>
            )}
          </div>
        </div>
      )}

      {/* Issues List */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {/* Violations */}
          {violations.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-red-400 mb-2 flex items-center gap-2">
                <XCircle className="h-4 w-4" />
                Violations ({violations.length})
              </h3>
              <div className="space-y-2">
                {violations.map((issue, i) => (
                  <IssueCard key={i} issue={issue} type="violation" />
                ))}
              </div>
            </div>
          )}

          {/* Warnings */}
          {warnings.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-yellow-400 mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Warnings ({warnings.length})
              </h3>
              <div className="space-y-2">
                {warnings.map((issue, i) => (
                  <IssueCard key={i} issue={issue} type="warning" />
                ))}
              </div>
            </div>
          )}

          {/* Passed Checks */}
          {checks.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-green-400 mb-2 flex items-center gap-2">
                <CheckCircle className="h-4 w-4" />
                Passed Checks ({checks.length})
              </h3>
              <div className="space-y-2">
                {checks.map((issue, i) => (
                  <IssueCard key={i} issue={issue} type="check" />
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function IssueCard({
  issue,
  type,
}: {
  issue: any;
  type: 'violation' | 'warning' | 'check';
}) {
  const colors = {
    violation: {
      bg: 'bg-red-500/5',
      border: 'border-red-500/30',
      text: 'text-red-400',
      icon: '✕',
    },
    warning: {
      bg: 'bg-yellow-500/5',
      border: 'border-yellow-500/30',
      text: 'text-yellow-400',
      icon: '⚠',
    },
    check: {
      bg: 'bg-green-500/5',
      border: 'border-green-500/30',
      text: 'text-green-400',
      icon: '✓',
    },
  };

  const style = colors[type];

  return (
    <Card className={`${style.bg} border ${style.border} p-3`}>
      <div className="flex items-start gap-2">
        <span className={`mt-0.5 ${style.text}`}>{style.icon}</span>
        <div className="flex-1">
          <div className="text-xs text-white/90">{issue.message}</div>
          {issue.code && (
            <div className="mt-1 text-[10px] text-white/40 font-mono">{issue.code}</div>
          )}
          {issue.elementId && (
            <div className="mt-1 text-[10px] text-white/40">
              Element: {issue.elementId}
            </div>
          )}
        </div>
        {issue.severity && (
          <Badge variant="outline" className={`text-[9px] h-4 ${style.border} ${style.text}`}>
            {issue.severity}
          </Badge>
        )}
      </div>
    </Card>
  );
}
