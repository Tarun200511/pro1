import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { triggerHaptic } from '../../utils/sound';
import {
  Box,
  Compass,
  PenTool,
  MousePointer2,
  Armchair,
  Sliders,
  Undo2,
  Redo2,
  Grid,
  Trash2,
  Copy
} from 'lucide-react';

interface Props {
  onToggleFurnitureDrawer: () => void;
  isFurnitureDrawerOpen: boolean;
  onToggleInspector: () => void;
  isInspectorOpen: boolean;
}

export const MobileBottomBar: React.FC<Props> = ({
  onToggleFurnitureDrawer,
  isFurnitureDrawerOpen,
  onToggleInspector,
  isInspectorOpen
}) => {
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const activeTool = useRoomStore((state) => state.activeTool);
  const setActiveTool = useRoomStore((state) => state.setActiveTool);
  const gridSnap = useRoomStore((state) => state.gridSnap);
  const toggleGridSnap = useRoomStore((state) => state.toggleGridSnap);
  const selectedId = useRoomStore((state) => state.selectedId);
  const selectedType = useRoomStore((state) => state.selectedType);
  const removeObject = useRoomStore((state) => state.removeObject);
  const removeWall = useRoomStore((state) => state.removeWall);
  const duplicateObject = useRoomStore((state) => state.duplicateObject);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const history = useRoomStore((state) => state.history);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const handleDelete = () => {
    triggerHaptic('medium');
    if (selectedId) {
      if (selectedType === 'object') {
        removeObject(selectedId);
      } else if (selectedType === 'wall') {
        removeWall(selectedId);
      }
    }
  };

  const handleDuplicate = () => {
    triggerHaptic('light');
    if (selectedId && selectedType === 'object') {
      duplicateObject(selectedId);
    }
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex flex-col items-center pointer-events-none">
      {/* Floating Contextual Quick Actions Bar (Undo, Redo, Snap, and Selection Actions) */}
      <div className="pointer-events-auto mb-2.5 flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/90 backdrop-blur-2xl border border-white/15 rounded-full shadow-2xl shadow-black/60">
        <button
          onClick={() => {
            triggerHaptic('light');
            undo();
          }}
          disabled={!canUndo}
          aria-label="Undo"
          className="p-2 rounded-full text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:text-white hover:bg-white/10 active:scale-95 transition-all"
        >
          <Undo2 className="w-4 h-4" />
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            redo();
          }}
          disabled={!canRedo}
          aria-label="Redo"
          className="p-2 rounded-full text-slate-300 disabled:opacity-30 disabled:pointer-events-none hover:text-white hover:bg-white/10 active:scale-95 transition-all"
        >
          <Redo2 className="w-4 h-4" />
        </button>

        <div className="w-px h-4 bg-white/20 mx-0.5" />

        <button
          onClick={() => {
            triggerHaptic('light');
            toggleGridSnap();
          }}
          aria-label="Grid Snap"
          className={`p-2 rounded-full active:scale-95 transition-all ${
            gridSnap ? 'text-blue-400 bg-blue-500/20' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Grid className="w-4 h-4" />
        </button>

        {/* Selected Item Actions on Mobile */}
        {selectedId && (
          <>
            <div className="w-px h-4 bg-white/20 mx-0.5" />

            {selectedType === 'object' && (
              <button
                onClick={handleDuplicate}
                aria-label="Duplicate Selected Object"
                className="p-2 rounded-full text-cyan-400 hover:bg-cyan-500/15 active:scale-95 transition-all"
              >
                <Copy className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={handleDelete}
              aria-label="Delete Selected"
              className="p-2 rounded-full text-red-400 hover:bg-red-500/15 active:scale-95 transition-all"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Main Bottom Glass Dock */}
      <nav className="pointer-events-auto w-full bg-slate-950/90 backdrop-blur-2xl border-t border-white/10 px-3 pt-2 pb-[calc(var(--sab)+0.6rem)]">
        <div className="max-w-md mx-auto flex items-center justify-around">
          {/* 2D / 3D Mode Toggle */}
          <button
            id="mobile-btn-mode"
            onClick={() => {
              triggerHaptic('selection');
              setViewMode(viewMode === '3d' ? '2d' : '3d');
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-white"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                viewMode === '3d'
                  ? 'bg-blue-600/30 text-blue-400 border border-blue-500/30'
                  : 'bg-indigo-600/30 text-indigo-400 border border-indigo-500/30'
              }`}
            >
              {viewMode === '3d' ? <Box className="w-5 h-5" /> : <Compass className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-semibold tracking-tight">
              {viewMode === '3d' ? '3D View' : '2D Plan'}
            </span>
          </button>

          {/* Wall / Select Tool */}
          <button
            id="mobile-btn-wall"
            onClick={() => {
              triggerHaptic('selection');
              setActiveTool(activeTool === 'wall' ? 'select' : 'wall');
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-white"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                activeTool === 'wall'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              {activeTool === 'wall' ? <PenTool className="w-5 h-5" /> : <MousePointer2 className="w-5 h-5" />}
            </div>
            <span className="text-[10px] font-semibold tracking-tight">
              {activeTool === 'wall' ? 'Drawing' : 'Select'}
            </span>
          </button>

          {/* Furniture Catalog */}
          <button
            id="mobile-btn-furniture"
            onClick={() => {
              triggerHaptic('light');
              onToggleFurnitureDrawer();
            }}
            className="flex flex-col items-center gap-1 py-1 px-3 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-white"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isFurnitureDrawerOpen
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/40'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              <Armchair className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">Catalog</span>
          </button>

          {/* Inspector / Properties Sheet */}
          <button
            id="mobile-btn-inspector"
            onClick={() => {
              triggerHaptic('light');
              onToggleInspector();
            }}
            className="relative flex flex-col items-center gap-1 py-1 px-3 rounded-2xl active:scale-95 transition-all text-slate-400 hover:text-white"
          >
            <div
              className={`p-1.5 rounded-xl transition-all ${
                isInspectorOpen
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              <Sliders className="w-5 h-5" />
            </div>
            <span className="text-[10px] font-semibold tracking-tight">Specs</span>

            {/* Pulsing indicator when something is selected */}
            {selectedId && !isInspectorOpen && (
              <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full animate-ping" />
            )}
            {selectedId && !isInspectorOpen && (
              <span className="absolute top-1 right-3 w-2.5 h-2.5 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>
      </nav>
    </div>
  );
};
