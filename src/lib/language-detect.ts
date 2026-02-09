/**
 * Language Detection for Danish/English
 *
 * Simple but effective detection based on:
 * 1. Danish-specific characters (æ, ø, å)
 * 2. Common Danish words
 * 3. Danish building/architecture terms
 */

export type DetectedLanguage = 'en' | 'da';

// Danish-specific characters (definitive indicator)
const DANISH_CHARS_REGEX = /[æøåÆØÅ]/;

// Common Danish words
const DANISH_COMMON_WORDS = [
  // Articles and pronouns
  'jeg',
  'du',
  'vi',
  'han',
  'hun',
  'de',
  'det',
  'den',
  'denne',
  // Prepositions
  'og',
  'i',
  'til',
  'med',
  'på',
  'af',
  'for',
  'fra',
  'om',
  'ved',
  // Verbs
  'er',
  'har',
  'kan',
  'vil',
  'skal',
  'gør',
  'lav',
  'tilføj',
  'fjern',
  'flyt',
  // Adjectives
  'stor',
  'lille',
  'større',
  'mindre',
  'ny',
  'nyt',
  'god',
  'godt',
  // Question words
  'hvad',
  'hvor',
  'hvordan',
  'hvorfor',
  'hvornår',
  'hvilken',
  'hvilket',
];

// Danish building/architecture terms
const DANISH_BUILDING_TERMS = [
  // Rooms
  'soveværelse',
  'stue',
  'køkken',
  'badeværelse',
  'toilet',
  'entre',
  'gang',
  'bryggers',
  'kontor',
  'værelse',
  'kælder',
  'loft',
  // Building types
  'hus',
  'lejlighed',
  'rækkehus',
  'villa',
  'bolig',
  'ejendom',
  // Elements
  'væg',
  'dør',
  'vindue',
  'trappe',
  'gulv',
  'tag',
  'garage',
  'terrasse',
  'altan',
  // Measurements
  'kvadratmeter',
  'meter',
  'areal',
  'bredde',
  'højde',
  'længde',
  // Actions
  'tegn',
  // 'design' removed - too common in English
  'byg',
  'plantegning',
];

// Danish patterns (grammatical structures)
const DANISH_PATTERNS = [
  /\b(en|et)\s+\w+/i, // Danish indefinite articles
  /\b(den|det)\s+\w+/i, // Danish definite articles (standalone)
  /\w+(en|et)$/i, // Danish definite suffix
  /\bjer\b/i, // Danish possessive
  /\bmig\b/i, // Danish "me"
  /\bdig\b/i, // Danish "you" (accusative)
];

/**
 * Detect if text is Danish or English
 */
export function detectLanguage(text: string): DetectedLanguage {
  if (!text || text.trim().length === 0) {
    return 'en'; // Default to English
  }

  const lowerText = text.toLowerCase();
  let danishScore = 0;

  // Check for Danish-specific characters (strong indicator)
  if (DANISH_CHARS_REGEX.test(text)) {
    danishScore += 5;
  }

  // Check for common Danish words
  for (const word of DANISH_COMMON_WORDS) {
    // Use word boundaries to match whole words
    const regex = new RegExp(`\\b${word}\\b`, 'i');
    if (regex.test(lowerText)) {
      danishScore += 1;
    }
  }

  // Check for Danish building terms (weighted higher for domain relevance)
  for (const term of DANISH_BUILDING_TERMS) {
    if (lowerText.includes(term)) {
      danishScore += 2;
    }
  }

  // Check for Danish grammatical patterns
  for (const pattern of DANISH_PATTERNS) {
    if (pattern.test(lowerText)) {
      danishScore += 1;
    }
  }

  // Threshold: If score >= 2, consider it Danish
  // This allows for single Danish terms or characters to trigger Danish mode
  return danishScore >= 2 ? 'da' : 'en';
}

/**
 * Get greeting based on language
 */
export function getGreeting(lang: DetectedLanguage): string {
  return lang === 'da'
    ? 'Hej! Jeg er Levi, din AI-arkitekt. Hvordan kan jeg hjælpe dig i dag?'
    : "Hi! I'm Levi, your AI architect. How can I help you today?";
}

/**
 * Get wizard prompts in the detected language
 */
export function getWizardPrompts(lang: DetectedLanguage) {
  if (lang === 'da') {
    return {
      ask_bedrooms: 'Hvor mange soveværelser har du brug for? (1-5 anbefales)',
      ask_area:
        'Hvad er dit mål for det samlede boligareal i kvadratmeter? (f.eks. 100-150 m² for et 3-værelses hus)',
      ask_type:
        'Hvilken type bygning er det?\n• Enfamiliehus\n• Rækkehus\n• Fleretageshus',
      ask_special:
        'Har du nogen særlige krav?\n• Kørestolsadgang\n• Hjemmekontor\n• Åbent køkken/stue\n• Garage\n• Flere badeværelser\n\n(Skriv "ingen" hvis du ikke har særlige krav)',
      generating: 'Perfekt! Jeg designer nu din plantegning...',
      refining:
        'Her er dit design! Du kan nu bede mig om at ændre det, f.eks. "gør soveværelset større" eller "tilføj et ekstra badeværelse".',
    };
  }

  return {
    ask_bedrooms: 'How many bedrooms do you need? (1-5 recommended)',
    ask_area:
      'What is your target total floor area in square meters? (e.g., 100-150 m² for a 3-bedroom house)',
    ask_type:
      'What type of building is this?\n• Single-family house\n• Townhouse\n• Multi-story house',
    ask_special:
      'Any special requirements?\n• Wheelchair accessibility\n• Home office\n• Open-plan kitchen/living\n• Garage\n• Multiple bathrooms\n\n(Type "none" if no special requirements)',
    generating: 'Perfect! I\'m now designing your floor plan...',
    refining:
      'Here\'s your design! You can now ask me to modify it, e.g., "make the bedroom bigger" or "add an extra bathroom".',
  };
}

/**
 * Translate room names based on language
 */
export function getRoomName(roomType: string, lang: DetectedLanguage): string {
  const translations: Record<string, { en: string; da: string }> = {
    bedroom: { en: 'Bedroom', da: 'Soveværelse' },
    living_room: { en: 'Living Room', da: 'Stue' },
    kitchen: { en: 'Kitchen', da: 'Køkken' },
    bathroom: { en: 'Bathroom', da: 'Badeværelse' },
    toilet: { en: 'Toilet', da: 'Toilet' },
    hallway: { en: 'Hallway', da: 'Gang' },
    entrance: { en: 'Entrance', da: 'Entré' },
    utility: { en: 'Utility Room', da: 'Bryggers' },
    office: { en: 'Office', da: 'Kontor' },
    garage: { en: 'Garage', da: 'Garage' },
    terrace: { en: 'Terrace', da: 'Terrasse' },
    basement: { en: 'Basement', da: 'Kælder' },
    tech_room: { en: 'Technical Room', da: 'Teknikrum' },
    storage: { en: 'Storage', da: 'Opbevaring' },
  };

  const translation = translations[roomType.toLowerCase()];
  if (translation) {
    return translation[lang];
  }

  // Return original if no translation found
  return roomType;
}

/**
 * Get compliance message in the detected language
 */
export function getComplianceMessage(
  code: string,
  lang: DetectedLanguage,
  params?: Record<string, string | number>
): string {
  const messages: Record<string, { en: string; da: string }> = {
    'BR18-door-width': {
      en: `Door width ${params?.width || ''}cm is below minimum 77cm (BR18 §373)`,
      da: `Dørbredde ${params?.width || ''}cm er under minimum 77cm (BR18 §373)`,
    },
    'BR18-ceiling-height': {
      en: `Ceiling height ${params?.height || ''}m is below minimum 2.30m`,
      da: `Lofthøjde ${params?.height || ''}m er under minimum 2,30m`,
    },
    'BR18-bedroom-area': {
      en: `Bedroom area ${params?.area || ''}m² is below recommended 6m²`,
      da: `Soveværelseareal ${params?.area || ''}m² er under anbefalet 6m²`,
    },
    'BR18-daylight': {
      en: `Window area ${params?.percentage || ''}% is below required 10% of floor area`,
      da: `Vinduesareal ${params?.percentage || ''}% er under påkrævet 10% af gulvareal`,
    },
    'BR18-rescue-window': {
      en: `Rescue window (H+W=${params?.sum || ''}m) must be ≥1.50m`,
      da: `Redningsvindue (H+B=${params?.sum || ''}m) skal være ≥1,50m`,
    },
    'BR18-bathroom-turning': {
      en: 'Bathroom must have 1.50m turning circle for wheelchair access',
      da: 'Badeværelse skal have 1,50m vendecirkel til kørestolsadgang',
    },
  };

  const message = messages[code];
  if (message) {
    return message[lang];
  }

  return code;
}
