import type { FurnitureType, FurnitureCategory } from '../types/room';

export interface AppleCategoryConfig {
  type: FurnitureType;
  category: FurnitureCategory;
  label: string;
  defaultDim: { width: number; depth: number; height: number };
}

export const APPLE_16_CATEGORIES: AppleCategoryConfig[] = [
  { type: 'chair', category: 'seating', label: 'Chair', defaultDim: { width: 0.55, depth: 0.55, height: 0.85 } },
  { type: 'sofa', category: 'seating', label: 'Sofa', defaultDim: { width: 2.2, depth: 0.9, height: 0.78 } },
  { type: 'table', category: 'tables', label: 'Table', defaultDim: { width: 1.6, depth: 0.9, height: 0.75 } },
  { type: 'bed', category: 'beds', label: 'Bed', defaultDim: { width: 1.6, depth: 2.0, height: 0.9 } },
  { type: 'storage', category: 'storage', label: 'Storage', defaultDim: { width: 0.9, depth: 0.45, height: 1.8 } },
  { type: 'refrigerator', category: 'appliances', label: 'Refrigerator', defaultDim: { width: 0.85, depth: 0.8, height: 1.85 } },
  { type: 'stove', category: 'appliances', label: 'Stove', defaultDim: { width: 0.75, depth: 0.65, height: 0.9 } },
  { type: 'oven', category: 'appliances', label: 'Oven', defaultDim: { width: 0.7, depth: 0.65, height: 0.85 } },
  { type: 'dishwasher', category: 'appliances', label: 'Dishwasher', defaultDim: { width: 0.6, depth: 0.6, height: 0.85 } },
  { type: 'sink', category: 'bathroom', label: 'Sink', defaultDim: { width: 0.7, depth: 0.55, height: 0.85 } },
  { type: 'washerDryer', category: 'appliances', label: 'Washer / Dryer', defaultDim: { width: 0.65, depth: 0.65, height: 0.9 } },
  { type: 'toilet', category: 'bathroom', label: 'Toilet', defaultDim: { width: 0.45, depth: 0.7, height: 0.78 } },
  { type: 'bathtub', category: 'bathroom', label: 'Bathtub', defaultDim: { width: 1.7, depth: 0.75, height: 0.55 } },
  { type: 'television', category: 'electronics', label: 'Television', defaultDim: { width: 1.5, depth: 0.25, height: 0.95 } },
  { type: 'fireplace', category: 'architectural', label: 'Fireplace', defaultDim: { width: 1.2, depth: 0.45, height: 1.05 } },
  { type: 'stairs', category: 'architectural', label: 'Stairs', defaultDim: { width: 1.0, depth: 2.2, height: 1.8 } }
];
