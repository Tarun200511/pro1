import { create } from 'zustand';
import type {
  Wall,
  RoomObject,
  WallOpening,
  ViewMode,
  ActiveTool,
  UnitType,
  FloorStyle,
  WallStyle,
  LightingPreset,
  ImportedMesh
} from '../types/room';
import { ROOM_PRESETS } from '../utils/presets';
import { snapToGrid } from '../utils/math';
import { toggleMute, playUiClick } from '../utils/sound';

interface HistorySnapshot {
  walls: Wall[];
  objects: RoomObject[];
}

interface RoomState {
  // Core Data
  walls: Wall[];
  objects: RoomObject[];
  roomName: string;
  unit: UnitType;
  ceilingHeight: number;
  wallThickness: number;
  gridSnap: boolean;

  // Surface Replication & Environment
  floorStyle: FloorStyle;
  wallStyle: WallStyle;
  customFloorTexture: string | null;
  customWallTexture: string | null;
  lightingPreset: LightingPreset;
  importedMeshes: ImportedMesh[];

  // View & Tool States
  viewMode: ViewMode;
  activeTool: ActiveTool;
  selectedId: string | null;
  selectedType: 'wall' | 'object' | 'opening' | null;
  selectedOpeningId: string | null;

  // Scanner State
  isScanning: boolean;
  scanProgress: number;
  scanStage: string;
  selectedScanPreset: string | null;

  // Sound
  isMuted: boolean;

  // History for Undo/Redo
  history: {
    past: HistorySnapshot[];
    future: HistorySnapshot[];
  };

  // Actions
  setViewMode: (mode: ViewMode) => void;
  setActiveTool: (tool: ActiveTool) => void;
  setUnit: (unit: UnitType) => void;
  toggleGridSnap: () => void;
  toggleAudioMute: () => void;
  setRoomName: (name: string) => void;

  selectElement: (id: string | null, type?: 'wall' | 'object' | 'opening' | null, openingId?: string | null) => void;
  clearSelection: () => void;

  // Wall mutations
  addWall: (wall: Wall) => void;
  updateWall: (id: string, updates: Partial<Wall>) => void;
  removeWall: (id: string) => void;

  // Opening mutations
  addOpening: (wallId: string, opening: WallOpening) => void;
  updateOpening: (wallId: string, openingId: string, updates: Partial<WallOpening>) => void;
  removeOpening: (wallId: string, openingId: string) => void;

  // Object mutations
  addObject: (obj: RoomObject) => void;
  updateObject: (id: string, updates: Partial<RoomObject>) => void;
  removeObject: (id: string) => void;
  duplicateObject: (id: string) => void;

  // Presets & Scanner
  startScanning: (presetId: string) => void;
  setScanProgress: (progress: number, stage: string) => void;
  finishScanning: () => void;
  cancelScanning: () => void;
  loadPreset: (presetId: string) => void;
  clearRoom: () => void;

  // Surface Replication & Environment
  setFloorStyle: (style: FloorStyle, customUrl?: string) => void;
  setWallStyle: (style: WallStyle, customUrl?: string) => void;
  setLightingPreset: (preset: LightingPreset) => void;
  addImportedMesh: (mesh: ImportedMesh) => void;
  removeImportedMesh: (id: string) => void;

  // History
  undo: () => void;
  redo: () => void;
  saveHistorySnapshot: () => void;
}

const defaultPreset = ROOM_PRESETS[0]; // Small Bedroom as initial default

export const useRoomStore = create<RoomState>((set, get) => ({
  walls: defaultPreset.walls,
  objects: defaultPreset.objects,
  roomName: 'Master Bedroom',
  unit: 'm',
  ceilingHeight: 2.6,
  wallThickness: 0.15,
  gridSnap: true,

  floorStyle: 'hardwood_oak',
  wallStyle: 'white_plaster',
  customFloorTexture: null,
  customWallTexture: null,
  lightingPreset: 'daylight',
  importedMeshes: [],

  setFloorStyle: (style, customUrl) => {
    playUiClick();
    set({ floorStyle: style, customFloorTexture: customUrl || null });
  },

  setWallStyle: (style, customUrl) => {
    playUiClick();
    set({ wallStyle: style, customWallTexture: customUrl || null });
  },

  setLightingPreset: (preset) => {
    playUiClick();
    set({ lightingPreset: preset });
  },

  addImportedMesh: (mesh) => {
    get().saveHistorySnapshot();
    set((state) => ({
      importedMeshes: [...state.importedMeshes, mesh]
    }));
  },

  removeImportedMesh: (id) => {
    get().saveHistorySnapshot();
    set((state) => ({
      importedMeshes: state.importedMeshes.filter((m) => m.id !== id)
    }));
  },

  viewMode: '3d',
  activeTool: 'select',
  selectedId: null,
  selectedType: null,
  selectedOpeningId: null,

  isScanning: false,
  scanProgress: 0,
  scanStage: '',
  selectedScanPreset: null,

  isMuted: false,

  history: {
    past: [],
    future: []
  },

  setViewMode: (mode) => {
    playUiClick();
    set({ viewMode: mode });
  },

  setActiveTool: (tool) => {
    playUiClick();
    set({ activeTool: tool });
  },

  setUnit: (unit) => {
    playUiClick();
    set({ unit });
  },

  toggleGridSnap: () => {
    playUiClick();
    set((state) => ({ gridSnap: !state.gridSnap }));
  },

  toggleAudioMute: () => {
    const muted = toggleMute();
    set({ isMuted: muted });
  },

  setRoomName: (name) => set({ roomName: name }),

  selectElement: (id, type = null, openingId = null) => {
    if (id !== get().selectedId) {
      playUiClick();
    }
    set({
      selectedId: id,
      selectedType: type,
      selectedOpeningId: openingId
    });
  },

  clearSelection: () => {
    set({ selectedId: null, selectedType: null, selectedOpeningId: null });
  },

  saveHistorySnapshot: () => {
    const { walls, objects, history } = get();
    const newPast = [
      ...history.past.slice(-20), // limit to 20 history states
      {
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects))
      }
    ];
    set({
      history: {
        past: newPast,
        future: []
      }
    });
  },

  addWall: (wall) => {
    get().saveHistorySnapshot();
    set((state) => ({
      walls: [...state.walls, wall],
      selectedId: wall.id,
      selectedType: 'wall'
    }));
  },

  updateWall: (id, updates) => {
    set((state) => ({
      walls: state.walls.map((w) => (w.id === id ? { ...w, ...updates } : w))
    }));
  },

  removeWall: (id) => {
    get().saveHistorySnapshot();
    set((state) => ({
      walls: state.walls.filter((w) => w.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType
    }));
  },

  addOpening: (wallId, opening) => {
    get().saveHistorySnapshot();
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId
          ? {
              ...w,
              openings: [...w.openings, opening]
            }
          : w
      ),
      selectedId: wallId,
      selectedType: 'opening',
      selectedOpeningId: opening.id
    }));
  },

  updateOpening: (wallId, openingId, updates) => {
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId
          ? {
              ...w,
              openings: w.openings.map((op) => (op.id === openingId ? { ...op, ...updates } : op))
            }
          : w
      )
    }));
  },

  removeOpening: (wallId, openingId) => {
    get().saveHistorySnapshot();
    set((state) => ({
      walls: state.walls.map((w) =>
        w.id === wallId
          ? {
              ...w,
              openings: w.openings.filter((op) => op.id !== openingId)
            }
          : w
      ),
      selectedOpeningId: null,
      selectedType: 'wall'
    }));
  },

  addObject: (obj) => {
    get().saveHistorySnapshot();
    set((state) => ({
      objects: [...state.objects, obj],
      selectedId: obj.id,
      selectedType: 'object'
    }));
  },

  updateObject: (id, updates) => {
    set((state) => ({
      objects: state.objects.map((obj) => (obj.id === id ? { ...obj, ...updates } : obj))
    }));
  },

  removeObject: (id) => {
    get().saveHistorySnapshot();
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
      selectedType: state.selectedId === id ? null : state.selectedType
    }));
  },

  duplicateObject: (id) => {
    const obj = get().objects.find((o) => o.id === id);
    if (!obj) return;
    get().saveHistorySnapshot();

    const newObj: RoomObject = {
      ...JSON.parse(JSON.stringify(obj)),
      id: `obj-${Date.now()}`,
      name: `${obj.name} Copy`,
      position: {
        x: snapToGrid(obj.position.x + 0.3),
        y: obj.position.y,
        z: snapToGrid(obj.position.z + 0.3)
      }
    };

    set((state) => ({
      objects: [...state.objects, newObj],
      selectedId: newObj.id,
      selectedType: 'object'
    }));
  },

  startScanning: (presetId) => {
    set({
      isScanning: true,
      scanProgress: 0,
      scanStage: 'Initializing Apple LiDAR sensor...',
      selectedScanPreset: presetId
    });
  },

  setScanProgress: (progress, stage) => {
    set({ scanProgress: progress, scanStage: stage });
  },

  finishScanning: () => {
    const { selectedScanPreset } = get();
    if (selectedScanPreset) {
      get().loadPreset(selectedScanPreset);
    }
    set({
      isScanning: false,
      scanProgress: 100,
      scanStage: 'Scan complete',
      selectedScanPreset: null
    });
  },

  cancelScanning: () => {
    set({
      isScanning: false,
      scanProgress: 0,
      scanStage: '',
      selectedScanPreset: null
    });
  },

  loadPreset: (presetId) => {
    const preset = ROOM_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    get().saveHistorySnapshot();

    set({
      walls: JSON.parse(JSON.stringify(preset.walls)),
      objects: JSON.parse(JSON.stringify(preset.objects)),
      roomName: preset.name,
      selectedId: null,
      selectedType: null,
      selectedOpeningId: null
    });
  },

  clearRoom: () => {
    get().saveHistorySnapshot();
    set({
      walls: [],
      objects: [],
      selectedId: null,
      selectedType: null,
      selectedOpeningId: null
    });
  },

  undo: () => {
    const { history, walls, objects } = get();
    if (history.past.length === 0) return;

    const previous = history.past[history.past.length - 1];
    const newPast = history.past.slice(0, -1);
    const newFuture = [
      {
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects))
      },
      ...history.future
    ];

    set({
      walls: previous.walls,
      objects: previous.objects,
      history: {
        past: newPast,
        future: newFuture
      },
      selectedId: null,
      selectedType: null
    });
  },

  redo: () => {
    const { history, walls, objects } = get();
    if (history.future.length === 0) return;

    const next = history.future[0];
    const newFuture = history.future.slice(1);
    const newPast = [
      ...history.past,
      {
        walls: JSON.parse(JSON.stringify(walls)),
        objects: JSON.parse(JSON.stringify(objects))
      }
    ];

    set({
      walls: next.walls,
      objects: next.objects,
      history: {
        past: newPast,
        future: newFuture
      },
      selectedId: null,
      selectedType: null
    });
  }
}));
