/**
 * FlooringRenderer - Renders room flooring beneath the structure
 * This is the base layer showing what's "below" the cut plane
 * Very subtle patterns to not interfere with wall clarity
 */

import { RoomZone, FlooringType } from '@/types/blueprint';
import { polygonToPath } from './render-utils';

interface FlooringRendererProps {
  rooms: RoomZone[];
  scale: number;
}

const flooringPatternMap: Record<FlooringType, string> = {
  'oak-parquet': 'floor-oak',
  'tiles': 'floor-tiles',
  'carpet': 'floor-carpet',
  'concrete': 'floor-concrete',
  'vinyl': 'floor-vinyl',
};

export function FlooringRenderer({ rooms, scale }: FlooringRendererProps) {
  return (
    <g id="flooring-layer" opacity="0.8">
      {rooms.map((room) => {
        if (!room.polygon || room.polygon.length === 0) return null;

        const path = polygonToPath(room.polygon, scale);
        const patternId = flooringPatternMap[room.flooring];

        return (
          <path
            key={`floor-${room.id}`}
            d={path}
            fill={`url(#${patternId})`}
            stroke="none"
          />
        );
      })}
    </g>
  );
}
