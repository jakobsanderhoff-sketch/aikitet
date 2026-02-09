"use client";

import { useRef, useEffect } from "react";
import { User, Bot, ArrowUp, FileText, CheckCircle2, Sofa } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const ICON_STROKE_WIDTH = 1.5;

// Pre-scripted conversation
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const BASE_MESSAGES: ChatMessage[] = [
  { role: "user", content: "I want to design a new 2-bedroom house" },
  { role: "assistant", content: "Great! Let's start with the **Design Wizard**. I'll guide you through a few questions to create your perfect floor plan.\n\nHow many **bedrooms** would you like?" },
  { role: "user", content: "2 bedrooms, spacious, with a private ensuite" },
  { role: "assistant", content: "Spacious bedrooms with ensuite — great choice! What **total floor area** are you looking for (in m²)?" },
  { role: "user", content: "About 110 square meters" },
  { role: "assistant", content: "110m² is a great size for a 2-bedroom home. What **type of building** — House, Townhouse, or Multi-story?" },
  { role: "user", content: "Single-story house, L-shaped" },
  { role: "assistant", content: "An L-shaped footprint gives great natural light and visual interest. Any **special requirements** for the layout?" },
  { role: "user", content: "Open-plan kitchen/living/dining in the main wing, master ensuite with shower, a utility bath for guests, pantry, and an entry foyer" },
  {
    role: "assistant",
    content: `I've designed your L-shaped 2-bedroom house! Here's what I created:\n\n**Main Wing (north, 12m wide):**\n- **Living + Kitchen + Dining** — 42m² open-plan with large north-facing windows\n- **Pantry** — 2.7m² with ventilation window\n\n**Bedroom Wing (south, 10m wide):**\n- **Entry Foyer** — 5m² with sidelight window\n- **Hallway** — 12m² connecting all rooms\n- **Utility Bath** — 3m² guest WC with window\n- **Bedroom 1 (Master)** — 25m² with 2 windows + private ensuite\n- **Ensuite Bath** — 10m² with shower, toilet & south-facing window\n- **Bedroom 2** — 15m² with 2 windows\n\nTotal: **~108m²**. Every room has natural light. The L-shaped layout separates living from sleeping zones. Fully **BR18/BR23 compliant** — all 12 checks passed.\n\nClick **Approve Blueprint** in the toolbar when you're happy with the design.`,
  },
];

const APPROVE_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Blueprint approved! The L-shaped layout is locked. Click **Add Furniture** in the toolbar to furnish all rooms.",
};

const FURNISH_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "Furniture has been placed in all rooms:\n\n- **Living area** — L-shaped sofa, coffee table, armchair, dining set\n- **Kitchen zone** — Sink, stove, refrigerator, counter\n- **Bedroom 1** — Double bed, 2 bedside tables, wardrobe\n- **Ensuite (10m²)** — Bathtub, shower, toilet, sink\n- **Utility Bath** — Toilet, sink, counter unit\n- **Bedroom 2** — Double bed, 2 bedside tables\n\nYour home is complete!",
};

// =====================================================
// Component
// =====================================================
interface PrototypeChatProps {
  stage: "draft" | "approved" | "furnished";
}

export function PrototypeChat({ stage }: PrototypeChatProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Build message list based on stage
  const messages: ChatMessage[] = [
    ...BASE_MESSAGES,
    ...(stage === "approved" || stage === "furnished" ? [APPROVE_MESSAGE] : []),
    ...(stage === "furnished" ? [FURNISH_MESSAGE] : []),
  ];

  // Slow auto-scroll: start at top and gradually scroll down
  useEffect(() => {
    const viewport = scrollRef.current;
    if (!viewport) return;

    viewport.scrollTop = 0;

    const SCROLL_SPEED = 0.4; // pixels per frame (~24px/sec at 60fps)
    let animationId: number;
    let cancelled = false;

    const scroll = () => {
      if (cancelled) return;
      const maxScroll = viewport.scrollHeight - viewport.clientHeight;
      if (maxScroll > 0 && viewport.scrollTop < maxScroll) {
        viewport.scrollTop = Math.min(viewport.scrollTop + SCROLL_SPEED, maxScroll);
        animationId = requestAnimationFrame(scroll);
      } else if (maxScroll === 0) {
        // Content not laid out yet, keep waiting
        animationId = requestAnimationFrame(scroll);
      }
    };

    // Wait for paint, then start after delay
    const timeout = setTimeout(() => {
      // Double rAF ensures browser has painted content with final dimensions
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!cancelled) {
            viewport.scrollTop = 0;
            animationId = requestAnimationFrame(scroll);
          }
        });
      });
    }, 800);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
      cancelAnimationFrame(animationId);
    };
  }, [stage]);

  // Stage indicator
  const stages = [
    { key: "draft", label: "Draft", icon: FileText },
    { key: "approved", label: "Approved", icon: CheckCircle2 },
    { key: "furnished", label: "Furnished", icon: Sofa },
  ];
  const currentIndex = stages.findIndex((s) => s.key === stage);

  return (
    <div className="flex h-full flex-col bg-black overflow-hidden">
      {/* Blueprint Stage Indicator */}
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">Blueprint Stage</span>
        </div>
        <div className="flex gap-2">
          {stages.map((s, index) => {
            const StageIcon = s.icon;
            const isComplete = index <= currentIndex;
            return (
              <div key={s.key} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    isComplete ? "bg-green-500" : "bg-zinc-700"
                  }`}
                />
                <div className="flex items-center gap-1 mt-1">
                  <StageIcon
                    className={`h-3 w-3 ${isComplete ? "text-green-500" : "text-zinc-600"}`}
                  />
                  <span
                    className={`text-[10px] ${isComplete ? "text-green-500" : "text-zinc-600"}`}
                  >
                    {s.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Messages Area */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 scrollbar-thin scrollbar-thumb-zinc-700 scrollbar-track-transparent"
      >
        <div className="space-y-6 pb-48">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white">
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <User className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                )}
              </div>

              <div
                className={`flex-1 max-w-[85%] ${
                  message.role === "user" ? "text-right" : "text-left"
                }`}
              >
                <div
                  className={`text-sm md:text-base leading-relaxed ${
                    message.role === "user"
                      ? "text-white font-medium bg-zinc-900/50 rounded-lg px-4 py-2 inline-block"
                      : "text-zinc-400"
                  }`}
                >
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Input Area (disabled, view-only) */}
      <div className="shrink-0 p-4 bg-black border-t border-zinc-800 relative z-10">
        <div className="relative">
          <div className="rounded-xl border border-zinc-800 bg-black">
            <div className="flex items-end gap-2 p-3 pb-4">
              <div
                className="flex-1 resize-none border-0 bg-transparent py-2 px-3 text-sm text-zinc-500 select-none"
                style={{ minHeight: "56px" }}
              >
                Prototype demo — chat is view-only
              </div>
              <button
                disabled
                className="h-8 w-8 rounded-lg bg-zinc-800 text-zinc-400 flex items-center justify-center shrink-0 mb-1 cursor-not-allowed"
              >
                <ArrowUp className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
