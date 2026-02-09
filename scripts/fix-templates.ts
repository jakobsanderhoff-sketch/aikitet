/**
 * Fix template formatting issues
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

function fixTemplate(filePath: string): boolean {
  try {
    const data = JSON.parse(readFileSync(filePath, 'utf-8'));
    let fixed = false;

    // Fix division materials
    if (data.divisions) {
      data.divisions.forEach((div: any) => {
        if (div.material === 'gypsum') {
          div.material = 'gypsum-board';
          fixed = true;
        }
      });
    }

    // Fix opening IDs
    if (data.openings) {
      data.openings.forEach((opening: any) => {
        // Fix d1 -> d-1, w1 -> w-1, etc.
        if (/^d\d+$/.test(opening.id)) {
          opening.id = opening.id.replace(/^d(\d+)$/, 'd-$1');
          fixed = true;
        } else if (/^w\d+$/.test(opening.id)) {
          opening.id = opening.id.replace(/^w(\d+)$/, 'w-$1');
          fixed = true;
        }
      });
    }

    // Fix feature references in rooms
    if (data.rooms) {
      data.rooms.forEach((room: any) => {
        if (room.features) {
          room.features = room.features.map((feature: string) => {
            if (/^(door|window):d\d+$/.test(feature)) {
              return feature.replace(/^(door|window):d(\d+)$/, '$1:d-$2');
            } else if (/^(door|window):w\d+$/.test(feature)) {
              return feature.replace(/^(door|window):w(\d+)$/, '$1:w-$2');
            }
            return feature;
          });
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
      if (fixTemplate(templatePath)) {
        console.log(`✓ Fixed ${templateFile}`);
        fixedCount++;
      }
    }
  }

  console.log(`\nFixed ${fixedCount} templates`);
}

fixAllTemplates();
