import { z } from 'zod';
import { BlueprintDataSchema, ComplianceReportSchema } from './blueprint.schema';
import { SVGBlueprintSchema } from './blueprint-svg.schema';

// =====================================================
// Wizard Types
// =====================================================

export const WizardStateSchema = z.enum([
  'idle',
  'ask_bedrooms',
  'ask_bathrooms',
  'ask_floors',
  'ask_area',
  'ask_type',
  'ask_lifestyle',
  'ask_special',
  'confirm',
  'generating',
  'refining',
]);

export type WizardState = z.infer<typeof WizardStateSchema>;

export const BuildingTypeSchema = z.enum([
  'house',
  'townhouse',
  'multi-story',
]);

export type BuildingType = z.infer<typeof BuildingTypeSchema>;

export const SpecialRequirementSchema = z.enum([
  'wheelchair_access',
  'home_office',
  'open_plan',
  'garage',
  'multiple_bathrooms',
  'basement',
  'terrace',
]);

export type SpecialRequirement = z.infer<typeof SpecialRequirementSchema>;

export const LifestyleNeedSchema = z.enum([
  'work_from_home',
  'kids',
  'elderly',
  'pets',
  'entertaining',
]);

export type LifestyleNeed = z.infer<typeof LifestyleNeedSchema>;

export const WizardAnswersSchema = z.object({
  bedrooms: z.number().min(1).max(10).optional(),
  bathrooms: z.number().min(1).max(4).optional(),
  floors: z.number().min(1).max(3).optional(),
  totalArea: z.number().min(20).max(1000).optional(),
  buildingType: BuildingTypeSchema.optional(),
  lifestyle: z.array(LifestyleNeedSchema).optional(),
  specialRequirements: z.array(SpecialRequirementSchema).optional(),
});

export type WizardAnswers = z.infer<typeof WizardAnswersSchema>;

// =====================================================
// Intent Classification
// =====================================================

export const IntentTypeSchema = z.enum([
  'new_design',
  'modify',
  'query',
  'fix_compliance',
  'wizard_answer',
  'general_chat',
]);

export const ModifyActionSchema = z.enum([
  'enlarge',
  'shrink',
  'move',
  'delete',
  'add',
  'rotate',
  'change_material',
]);

export const IntentSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('new_design'),
  }),
  z.object({
    type: z.literal('modify'),
    target: z.string().describe('Room or element name to modify'),
    action: ModifyActionSchema,
    amount: z.number().optional().describe('Amount/percentage to change'),
    direction: z.string().optional().describe('Direction of change'),
  }),
  z.object({
    type: z.literal('query'),
    subject: z.string().optional().describe('What the user is asking about'),
  }),
  z.object({
    type: z.literal('fix_compliance'),
    issueId: z.string(),
    issueCode: z.string().optional(),
  }),
  z.object({
    type: z.literal('wizard_answer'),
  }),
  z.object({
    type: z.literal('general_chat'),
  }),
]);

export type Intent = z.infer<typeof IntentSchema>;

// =====================================================
// Language Detection
// =====================================================

export const DetectedLanguageSchema = z.enum(['en', 'da']);
export type DetectedLanguage = z.infer<typeof DetectedLanguageSchema>;

// =====================================================
// Compliance Fix Suggestions
// =====================================================

export const FixSuggestionSchema = z.object({
  issueId: z.string(),
  issueCode: z.string(),
  description: z.string(),
  canAutoFix: z.boolean(),
  autoFixDescription: z.string().optional(),
  manualSteps: z.array(z.string()).optional(),
});

export type FixSuggestion = z.infer<typeof FixSuggestionSchema>;

// =====================================================
// Chat Request Schema (Frontend → API)
// =====================================================

export const ChatRequestSchema = z.object({
  // Required
  message: z.string().min(1).describe('User message'),

  // Context
  conversationHistory: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string(),
        timestamp: z.string().or(z.date()).optional(),
      })
    )
    .optional()
    .describe('Recent conversation messages for context'),

  // Use passthrough to accept existing blueprints that may not strictly match schema
  // (e.g., windows with height < 1.8m from older designs)
  currentBlueprint: z.any().nullable().optional().describe('Current design state'),

  // Wizard State
  wizardState: WizardStateSchema.optional(),
  wizardAnswers: WizardAnswersSchema.optional(),

  // Template Reference (optional - for using pre-validated templates)
  templateId: z.string().optional().describe('Template ID to use as reference'),

  // API Key (optional - falls back to env)
  apiKey: z.string().optional(),
});

export type ChatRequest = z.infer<typeof ChatRequestSchema>;

// =====================================================
// Chat Response Schema (API → Frontend)
// =====================================================

export const WizardActionSchema = z.enum([
  'advance', // Move to next wizard step
  'stay', // Stay on current step (need more info)
  'complete', // Wizard finished, design generated
  'cancel', // User cancelled wizard
  'skip', // Skip current step
]);

export type WizardAction = z.infer<typeof WizardActionSchema>;

export const ChatResponseSchema = z.object({
  // Required: AI response message
  message: z.string().describe('Human-readable response from Levi'),

  // Optional: Updated blueprint (only when design changes)
  // Can be either legacy coordinate format or new SVG-enhanced format
  blueprint: z.union([BlueprintDataSchema, SVGBlueprintSchema]).optional(),

  // Optional: Wizard flow control
  wizardAction: WizardActionSchema.optional(),
  nextWizardState: WizardStateSchema.optional(),

  // Optional: Compliance results
  compliance: ComplianceReportSchema.optional(),

  // Optional: Suggested fixes for compliance issues
  suggestions: z.array(FixSuggestionSchema).optional(),

  // Language detection result
  detectedLanguage: DetectedLanguageSchema,

  // Intent classification (for debugging/logging)
  detectedIntent: IntentSchema.optional(),

  // Error handling
  error: z
    .object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
    })
    .optional(),
});

export type ChatResponse = z.infer<typeof ChatResponseSchema>;

// =====================================================
// Message Type (for UI)
// =====================================================

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.date(),
  // Optional metadata
  blueprint: z.union([BlueprintDataSchema, SVGBlueprintSchema]).optional(),
  compliance: ComplianceReportSchema.optional(),
  suggestions: z.array(FixSuggestionSchema).optional(),
  wizardAction: WizardActionSchema.optional(),
});

export type Message = z.infer<typeof MessageSchema>;

// =====================================================
// Conversation History for Gemini
// =====================================================

export const GeminiMessageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(
    z.object({
      text: z.string(),
    })
  ),
});

export type GeminiMessage = z.infer<typeof GeminiMessageSchema>;

// =====================================================
// Helper Functions
// =====================================================

/**
 * Convert frontend messages to Gemini format
 */
export function toGeminiHistory(
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
): GeminiMessage[] {
  return messages.map((msg) => ({
    role: msg.role === 'user' ? 'user' : 'model',
    parts: [{ text: msg.content }],
  }));
}

/**
 * Create a system context message that includes current blueprint
 */
export function createBlueprintContext(blueprint: z.infer<typeof BlueprintDataSchema>): string {
  const sheet = blueprint.sheets[0];
  const roomList = sheet.elements.rooms
    .map((r) => `- ${r.label}: ${r.area.value} m² (${r.flooring})`)
    .join('\n');

  const wallCount = sheet.elements.walls.length;
  const doorCount = sheet.elements.openings.filter((o) => o.type === 'door').length;
  const windowCount = sheet.elements.openings.filter((o) => o.type === 'window').length;

  return `
CURRENT DESIGN STATE:
Project: ${blueprint.projectName}
Total Area: ${sheet.metadata.totalArea || 'Unknown'} m²
Scale: ${sheet.scale}

ROOMS:
${roomList}

STRUCTURE:
- ${wallCount} walls
- ${doorCount} doors
- ${windowCount} windows

When the user asks to modify this design, refer to these elements by their names.
Return the COMPLETE updated blueprint, not just changes.
`;
}

/**
 * Extract wizard answers from user message
 */
export function parseWizardResponse(
  state: WizardState,
  message: string
): { answers: Partial<WizardAnswers>; understood: boolean } {
  const lowerMessage = message.toLowerCase();

  switch (state) {
    case 'ask_bedrooms': {
      const match = message.match(/(\d+)/);
      if (match) {
        const bedrooms = parseInt(match[1], 10);
        if (bedrooms >= 1 && bedrooms <= 10) {
          return { answers: { bedrooms }, understood: true };
        }
      }
      return { answers: {}, understood: false };
    }

    case 'ask_bathrooms': {
      const match = message.match(/(\d+)/);
      if (match) {
        const bathrooms = parseInt(match[1], 10);
        if (bathrooms >= 1 && bathrooms <= 4) {
          return { answers: { bathrooms }, understood: true };
        }
      }
      return { answers: {}, understood: false };
    }

    case 'ask_floors': {
      const match = message.match(/(\d+)/);
      if (match) {
        const floors = parseInt(match[1], 10);
        if (floors >= 1 && floors <= 3) {
          return { answers: { floors }, understood: true };
        }
      }
      if (lowerMessage.match(/single|one|en\b|ét/i)) return { answers: { floors: 1 }, understood: true };
      if (lowerMessage.match(/two|double|to\b|dobbelt/i)) return { answers: { floors: 2 }, understood: true };
      if (lowerMessage.match(/three|triple|tre\b/i)) return { answers: { floors: 3 }, understood: true };
      return { answers: {}, understood: false };
    }

    case 'ask_area': {
      const match = message.match(/(\d+)/);
      if (match) {
        const area = parseInt(match[1], 10);
        if (area >= 20 && area <= 1000) {
          return { answers: { totalArea: area }, understood: true };
        }
      }
      return { answers: {}, understood: false };
    }

    case 'ask_type': {
      if (lowerMessage.match(/house|hus|enfamilie|villa/i)) {
        return { answers: { buildingType: 'house' }, understood: true };
      }
      if (lowerMessage.match(/townhouse|rækkehus|row/i)) {
        return { answers: { buildingType: 'townhouse' }, understood: true };
      }
      if (lowerMessage.match(/multi|etage|story|stories/i)) {
        return { answers: { buildingType: 'multi-story' }, understood: true };
      }
      return { answers: {}, understood: false };
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
      if (lowerMessage.match(/bath|badeværelse/i)) {
        requirements.push('multiple_bathrooms');
      }
      if (lowerMessage.match(/basement|kælder/i)) {
        requirements.push('basement');
      }
      if (lowerMessage.match(/terrace|terrasse|balcon/i)) {
        requirements.push('terrace');
      }

      // "none" or empty is also valid
      if (requirements.length === 0) {
        if (lowerMessage.match(/none|no|nothing|ingen|nej/i) || message.trim().length > 0) {
          return { answers: { specialRequirements: [] }, understood: true };
        }
      }

      return {
        answers: requirements.length > 0 ? { specialRequirements: requirements } : {},
        understood: requirements.length > 0,
      };
    }

    case 'ask_lifestyle': {
      const lifestyle: LifestyleNeed[] = [];
      if (lowerMessage.match(/work|office|hjemmearbejde|kontor/i)) lifestyle.push('work_from_home');
      if (lowerMessage.match(/kid|child|children|barn|børn/i)) lifestyle.push('kids');
      if (lowerMessage.match(/elder|senior|old|ældre/i)) lifestyle.push('elderly');
      if (lowerMessage.match(/pet|dog|cat|hund|kat|dyr/i)) lifestyle.push('pets');
      if (lowerMessage.match(/entertain|guest|party|gæst|fest/i)) lifestyle.push('entertaining');

      if (lifestyle.length === 0 && lowerMessage.match(/none|no|nothing|ingen|nej/i)) {
        return { answers: { lifestyle: [] }, understood: true };
      }
      if (lifestyle.length > 0) {
        return { answers: { lifestyle }, understood: true };
      }
      // Accept any non-empty message as "none" for flexibility
      if (message.trim().length > 0) {
        return { answers: { lifestyle: [] }, understood: true };
      }
      return { answers: {}, understood: false };
    }

    case 'confirm': {
      if (lowerMessage.match(/^(yes|ja|go|generate|generer|lad os|ok|okay|sure|yep|confirmed|do it|start)/i)) {
        return { answers: {}, understood: true };
      }
      // Any other response means the user wants to change something — stay on confirm
      return { answers: {}, understood: false };
    }

    default:
      return { answers: {}, understood: false };
  }
}
