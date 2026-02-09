import type { BlueprintData } from '@/schemas/blueprint.schema';

/**
 * Migrate legacy blueprints to include furniture field and workflow state
 */
export function migrateBlueprintToV2(blueprint: any): BlueprintData {
  if (!blueprint?.sheets) return blueprint;

  const migrated = JSON.parse(JSON.stringify(blueprint));

  migrated.sheets = migrated.sheets.map((sheet: any) => {
    // Add furniture array if missing
    if (!sheet.elements.furniture) {
      sheet.elements.furniture = [];
    }

    return sheet;
  });

  // Add workflow state if missing
  if (!migrated.blueprintStage) {
    migrated.blueprintStage = 'draft';
  }
  if (migrated.furnitureModeActive === undefined) {
    migrated.furnitureModeActive = false;
  }

  return migrated;
}

/**
 * Check if blueprint needs migration
 */
export function needsMigration(blueprint: any): boolean {
  if (!blueprint?.sheets?.[0]?.elements) return false;
  return blueprint.sheets[0].elements.furniture === undefined;
}
