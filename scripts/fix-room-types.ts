/**
 * Fix invalid room types in templates
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOM_TYPE_MAPPING: Record<string, string> = {
  'Guest Room': 'Bedroom',
  'Media Room': 'Other',
  'Home Theater': 'Other',
  'Wine Cellar': 'Storage',
  'Gym': 'Other',
  'Library': 'Office',
  'Pantry': 'Storage',
  'Laundry Room': 'Utility',
  'Mudroom': 'Entry',
  'Bonus Room': 'Other',
  'Playroom': 'Other',
  'Recreation': 'Other',
};

function fixRoomTypes(filePath: string): boolean {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    let fixed = false;

    if (data.rooms) {
      data.rooms.forEach((room: any) => {
        if (ROOM_TYPE_MAPPING[room.type]) {
          console.log(`  Mapping "${room.type}" -> "${ROOM_TYPE_MAPPING[room.type]}" in ${room.name}`);
          room.type = ROOM_TYPE_MAPPING[room.type];
          fixed = true;
        }
      });
    }

    if (fixed) {
      writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
      return true;
    }

    return false;
  } catch (error) {
    console.error(`Error fixing ${filePath}:`, error);
    return false;
  }
}

function fixAllTemplates() {
  const templatesDir = './public/templates';
  let fixedCount = 0;

  const categories = readdirSync(templatesDir);

  for (const category of categories) {
    const categoryPath = join(templatesDir, category);
    if (!statSync(categoryPath).isDirectory()) continue;

    const templates = readdirSync(categoryPath);
    for (const templateFile of templates) {
      if (!templateFile.endsWith('.json')) continue;

      const templatePath = join(categoryPath, templateFile);
      console.log(`\n${templateFile}:`);
      if (fixRoomTypes(templatePath)) {
        fixedCount++;
      } else {
        console.log('  No changes needed');
      }
    }
  }

  console.log(`\n\nFixed ${fixedCount} templates`);
}

fixAllTemplates();
