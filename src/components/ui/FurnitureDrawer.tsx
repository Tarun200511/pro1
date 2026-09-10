import React, { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import type { FurnitureCategory, FurnitureType, RoomObject } from '../../types/room';
import {
  Armchair,
  Bed,
  Refrigerator,
  Sofa,
  Table,
  Archive,
  Bath,
  Flame,
  Layers,
  Tv,
  UtensilsCrossed,
  X,
  Plus
} from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

interface CatalogItem {
  type: FurnitureType;
  category: FurnitureCategory;
  name: string;
  defaultDim: { width: number; depth: number; height: number };
  icon: React.ReactNode;
}

const CATALOG_ITEMS: CatalogItem[] = [
  // 1. Chair
  {
    type: 'chair',
    category: 'seating',
    name: 'Dining / Desk Chair',
    defaultDim: { width: 0.55, depth: 0.55, height: 0.85 },
    icon: <Armchair className="w-5 h-5" />
  },
  // 2. Sofa
  {
    type: 'sofa',
    category: 'seating',
    name: '3-Seater Spatial Sofa',
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
  // 3. Table
  {
    type: 'table',
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
  // 4. Bed
  {
    type: 'bed',
    category: 'beds',
    name: 'Queen Size Bed',
    defaultDim: { width: 1.6, depth: 2.0, height: 0.9 },
    icon: <Bed className="w-5 h-5" />
  },
  // 5. Storage
  {
    type: 'storage',
    category: 'storage',
    name: 'Storage Wardrobe',
    defaultDim: { width: 0.9, depth: 0.55, height: 1.9 },
    icon: <Archive className="w-5 h-5" />
  },
  {
    type: 'sideboard',
    category: 'storage',
    name: 'Media Console Sideboard',
    defaultDim: { width: 1.8, depth: 0.45, height: 0.6 },
    icon: <Archive className="w-5 h-5" />
  },
  {
    type: 'bookshelf',
    category: 'storage',
    name: 'Open Bookshelf',
    defaultDim: { width: 0.9, depth: 0.35, height: 1.9 },
    icon: <Archive className="w-5 h-5" />
  },
  // 6. Refrigerator
  {
    type: 'refrigerator',
    category: 'appliances',
    name: 'Double-Door Refrigerator',
    defaultDim: { width: 0.85, depth: 0.8, height: 1.85 },
    icon: <Refrigerator className="w-5 h-5" />
  },
  // 7. Stove
  {
    type: 'stove',
    category: 'appliances',
    name: 'Cooking Range Stove',
    defaultDim: { width: 0.75, depth: 0.65, height: 0.9 },
    icon: <UtensilsCrossed className="w-5 h-5" />
  },
  // 8. Oven
  {
    type: 'oven',
    category: 'appliances',
    name: 'Built-in Wall Oven',
    defaultDim: { width: 0.7, depth: 0.65, height: 0.85 },
    icon: <UtensilsCrossed className="w-5 h-5" />
  },
  // 9. Dishwasher
  {
    type: 'dishwasher',
    category: 'appliances',
    name: 'Under-Counter Dishwasher',
    defaultDim: { width: 0.6, depth: 0.6, height: 0.85 },
    icon: <Archive className="w-5 h-5" />
  },
  // 10. Sink
  {
    type: 'sink',
    category: 'bathroom',
    name: 'Vanity Washbasin Sink',
    defaultDim: { width: 0.7, depth: 0.55, height: 0.85 },
    icon: <Bath className="w-5 h-5" />
  },
  // 11. Washer / Dryer
  {
    type: 'washerDryer',
    category: 'appliances',
    name: 'Front-Load Washer & Dryer',
    defaultDim: { width: 0.65, depth: 0.65, height: 0.9 },
    icon: <Archive className="w-5 h-5" />
  },
  // 12. Toilet
  {
    type: 'toilet',
    category: 'bathroom',
    name: 'Modern Wall-Hung Toilet',
    defaultDim: { width: 0.45, depth: 0.7, height: 0.78 },
    icon: <Bath className="w-5 h-5" />
  },
  // 13. Bathtub
  {
    type: 'bathtub',
    category: 'bathroom',
    name: 'Freestanding Bathtub',
    defaultDim: { width: 1.7, depth: 0.75, height: 0.55 },
    icon: <Bath className="w-5 h-5" />
  },
  // 14. Television
  {
    type: 'television',
    category: 'electronics',
    name: 'Wall-Mount OLED TV',
    defaultDim: { width: 1.5, depth: 0.25, height: 0.95 },
    icon: <Tv className="w-5 h-5" />
  },
  // 15. Fireplace
  {
    type: 'fireplace',
    category: 'architectural',
    name: 'Contemporary Fireplace',
    defaultDim: { width: 1.2, depth: 0.45, height: 1.05 },
    icon: <Flame className="w-5 h-5" />
  },
  // 16. Stairs
  {
    type: 'stairs',
    category: 'architectural',
    name: 'Architectural Staircase',
    defaultDim: { width: 1.0, depth: 2.2, height: 1.8 },
    icon: <Layers className="w-5 h-5" />
  }
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const FurnitureDrawer: React.FC<Props> = ({ isOpen, onClose }) => {
  const addObject = useRoomStore((state) => state.addObject);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'All (Apple 16)' },
    { id: 'seating', label: 'Seating' },
    { id: 'tables', label: 'Tables' },
    { id: 'beds', label: 'Beds' },
    { id: 'storage', label: 'Storage' },
    { id: 'appliances', label: 'Appliances' },
    { id: 'bathroom', label: 'Bathroom' },
    { id: 'electronics', label: 'Electronics' },
    { id: 'architectural', label: 'Architecture' }
  ];

  const filteredItems = CATALOG_ITEMS.filter((item) => {
    const matchesCategory = activeCategory === 'all' || item.category === activeCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleAddItem = (item: CatalogItem) => {
    triggerHaptic('medium');
    const newObj: RoomObject = {
      id: `obj-${Date.now()}`,
      category: item.category,
      type: item.type,
      name: item.name,
      position: { x: (Math.random() - 0.5) * 1.5, y: 0, z: (Math.random() - 0.5) * 1.5 },
      dimensions: { ...item.defaultDim },
      rotation: { yaw: 0 },
      confidence: 'high',
      materialStyle: 'modern_white'
    };
    addObject(newObj);
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] md:fixed md:inset-auto md:top-20 md:left-20 md:z-40 md:w-88 md:max-h-[calc(100vh-6.5rem)] flex flex-col vision-panel border-t md:border border-white/15 rounded-t-3xl md:rounded-3xl p-5 pb-[calc(var(--sab)+1.5rem)] md:pb-5 shadow-2xl text-white select-none backdrop-blur-3xl animate-fade-in">
      {/* Mobile Top Sheet Grab Handle */}
      <div className="md:hidden flex flex-col items-center pb-2">
        <div className="w-12 h-1 bg-white/25 rounded-full mb-2" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-sm tracking-tight font-display text-white">Apple RoomPlan Library</h3>
            <span className="px-2 py-0.5 text-[9px] font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/35 rounded-full font-mono-digits">
              16 Types
            </span>
          </div>
          <p className="text-[11px] text-slate-400">Parametric CAD geometric objects</p>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-white rounded-full hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Instant Search Bar */}
      <div className="mt-3 relative">
        <input
          type="text"
          placeholder="Search chairs, beds, tables..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full px-3.5 py-2 bg-white/5 border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/60 focus:bg-white/10 transition-all font-medium"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1 text-xs"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto py-2.5 no-scrollbar text-xs">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {
              triggerHaptic('selection');
              setActiveCategory(cat.id);
            }}
            className={`px-3 py-1 rounded-full whitespace-nowrap text-xs font-medium transition-all ${
              activeCategory === cat.id
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold shadow-md shadow-cyan-500/25 vision-glow-cyan'
                : 'bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Items Grid */}
      <div className="overflow-y-auto space-y-2 mt-1 pr-1 flex-1">
        {filteredItems.length === 0 ? (
          <div className="py-8 text-center text-slate-500 text-xs">
            No furniture matching "{searchQuery}"
          </div>
        ) : (
          filteredItems.map((item) => (
            <div
              key={item.name}
              onClick={() => handleAddItem(item)}
              className="group flex items-center justify-between p-3 vision-card hover:bg-cyan-600/15 hover:border-cyan-500/35 rounded-2xl cursor-pointer transition-all active:scale-[0.98]"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-slate-900/80 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white rounded-xl transition-colors shadow-inner">
                  {item.icon}
                </div>
                <div>
                  <div className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors font-display">
                    {item.name}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-digits">
                    {item.defaultDim.width}m × {item.defaultDim.depth}m × {item.defaultDim.height}m
                  </div>
                </div>
              </div>
              <button
                className="p-1.5 text-slate-500 group-hover:text-cyan-400 group-hover:bg-cyan-500/15 rounded-lg transition-colors"
                title="Add to Scene"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
