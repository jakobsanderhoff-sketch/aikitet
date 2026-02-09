export type Point = { x: number; y: number };

export type ComplianceIssue = {
  type: 'violation' | 'warning' | 'info';
  message: string;
};

export type Wall = {
  id: string;
  start: Point;
  end: Point;
  thickness: 0.5 | 0.35 | 0.15; // 0.5=Exterior, 0.35=Bearing/Party, 0.15=Partition
  material: 'brick' | 'concrete' | 'insulation' | 'partition';
  isExternal: boolean;
};

export type Opening = {
  id: string;
  wallId: string;
  distFromStart: number; // Distance in meters from wall start
  width: number;    // meters
  type: 'door' | 'window' | 'sliding' | 'opening';
  swing?: 'left' | 'right'; // For doors
};

export type RoomZone = {
  id: string;
  label: string;
  area: { value: number; unit: 'm²' };
  flooring: string;
  center: Point; // Label placement
  polygon: Point[]; // The floor shape (for flooring fill)
};

export type FloorPlanData = {
  walls: Wall[];
  openings: Opening[];
  rooms: RoomZone[];
  metadata: {
    totalArea: number;
    scale: string; // e.g. "1:100"
    compliance: ComplianceIssue[];
  };
};
