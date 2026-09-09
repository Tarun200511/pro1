import React from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  MousePointer2,
  PenTool,
  Armchair,
  Grid,
  Undo2,
  Redo2,
  Volume2,
  VolumeX
} from 'lucide-react';

interface Props {
  onToggleFurnitureDrawer: () => void;
  isFurnitureDrawerOpen: boolean;
}

export const Toolbar: React.FC<Props> = ({ onToggleFurnitureDrawer, isFurnitureDrawerOpen }) => {
  const activeTool = useRoomStore((state) => state.activeTool);
  const setActiveTool = useRoomStore((state) => state.setActiveTool);
  const gridSnap = useRoomStore((state) => state.gridSnap);
  const toggleGridSnap = useRoomStore((state) => state.toggleGridSnap);
  const isMuted = useRoomStore((state) => state.isMuted);
  const toggleAudioMute = useRoomStore((state) => state.toggleAudioMute);
  const undo = useRoomStore((state) => state.undo);
  const redo = useRoomStore((state) => state.redo);
  const history = useRoomStore((state) => state.history);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <div className="flex flex-col items-center gap-1.5 p-2 bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl select-none">
      {/* Select Tool */}
      <button
        id="tool-select"
        onClick={() => setActiveTool('select')}
        title="Select & Move (V)"
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'select'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <MousePointer2 className="w-5 h-5" />
      </button>

      {/* Wall Drawing Tool */}
      <button
        id="tool-wall"
        onClick={() => setActiveTool('wall')}
        title="Draw Parametric Walls (W)"
        className={`p-2.5 rounded-xl transition-all ${
          activeTool === 'wall'
            ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <PenTool className="w-5 h-5" />
      </button>

      {/* Furniture Drawer Toggle */}
      <button
        id="tool-furniture"
        onClick={onToggleFurnitureDrawer}
        title="Furniture Catalog"
        className={`p-2.5 rounded-xl transition-all ${
          isFurnitureDrawerOpen
            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <Armchair className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-white/15 my-1" />

      {/* Snap to Grid Toggle */}
      <button
        onClick={toggleGridSnap}
        title={`Grid Snapping (0.1m) ${gridSnap ? 'ON' : 'OFF'}`}
        className={`p-2.5 rounded-xl transition-all ${
          gridSnap
            ? 'text-blue-400 bg-blue-500/15'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
        }`}
      >
        <Grid className="w-5 h-5" />
      </button>

      {/* Undo */}
      <button
        onClick={undo}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className={`p-2.5 rounded-xl transition-all ${
          canUndo
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <Undo2 className="w-5 h-5" />
      </button>

      {/* Redo */}
      <button
        onClick={redo}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className={`p-2.5 rounded-xl transition-all ${
          canRedo
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 cursor-not-allowed'
        }`}
      >
        <Redo2 className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-white/15 my-1" />

      {/* Audio Mute Toggle */}
      <button
        onClick={toggleAudioMute}
        title={isMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
        className="p-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5" />}
      </button>
    </div>
  );
};
