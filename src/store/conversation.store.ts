import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// =====================================================
// Types
// =====================================================

export type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
};

export type LifestyleNeed = 'work_from_home' | 'kids' | 'elderly' | 'pets' | 'entertaining';

export type WizardState =
  | 'idle'           // No wizard active
  | 'ask_bedrooms'   // Step 1: How many bedrooms?
  | 'ask_bathrooms'  // Step 2: How many bathrooms?
  | 'ask_floors'     // Step 3: How many floors?
  | 'ask_area'       // Step 4: Total floor area?
  | 'ask_type'       // Step 5: Building type?
  | 'ask_lifestyle'  // Step 6: Lifestyle needs?
  | 'ask_special'    // Step 7: Special requirements?
  | 'confirm'        // Step 8: Confirm & review summary
  | 'generating'     // Creating initial design
  | 'refining';      // Post-generation refinement mode

export type BuildingType = 'house' | 'townhouse' | 'multi-story';

export type SpecialRequirement =
  | 'wheelchair_access'
  | 'home_office'
  | 'open_plan'
  | 'garage'
  | 'multiple_bathrooms'
  | 'basement'
  | 'terrace';

export type WizardAnswers = {
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  totalArea?: number;
  buildingType?: BuildingType;
  lifestyle?: LifestyleNeed[];
  specialRequirements?: SpecialRequirement[];
};

export type Intent =
  | { type: 'new_design' }
  | { type: 'modify'; target: string; action: 'enlarge' | 'shrink' | 'move' | 'delete' | 'add'; amount?: number }
  | { type: 'query' }
  | { type: 'fix_compliance'; issueId: string }
  | { type: 'wizard_answer' };

export type DetectedLanguage = 'en' | 'da';

// =====================================================
// State Interface
// =====================================================

interface ConversationState {
  // Chat History
  messages: Message[];

  // Wizard State Machine
  wizardState: WizardState;
  wizardAnswers: WizardAnswers;

  // Language Detection
  detectedLanguage: DetectedLanguage;

  // Current Intent (for API context)
  currentIntent: Intent | null;

  // Loading state
  isProcessing: boolean;
}

// =====================================================
// Actions Interface
// =====================================================

interface ConversationActions {
  // Message Management
  addMessage: (message: Message) => void;
  clearMessages: () => void;
  getRecentMessages: (count?: number) => Message[];

  // Wizard Control
  startWizard: () => void;
  advanceWizard: () => void;
  setWizardState: (state: WizardState) => void;
  setWizardAnswer: <K extends keyof WizardAnswers>(key: K, value: WizardAnswers[K]) => void;
  resetWizard: () => void;
  completeWizard: () => void;

  // Language
  setDetectedLanguage: (lang: DetectedLanguage) => void;

  // Intent
  setCurrentIntent: (intent: Intent | null) => void;

  // Processing
  setIsProcessing: (processing: boolean) => void;

  // Full Reset
  resetConversation: () => void;
}

type ConversationStore = ConversationState & ConversationActions;

// =====================================================
// Wizard Transitions
// =====================================================

const wizardTransitions: Record<WizardState, WizardState> = {
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
  'refining': 'refining', // Stay in refining mode
};

// =====================================================
// Initial State
// =====================================================

const initialState: ConversationState = {
  messages: [],
  wizardState: 'idle',
  wizardAnswers: {},
  detectedLanguage: 'en',
  currentIntent: null,
  isProcessing: false,
};

// =====================================================
// Zustand Store
// =====================================================

export const useConversationStore = create<ConversationStore>()(
  devtools(
    // No persist - each new window/tab starts with a fresh conversation
    (set, get) => ({
      ...initialState,

      // Message Management
      addMessage: (message) => {
        set(
          (state) => ({
            messages: [...state.messages, message],
          }),
          false,
          'addMessage'
        );
      },

      clearMessages: () => {
        set({ messages: [] }, false, 'clearMessages');
      },

      getRecentMessages: (count = 10) => {
        const { messages } = get();
        return messages.slice(-count);
      },

      // Wizard Control
      startWizard: () => {
        set(
          {
            wizardState: 'ask_bedrooms',
            wizardAnswers: {},
          },
          false,
          'startWizard'
        );
      },

      advanceWizard: () => {
        const { wizardState } = get();
        const nextState = wizardTransitions[wizardState];
        set({ wizardState: nextState }, false, 'advanceWizard');
      },

      setWizardState: (state) => {
        set({ wizardState: state }, false, 'setWizardState');
      },

      setWizardAnswer: (key, value) => {
        set(
          (state) => ({
            wizardAnswers: {
              ...state.wizardAnswers,
              [key]: value,
            },
          }),
          false,
          'setWizardAnswer'
        );
      },

      resetWizard: () => {
        set(
          {
            wizardState: 'idle',
            wizardAnswers: {},
          },
          false,
          'resetWizard'
        );
      },

      completeWizard: () => {
        set({ wizardState: 'refining' }, false, 'completeWizard');
      },

      // Language
      setDetectedLanguage: (lang) => {
        set({ detectedLanguage: lang }, false, 'setDetectedLanguage');
      },

      // Intent
      setCurrentIntent: (intent) => {
        set({ currentIntent: intent }, false, 'setCurrentIntent');
      },

      // Processing
      setIsProcessing: (processing) => {
        set({ isProcessing: processing }, false, 'setIsProcessing');
      },

      // Full Reset
      resetConversation: () => {
        set(initialState, false, 'resetConversation');
      },
    }),
    { name: 'conversation-store' }
  )
);

// =====================================================
// Helper Functions
// =====================================================

/**
 * Check if message should trigger wizard start
 */
export function shouldStartWizard(message: string): boolean {
  const triggers = [
    // English
    'new design',
    'start over',
    'new house',
    'new home',
    'design a house',
    'design a home',
    'help me design',
    'create a floor plan',
    'start fresh',
    'begin',
    // Danish
    'nyt design',
    'start forfra',
    'nyt hus',
    'nyt hjem',
    'design et hus',
    'hjælp mig med at designe',
    'lav en plantegning',
    'begynd',
  ];

  const lowerMessage = message.toLowerCase().trim();
  return triggers.some((t) => lowerMessage.includes(t));
}

/**
 * Extract wizard answer from user message based on current state
 */
export function extractWizardAnswer(
  state: WizardState,
  message: string
): Partial<WizardAnswers> {
  const lowerMessage = message.toLowerCase();

  switch (state) {
    case 'ask_bedrooms': {
      const match = message.match(/(\d+)/);
      if (match) {
        const bedrooms = parseInt(match[1], 10);
        if (bedrooms >= 1 && bedrooms <= 10) {
          return { bedrooms };
        }
      }
      return {};
    }

    case 'ask_bathrooms': {
      const match = message.match(/(\d+)/);
      if (match) {
        const bathrooms = parseInt(match[1], 10);
        if (bathrooms >= 1 && bathrooms <= 4) {
          return { bathrooms };
        }
      }
      return {};
    }

    case 'ask_floors': {
      const match = message.match(/(\d+)/);
      if (match) {
        const floors = parseInt(match[1], 10);
        if (floors >= 1 && floors <= 3) {
          return { floors };
        }
      }
      if (lowerMessage.match(/single|one|en\b|ét/i)) return { floors: 1 };
      if (lowerMessage.match(/two|double|to\b|dobbelt/i)) return { floors: 2 };
      if (lowerMessage.match(/three|triple|tre\b/i)) return { floors: 3 };
      return {};
    }

    case 'ask_area': {
      const match = message.match(/(\d+)/);
      if (match) {
        const area = parseInt(match[1], 10);
        if (area >= 20 && area <= 1000) {
          return { totalArea: area };
        }
      }
      return {};
    }

    case 'ask_type': {
      if (lowerMessage.match(/house|hus|enfamilie|villa/i)) {
        return { buildingType: 'house' };
      }
      if (lowerMessage.match(/townhouse|rækkehus|row/i)) {
        return { buildingType: 'townhouse' };
      }
      if (lowerMessage.match(/multi|etage|story|stories/i)) {
        return { buildingType: 'multi-story' };
      }
      return {};
    }

    case 'ask_special': {
      const requirements: SpecialRequirement[] = [];

      if (lowerMessage.match(/wheel|kørestol|handicap|accessibility/i)) {
        requirements.push('wheelchair_access');
      }
      if (lowerMessage.match(/office|kontor|hjemmearbejde|work/i)) {
        requirements.push('home_office');
      }
      if (lowerMessage.match(/open|åben|åbent/i)) {
        requirements.push('open_plan');
      }
      if (lowerMessage.match(/garage|carport/i)) {
        requirements.push('garage');
      }
      if (lowerMessage.match(/bathroom|badeværelse|multiple bath/i)) {
        requirements.push('multiple_bathrooms');
      }
      if (lowerMessage.match(/basement|kælder/i)) {
        requirements.push('basement');
      }
      if (lowerMessage.match(/terrace|terrasse|balcon/i)) {
        requirements.push('terrace');
      }

      // If nothing matched but user said something, assume they want to continue
      if (requirements.length === 0 && message.trim().length > 0) {
        // Check for "none" or "no" or "nothing"
        if (lowerMessage.match(/none|no|nothing|ingen|nej/i)) {
          return { specialRequirements: [] };
        }
      }

      return requirements.length > 0 ? { specialRequirements: requirements } : {};
    }

    case 'ask_lifestyle': {
      const lifestyle: LifestyleNeed[] = [];
      if (lowerMessage.match(/work|office|hjemmearbejde|kontor/i)) lifestyle.push('work_from_home');
      if (lowerMessage.match(/kid|child|children|barn|børn/i)) lifestyle.push('kids');
      if (lowerMessage.match(/elder|senior|old|ældre/i)) lifestyle.push('elderly');
      if (lowerMessage.match(/pet|dog|cat|hund|kat|dyr/i)) lifestyle.push('pets');
      if (lowerMessage.match(/entertain|guest|party|gæst|fest/i)) lifestyle.push('entertaining');

      if (lifestyle.length > 0) return { lifestyle };
      // Accept "none" or any text as empty lifestyle
      if (message.trim().length > 0) return { lifestyle: [] };
      return {};
    }

    case 'confirm':
      // Confirm step doesn't extract answers — it controls flow
      return {};

    default:
      return {};
  }
}

/**
 * Get wizard step number (1-8)
 */
export function getWizardStepNumber(state: WizardState): number {
  const steps: Record<WizardState, number> = {
    idle: 0,
    ask_bedrooms: 1,
    ask_bathrooms: 2,
    ask_floors: 3,
    ask_area: 4,
    ask_type: 5,
    ask_lifestyle: 6,
    ask_special: 7,
    confirm: 8,
    generating: 9,
    refining: 9,
  };
  return steps[state];
}

/**
 * Check if wizard is active
 */
export function isWizardActive(state: WizardState): boolean {
  return state !== 'idle' && state !== 'refining';
}

// =====================================================
// Selector Hooks
// =====================================================

export const useMessages = () => useConversationStore((state) => state.messages);
export const useWizardState = () => useConversationStore((state) => state.wizardState);
export const useWizardAnswers = () => useConversationStore((state) => state.wizardAnswers);
export const useDetectedLanguage = () => useConversationStore((state) => state.detectedLanguage);
export const useIsProcessing = () => useConversationStore((state) => state.isProcessing);
