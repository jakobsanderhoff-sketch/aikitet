/**
 * Compliance Fix Suggestions Generator
 * Provides actionable suggestions and auto-fix capabilities for BR18 violations
 */

import type { ComplianceIssue, ComplianceReport } from '@/schemas/blueprint.schema';
import type { FixSuggestion } from '@/schemas/chat.schema';
import type { DetectedLanguage } from './language-detect';

// =====================================================
// Fix Suggestion Generator
// =====================================================

/**
 * Generate fix suggestions for compliance issues
 */
export function generateFixSuggestions(
  report: ComplianceReport,
  language: DetectedLanguage = 'en'
): FixSuggestion[] {
  const suggestions: FixSuggestion[] = [];

  // Process violations (most important)
  for (const violation of report.violations) {
    const suggestion = createSuggestionForIssue(violation, language, 'violation');
    if (suggestion) {
      suggestions.push(suggestion);
    }
  }

  // Process critical warnings
  for (const warning of report.warnings) {
    if (warning.severity === 'major' || warning.severity === 'critical') {
      const suggestion = createSuggestionForIssue(warning, language, 'warning');
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }
  }

  return suggestions;
}

/**
 * Create a fix suggestion for a specific issue
 */
function createSuggestionForIssue(
  issue: ComplianceIssue,
  language: DetectedLanguage,
  issueType: 'violation' | 'warning'
): FixSuggestion | null {
  const code = issue.code || '';

  // Door width issues
  if (code.includes('BR18-3.1.1') || issue.message.toLowerCase().includes('door') || issue.message.toLowerCase().includes('dør')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Dør er for smal: ${issue.message}`
        : `Door too narrow: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Udvid døren til standard 0.9m (M9) eller 1.0m (M10) bredde'
        : 'Expand door to standard 0.9m (M9) or 1.0m (M10) width',
      manualSteps: language === 'da'
        ? [
            'Vælg M9 (0.9m) til indvendige døre',
            'Vælg M10 (1.0m) til hoveddør',
            'Minimum er 0.77m for tilgængelighed (BR18 §373)',
          ]
        : [
            'Use M9 (0.9m) for interior doors',
            'Use M10 (1.0m) for main entrance',
            'Minimum is 0.77m for accessibility (BR18 §373)',
          ],
    };
  }

  // Room area issues
  if (code.includes('BR18-5.2') || issue.message.toLowerCase().includes('area') || issue.message.toLowerCase().includes('areal')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Rum er for lille: ${issue.message}`
        : `Room too small: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Udvid rummet ved at flytte vægge eller reducere tilstødende rum'
        : 'Expand room by moving walls or reducing adjacent rooms',
      manualSteps: language === 'da'
        ? [
            'Soveværelse kræver minimum 6m²',
            'Stue kræver minimum 10m²',
            'Køkken kræver minimum 4m²',
            'Overvej at flytte indvendige vægge',
          ]
        : [
            'Bedrooms require minimum 6m²',
            'Living rooms require minimum 10m²',
            'Kitchens require minimum 4m²',
            'Consider moving interior walls',
          ],
    };
  }

  // Ceiling height issues
  if (code.includes('BR18-5.1') || issue.message.toLowerCase().includes('ceiling') || issue.message.toLowerCase().includes('loft')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Lofthøjde er for lav: ${issue.message}`
        : `Ceiling height too low: ${issue.message}`,
      canAutoFix: false,
      manualSteps: language === 'da'
        ? [
            'Beboelsesrum: minimum 2.30m lofthøjde (BR18 §199)',
            'Badeværelser/opbevaring: minimum 2.10m',
            'Overvej bygningskonstruktionen',
          ]
        : [
            'Habitable rooms: minimum 2.30m ceiling height (BR18 §199)',
            'Bathrooms/storage: minimum 2.10m',
            'Consider building construction',
          ],
    };
  }

  // Natural light issues
  if (code.includes('BR23') || issue.message.toLowerCase().includes('light') || issue.message.toLowerCase().includes('lys')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Utilstrækkeligt dagslys: ${issue.message}`
        : `Insufficient natural light: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Tilføj flere vinduer eller gør eksisterende vinduer større'
        : 'Add more windows or increase existing window sizes',
      manualSteps: language === 'da'
        ? [
            'Vinduesareal skal være ≥10% af gulvareal',
            'Tilføj vinduer på ydervægge',
            'Overvej tagvinduer eller ovenlys',
            'Større vinduer forbedrer forholdet',
          ]
        : [
            'Window area must be ≥10% of floor area',
            'Add windows on exterior walls',
            'Consider skylights or roof windows',
            'Larger windows improve the ratio',
          ],
    };
  }

  // Rescue window issues
  if (code.includes('rescue') || code.includes('redning') || issue.message.toLowerCase().includes('rescue')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Redningsvindue problem: ${issue.message}`
        : `Rescue window issue: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Tilføj eller udvid et vindue så H+B ≥ 1.50m'
        : 'Add or expand a window so H+W ≥ 1.50m',
      manualSteps: language === 'da'
        ? [
            'Redningsvinduer kræver H+B ≥ 1.50m',
            'Maksimal højde over gulv: 1.20m',
            'Påkrævet i alle soveværelser',
            'Bruges som nødudgang ved brand',
          ]
        : [
            'Rescue windows require H+W ≥ 1.50m',
            'Maximum height above floor: 1.20m',
            'Required in all bedrooms',
            'Used as emergency exit in case of fire',
          ],
    };
  }

  // Bathroom turning circle issues
  if (code.includes('bathroom') || code.includes('turning') || issue.message.toLowerCase().includes('turning')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Badeværelse tilgængelighed: ${issue.message}`
        : `Bathroom accessibility: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Udvid badeværelset til minimum 1.50×1.50m fri gulvplads'
        : 'Expand bathroom to minimum 1.50×1.50m clear floor space',
      manualSteps: language === 'da'
        ? [
            'Kræver 1.50m vendecirkel til kørestol',
            'Dør skal slå udad',
            'Minimum 2.25m² gulvareal',
            'BR18 §196 tilgængelighedskrav',
          ]
        : [
            'Requires 1.50m turning circle for wheelchair',
            'Door must swing outward',
            'Minimum 2.25m² floor area',
            'BR18 §196 accessibility requirements',
          ],
    };
  }

  // Egress distance issues
  if (code.includes('5.4') || issue.message.toLowerCase().includes('egress') || issue.message.toLowerCase().includes('exit')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Flugtvejen er for lang: ${issue.message}`
        : `Egress distance too long: ${issue.message}`,
      canAutoFix: false,
      manualSteps: language === 'da'
        ? [
            'Maksimal afstand til udgang: 25m',
            'Soveværelser: maksimalt 15m',
            'Tilføj ekstra udgangsdør',
            'Revurder rumplacering',
          ]
        : [
            'Maximum distance to exit: 25m',
            'Bedrooms: maximum 15m',
            'Add additional exit door',
            'Reconsider room placement',
          ],
    };
  }

  // Technical room issues
  if (code.includes('tech-room') || issue.message.toLowerCase().includes('technical') || issue.message.toLowerCase().includes('teknik')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Teknikrum: ${issue.message}`
        : `Technical room: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Tilføj et teknikrum på 2-3m² eller et 120×60cm skab'
        : 'Add a technical room of 2-3m² or a 120×60cm cabinet space',
      manualSteps: language === 'da'
        ? [
            'Minimum 2m² for teknikrum',
            'Alternativt 120×60cm skabsplads',
            'Bruges til varmepumpe, ventilation, el-tavle',
            'Skal have adgang til vedligeholdelse',
          ]
        : [
            'Minimum 2m² for technical room',
            'Alternatively 120×60cm cabinet space',
            'Used for heat pump, ventilation, electrical panel',
            'Must have access for maintenance',
          ],
    };
  }

  // Corridor width issues
  if (code.includes('corridor') || issue.message.toLowerCase().includes('corridor') || issue.message.toLowerCase().includes('gang')) {
    return {
      issueId: issue.elementId || `issue-${Date.now()}`,
      issueCode: code,
      description: language === 'da'
        ? `Gang bredde: ${issue.message}`
        : `Corridor width: ${issue.message}`,
      canAutoFix: true,
      autoFixDescription: language === 'da'
        ? 'Udvid gangen til minimum 1.00m bredde'
        : 'Expand corridor to minimum 1.00m width',
      manualSteps: language === 'da'
        ? [
            'Standard gang: minimum 1.00m bredde',
            'Gang med sidedøre: minimum 1.30m bredde',
            'Flyt vægge for at udvide',
          ]
        : [
            'Standard corridor: minimum 1.00m width',
            'Corridor with side doors: minimum 1.30m width',
            'Move walls to expand',
          ],
    };
  }

  // Generic fallback
  return {
    issueId: issue.elementId || `issue-${Date.now()}`,
    issueCode: code || 'BR18',
    description: language === 'da'
      ? `Compliance problem: ${issue.message}`
      : `Compliance issue: ${issue.message}`,
    canAutoFix: false,
    manualSteps: language === 'da'
      ? ['Gennemgå BR18/BR23 bygningsreglementet', 'Konsulter en arkitekt']
      : ['Review BR18/BR23 building regulations', 'Consult an architect'],
  };
}

// =====================================================
// Quick Fix Descriptions for Common Issues
// =====================================================

export const QUICK_FIX_DESCRIPTIONS = {
  en: {
    'door-width': 'Widen door to 0.9m (M9) standard',
    'room-area': 'Expand room by moving interior walls',
    'natural-light': 'Add or enlarge windows',
    'rescue-window': 'Add rescue window (H+W ≥ 1.50m)',
    'bathroom-turning': 'Expand bathroom for wheelchair access',
    'tech-room': 'Add 2-3m² technical room',
    'corridor-width': 'Widen corridor to 1.00m',
  },
  da: {
    'door-width': 'Udvid dør til 0.9m (M9) standard',
    'room-area': 'Udvid rum ved at flytte indervægge',
    'natural-light': 'Tilføj eller forstør vinduer',
    'rescue-window': 'Tilføj redningsvindue (H+B ≥ 1.50m)',
    'bathroom-turning': 'Udvid badeværelse til kørestolsadgang',
    'tech-room': 'Tilføj 2-3m² teknikrum',
    'corridor-width': 'Udvid gang til 1.00m',
  },
};

// =====================================================
// Severity Prioritization
// =====================================================

/**
 * Sort suggestions by priority (critical first)
 */
export function prioritizeSuggestions(suggestions: FixSuggestion[]): FixSuggestion[] {
  const priorityOrder: Record<string, number> = {
    'BR18-5.4.1': 1,     // Egress - safety critical
    'BR18-5.1.1': 2,     // Ceiling height
    'BR18-3.1.1': 3,     // Door width - accessibility
    'BR18-rescue': 4,    // Rescue windows
    'BR18-bathroom': 5,  // Bathroom accessibility
    'BR23': 6,           // Natural light
    'BR18-5.2': 7,       // Room areas
  };

  return suggestions.sort((a, b) => {
    const priorityA = Object.entries(priorityOrder)
      .find(([key]) => a.issueCode.includes(key))?.[1] || 99;
    const priorityB = Object.entries(priorityOrder)
      .find(([key]) => b.issueCode.includes(key))?.[1] || 99;
    return priorityA - priorityB;
  });
}

/**
 * Get auto-fixable suggestions only
 */
export function getAutoFixableSuggestions(suggestions: FixSuggestion[]): FixSuggestion[] {
  return suggestions.filter(s => s.canAutoFix);
}

/**
 * Count issues by severity
 */
export function countBySeverity(report: ComplianceReport): {
  critical: number;
  major: number;
  minor: number;
} {
  let critical = 0;
  let major = 0;
  let minor = 0;

  for (const issue of [...report.violations, ...report.warnings]) {
    switch (issue.severity) {
      case 'critical':
        critical++;
        break;
      case 'major':
        major++;
        break;
      case 'minor':
        minor++;
        break;
    }
  }

  return { critical, major, minor };
}
