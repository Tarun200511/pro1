import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { FurnitureCategory, FurnitureType, RoomObject } from '../../types/room';
import { Armchair, Bed, Monitor, Refrigerator, Sofa, Table, Archive, X, Plus } from 'lucide-react';

interface CatalogItem {
  type: FurnitureType;
  category: FurnitureCategory;
  name: string;
  defaultDim: { width: number; depth: number; height: number };
  icon: React.ReactNode;
}

const CATALOG_ITEMS: CatalogItem[] = [
  // Seating
  {
    type: 'sofa',
    category: 'seating',
    name: '3-Seater Sofa',
    defaultDim: { width: 2.2, depth: 0.9, height: 0.78 },
    icon: <Sofa className="w-5 h-5" />
  },
  {
    type: 'armchair',
    category: 'seating',
    name: 'Lounge Armchair',
    defaultDim: { width: 0.9, depth: 0.85, height: 0.8 },
    icon: <Armchair className="w-5 h-5" />
  },
  {
    type: 'chair',
    category: 'seating',
    name: 'Dining / Desk Chair',
    defaultDim: { width: 0.5, depth: 0.5, height: 0.85 },
    icon: <Armchair className="w-5 h-5" />
  },

  // Tables
  {
    type: 'dining_table',
    category: 'tables',
    name: 'Dining Table',
    defaultDim: { width: 1.6, depth: 0.9, height: 0.75 },
    icon: <Table className="w-5 h-5" />
  },
  {
    type: 'desk',
    category: 'tables',
    name: 'Workstation Desk',
    defaultDim: { width: 1.3, depth: 0.65, height: 0.75 },
    icon: <Table className="w-5 h-5" />
  },
  {
    type: 'coffee_table',
    category: 'tables',
    name: 'Coffee Table',
    defaultDim: { width: 1.1, depth: 0.6, height: 0.4 },
    icon: <Table className="w-5 h-5" />
  },

  // Beds
  {
    type: 'bed',
    category: 'beds',
    name: 'Queen Bed',
    defaultDim: { width: 1.6, depth: 2.0, height: 0.9 },
    icon: <Bed className="w-5 h-5" />
  },

  // Storage
  {
    type: 'wardrobe',
    category: 'storage',
    name: 'Minimal Wardrobe',
    defaultDim: { width: 0.8, depth: 1.6, height: 2.2 },
    icon: <Archive className="w-5 h-5" />
  },
  {
    type: 'sideboard',
    category: 'storage',
    name: 'Media Sideboard',
    defaultDim: { width: 1.8, depth: 0.45, height: 0.6 },
    icon: <Archive className="w-5 h-5" />
  },
  {
    type: 'bookshelf',
    category: 'storage',
    name: 'Bookshelf Unit',
    defaultDim: { width: 0.9, depth: 0.35, height: 1.9 },
    icon: <Archive className="w-5 h-5" />
  },

  // Appliances & Electronics
  {
    type: 'refrigerator',
    category: 'appliances',
    name: 'Double-Door Fridge',
    defaultDim: { width: 0.85, depth: 0.8, height: 1.9 },
    icon: <Refrigerator className="w-5 h-5" />
  },
  {
    type: 'tv',
    category: 'electronics',
    name: 'OLED TV & Console',
    defaultDim: { width: 1.6, depth: 0.35, height: 1.1 },
    icon: <Monitor className="w-5 h-5" />
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FurnitureDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const addObject = useRoomStore((state) => state.addObject);
  const [activeCategory, setActiveCategory] = React.useState<string>('all');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All Items' },
    { id: 'seating', label: 'Seating' },
    { id: 'tables', label: 'Tables' },
    { id: 'beds', label: 'Beds' },
    { id: 'storage', label: 'Storage' },
    { id: 'appliances', label: 'Appliances' },
    { id: 'electronics', label: 'Electronics' }
  ];

  const filteredItems =
    activeCategory === 'all'
      ? CATALOG_ITEMS
      : CATALOG_ITEMS.filter((item) => item.category === activeCategory);

  const handleAddItem = (item: CatalogItem) => {
    const newObj: RoomObject = {
      id: `obj-${Date.now()}`,
      category: item.category,
      type: item.type,
      name: item.name,
      position: { x: (Math.random() - 0.5) * 1.5, y: 0, z: (Math.random() - 0.5) * 1.5 },
      dimensions: { ...item.defaultDim },
      rotation: { yaw: 0 },
      materialStyle: 'modern_white'
    };
    addObject(newObj);
  };

  return (
    <div className="absolute top-16 left-4 z-40 w-80 max-h-[calc(100vh-6rem)] flex flex-col bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 shadow-2xl text-white select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <h3 className="font-bold text-sm tracking-tight">RoomPlan Object Library</h3>
          <p className="text-[11px] text-slate-400">Parametric spatial CAD models</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`px-3 py-1 rounded-xl whitespace-nowrap text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/25'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="overflow-y-auto space-y-2 mt-1 pr-1 flex-1">
        {filteredItems.map((item) => (
          <div
            key={item.name}
            onClick={() => handleAddItem(item)}
            className="group flex items-center justify-between p-3 bg-white/5 hover:bg-blue-600/15 border border-white/5 hover:border-blue-500/30 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-slate-800 text-blue-400 group-hover:bg-blue-500 group-hover:text-white rounded-xl transition-colors">
                {item.icon}
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                  {item.name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  {item.defaultDim.width}m × {item.defaultDim.depth}m × {item.defaultDim.height}m
                </div>
              </div>
            </div>
            <button
              className="p-1.5 text-slate-500 group-hover:text-blue-400 group-hover:bg-blue-500/10 rounded-lg transition-colors"
              title="Add to Scene"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
