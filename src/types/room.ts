export type UnitType = 'm' | 'ft';

export type ViewMode = '3d' | '2d' | 'split';

export type ActiveTool = 'select' | 'wall' | 'door' | 'window' | 'furniture';

export type OpeningType = 'door' | 'window';

export interface WallOpening {
  id: string;
  type: OpeningType;
  offset: number; // distance along wall from start point (meters)
  width: number;  // meters (e.g. 0.9m for door, 1.2m for window)
  height: number; // meters (e.g. 2.1m for door, 1.2m for window)
  elevation: number; // elevation from floor (0 for door, 0.9m for window)
  swingDirection?: 'left' | 'right' | 'in' | 'out'; // for 2D door swing arc
}

export interface Wall {
  id: string;
  name: string;
  start: { x: number; z: number }; // meters
  end: { x: number; z: number };   // meters
  height: number;                  // default 2.6m
  thickness: number;               // default 0.15m
  openings: WallOpening[];
}

export type FurnitureCategory = 
  | 'seating'
  | 'tables'
  | 'storage'
  | 'appliances'
  | 'electronics'
  | 'beds'
  | 'bathroom'
  | 'architectural';

// Official Apple RoomPlan Object Categories + CAD aliases
export type FurnitureType =
  // Apple RoomPlan official 16 categories:
  | 'chair'
  | 'sofa'
  | 'table'
  | 'bed'
  | 'storage'
  | 'refrigerator'
  | 'stove'
  | 'oven'
  | 'dishwasher'
  | 'sink'
  | 'washerDryer'
  | 'toilet'
  | 'bathtub'
  | 'television'
  | 'fireplace'
  | 'stairs'
  // Convenience CAD subtypes:
  | 'armchair'
  | 'dining_table'
  | 'coffee_table'
  | 'desk'
  | 'wardrobe'
  | 'sideboard'
  | 'bookshelf'
  | 'tv';

export type RenderStyle = 'dollhouse' | 'textured';
export type ConfidenceLevel = 'high' | 'medium' | 'low';

export type FloorStyle = 'hardwood_oak' | 'grey_tile' | 'marble' | 'carpet' | 'concrete' | 'custom_photo';
export type WallStyle = 'white_plaster' | 'warm_beige' | 'slate_grey' | 'brick' | 'custom_photo';
export type LightingPreset = 'daylight' | 'golden_hour' | 'warm_interior' | 'night_studio';

export interface ImportedMesh {
  id: string;
  name: string;
  url: string;
  fileType: 'glb' | 'gltf' | 'obj';
  position: { x: number; y: number; z: number };
  scale: { x: number; y: number; z: number };
  rotation: { yaw: number };
}

export interface RoomObject {
  id: string;
  category: FurnitureCategory;
  type: FurnitureType;
  name: string;
  position: { x: number; y: number; z: number }; // meters
  dimensions: { width: number; depth: number; height: number }; // meters (W=X, D=Z, H=Y)
  rotation: { yaw: number }; // in radians (rotation around Y-axis)
  color?: string;
  confidence?: ConfidenceLevel;
  materialStyle?: 'modern_white' | 'natural_oak' | 'slate_dark' | 'brushed_aluminum';
  photoSnapshotUrl?: string; // real camera photo snapshot of this item
}

export interface SavedRoom {
  id: string;
  name: string;
  savedAt: string;
  walls: Wall[];
  objects: RoomObject[];
  metadata: {
    area: number;
    wallCount: number;
    objectCount: number;
    ceilingHeight: number;
  };
}

export interface RoomMetadata {
  name: string;
  createdAt: string;
  updatedAt: string;
  unit: UnitType;
  ceilingHeight: number;
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  customFloorTexture?: string;
  customWallTexture?: string;
  lightingPreset: LightingPreset;
}

export interface AppleRoomPlanSchema {
  version: string;
  captureDate: string;
  unit: string;
  roomDimensions: {
    width: number;
    depth: number;
    height: number;
    estimatedAreaSqMeters: number;
  };
  walls: Array<{
    identifier: string;
    start: [number, number, number];
    end: [number, number, number];
    dimensions: [number, number, number]; // [length, height, thickness]
    openings: Array<{
      identifier: string;
      category: 'door' | 'window';
      offset: number;
      dimensions: [number, number, number];
    }>;
  }>;
  objects: Array<{
    identifier: string;
    category: string;
    name: string;
    confidence: 'high' | 'medium';
    dimensions: [number, number, number]; // [width, height, depth]
    transform: number[]; // 16-element column-major 4x4 matrix
    position: [number, number, number];
    rotationEulerDeg: [number, number, number];
  }>;
}
