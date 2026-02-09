"use client";

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User, Loader2, Key, ArrowUp, X, CheckCircle2, AlertTriangle, Wrench, FileText, Sofa } from "lucide-react";

const ICON_STROKE_WIDTH = 1.5;
import { FloorPlanData } from "@/types/floorplan";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Import stores
import { useBlueprintStore } from "@/store/blueprint.store";
import {
  useConversationStore,
  shouldStartWizard,
  extractWizardAnswer,
  getWizardStepNumber,
  isWizardActive,
  type WizardState,
  type Message,
} from "@/store/conversation.store";

// Import types
import type { ChatResponse, FixSuggestion } from "@/schemas/chat.schema";

type ChatInterfaceProps = {
  onFloorPlanGenerated: (plan: FloorPlanData) => void;
  isGenerating: boolean;
  setIsGenerating: (value: boolean) => void;
};

// Wizard step labels - UI is always in English for consistency (abbreviated for 8 steps)
const WIZARD_STEPS = ["Beds", "Baths", "Floors", "Area", "Type", "Life", "Reqs", "Confirm"];

export function ChatInterface({ onFloorPlanGenerated, isGenerating, setIsGenerating }: ChatInterfaceProps) {
  // Local UI state
  const [input, setInput] = useState("");
  const [apiKey, setApiKey] = useState("");
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Conversation store
  const messages = useConversationStore((state) => state.messages);
  const wizardState = useConversationStore((state) => state.wizardState);
  const wizardAnswers = useConversationStore((state) => state.wizardAnswers);
  const detectedLanguage = useConversationStore((state) => state.detectedLanguage);
  const isProcessing = useConversationStore((state) => state.isProcessing);

  const addMessage = useConversationStore((state) => state.addMessage);
  const startWizard = useConversationStore((state) => state.startWizard);
  const advanceWizard = useConversationStore((state) => state.advanceWizard);
  const setWizardState = useConversationStore((state) => state.setWizardState);
  const setWizardAnswer = useConversationStore((state) => state.setWizardAnswer);
  const completeWizard = useConversationStore((state) => state.completeWizard);
  const setDetectedLanguage = useConversationStore((state) => state.setDetectedLanguage);
  const setIsProcessing = useConversationStore((state) => state.setIsProcessing);

  // Blueprint store
  const blueprint = useBlueprintStore((state) => state.blueprint);
  const setBlueprint = useBlueprintStore((state) => state.setBlueprint);
  const setComplianceReport = useBlueprintStore((state) => state.setComplianceReport);
  const blueprintStage = useBlueprintStore((state) => state.blueprintStage);
  const furnitureModeActive = useBlueprintStore((state) => state.furnitureModeActive);

  // Compliance suggestions state
  const [suggestions, setSuggestions] = useState<FixSuggestion[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  useEffect(() => {
    const storedKey = localStorage.getItem("gemini_api_key");
    if (storedKey) {
      setApiKey(storedKey);
    }
  }, []);

  // Add Levi's welcome message on mount so it persists in chat history
  useEffect(() => {
    if (messages.length === 0) {
      const welcomeText = detectedLanguage === "da"
        ? 'Hej! Jeg er **Levi**, din AI-arkitekt. Jeg kan hjælpe dig med at designe plantegninger der overholder danske bygningsregler (BR18).\n\nSkriv **"nyt design"** for at starte guiden, eller beskriv direkte hvad du ønsker.'
        : 'Hi! I\'m **Levi**, your AI architect. I can help you design floor plans that comply with Danish building regulations (BR18).\n\nType **"new design"** to start the wizard, or describe what you want directly.';
      addMessage({
        role: "assistant",
        content: welcomeText,
        timestamp: new Date(),
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // Get recent messages for API context (last 10)
  const getRecentHistory = () => {
    return messages.slice(-10).map((msg) => ({
      role: msg.role,
      content: msg.content,
      timestamp: msg.timestamp instanceof Date
        ? msg.timestamp.toISOString()
        : String(msg.timestamp),
    }));
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    const userMessage: Message = {
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    addMessage(userMessage);
    const currentInput = input;
    setInput("");
    setSelectedFiles([]);
    setIsProcessing(true);

    // Only show the full "Architecting..." loader when actually generating a blueprint
    const isAboutToGenerate = wizardState === "confirm" || wizardState === "generating";
    if (isAboutToGenerate) {
      setIsGenerating(true);
    }

    try {
      // Check if this should start the wizard (only if not already in wizard)
      if (wizardState === "idle" && shouldStartWizard(currentInput)) {
        startWizard();
      }

      // Extract wizard answer if in wizard mode
      let updatedWizardAnswers = { ...wizardAnswers };
      if (isWizardActive(wizardState)) {
        const extracted = extractWizardAnswer(wizardState, currentInput);
        if (Object.keys(extracted).length > 0) {
          // Update local copy for API call
          updatedWizardAnswers = { ...wizardAnswers, ...extracted };
          // Update store
          Object.entries(extracted).forEach(([key, value]) => {
            setWizardAnswer(key as keyof typeof wizardAnswers, value as any);
          });
        }
      }

      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: currentInput,
          conversationHistory: getRecentHistory(),
          currentBlueprint: blueprint,
          wizardState: wizardState,
          wizardAnswers: updatedWizardAnswers,
          apiKey: apiKey || undefined,
        }),
      });

      const data: ChatResponse = await response.json();

      // Even if response is not ok, API returns a helpful message we should display
      if (!response.ok && !data.message) {
        throw new Error("Failed to generate response");
      }

      // Update detected language
      if (data.detectedLanguage) {
        setDetectedLanguage(data.detectedLanguage);
      }

      // Handle wizard state transitions
      if (data.wizardAction) {
        switch (data.wizardAction) {
          case "advance":
            advanceWizard();
            break;
          case "complete":
            completeWizard();
            break;
          case "cancel":
            setWizardState("idle");
            break;
        }
      }

      // If explicit next state provided, use it
      if (data.nextWizardState) {
        setWizardState(data.nextWizardState);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);

      // Update blueprint if provided
      if (data.blueprint) {
        setBlueprint(data.blueprint);
      }

      // Update compliance report if provided
      if (data.compliance) {
        setComplianceReport(data.compliance);
      }

      // Store suggestions for display
      if (data.suggestions && data.suggestions.length > 0) {
        setSuggestions(data.suggestions);
      } else {
        setSuggestions([]);
      }
    } catch (error) {
      console.error("Chat error:", error);
      const errorMessage: Message = {
        role: "assistant",
        content:
          detectedLanguage === "da"
            ? "Beklager, der opstod en fejl. Tjek venligst din API-nøgle og prøv igen."
            : "I apologize, but I encountered an error. Please check your API key and try again.",
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsGenerating(false);
      setIsProcessing(false);
    }
  };

  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("gemini_api_key", apiKey);
      setShowApiKeyInput(false);
    }
  };

  // Handle auto-fix for compliance issues
  const handleAutoFix = async (suggestion: FixSuggestion) => {
    if (!suggestion.canAutoFix) return;

    setIsGenerating(true);
    setIsProcessing(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message:
            detectedLanguage === "da"
              ? `Ret venligst compliance-problemet: ${suggestion.description}`
              : `Please fix the compliance issue: ${suggestion.description}`,
          conversationHistory: getRecentHistory(),
          currentBlueprint: blueprint,
          wizardState: "refining",
          apiKey: apiKey || undefined,
        }),
      });

      if (!response.ok) throw new Error("Failed to auto-fix");

      const data: ChatResponse = await response.json();

      if (data.blueprint) {
        setBlueprint(data.blueprint);
      }

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);

      // Remove the fixed suggestion
      setSuggestions((prev) => prev.filter((s) => s.issueId !== suggestion.issueId));
    } catch (error) {
      console.error("Auto-fix failed:", error);
    } finally {
      setIsGenerating(false);
      setIsProcessing(false);
    }
  };

  // Blueprint Stage Indicator component
  const BlueprintStageIndicator = () => {
    if (!blueprint) return null;

    const stages = [
      { key: 'draft', label: 'Draft', icon: FileText },
      { key: 'approved', label: 'Approved', icon: CheckCircle2 },
      { key: 'furnished', label: 'Furnished', icon: Sofa },
    ];

    const currentIndex = stages.findIndex(s => s.key === blueprintStage);

    return (
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">
            {detectedLanguage === 'da' ? 'Status' : 'Blueprint Stage'}
          </span>
        </div>
        <div className="flex gap-2">
          {stages.map((stage, index) => {
            const StageIcon = stage.icon;
            const isComplete = index <= currentIndex;
            const isCurrent = index === currentIndex;

            return (
              <div key={stage.key} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-colors ${
                    isComplete ? 'bg-green-500' : 'bg-zinc-700'
                  }`}
                />
                <div className="flex items-center gap-1 mt-1">
                  <StageIcon
                    className={`h-3 w-3 ${
                      isComplete ? 'text-green-500' : 'text-zinc-600'
                    }`}
                  />
                  <span
                    className={`text-[10px] ${
                      isComplete ? 'text-green-500' : 'text-zinc-600'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Wizard progress bar component
  const WizardProgress = () => {
    if (!isWizardActive(wizardState) && wizardState !== "generating") return null;

    const currentStep = getWizardStepNumber(wizardState);

    return (
      <div className="px-6 py-3 border-b border-zinc-800 bg-zinc-900/50">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-zinc-400">
            Design Wizard
          </span>
          <span className="text-xs text-zinc-500">
            {currentStep}/8
          </span>
        </div>
        <div className="flex gap-2">
          {WIZARD_STEPS.map((step, index) => {
            const stepNum = index + 1;
            const isComplete = currentStep > stepNum;
            const isCurrent = currentStep === stepNum;

            return (
              <div key={step} className="flex-1">
                <div
                  className={`h-1 rounded-full transition-colors ${isComplete
                    ? "bg-green-500"
                    : isCurrent
                      ? "bg-white"
                      : "bg-zinc-700"
                    }`}
                />
                <span
                  className={`text-[10px] mt-1 block ${isComplete
                    ? "text-green-500"
                    : isCurrent
                      ? "text-white"
                      : "text-zinc-600"
                    }`}
                >
                  {step}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Compliance suggestions component
  const ComplianceSuggestions = () => {
    if (suggestions.length === 0) return null;

    return (
      <div className="px-6 py-3 border-b border-zinc-800 bg-amber-900/10">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" strokeWidth={ICON_STROKE_WIDTH} />
          <span className="text-xs text-amber-500 font-medium">
            {detectedLanguage === "da" ? "Compliance problemer fundet" : "Compliance Issues Found"}
          </span>
        </div>
        <div className="space-y-2">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.issueId}
              className="flex items-center justify-between bg-zinc-900 rounded-lg px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-xs text-zinc-300">{suggestion.description}</p>
                {suggestion.autoFixDescription && (
                  <p className="text-[10px] text-zinc-500 mt-1">{suggestion.autoFixDescription}</p>
                )}
              </div>
              {suggestion.canAutoFix && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleAutoFix(suggestion)}
                  disabled={isGenerating}
                  className="ml-2 h-7 text-xs text-green-500 hover:text-green-400 hover:bg-green-500/10"
                >
                  <Wrench className="h-3 w-3 mr-1" strokeWidth={ICON_STROKE_WIDTH} />
                  {detectedLanguage === "da" ? "Auto-ret" : "Auto-fix"}
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Get placeholder text based on wizard state
  const getPlaceholder = () => {
    if (wizardState === "generating") {
      return detectedLanguage === "da" ? "Genererer design..." : "Generating design...";
    }

    const placeholders: Record<WizardState, { en: string; da: string }> = {
      idle: {
        en: 'Describe your floor plan or type "new design" to start the wizard...',
        da: 'Beskriv din plantegning eller skriv "nyt design" for at starte guiden...',
      },
      ask_bedrooms: {
        en: "Enter number of bedrooms (1-10)...",
        da: "Indtast antal soveværelser (1-10)...",
      },
      ask_bathrooms: {
        en: "Enter number of bathrooms (1-4)...",
        da: "Indtast antal badeværelser (1-4)...",
      },
      ask_floors: {
        en: "How many floors? (1-3)...",
        da: "Hvor mange etager? (1-3)...",
      },
      ask_area: {
        en: "Enter total floor area in m\u00b2...",
        da: "Indtast samlet areal i m\u00b2...",
      },
      ask_type: {
        en: "House, Townhouse, or Multi-story...",
        da: "Hus, Rækkehus, eller Fleretageshus...",
      },
      ask_lifestyle: {
        en: "Your lifestyle needs (or type 'none')...",
        da: "Dine livsstilsbehov (eller skriv 'ingen')...",
      },
      ask_special: {
        en: "Special requirements (or type 'none')...",
        da: "S\u00e6rlige krav (eller skriv 'ingen')...",
      },
      confirm: {
        en: "Type 'yes' to generate or describe changes...",
        da: "Skriv 'ja' for at generere eller beskriv \u00e6ndringer...",
      },
      generating: {
        en: "Generating...",
        da: "Genererer...",
      },
      refining: {
        en: "Ask me to modify the design...",
        da: "Bed mig om at \u00e6ndre designet...",
      },
    };

    return placeholders[wizardState]?.[detectedLanguage] || placeholders.idle[detectedLanguage];
  };

  return (
    <div className="flex h-full flex-col bg-black overflow-hidden">
      {/* Blueprint Stage Indicator */}
      <BlueprintStageIndicator />

      {/* Wizard Progress Bar */}
      <WizardProgress />

      {/* Compliance Suggestions */}
      <ComplianceSuggestions />

      {/* Messages Area - takes remaining space minus input area */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full px-6 py-6">
          <div className="space-y-6 pb-48">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-4 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${message.role === "assistant" ? "bg-zinc-800 text-white" : "bg-zinc-800 text-white"
                  }`}
              >
                {message.role === "assistant" ? (
                  <Bot className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                ) : (
                  <User className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
                )}
              </div>

              <div
                className={`flex-1 max-w-[85%] ${message.role === "user" ? "text-right" : "text-left"
                  }`}
              >
                <div
                  className={`text-sm md:text-base leading-relaxed ${message.role === "user"
                    ? "text-white font-medium bg-zinc-900/50 rounded-lg px-4 py-2 inline-block"
                    : "text-zinc-400"
                    }`}
                >
                  <div className="prose prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
                  </div>
                </div>
                {message.role === "assistant" && (
                  <div className="mt-2 flex gap-2">{/* Action buttons could go here */}</div>
                )}
              </div>
            </div>
          ))}

          {isProcessing && !isGenerating && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white">
                <Bot className="h-4 w-4 opacity-40" strokeWidth={ICON_STROKE_WIDTH} />
              </div>
              <div className="text-zinc-600 text-sm flex items-center h-8">
                <span className="flex gap-0.5">
                  <span className="animate-bounce" style={{ animationDelay: '0ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '150ms' }}>.</span>
                  <span className="animate-bounce" style={{ animationDelay: '300ms' }}>.</span>
                </span>
              </div>
            </div>
          )}
          {isGenerating && (
            <div className="flex gap-4">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-white">
                <Loader2 className="h-4 w-4 animate-spin" strokeWidth={ICON_STROKE_WIDTH} />
              </div>
              <div className="text-zinc-400 text-sm flex items-center h-8">
                <span className="animate-pulse">
                  {detectedLanguage === "da"
                    ? "Tegner din plantegning..."
                    : "Drafting your floor plan..."}
                </span>
              </div>
            </div>
          )}
          <div ref={scrollRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Input Area - fixed at bottom */}
      <div className="shrink-0 p-4 bg-black border-t border-zinc-800 relative z-10">
        <div className="relative">
          <div
            className={`relative rounded-xl border bg-black transition-all duration-200 ${isFocused ? "border-zinc-700" : "border-zinc-800"
              }`}
          >
            {/* File Previews */}
            {selectedFiles.length > 0 && (
              <div className="flex gap-2 p-4 pb-0 overflow-x-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={index}
                    className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-black"
                  >
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="h-full w-full object-cover"
                      onLoad={(e) => URL.revokeObjectURL(e.currentTarget.src)}
                    />
                    <button
                      onClick={() => removeFile(index)}
                      className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center bg-black/80 text-white hover:bg-black"
                    >
                      <X className="h-3 w-3" strokeWidth={ICON_STROKE_WIDTH} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-end gap-2 p-3 pb-4">
              <Textarea
                ref={textareaRef}
                placeholder={getPlaceholder()}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 200)}px`;
                }}
                onPaste={(e) => {
                  // Allow paste to complete, then resize
                  setTimeout(() => {
                    if (textareaRef.current) {
                      textareaRef.current.style.height = "auto";
                      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
                    }
                  }, 0);
                }}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                    setTimeout(() => {
                      if (textareaRef.current) textareaRef.current.style.height = "auto";
                    }, 0);
                  }
                }}
                rows={2}
                style={{ minHeight: "56px", maxHeight: "200px" }}
                className="flex-1 resize-none border-0 bg-transparent py-2 px-3 shadow-none focus-visible:ring-0 placeholder:text-zinc-500 text-sm text-white overflow-y-auto"
              />

              <Button
                onClick={() => handleSendMessage()}
                disabled={isGenerating || isProcessing || !input.trim()}
                size="icon"
                className={`h-8 w-8 rounded-lg transition-all shrink-0 mb-1 ${input.trim() ? "bg-white text-black hover:bg-zinc-200" : "bg-zinc-800 text-zinc-400"
                  }`}
              >
                <ArrowUp className="h-4 w-4" strokeWidth={ICON_STROKE_WIDTH} />
              </Button>
            </div>
          </div>

          {/* API Key button - always visible */}
          <button
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className={`text-xs transition-colors mt-2 text-center w-full px-3 py-1.5 rounded-lg border ${apiKey
              ? "text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:border-zinc-700"
              : "text-amber-400 border-amber-400/30 hover:bg-amber-400/10"
              }`}
          >
            {apiKey ? "Change API Key" : "Configure API Key"}
          </button>

          {/* API Key Modal/Input */}
          {showApiKeyInput && (
            <div className="absolute bottom-full mb-4 left-0 right-0 bg-black border border-zinc-800 p-4 rounded-xl">
              <Input
                type="password"
                placeholder="Gemini API Key"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="mb-2 bg-black border-zinc-800"
              />
              <Button
                size="sm"
                onClick={handleSaveApiKey}
                className="w-full bg-white text-black hover:bg-zinc-200"
              >
                Save Key
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
