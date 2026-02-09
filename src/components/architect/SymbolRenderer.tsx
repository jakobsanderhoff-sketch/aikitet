/**
 * SymbolRenderer - Renders architectural symbols for openings
 * - Doors: 90° swing arc + door leaf (0.13mm detail lines)
 * - Windows: 3-line symbol showing wall-glass-wall (0.13mm)
 * - All symbols use thin lines as they represent details, not cut elements
 */

import { Opening, Wall, LineWeights } from '@/types/blueprint';
import { getDoorPath, polygonToPath, getWindowPath } from './render-utils';

interface SymbolRendererProps {
  openings: Opening[];
  walls: Wall[];
  scale: number;
}

export function SymbolRenderer({ openings, walls, scale }: SymbolRendererProps) {
  return (
    <g id="opening-layer">
      {openings.map((opening) => {
        const wall = walls.find((w) => w.id === opening.wallId);
        if (!wall) return null;

        // Calculate position along wall
        const wallLength = Math.sqrt(
          Math.pow(wall.end.x - wall.start.x, 2) +
          Math.pow(wall.end.y - wall.start.y, 2)
        );
        const position = opening.distFromStart / wallLength;

        if (opening.type === 'door' || opening.type === 'double-door') {
          return renderDoor(opening, wall, position, scale);
        }

        if (opening.type === 'window') {
          return renderWindow(opening, wall, position, scale);
        }

        if (opening.type === 'sliding') {
          return renderSlidingDoor(opening, wall, position, scale);
        }

        return null;
      })}
    </g>
  );
}

function renderDoor(opening: Opening, wall: Wall, position: number, scale: number) {
  // TODO: Fix this function - getDoorPath signature has changed
  const doorGeo: any = {}; // Placeholder
  const openingPath = '';
  const swing: any = {}; // Placeholder

  return (
    <g key={opening.id}>
      {/* Door opening (cuts through wall - fill with background) */}
      <path
        d={openingPath}
        fill="#060606"
        stroke="none"
      />

      {/* Door swing arc (thin detail line) */}
      <path
        d={swing}
        fill="none"
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={LineWeights.detail}
        strokeDasharray="none"
      />

      {/* Door leaf (closed position - rectangle showing door thickness) */}
      <path
        d={swing}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={LineWeights.detail * 3}
        strokeDasharray="none"
      />
    </g>
  );
}

function renderWindow(opening: Opening, wall: Wall, position: number, scale: number) {
  const { opening: openingPolygon, frame } = getWindowPath(wall, { ...opening, position }, scale);
  const openingPath = polygonToPath(openingPolygon, scale);

  return (
    <g key={opening.id}>
      {/* Window opening (lighter fill to suggest glass) */}
      <path
        d={openingPath}
        fill="rgba(135,206,235,0.15)"
        stroke="none"
      />

      {/* Window frame (3 parallel lines: outer-glass-inner) */}
      <path
        d={frame}
        fill="none"
        stroke="rgba(255,255,255,0.6)"
        strokeWidth={LineWeights.detail}
      />

      {/* Glass indication (very subtle center line) */}
      <path
        d={frame}
        fill="none"
        stroke="rgba(135,206,235,0.4)"
        strokeWidth={LineWeights.detail * 0.5}
      />
    </g>
  );
}

function renderSlidingDoor(opening: Opening, wall: Wall, position: number, scale: number) {
  // Calculate sliding door geometry using window path (similar cutout)
  const { opening: openingPolygon } = getWindowPath(wall, { width: opening.width, position }, scale);
  const openingPath = polygonToPath(openingPolygon, scale);

  // Calculate center position along wall
  const dx = wall.end.x - wall.start.x;
  const dy = wall.end.y - wall.start.y;
  const length = Math.sqrt(dx * dx + dy * dy);
  const centerPos = {
    x: wall.start.x + dx * position,
    y: wall.start.y + dy * position,
  };

  // Direction vector (normalized)
  const dir = { x: dx / length, y: dy / length };

  const halfWidth = opening.width / 2;
  const panelWidth = opening.width * 0.55; // Overlap

  const panel1Start = {
    x: (centerPos.x - dir.x * halfWidth) * scale,
    y: (centerPos.y - dir.y * halfWidth) * scale,
  };
  const panel1End = {
    x: (centerPos.x + dir.x * (panelWidth - halfWidth)) * scale,
    y: (centerPos.y + dir.y * (panelWidth - halfWidth)) * scale,
  };

  const panel2Start = {
    x: (centerPos.x + dir.x * (halfWidth - panelWidth)) * scale,
    y: (centerPos.y + dir.y * (halfWidth - panelWidth)) * scale,
  };
  const panel2End = {
    x: (centerPos.x + dir.x * halfWidth) * scale,
    y: (centerPos.y + dir.y * halfWidth) * scale,
  };

  return (
    <g key={opening.id}>
      {/* Opening */}
      <path
        d={openingPath}
        fill="#060606"
        stroke="none"
      />

      {/* Panel 1 */}
      <line
        x1={panel1Start.x}
        y1={panel1Start.y}
        x2={panel1End.x}
        y2={panel1End.y}
        stroke="rgba(255,255,255,0.5)"
        strokeWidth={LineWeights.detail * 3}
      />

      {/* Panel 2 */}
      <line
        x1={panel2Start.x}
        y1={panel2Start.y}
        x2={panel2End.x}
        y2={panel2End.y}
        stroke="rgba(255,255,255,0.4)"
        strokeWidth={LineWeights.detail * 3}
      />
    </g>
  );
}
