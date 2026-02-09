/**
 * JSON Schema types for OpenAI Structured Outputs
 *
 * Note: We use OpenAI's json_object response format and validate
 * the output with our Zod schemas after parsing. This is more
 * reliable than trying to convert complex Zod schemas to JSON Schema.
 */

import { z } from 'zod';
import { BlueprintDataSchema } from './blueprint.schema';

// Response schema that includes both message and blueprint
export const BlueprintResponseSchema = z.object({
  message: z.string().describe('Human-friendly explanation of the design in the user\'s language'),
  blueprint: BlueprintDataSchema,
});

// Type for the response
export type BlueprintResponse = z.infer<typeof BlueprintResponseSchema>;

// Simple JSON schema hint for OpenAI (not strict mode, just json_object)
// We rely on our Zod validation after parsing
export const OpenAIResponseFormat = {
  type: 'json_object' as const,
};
