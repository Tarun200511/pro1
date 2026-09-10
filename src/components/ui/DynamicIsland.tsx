import React, { useState, useMemo } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { calculateRoomArea, formatArea, formatDimension, distance2D } from '../../utils/math';
import { triggerHaptic, playUiClick, playMeshDetect } from '../../utils/sound';
import {
  Box,
  Compass,
  Columns2,
  Volume2,
  VolumeX,
  Grid,
  Sparkles,
  ChevronDown,
  Edit2,
  Check,
  X,
  Maximize2
} from 'lucide-react';

export const DynamicIsland: React.FC = () => {
  const walls = useRoomStore((state) => state.walls);
  const objects = useRoomStore((state) => state.objects);
  const viewMode = useRoomStore((state) => state.viewMode);
  const setViewMode = useRoomStore((state) => state.setViewMode);
  const unit = useRoomStore((state) => state.unit);
  const setUnit = useRoomStore((state) => state.setUnit);
  const gridSnap = useRoomStore((state) => state.gridSnap);
  const toggleGridSnap = useRoomStore((state) => state.toggleGridSnap);
  const isMuted = useRoomStore((state) => state.isMuted);
  const toggleAudioMute = useRoomStore((state) => state.toggleAudioMute);
  const roomName = useRoomStore((state) => state.roomName);
  const setRoomName = useRoomStore((state) => state.setRoomName);
  const ceilingHeight = useRoomStore((state) => state.ceilingHeight);

  // Expanded Telemetry Flyout State
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [tempName, setTempName] = useState<string>(roomName);

  // Live Telemetry Calculations
  const floorArea = useMemo(() => calculateRoomArea(walls), [walls]);
  const perimeter = useMemo(() => {
    return walls.reduce((sum, w) => sum + distance2D(w.start, w.end), 0);
  }, [walls]);

  const totalOpenings = useMemo(() => {
    return walls.reduce((sum, w) => sum + (w.openings ? w.openings.length : 0), 0);
  }, [walls]);

  const handleSaveName = () => {
    if (tempName.trim()) {
      setRoomName(tempName.trim());
      triggerHaptic('light');
      playMeshDetect();
    }
    setIsEditingName(false);
  };

  return (
    <div className="relative select-none">
      {/* Floating Dynamic Island Capsule */}
      <div className="flex items-center gap-1.5 p-1.5 vision-panel rounded-full shadow-2xl border border-white/15 backdrop-blur-3xl transition-all duration-300">
        {/* Segmented View Mode Slider (3D / 2D / Split) */}
        <div className="flex items-center p-0.5 bg-black/30 rounded-full border border-white/5">
          <button
            id="dynamic-island-btn-3d"
            onClick={() => {
              triggerHaptic('selection');
              playUiClick();
              setViewMode('3d');
            }}
            title="3D Spatial Perspective"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === '3d'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D</span>
          </button>

          <button
            id="dynamic-island-btn-2d"
            onClick={() => {
              triggerHaptic('selection');
              playUiClick();
              setViewMode('2d');
            }}
            title="2D Floor Plan Blueprint"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === '2d'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">2D</span>
          </button>

          <button
            id="dynamic-island-btn-split"
            onClick={() => {
              triggerHaptic('selection');
              playUiClick();
              setViewMode('split');
            }}
            title="Synchronized Split View"
            className={`hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-200 ${
              viewMode === 'split'
                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Columns2 className="w-3.5 h-3.5" />
            <span>Split</span>
          </button>
        </div>

        {/* Vertical Divider */}
        <div className="w-px h-5 bg-white/15 mx-0.5 hidden sm:block" />

        {/* Live Room Telemetry Trigger Pill */}
        <button
          id="dynamic-island-telemetry-trigger"
          onClick={() => {
            triggerHaptic('light');
            setIsExpanded((prev) => !prev);
          }}
          title="Click to view live room telemetry & details"
          className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 text-xs font-medium transition-all active:scale-95 group"
        >
          {/* Live Pulse Dot */}
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>

          {/* Area & Metric */}
          <div className="flex items-center gap-1.5 text-slate-200 font-display">
            <span className="font-bold text-white font-mono-digits tracking-tight">
              {formatArea(floorArea, unit)}
            </span>
            <span className="text-[10px] text-slate-400 hidden lg:inline">
              • {walls.length} {walls.length === 1 ? 'Wall' : 'Walls'}
            </span>
            <span className="text-[10px] text-slate-400 hidden lg:inline">
              • {objects.length} {objects.length === 1 ? 'Obj' : 'Objs'}
            </span>
          </div>

          <ChevronDown
            className={`w-3.5 h-3.5 text-slate-400 group-hover:text-white transition-transform duration-200 ${
              isExpanded ? 'rotate-180 text-cyan-400' : ''
            }`}
          />
        </button>

        {/* Vertical Divider */}
        <div className="w-px h-5 bg-white/15 mx-0.5" />

        {/* Quick Toggles: Grid Snap & Sound Effects */}
        <div className="flex items-center gap-1">
          {/* Grid Snap Toggle */}
          <button
            id="dynamic-island-btn-gridsnap"
            onClick={() => {
              triggerHaptic('light');
              toggleGridSnap();
            }}
            title={gridSnap ? 'Grid Snap Enabled (10cm)' : 'Grid Snap Disabled'}
            className={`p-2 rounded-full text-xs transition-all active:scale-90 ${
              gridSnap
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
          </button>

          {/* Audio Sound FX Toggle */}
          <button
            id="dynamic-island-btn-audio"
            onClick={() => {
              triggerHaptic('medium');
              toggleAudioMute();
            }}
            title={isMuted ? 'Unmute Sound Effects' : 'Mute Sound Effects'}
            className={`p-2 rounded-full text-xs transition-all active:scale-90 ${
              !isMuted
                ? 'text-cyan-400 hover:bg-cyan-500/15'
                : 'text-slate-500 hover:text-slate-400 hover:bg-white/5'
            }`}
          >
            {!isMuted ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Unit Switcher */}
          <button
            id="dynamic-island-btn-unit"
            onClick={() => {
              triggerHaptic('selection');
              setUnit(unit === 'm' ? 'ft' : 'm');
            }}
            title={`Switch to ${unit === 'm' ? 'Imperial Feet (ft)' : 'Metric Meters (m)'}`}
            className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white transition-all active:scale-95"
          >
            {unit}
          </button>
        </div>
      </div>

      {/* Expanded Live Telemetry & Room Details Flyout Sheet */}
      {isExpanded && (
        <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-80 sm:w-96 vision-panel rounded-3xl p-5 shadow-2xl border border-white/15 z-50 animate-fade-in text-white backdrop-blur-3xl">
          {/* Header with Title & Rename */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
            <div className="flex items-center gap-2 flex-1 mr-2">
              {isEditingName ? (
                <div className="flex items-center gap-1.5 flex-1">
                  <input
                    type="text"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') setIsEditingName(false);
                    }}
                    autoFocus
                    className="w-full px-2.5 py-1 bg-white/10 border border-cyan-400/50 rounded-xl text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-400"
                  />
                  <button
                    onClick={handleSaveName}
                    className="p-1 rounded-lg bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setIsEditingName(false)}
                    className="p-1 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditingName(true)}>
                  <h3 className="text-sm font-bold text-white font-display truncate max-w-[200px]">
                    {roomName}
                  </h3>
                  <Edit2 className="w-3 h-3 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                </div>
              )}
            </div>

            <button
              onClick={() => setIsExpanded(false)}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Telemetry Metric Cards Grid */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            {/* Floor Area */}
            <div className="vision-card p-3 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>Floor Area</span>
                <Sparkles className="w-3 h-3 text-cyan-400" />
              </div>
              <div className="text-base font-extrabold text-white font-display font-mono-digits">
                {formatArea(floorArea, unit)}
              </div>
            </div>

            {/* Wall Perimeter */}
            <div className="vision-card p-3 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>Perimeter</span>
                <Maximize2 className="w-3 h-3 text-blue-400" />
              </div>
              <div className="text-base font-extrabold text-white font-display font-mono-digits">
                {formatDimension(perimeter, unit)}
              </div>
            </div>

            {/* Wall & Ceiling Height */}
            <div className="vision-card p-3 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>Ceiling Height</span>
              </div>
              <div className="text-sm font-bold text-white font-display font-mono-digits">
                {formatDimension(ceilingHeight, unit)}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {walls.length} walls connected
              </div>
            </div>

            {/* Openings & Objects */}
            <div className="vision-card p-3 rounded-2xl">
              <div className="text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                <span>Components</span>
              </div>
              <div className="text-sm font-bold text-white font-display font-mono-digits">
                {objects.length} Objects
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {totalOpenings} Doors & Windows
              </div>
            </div>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-between pt-3 border-t border-white/10 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block"></span>
              <span>100% Offline Local Vault</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono-digits">VisionOS 2.0</span>
          </div>
        </div>
      )}
    </div>
  );
};
