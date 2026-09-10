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
  VolumeX,
  Camera
} from 'lucide-react';
import { triggerHaptic } from '../../utils/sound';

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
  const openCameraScanner = useRoomStore((state) => state.openCameraScanner);

  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  return (
    <div className="hidden md:flex flex-col items-center gap-2 p-2.5 vision-panel rounded-3xl shadow-2xl border border-white/15 select-none backdrop-blur-3xl">
      {/* Select & Transform Tool */}
      <button
        id="tool-select"
        onClick={() => {
          triggerHaptic('selection');
          setActiveTool('select');
        }}
        title="Select & Move (V)"
        className={`relative p-2.5 rounded-2xl transition-all duration-200 active:scale-90 group ${
          activeTool === 'select'
            ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 vision-glow-cyan'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <MousePointer2 className="w-5 h-5" />
        <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 bg-black/70 text-slate-300 rounded font-mono-digits border border-white/10">
          V
        </span>
      </button>

      {/* Wall Drawing Tool */}
      <button
        id="tool-wall"
        onClick={() => {
          triggerHaptic('selection');
          setActiveTool('wall');
        }}
        title="Draw Parametric Walls (W)"
        className={`relative p-2.5 rounded-2xl transition-all duration-200 active:scale-90 group ${
          activeTool === 'wall'
            ? 'bg-gradient-to-tr from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/30 vision-glow-cyan'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <PenTool className="w-5 h-5" />
        <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1 bg-black/70 text-slate-300 rounded font-mono-digits border border-white/10">
          W
        </span>
      </button>

      {/* Furniture Catalog Drawer Toggle */}
      <button
        id="tool-furniture"
        onClick={() => {
          triggerHaptic('medium');
          onToggleFurnitureDrawer();
        }}
        title="Apple 16-Category Catalog"
        className={`p-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
          isFurnitureDrawerOpen
            ? 'bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/30 vision-glow-indigo'
            : 'text-slate-400 hover:text-white hover:bg-white/10'
        }`}
      >
        <Armchair className="w-5 h-5" />
      </button>

      {/* Direct On-Spot Camera Scanner */}
      <button
        id="tool-camera-scanner"
        onClick={() => {
          triggerHaptic('heavy');
          openCameraScanner();
        }}
        title="On-Spot Camera Capture"
        className="p-2.5 rounded-2xl text-cyan-400 hover:text-white hover:bg-cyan-500/20 active:scale-90 transition-all duration-200 shadow-md shadow-cyan-500/10"
      >
        <Camera className="w-5 h-5 animate-pulse" />
      </button>

      <div className="w-6 h-px bg-white/15 my-0.5" />

      {/* Grid Snapping Toggle */}
      <button
        onClick={() => {
          triggerHaptic('light');
          toggleGridSnap();
        }}
        title={`Grid Snapping (0.1m) ${gridSnap ? 'ON' : 'OFF'}`}
        className={`p-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
          gridSnap
            ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/30'
            : 'text-slate-500 hover:text-slate-300 hover:bg-white/5 border border-transparent'
        }`}
      >
        <Grid className="w-5 h-5" />
      </button>

      {/* Undo */}
      <button
        onClick={() => {
          triggerHaptic('light');
          undo();
        }}
        disabled={!canUndo}
        title="Undo (Ctrl+Z)"
        className={`p-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
          canUndo
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Undo2 className="w-5 h-5" />
      </button>

      {/* Redo */}
      <button
        onClick={() => {
          triggerHaptic('light');
          redo();
        }}
        disabled={!canRedo}
        title="Redo (Ctrl+Y)"
        className={`p-2.5 rounded-2xl transition-all duration-200 active:scale-90 ${
          canRedo
            ? 'text-slate-300 hover:text-white hover:bg-white/10'
            : 'text-slate-600 cursor-not-allowed opacity-40'
        }`}
      >
        <Redo2 className="w-5 h-5" />
      </button>

      <div className="w-6 h-px bg-white/15 my-0.5" />

      {/* Audio Sound FX Toggle */}
      <button
        onClick={() => {
          triggerHaptic('medium');
          toggleAudioMute();
        }}
        title={isMuted ? 'Unmute Audio Feedback' : 'Mute Audio Feedback'}
        className="p-2.5 rounded-2xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors active:scale-90"
      >
        {isMuted ? <VolumeX className="w-5 h-5 text-red-400" /> : <Volume2 className="w-5 h-5 text-cyan-400" />}
      </button>
    </div>
  );
};
