"use client";

import { MessageSquare, Layers, CheckCircle } from "lucide-react";

type TabType = 'chat' | '2d' | 'compliance';

interface TabBarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export function TabBar({ activeTab, onTabChange }: TabBarProps) {
  const tabs = [
    { id: 'chat' as TabType, label: 'Chat', icon: MessageSquare },
    { id: '2d' as TabType, label: '2D View', icon: Layers },
    { id: 'compliance' as TabType, label: 'Code Check', icon: CheckCircle },
  ];

  return (
    <div className="flex items-center border-b border-zinc-800 bg-zinc-900/50">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium
              transition-all duration-200
              ${
                isActive
                  ? 'text-cyan-400 bg-zinc-900'
                  : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'
              }
            `}
          >
            <Icon className="h-3.5 w-3.5" />
            {tab.label}

            {/* Active indicator */}
            {isActive && (
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-cyan-400" />
            )}
          </button>
        );
      })}
    </div>
  );
}
