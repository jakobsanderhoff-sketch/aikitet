/**
 * Wizard Validation — "Bullshit Filter"
 *
 * Validates wizard answers per-step and cross-validates at the confirm step.
 * Professional & helpful tone, bilingual (EN/DA).
 */

type WizardState = string;

type WizardAnswers = {
  bedrooms?: number;
  bathrooms?: number;
  floors?: number;
  totalArea?: number;
  buildingType?: string;
  lifestyle?: string[];
  specialRequirements?: string[];
};

export type ValidationResult = {
  isValid: boolean;
  severity: 'ok' | 'warning' | 'error';
  message?: { en: string; da: string };
  suggestedValue?: number;
};

/**
 * Calculate the minimum realistic floor area based on room requirements
 */
function calculateMinArea(answers: WizardAnswers): number {
  const bedrooms = answers.bedrooms || 1;
  const bathrooms = answers.bathrooms || 1;
  // 12m² per bedroom, 5m² per bathroom, 25m² living/kitchen, 15% hallway/circulation, 13% walls
  const netArea = bedrooms * 12 + bathrooms * 5 + 25;
  const withCirculation = netArea * 1.15;
  return Math.ceil(withCirculation / 0.87);
}

/**
 * Calculate a reasonable maximum area for the given room count
 */
function calculateMaxReasonableArea(answers: WizardAnswers): number {
  const bedrooms = answers.bedrooms || 1;
  const bathrooms = answers.bathrooms || 1;
  return bedrooms * 50 + bathrooms * 15 + 80;
}

/**
 * Validate a wizard step answer in the context of all accumulated answers.
 * Returns a validation result with severity and bilingual message.
 */
export function validateWizardStep(
  state: WizardState,
  answers: WizardAnswers
): ValidationResult {
  switch (state) {
    case 'ask_bedrooms': {
      const bedrooms = answers.bedrooms;
      if (!bedrooms) return { isValid: true, severity: 'ok' };

      if (bedrooms >= 8) {
        return {
          isValid: true,
          severity: 'warning',
          message: {
            en: `${bedrooms} bedrooms is very unusual for a residential home. This will require a very large floor area (at least ${calculateMinArea(answers)}m²). Are you planning a large family home or a property with guest rooms?`,
            da: `${bedrooms} soveværelser er meget usædvanligt for en bolig. Det kræver et meget stort areal (mindst ${calculateMinArea(answers)}m²). Planlægger du et stort familiehus eller en ejendom med gæsteværelser?`,
          },
        };
      }
      if (bedrooms >= 6) {
        return {
          isValid: true,
          severity: 'warning',
          message: {
            en: `That's quite a few bedrooms. Is this for a large family, or will some serve as guest rooms or studies?`,
            da: `Det er ret mange soveværelser. Er det til en stor familie, eller skal nogle bruges som gæsteværelser eller studier?`,
          },
        };
      }
      return { isValid: true, severity: 'ok' };
    }

    case 'ask_bathrooms': {
      const bathrooms = answers.bathrooms;
      const bedrooms = answers.bedrooms || 1;
      if (!bathrooms) return { isValid: true, severity: 'ok' };

      if (bathrooms > bedrooms + 1) {
        return {
          isValid: true,
          severity: 'warning',
          message: {
            en: `${bathrooms} bathrooms for ${bedrooms} bedroom(s) is more than usual. Most homes have 1-2 bathrooms for every 2-3 bedrooms. Are you sure you need ${bathrooms}?`,
            da: `${bathrooms} badeværelser til ${bedrooms} soveværelse(r) er mere end normalt. De fleste hjem har 1-2 badeværelser per 2-3 soveværelser. Er du sikker på, at du har brug for ${bathrooms}?`,
          },
        };
      }
      return { isValid: true, severity: 'ok' };
    }

    case 'ask_floors': {
      const floors = answers.floors;
      if (!floors) return { isValid: true, severity: 'ok' };
      // No major validation needed here — cross-check with lifestyle at confirm
      return { isValid: true, severity: 'ok' };
    }

    case 'ask_area': {
      const totalArea = answers.totalArea;
      if (!totalArea) return { isValid: true, severity: 'ok' };

      const minArea = calculateMinArea(answers);
      const maxArea = calculateMaxReasonableArea(answers);
      const bedrooms = answers.bedrooms || 1;
      const bathrooms = answers.bathrooms || 1;

      if (totalArea < minArea) {
        return {
          isValid: false,
          severity: 'error',
          message: {
            en: `With ${bedrooms} bedroom(s) and ${bathrooms} bathroom(s), the minimum realistic floor area is about ${minArea}m². Your requested ${totalArea}m² would make rooms uncomfortably small and likely violate BR18 minimum room size requirements. Would you like to increase the area to at least ${minArea}m², or reduce the number of rooms?`,
            da: `Med ${bedrooms} soveværelse(r) og ${bathrooms} badeværelse(r) er det mindste realistiske areal ca. ${minArea}m². Dine ønskede ${totalArea}m² ville gøre rummene ubehageligt små og sandsynligvis overtræde BR18 minimumskrav til rumstørrelse. Vil du øge arealet til mindst ${minArea}m² eller reducere antallet af rum?`,
          },
          suggestedValue: minArea,
        };
      }

      if (totalArea > maxArea) {
        return {
          isValid: true,
          severity: 'warning',
          message: {
            en: `${totalArea}m² is quite generous for ${bedrooms} bedroom(s). I'll make sure the extra space is put to good use with additional rooms like a home office, utility room, or spacious living areas.`,
            da: `${totalArea}m² er ret generøst til ${bedrooms} soveværelse(r). Jeg sørger for, at den ekstra plads udnyttes godt med ekstra rum som hjemmekontor, bryggers eller rummelige opholdsarealer.`,
          },
        };
      }

      return { isValid: true, severity: 'ok' };
    }

    case 'ask_type':
      return { isValid: true, severity: 'ok' };

    case 'ask_lifestyle':
      return { isValid: true, severity: 'ok' };

    case 'ask_special':
      return { isValid: true, severity: 'ok' };

    case 'confirm':
      return crossValidate(answers);

    default:
      return { isValid: true, severity: 'ok' };
  }
}

/**
 * Cross-validate all answers together at the confirmation step.
 * Checks for contradictions and provides helpful notes.
 */
function crossValidate(answers: WizardAnswers): ValidationResult {
  const notes: { en: string; da: string }[] = [];

  // Elderly + multi-floor warning
  if (answers.lifestyle?.includes('elderly') && (answers.floors || 1) > 1) {
    notes.push({
      en: 'Since there are elderly residents and multiple floors, I\'ll make sure the master bedroom and an accessible bathroom are on the ground floor.',
      da: 'Da der er ældre beboere og flere etager, sørger jeg for, at hovedsoveværelset og et tilgængeligt badeværelse er på stueetagen.',
    });
  }

  // Kids + multi-floor note
  if (answers.lifestyle?.includes('kids') && (answers.floors || 1) > 1) {
    notes.push({
      en: 'With kids in a multi-story home, I\'ll keep bedrooms close together and ensure safe stair access.',
      da: 'Med børn i et fleretageshus sørger jeg for, at soveværelserne er tæt sammen og sikrer sikker adgang til trapper.',
    });
  }

  // Wheelchair + multi-floor
  if (answers.specialRequirements?.includes('wheelchair_access') && (answers.floors || 1) > 1) {
    notes.push({
      en: 'Wheelchair accessibility with multiple floors will require all essential rooms on the ground floor. Upper floors will be secondary spaces.',
      da: 'Kørestolstilgængelighed med flere etager kræver, at alle vigtige rum er på stueetagen. Øvre etager vil være sekundære rum.',
    });
  }

  // Area re-check with all info
  if (answers.totalArea && answers.bedrooms) {
    const minArea = calculateMinArea(answers);
    if (answers.totalArea < minArea * 0.9) {
      return {
        isValid: false,
        severity: 'error',
        message: {
          en: `Looking at the full picture, ${answers.totalArea}m² is too tight for your requirements. I'd recommend at least ${minArea}m². Would you like to adjust?`,
          da: `Når jeg ser på det samlede billede, er ${answers.totalArea}m² for stramt til dine krav. Jeg anbefaler mindst ${minArea}m². Vil du justere?`,
        },
        suggestedValue: minArea,
      };
    }
  }

  if (notes.length > 0) {
    return {
      isValid: true,
      severity: 'warning',
      message: {
        en: notes.map(n => n.en).join('\n\n'),
        da: notes.map(n => n.da).join('\n\n'),
      },
    };
  }

  return { isValid: true, severity: 'ok' };
}

/**
 * Build a human-readable confirmation summary of all wizard answers.
 */
export function buildConfirmationSummary(
  answers: WizardAnswers,
  lang: 'en' | 'da'
): string {
  const lines: string[] = [];

  if (lang === 'da') {
    lines.push('**Her er en oversigt over dit projekt:**\n');
    if (answers.bedrooms) lines.push(`- **Soveværelser:** ${answers.bedrooms}`);
    if (answers.bathrooms) lines.push(`- **Badeværelser:** ${answers.bathrooms}`);
    if (answers.floors) lines.push(`- **Etager:** ${answers.floors}`);
    if (answers.totalArea) lines.push(`- **Samlet areal:** ${answers.totalArea} m²`);
    if (answers.buildingType) {
      const types: Record<string, string> = { house: 'Enfamiliehus', townhouse: 'Rækkehus', 'multi-story': 'Fleretageshus' };
      lines.push(`- **Bygningstype:** ${types[answers.buildingType] || answers.buildingType}`);
    }
    if (answers.lifestyle && answers.lifestyle.length > 0) {
      const labels: Record<string, string> = { work_from_home: 'Hjemmearbejde', kids: 'Børn', elderly: 'Ældre beboere', pets: 'Kæledyr', entertaining: 'Underholdning/gæster' };
      lines.push(`- **Livsstil:** ${answers.lifestyle.map(l => labels[l] || l).join(', ')}`);
    }
    if (answers.specialRequirements && answers.specialRequirements.length > 0) {
      const labels: Record<string, string> = { wheelchair_access: 'Kørestolstilgængelighed', home_office: 'Hjemmekontor', open_plan: 'Åben plan', garage: 'Garage', multiple_bathrooms: 'Flere badeværelser', basement: 'Kælder', terrace: 'Terrasse' };
      lines.push(`- **Særlige krav:** ${answers.specialRequirements.map(r => labels[r] || r).join(', ')}`);
    } else {
      lines.push(`- **Særlige krav:** Ingen`);
    }
    lines.push('\nSer det rigtigt ud? Sig **ja** for at generere, eller fortæl mig, hvad du gerne vil ændre.');
  } else {
    lines.push('**Here\'s a summary of your project:**\n');
    if (answers.bedrooms) lines.push(`- **Bedrooms:** ${answers.bedrooms}`);
    if (answers.bathrooms) lines.push(`- **Bathrooms:** ${answers.bathrooms}`);
    if (answers.floors) lines.push(`- **Floors:** ${answers.floors}`);
    if (answers.totalArea) lines.push(`- **Total area:** ${answers.totalArea} m²`);
    if (answers.buildingType) {
      const types: Record<string, string> = { house: 'Single-family house', townhouse: 'Townhouse', 'multi-story': 'Multi-story' };
      lines.push(`- **Building type:** ${types[answers.buildingType] || answers.buildingType}`);
    }
    if (answers.lifestyle && answers.lifestyle.length > 0) {
      const labels: Record<string, string> = { work_from_home: 'Work from home', kids: 'Kids', elderly: 'Elderly residents', pets: 'Pets', entertaining: 'Entertaining guests' };
      lines.push(`- **Lifestyle:** ${answers.lifestyle.map(l => labels[l] || l).join(', ')}`);
    }
    if (answers.specialRequirements && answers.specialRequirements.length > 0) {
      const labels: Record<string, string> = { wheelchair_access: 'Wheelchair accessibility', home_office: 'Home office', open_plan: 'Open-plan', garage: 'Garage', multiple_bathrooms: 'Multiple bathrooms', basement: 'Basement', terrace: 'Terrace' };
      lines.push(`- **Special requirements:** ${answers.specialRequirements.map(r => labels[r] || r).join(', ')}`);
    } else {
      lines.push(`- **Special requirements:** None`);
    }
    lines.push('\nDoes this look correct? Say **yes** to generate, or tell me what you\'d like to change.');
  }

  return lines.join('\n');
}
