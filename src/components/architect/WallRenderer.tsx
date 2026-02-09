/**
 * WallRenderer - Renders walls with proper cut plane logic
 * - Calculates wall polygon from centerline + thickness
 * - Applies material hatching
 * - Uses appropriate line weights (0.5-0.7mm for cut elements)
 */

import { Wall, MaterialRenderProps, LineWeights } from '@/types/blueprint';
import { getWallPolygon, polygonToPath } from './render-utils';

interface WallRendererProps {
  walls: Wall[];
  scale: number; // pixels per meter
}

export function WallRenderer({ walls, scale }: WallRendererProps) {
  return (
    <g id="wall-layer">
      {/* Layer 1: Hatching fills (material representation) */}
      {walls.map((wall) => {
        const polygon = getWallPolygon(wall);
        const path = polygonToPath(polygon, scale);
        const materialProps = MaterialRenderProps[wall.material];

        return (
          <path
            key={`fill-${wall.id}`}
            d={path}
            fill={`url(#${materialProps.hatchId})`}
            stroke="none"
          />
        );
      })}

      {/* Layer 2: Cut lines (thick strokes for elements cut by plane) */}
      {walls.map((wall) => {
        const polygon = getWallPolygon(wall);
        const path = polygonToPath(polygon, scale);
        const materialProps = MaterialRenderProps[wall.material];

        // Line weight based on wall type
        let strokeWidth: number;
        if (wall.type === 'external' || wall.type === 'bearing') {
          strokeWidth = LineWeights.cutWall;
        } else if (wall.type === 'partition') {
          strokeWidth = LineWeights.partition;
        } else {
          strokeWidth = LineWeights.partition * 0.8;
        }

        return (
          <path
            key={`cut-${wall.id}`}
            d={path}
            fill="none"
            stroke={materialProps.color}
            strokeWidth={strokeWidth}
            strokeLinejoin="miter"
            strokeLinecap="square"
          />
        );
      })}
    </g>
  );
}
