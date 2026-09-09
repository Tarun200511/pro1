import type { Wall, RoomObject } from '../types/room';

export interface RoomPreset {
  id: string;
  name: string;
  description: string;
  walls: Wall[];
  objects: RoomObject[];
}

export const ROOM_PRESETS: RoomPreset[] = [
  {
    id: 'bedroom',
    name: 'Small Bedroom',
    description: 'Cozy bedroom layout with queen bed, wardrobe, study desk, and window.',
    walls: [
      {
        id: 'w-bed-1',
        name: 'North Wall',
        start: { x: -2.0, z: -1.8 },
        end: { x: 2.0, z: -1.8 },
        height: 2.6,
        thickness: 0.15,
        openings: [
          {
            id: 'win-1',
            type: 'window',
            offset: 2.0,
            width: 1.4,
            height: 1.2,
            elevation: 0.9
          }
        ]
      },
      {
        id: 'w-bed-2',
        name: 'East Wall',
        start: { x: 2.0, z: -1.8 },
        end: { x: 2.0, z: 1.8 },
        height: 2.6,
        thickness: 0.15,
        openings: []
      },
      {
        id: 'w-bed-3',
        name: 'South Wall',
        start: { x: 2.0, z: 1.8 },
        end: { x: -2.0, z: 1.8 },
        height: 2.6,
        thickness: 0.15,
        openings: [
          {
            id: 'door-1',
            type: 'door',
            offset: 1.0,
            width: 0.9,
            height: 2.1,
            elevation: 0,
            swingDirection: 'in'
          }
        ]
      },
      {
        id: 'w-bed-4',
        name: 'West Wall',
        start: { x: -2.0, z: 1.8 },
        end: { x: -2.0, z: -1.8 },
        height: 2.6,
        thickness: 0.15,
        openings: []
      }
    ],
    objects: [
      {
        id: 'obj-bed',
        category: 'beds',
        type: 'bed',
        name: 'Queen Bed',
        position: { x: 0, y: 0, z: -0.7 },
        dimensions: { width: 1.6, depth: 2.0, height: 0.9 },
        rotation: { yaw: 0 },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-wardrobe',
        category: 'storage',
        type: 'wardrobe',
        name: 'Minimalist Wardrobe',
        position: { x: -1.5, y: 0, z: 0.8 },
        dimensions: { width: 0.8, depth: 1.5, height: 2.2 },
        rotation: { yaw: Math.PI / 2 },
        materialStyle: 'natural_oak'
      },
      {
        id: 'obj-desk',
        category: 'tables',
        type: 'desk',
        name: 'Study Desk',
        position: { x: 1.2, y: 0, z: 0.9 },
        dimensions: { width: 1.2, depth: 0.6, height: 0.75 },
        rotation: { yaw: -Math.PI / 2 },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-chair',
        category: 'seating',
        type: 'chair',
        name: 'Desk Chair',
        position: { x: 1.2, y: 0, z: 0.3 },
        dimensions: { width: 0.55, depth: 0.55, height: 0.85 },
        rotation: { yaw: 0 },
        materialStyle: 'slate_dark'
      }
    ]
  },
  {
    id: 'studio',
    name: 'Open Studio',
    description: 'Spacious studio apartment with lounge, dining zone, entertainment wall, and kitchenette.',
    walls: [
      {
        id: 'w-stu-1',
        name: 'North Wall',
        start: { x: -3.0, z: -2.5 },
        end: { x: 3.0, z: -2.5 },
        height: 2.7,
        thickness: 0.15,
        openings: [
          {
            id: 'win-stu-1',
            type: 'window',
            offset: 1.6,
            width: 1.8,
            height: 1.4,
            elevation: 0.8
          },
          {
            id: 'win-stu-2',
            type: 'window',
            offset: 4.4,
            width: 1.8,
            height: 1.4,
            elevation: 0.8
          }
        ]
      },
      {
        id: 'w-stu-2',
        name: 'East Wall',
        start: { x: 3.0, z: -2.5 },
        end: { x: 3.0, z: 2.5 },
        height: 2.7,
        thickness: 0.15,
        openings: []
      },
      {
        id: 'w-stu-3',
        name: 'South Wall',
        start: { x: 3.0, z: 2.5 },
        end: { x: -3.0, z: 2.5 },
        height: 2.7,
        thickness: 0.15,
        openings: [
          {
            id: 'door-stu-1',
            type: 'door',
            offset: 4.8,
            width: 0.95,
            height: 2.2,
            elevation: 0,
            swingDirection: 'in'
          }
        ]
      },
      {
        id: 'w-stu-4',
        name: 'West Wall',
        start: { x: -3.0, z: 2.5 },
        end: { x: -3.0, z: -2.5 },
        height: 2.7,
        thickness: 0.15,
        openings: []
      }
    ],
    objects: [
      {
        id: 'obj-sofa',
        category: 'seating',
        type: 'sofa',
        name: '3-Seater Sofa',
        position: { x: -0.6, y: 0, z: -0.3 },
        dimensions: { width: 2.2, depth: 0.9, height: 0.78 },
        rotation: { yaw: 0 },
        materialStyle: 'slate_dark'
      },
      {
        id: 'obj-coffee-table',
        category: 'tables',
        type: 'coffee_table',
        name: 'Modern Coffee Table',
        position: { x: -0.6, y: 0, z: 0.8 },
        dimensions: { width: 1.1, depth: 0.6, height: 0.4 },
        rotation: { yaw: 0 },
        materialStyle: 'natural_oak'
      },
      {
        id: 'obj-tv',
        category: 'electronics',
        type: 'tv',
        name: '65" OLED TV & Console',
        position: { x: -0.6, y: 0, z: 2.3 },
        dimensions: { width: 1.6, depth: 0.35, height: 1.1 },
        rotation: { yaw: Math.PI },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-dining',
        category: 'tables',
        type: 'dining_table',
        name: 'Dining Table',
        position: { x: 1.8, y: 0, z: -0.8 },
        dimensions: { width: 1.4, depth: 0.85, height: 0.75 },
        rotation: { yaw: Math.PI / 2 },
        materialStyle: 'natural_oak'
      },
      {
        id: 'obj-chair-1',
        category: 'seating',
        type: 'chair',
        name: 'Dining Chair A',
        position: { x: 1.8, y: 0, z: -1.5 },
        dimensions: { width: 0.5, depth: 0.5, height: 0.85 },
        rotation: { yaw: 0 },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-chair-2',
        category: 'seating',
        type: 'chair',
        name: 'Dining Chair B',
        position: { x: 1.8, y: 0, z: -0.1 },
        dimensions: { width: 0.5, depth: 0.5, height: 0.85 },
        rotation: { yaw: Math.PI },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-fridge',
        category: 'appliances',
        type: 'refrigerator',
        name: 'Double-Door Fridge',
        position: { x: 2.4, y: 0, z: 1.8 },
        dimensions: { width: 0.85, depth: 0.8, height: 1.9 },
        rotation: { yaw: -Math.PI / 2 },
        materialStyle: 'brushed_aluminum'
      }
    ]
  },
  {
    id: 'l-shaped',
    name: 'L-Shaped Living Suite',
    description: 'Dynamic multi-angle room featuring a lounge area, reading nook, and balcony opening.',
    walls: [
      {
        id: 'w-l-1',
        name: 'North Wall Main',
        start: { x: -3.5, z: -3.0 },
        end: { x: 0.5, z: -3.0 },
        height: 2.8,
        thickness: 0.15,
        openings: [
          {
            id: 'win-l-1',
            type: 'window',
            offset: 2.0,
            width: 2.0,
            height: 1.4,
            elevation: 0.8
          }
        ]
      },
      {
        id: 'w-l-2',
        name: 'Inner Corner Down',
        start: { x: 0.5, z: -3.0 },
        end: { x: 0.5, z: -0.5 },
        height: 2.8,
        thickness: 0.15,
        openings: []
      },
      {
        id: 'w-l-3',
        name: 'East Extension',
        start: { x: 0.5, z: -0.5 },
        end: { x: 3.5, z: -0.5 },
        height: 2.8,
        thickness: 0.15,
        openings: [
          {
            id: 'door-l-balcony',
            type: 'door',
            offset: 1.8,
            width: 1.6,
            height: 2.3,
            elevation: 0,
            swingDirection: 'out'
          }
        ]
      },
      {
        id: 'w-l-4',
        name: 'East Wall South',
        start: { x: 3.5, z: -0.5 },
        end: { x: 3.5, z: 2.5 },
        height: 2.8,
        thickness: 0.15,
        openings: []
      },
      {
        id: 'w-l-5',
        name: 'South Wall Long',
        start: { x: 3.5, z: 2.5 },
        end: { x: -3.5, z: 2.5 },
        height: 2.8,
        thickness: 0.15,
        openings: [
          {
            id: 'door-l-entry',
            type: 'door',
            offset: 5.5,
            width: 0.9,
            height: 2.1,
            elevation: 0,
            swingDirection: 'in'
          }
        ]
      },
      {
        id: 'w-l-6',
        name: 'West Wall Return',
        start: { x: -3.5, z: 2.5 },
        end: { x: -3.5, z: -3.0 },
        height: 2.8,
        thickness: 0.15,
        openings: []
      }
    ],
    objects: [
      {
        id: 'obj-l-sofa',
        category: 'seating',
        type: 'sofa',
        name: 'Sectional Sofa',
        position: { x: -1.8, y: 0, z: -1.2 },
        dimensions: { width: 2.6, depth: 1.8, height: 0.8 },
        rotation: { yaw: 0 },
        materialStyle: 'slate_dark'
      },
      {
        id: 'obj-l-armchair',
        category: 'seating',
        type: 'armchair',
        name: 'Lounge Armchair',
        position: { x: -0.2, y: 0, z: -1.5 },
        dimensions: { width: 0.9, depth: 0.85, height: 0.8 },
        rotation: { yaw: -Math.PI / 4 },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-l-sideboard',
        category: 'storage',
        type: 'sideboard',
        name: 'Media Credenza',
        position: { x: -1.8, y: 0, z: 1.2 },
        dimensions: { width: 2.0, depth: 0.45, height: 0.6 },
        rotation: { yaw: Math.PI },
        materialStyle: 'natural_oak'
      },
      {
        id: 'obj-l-tv',
        category: 'electronics',
        type: 'tv',
        name: '75" Wall TV',
        position: { x: -1.8, y: 0.6, z: 2.3 },
        dimensions: { width: 1.7, depth: 0.1, height: 1.0 },
        rotation: { yaw: Math.PI },
        materialStyle: 'modern_white'
      },
      {
        id: 'obj-l-desk',
        category: 'tables',
        type: 'desk',
        name: 'Workstation Table',
        position: { x: 2.0, y: 0, z: 1.0 },
        dimensions: { width: 1.4, depth: 0.7, height: 0.75 },
        rotation: { yaw: -Math.PI / 2 },
        materialStyle: 'natural_oak'
      }
    ]
  }
];
