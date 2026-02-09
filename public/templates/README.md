# Blueprint Template Library

This directory contains 50 pre-validated BR18/BR23-compliant blueprint templates in SVG-enhanced format. These templates can be used as references by Levi (the AI architect) to generate more reliable and faster blueprint designs.

## Template Categories

### 1. **Compact (50-60m²)** - 10 templates
1-bedroom apartments optimized for efficient living
- Studio layouts
- Alcove bedrooms
- Office nooks
- Accessible designs

### 2. **Small (70-80m²)** - 10 templates
2-bedroom starter homes and apartments
- Open-plan living/kitchen
- Traditional separated rooms
- Home office spaces
- Walk-in closets
- Terrace access

### 3. **Medium (100-120m²)** - 10 templates
2-3 bedroom family homes
- Family-friendly layouts
- Open concept designs
- Split-level options
- Pantry and laundry rooms
- Multiple bathrooms

### 4. **Large (150-180m²)** - 10 templates
3-4 bedroom family estates
- Modern villas
- Professional home offices
- Guest rooms
- Bonus rooms
- Media rooms
- Mudrooms

### 5. **Spacious (200-250m²)** - 10 templates
4-5 bedroom luxury homes
- Executive homes
- Multigenerational living
- Home gyms
- Libraries
- Wine cellars
- Art studios
- In-law suites

## Template Naming Convention

```
template-{size}m2-{bedrooms}br-{style}-{variant}.json
```

**Examples:**
- `template-70m2-2br-open-plan-001.json` - 70m² 2-bedroom with open-plan layout
- `template-120m2-3br-traditional-002.json` - 120m² 3-bedroom traditional layout
- `template-200m2-4br-modern-luxury-001.json` - 200m² 4-bedroom modern luxury home

## How to Use Templates

### Via API

Send a request to `/api/chat` with a `templateId` parameter:

```json
{
  "message": "I want a 2-bedroom apartment with an open kitchen",
  "templateId": "template-70m2-2br-open-plan-001",
  "wizardState": "generating",
  "wizardAnswers": {
    "bedrooms": 2,
    "totalArea": 75,
    "buildingType": "house"
  }
}
```

### Template Index

All templates are indexed in `index.json` with metadata:
- Template ID
- Size and bedroom count
- Style tags
- File path
- Description

You can query the index to find suitable templates:

```typescript
import templateIndex from './public/templates/index.json';

// Find all 2-bedroom templates
const twoBedroomTemplates = templateIndex.filters.byBedrooms['2BR'];

// Find all open-plan templates
const openPlanTemplates = templateIndex.filters.byStyle['open-plan'];

// Find all templates with home office
const officeTemplates = templateIndex.filters.byFeature['office'];
```

## Template Structure

Each template follows the SVG-enhanced format:

```json
{
  "format": "svg-enhanced",
  "metadata": {
    "templateId": "template-70m2-2br-open-plan-001",
    "projectName": "2BR Open Plan 70m²",
    "location": "Denmark",
    "buildingCode": "BR18/BR23",
    "totalArea": 70,
    "buildingType": "house",
    "description": "Compact 2-bedroom with open living/kitchen",
    "tags": ["2BR", "open-plan", "starter-home"],
    "compliant": true
  },
  "exterior": {
    "path": "M 0,0 L 10,0 L 10,7 L 0,7 Z",
    "thickness": 0.3,
    "material": "brick"
  },
  "divisions": [...],
  "rooms": [...],
  "openings": [...]
}
```

## BR18/BR23 Compliance

All templates are validated against Danish Building Regulations:

✅ **Minimum room sizes met:**
- Bedrooms: ≥6m² (10m² recommended)
- Living rooms: ≥10m²
- Kitchens: ≥4m²
- Bathrooms: ≥2.5m²

✅ **Door requirements:**
- Clear passage: ≥77cm (0.9m standard)
- Bathroom doors swing outward

✅ **Window requirements:**
- Rescue windows in bedrooms (H+W ≥1.50m)
- Daylight: ≥10% of floor area

✅ **Geometry integrity:**
- All walls properly connected
- Zero dangling endpoints
- Closed exterior loops
- Valid SVG path format

## How Levi Uses Templates

When a template is provided, Levi (the AI):

1. **Starts from validated geometry** - Avoids generation errors
2. **Preserves compliant elements** - Door widths, window sizes, wall connections
3. **Modifies per user request** - Adjusts room sizes, adds/removes rooms
4. **Maintains BR18/BR23 compliance** - Checks all modifications against regulations
5. **Returns complete updated blueprint** - In the same SVG-enhanced format

### Modification Examples

**User:** "Make the living room larger"
→ Levi scales the living room boundary while maintaining wall connections

**User:** "Add a home office"
→ Levi splits an existing room or expands the exterior to add office space

**User:** "I need 3 bedrooms instead of 2"
→ Levi adds a bedroom division and adjusts room sizes proportionally

## Validation

All templates pass strict validation:

```bash
npm run validate:templates
```

**Expected output:**
```
Total templates:    50
✓ Valid:            50
❌ Invalid:         0
Success rate:       100.0%
```

## Adding New Templates

To add new templates:

1. Create the template JSON file in the appropriate size category folder
2. Follow the SVG-enhanced format structure
3. Ensure BR18/BR23 compliance
4. Add entry to `index.json`
5. Run validation script to verify
6. Test with Levi AI to ensure it can modify the template correctly

## Template Benefits

### For Users:
- ✅ Faster blueprint generation (modify vs. create from scratch)
- ✅ Higher reliability (start from validated geometry)
- ✅ Browse templates before customizing
- ✅ Visual inspiration for layouts

### For Levi (AI):
- ✅ Reference examples for learning patterns
- ✅ Reduced generation failures (modify known-good template)
- ✅ Faster response time (less computation)
- ✅ Better compliance (templates pre-validated)

### For System:
- ✅ Lower API costs (fewer regenerations)
- ✅ Reduced geometry processing (templates already valid)
- ✅ Better user experience (more predictable results)
- ✅ Scalable approach (add more templates over time)

## License

These templates are part of the AI Architect project and follow the project's license terms.

---

**Version:** 1.0.0
**Total Templates:** 50
**Last Updated:** 2026-02-03
