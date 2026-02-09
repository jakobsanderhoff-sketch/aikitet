/**
 * Professional Architectural Hatching Patterns
 * Following standard CAD conventions for material representation
 * All patterns scaled to work at 50px/meter base scale
 */

export function SVGHatchPatterns() {
  return (
    <defs>
      {/* BRICK - Diagonal lines at 45° with proper spacing */}
      <pattern
        id="hatch-brick"
        patternUnits="userSpaceOnUse"
        width="6"
        height="6"
        patternTransform="rotate(45)"
      >
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="6"
          stroke="#d97706"
          strokeWidth="0.8"
          opacity="0.7"
        />
      </pattern>

      {/* CONCRETE - Tight cross-hatching for solid mass */}
      <pattern
        id="hatch-concrete"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <path
          d="M0,0 L8,8 M8,0 L0,8"
          stroke="#71717a"
          strokeWidth="0.6"
          opacity="0.6"
          fill="none"
        />
      </pattern>

      {/* GASBETON - Horizontal lines (lighter material) */}
      <pattern
        id="hatch-gasbeton"
        patternUnits="userSpaceOnUse"
        width="8"
        height="5"
      >
        <line
          x1="0"
          y1="2.5"
          x2="8"
          y2="2.5"
          stroke="#e5e7eb"
          strokeWidth="0.5"
          opacity="0.5"
        />
      </pattern>

      {/* INSULATION - Wave pattern (soft material) */}
      <pattern
        id="hatch-insulation"
        patternUnits="userSpaceOnUse"
        width="12"
        height="8"
      >
        <path
          d="M0,4 Q3,2 6,4 T12,4"
          stroke="#fbbf24"
          strokeWidth="0.6"
          fill="none"
          opacity="0.6"
        />
      </pattern>

      {/* TIMBER - Wood grain pattern */}
      <pattern
        id="hatch-timber"
        patternUnits="userSpaceOnUse"
        width="10"
        height="12"
      >
        <path
          d="M0,2 Q5,1 10,2 M0,6 Q5,5 10,6 M0,10 Q5,9 10,10"
          stroke="#92400e"
          strokeWidth="0.5"
          fill="none"
          opacity="0.6"
        />
      </pattern>

      {/* FLOORING PATTERNS (Subtle - rendered beneath structure) */}

      {/* Oak Parquet - Wood planks */}
      <pattern
        id="floor-oak"
        patternUnits="userSpaceOnUse"
        width="40"
        height="10"
      >
        <rect x="0" y="0" width="18" height="9" fill="none" stroke="#92400e" strokeWidth="0.3" opacity="0.15" />
        <rect x="20" y="0" width="18" height="9" fill="none" stroke="#92400e" strokeWidth="0.3" opacity="0.15" />
      </pattern>

      {/* Tiles - Grid pattern */}
      <pattern
        id="floor-tiles"
        patternUnits="userSpaceOnUse"
        width="15"
        height="15"
      >
        <rect x="0" y="0" width="14" height="14" fill="none" stroke="#71717a" strokeWidth="0.3" opacity="0.1" />
      </pattern>

      {/* Carpet - Subtle texture */}
      <pattern
        id="floor-carpet"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
      >
        <circle cx="4" cy="4" r="0.5" fill="#a1a1aa" opacity="0.08" />
      </pattern>

      {/* Concrete - Minimal texture */}
      <pattern
        id="floor-concrete"
        patternUnits="userSpaceOnUse"
        width="20"
        height="20"
      >
        <circle cx="10" cy="10" r="0.5" fill="#71717a" opacity="0.05" />
      </pattern>

      {/* Vinyl - Very subtle */}
      <pattern
        id="floor-vinyl"
        patternUnits="userSpaceOnUse"
        width="10"
        height="10"
      >
        <rect x="0" y="0" width="9" height="9" fill="none" stroke="#a1a1aa" strokeWidth="0.2" opacity="0.08" />
      </pattern>

      {/* DIMENSION ARROW MARKERS */}
      <marker
        id="arrow-start"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
      >
        <path d="M7,4 L1,1 L1,7 Z" fill="rgba(255,255,255,0.6)" />
      </marker>

      <marker
        id="arrow-end"
        markerWidth="8"
        markerHeight="8"
        refX="4"
        refY="4"
        orient="auto"
      >
        <path d="M1,4 L7,1 L7,7 Z" fill="rgba(255,255,255,0.6)" />
      </marker>
    </defs>
  );
}
