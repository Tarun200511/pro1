import React, { useRef, useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { metersToFeet, feetToMeters, formatDimension, formatArea, calculateRoomArea, distance2D } from '../../utils/math';
import type { FloorStyle, WallStyle, LightingPreset } from '../../types/room';
import {
  Sliders,
  Trash2,
  Copy,
  DoorOpen,
  AppWindow,
  Maximize2,
  X,
  Compass,
  Palette,
  Sparkles,
  Sun,
  Flame,
  Moon,
  Upload,
  Image,
  Layers
} from 'lucide-react';

export const InspectorPanel: React.FC = () => {
  const selectedId = useRoomStore((state) => state.selectedId);
  const selectedType = useRoomStore((state) => state.selectedType);
  const walls = useRoomStore((state) => state.walls);
  const objects = useRoomStore((state) => state.objects);
  const unit = useRoomStore((state) => state.unit);
  const roomName = useRoomStore((state) => state.roomName);
  const ceilingHeight = useRoomStore((state) => state.ceilingHeight);
  const floorStyle = useRoomStore((state) => state.floorStyle);
  const setFloorStyle = useRoomStore((state) => state.setFloorStyle);
  const wallStyle = useRoomStore((state) => state.wallStyle);
  const setWallStyle = useRoomStore((state) => state.setWallStyle);
  const lightingPreset = useRoomStore((state) => state.lightingPreset);
  const setLightingPreset = useRoomStore((state) => state.setLightingPreset);
  const importedMeshes = useRoomStore((state) => state.importedMeshes);
  const removeImportedMesh = useRoomStore((state) => state.removeImportedMesh);

  const clearSelection = useRoomStore((state) => state.clearSelection);
  const updateObject = useRoomStore((state) => state.updateObject);
  const removeObject = useRoomStore((state) => state.removeObject);
  const duplicateObject = useRoomStore((state) => state.duplicateObject);
  const updateWall = useRoomStore((state) => state.updateWall);
  const removeWall = useRoomStore((state) => state.removeWall);
  const addOpening = useRoomStore((state) => state.addOpening);
  const removeOpening = useRoomStore((state) => state.removeOpening);
  const setRoomName = useRoomStore((state) => state.setRoomName);
  const clearRoom = useRoomStore((state) => state.clearRoom);

  const [roomTab, setRoomTab] = useState<'overview' | 'surfaces'>('overview');
  const floorFileInputRef = useRef<HTMLInputElement>(null);
  const wallFileInputRef = useRef<HTMLInputElement>(null);

  // Selected Object
  const selectedObj = selectedType === 'object' ? objects.find((o) => o.id === selectedId) : null;
  // Selected Wall
  const selectedWall = selectedType === 'wall' || selectedType === 'opening' ? walls.find((w) => w.id === selectedId) : null;

  // Convert for display according to unit
  const toDisplay = (m: number) => (unit === 'ft' ? Number(metersToFeet(m).toFixed(2)) : Number(m.toFixed(2)));
  const fromDisplay = (val: number) => (unit === 'ft' ? feetToMeters(val) : val);

  return (
    <div
      id="inspector-panel"
      className="w-80 max-h-[calc(100vh-6rem)] overflow-y-auto bg-slate-900/85 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 shadow-2xl text-white select-none transition-all"
    >
      {/* 1. FURNITURE OBJECT INSPECTOR */}
      {selectedObj && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-blue-500/20 text-blue-400 rounded-xl">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <input
                  type="text"
                  value={selectedObj.name}
                  onChange={(e) => updateObject(selectedObj.id, { name: e.target.value })}
                  className="bg-transparent font-semibold text-sm focus:outline-none focus:border-b border-blue-400 text-white w-36"
                />
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  {selectedObj.category} • {selectedObj.type}
                </div>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dimensions (W × D × H) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Dimensions ({unit})</span>
              <Maximize2 className="w-3.5 h-3.5 text-slate-500" />
            </div>

            {/* Width */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Width (X)</span>
                <span className="font-mono text-white">{toDisplay(selectedObj.dimensions.width)} {unit}</span>
              </div>
              <input
                type="range"
                min={unit === 'ft' ? '1' : '0.3'}
                max={unit === 'ft' ? '12' : '4'}
                step={unit === 'ft' ? '0.2' : '0.05'}
                value={toDisplay(selectedObj.dimensions.width)}
                onChange={(e) =>
                  updateObject(selectedObj.id, {
                    dimensions: {
                      ...selectedObj.dimensions,
                      width: Math.max(0.2, fromDisplay(parseFloat(e.target.value)))
                    }
                  })
                }
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Depth */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Depth (Z)</span>
                <span className="font-mono text-white">{toDisplay(selectedObj.dimensions.depth)} {unit}</span>
              </div>
              <input
                type="range"
                min={unit === 'ft' ? '1' : '0.3'}
                max={unit === 'ft' ? '12' : '4'}
                step={unit === 'ft' ? '0.2' : '0.05'}
                value={toDisplay(selectedObj.dimensions.depth)}
                onChange={(e) =>
                  updateObject(selectedObj.id, {
                    dimensions: {
                      ...selectedObj.dimensions,
                      depth: Math.max(0.2, fromDisplay(parseFloat(e.target.value)))
                    }
                  })
                }
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>

            {/* Height */}
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Height (Y)</span>
                <span className="font-mono text-white">{toDisplay(selectedObj.dimensions.height)} {unit}</span>
              </div>
              <input
                type="range"
                min={unit === 'ft' ? '0.5' : '0.2'}
                max={unit === 'ft' ? '9' : '2.8'}
                step={unit === 'ft' ? '0.2' : '0.05'}
                value={toDisplay(selectedObj.dimensions.height)}
                onChange={(e) =>
                  updateObject(selectedObj.id, {
                    dimensions: {
                      ...selectedObj.dimensions,
                      height: Math.max(0.1, fromDisplay(parseFloat(e.target.value)))
                    }
                  })
                }
                className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
              />
            </div>
          </div>

          {/* Position (X & Z) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Position ({unit})</span>
              <Compass className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">X</span>
                <input
                  type="number"
                  step={unit === 'ft' ? '0.5' : '0.1'}
                  value={toDisplay(selectedObj.position.x)}
                  onChange={(e) =>
                    updateObject(selectedObj.id, {
                      position: { ...selectedObj.position, x: fromDisplay(parseFloat(e.target.value) || 0) }
                    })
                  }
                  className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                />
              </div>
              <div className="p-2 bg-white/5 rounded-xl border border-white/5">
                <span className="text-[10px] text-slate-400 block">Z</span>
                <input
                  type="number"
                  step={unit === 'ft' ? '0.5' : '0.1'}
                  value={toDisplay(selectedObj.position.z)}
                  onChange={(e) =>
                    updateObject(selectedObj.id, {
                      position: { ...selectedObj.position, z: fromDisplay(parseFloat(e.target.value) || 0) }
                    })
                  }
                  className="w-full bg-transparent font-mono text-sm font-semibold text-white focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Rotation (Yaw) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Yaw Rotation</span>
              <span className="font-mono text-blue-400">
                {Math.round((selectedObj.rotation.yaw * 180) / Math.PI)}°
              </span>
            </div>
            <input
              type="range"
              min="-180"
              max="180"
              step="5"
              value={Math.round((selectedObj.rotation.yaw * 180) / Math.PI)}
              onChange={(e) =>
                updateObject(selectedObj.id, {
                  rotation: { yaw: (parseFloat(e.target.value) * Math.PI) / 180 }
                })
              }
              className="w-full accent-blue-500 cursor-pointer h-1.5 bg-slate-700 rounded-lg"
            />
            {/* Quick 90 deg turn buttons */}
            <div className="flex items-center gap-1.5">
              {[0, 90, 180, 270].map((deg) => (
                <button
                  key={deg}
                  onClick={() =>
                    updateObject(selectedObj.id, {
                      rotation: { yaw: (deg * Math.PI) / 180 }
                    })
                  }
                  className="flex-1 py-1 text-[11px] bg-white/5 hover:bg-white/15 rounded-lg transition-colors font-mono"
                >
                  {deg}°
                </button>
              ))}
            </div>
          </div>

          {/* Material & Style Palette */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Material Finish</span>
              <Palette className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div className="grid grid-cols-2 gap-1.5 text-xs">
              {[
                { id: 'modern_white', label: 'Matte White' },
                { id: 'natural_oak', label: 'Natural Oak' },
                { id: 'slate_dark', label: 'Slate Dark' },
                { id: 'brushed_aluminum', label: 'Aluminum' }
              ].map((style) => (
                <button
                  key={style.id}
                  onClick={() =>
                    updateObject(selectedObj.id, {
                      materialStyle: style.id as any
                    })
                  }
                  className={`py-1.5 px-2 rounded-xl text-center text-xs transition-all ${
                    (selectedObj.materialStyle || 'modern_white') === style.id
                      ? 'bg-blue-600 text-white font-semibold shadow-md shadow-blue-500/30'
                      : 'bg-white/5 hover:bg-white/10 text-slate-300'
                  }`}
                >
                  {style.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real Camera Photo Snapshot Thumbnail */}
          {selectedObj.photoSnapshotUrl && (
            <div className="space-y-1.5 pt-2 border-t border-white/10">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Real Camera Photo</span>
                <span className="text-[10px] text-emerald-400 font-mono">Captured AR</span>
              </div>
              <img
                src={selectedObj.photoSnapshotUrl}
                alt={selectedObj.name}
                className="w-full h-28 object-cover rounded-2xl border border-white/10 shadow-inner"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 pt-3 border-t border-white/10">
            <button
              onClick={() => duplicateObject(selectedObj.id)}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold rounded-xl transition-colors active:scale-95"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Duplicate</span>
            </button>
            <button
              onClick={() => removeObject(selectedObj.id)}
              className="p-2 bg-red-500/15 hover:bg-red-500/30 text-red-400 rounded-xl transition-colors active:scale-95"
              title="Delete Object"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* 2. WALL INSPECTOR */}
      {selectedWall && (
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <input
                  type="text"
                  value={selectedWall.name}
                  onChange={(e) => updateWall(selectedWall.id, { name: e.target.value })}
                  className="bg-transparent font-semibold text-sm focus:outline-none focus:border-b border-blue-400 text-white w-36"
                />
                <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                  Parametric Wall
                </div>
              </div>
            </div>
            <button
              onClick={clearSelection}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Wall Specs */}
          <div className="space-y-2">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between items-center text-slate-300">
                <span>Wall Length:</span>
                <span className="font-mono font-bold text-blue-400">
                  {formatDimension(distance2D(selectedWall.start, selectedWall.end), unit)}
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Height:</span>
                <span className="font-mono font-semibold text-white">{selectedWall.height} m</span>
              </div>
              <div className="flex justify-between items-center text-slate-300">
                <span>Thickness:</span>
                <span className="font-mono font-semibold text-white">{selectedWall.thickness} m</span>
              </div>
            </div>
          </div>

          {/* Openings (Doors & Windows) */}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
              <span>Openings ({selectedWall.openings.length})</span>
            </div>

            {selectedWall.openings.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-1">No doors or windows on this wall.</div>
            ) : (
              <div className="space-y-1.5">
                {selectedWall.openings.map((op) => (
                  <div
                    key={op.id}
                    className="flex items-center justify-between p-2 bg-white/5 rounded-xl border border-white/5 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      {op.type === 'door' ? (
                        <DoorOpen className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <AppWindow className="w-4 h-4 text-sky-400" />
                      )}
                      <div>
                        <div className="font-medium capitalize text-slate-200">{op.type}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {op.width}m × {op.height}m @ offset {op.offset}m
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => removeOpening(selectedWall.id, op.id)}
                      className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                      title="Remove Opening"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Add Opening Buttons */}
            <div className="grid grid-cols-2 gap-2 pt-2">
              <button
                onClick={() => {
                  const wallLen = distance2D(selectedWall.start, selectedWall.end);
                  addOpening(selectedWall.id, {
                    id: `door-${Date.now()}`,
                    type: 'door',
                    offset: Number((wallLen / 2).toFixed(2)),
                    width: 0.9,
                    height: 2.1,
                    elevation: 0,
                    swingDirection: 'in'
                  });
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl text-xs font-medium transition-colors"
              >
                <DoorOpen className="w-3.5 h-3.5" />
                <span>+ Door</span>
              </button>

              <button
                onClick={() => {
                  const wallLen = distance2D(selectedWall.start, selectedWall.end);
                  addOpening(selectedWall.id, {
                    id: `win-${Date.now()}`,
                    type: 'window',
                    offset: Number((wallLen / 2).toFixed(2)),
                    width: 1.4,
                    height: 1.2,
                    elevation: 0.9
                  });
                }}
                className="flex items-center justify-center gap-1.5 py-2 bg-sky-500/15 hover:bg-sky-500/25 text-sky-300 rounded-xl text-xs font-medium transition-colors"
              >
                <AppWindow className="w-3.5 h-3.5" />
                <span>+ Window</span>
              </button>
            </div>
          </div>

          {/* Delete Wall */}
          <div className="pt-3 border-t border-white/10">
            <button
              onClick={() => removeWall(selectedWall.id)}
              className="w-full flex items-center justify-center gap-1.5 py-2 bg-red-500/15 hover:bg-red-500/30 text-red-400 text-xs font-semibold rounded-xl transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Wall</span>
            </button>
          </div>
        </div>
      )}

      {/* 3. ROOM SUMMARY (DEFAULT WHEN NOTHING SELECTED) */}
      {!selectedObj && !selectedWall && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/10">
            <div>
              <input
                type="text"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                className="bg-transparent font-bold text-base focus:outline-none focus:border-b border-blue-400 text-white w-48"
              />
              <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mt-0.5">
                Spatial Blueprint Summary
              </div>
            </div>
          </div>

          {/* Hidden File Inputs for Photo Texture Upload */}
          <input
            ref={floorFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setFloorStyle('custom_photo', url);
              }
            }}
          />
          <input
            ref={wallFileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                const url = URL.createObjectURL(file);
                setWallStyle('custom_photo', url);
              }
            }}
          />

          {/* Room Sub-Tabs */}
          <div className="flex items-center p-1 bg-white/5 rounded-2xl border border-white/10 text-xs font-semibold">
            <button
              onClick={() => setRoomTab('overview')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                roomTab === 'overview' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setRoomTab('surfaces')}
              className={`flex-1 py-1.5 rounded-xl transition-all ${
                roomTab === 'surfaces' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Surfaces & 3D Scan
            </button>
          </div>

          {roomTab === 'overview' ? (
            <>
              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Floor Area</span>
                  <span className="font-bold text-lg text-blue-400 mt-0.5 block">
                    {formatArea(calculateRoomArea(walls), unit)}
                  </span>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Ceiling Height</span>
                  <span className="font-bold text-lg text-white mt-0.5 block">
                    {formatDimension(ceilingHeight, unit)}
                  </span>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Wall Segments</span>
                  <span className="font-bold text-lg text-white mt-0.5 block">{walls.length}</span>
                </div>
                <div className="p-3 bg-white/5 rounded-2xl border border-white/5">
                  <span className="text-slate-400 block text-[11px]">Furniture Items</span>
                  <span className="font-bold text-lg text-emerald-400 mt-0.5 block">{objects.length}</span>
                </div>
              </div>

              {/* Quick Info */}
              <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-xs text-blue-200">
                💡 Drag any <code>.glb</code> or <code>.obj</code> scan file onto the 3D viewport to place photogrammetry models!
              </div>

              {/* Clear Room Action */}
              <div className="pt-2 border-t border-white/10">
                <button
                  onClick={clearRoom}
                  className="w-full flex items-center justify-center gap-1.5 py-2 bg-white/5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 text-xs font-semibold rounded-xl transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear Entire Room</span>
                </button>
              </div>
            </>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Floor Surface Replication */}
              <div className="space-y-2">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>Floor Material Replication</span>
                  <Layers className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'hardwood_oak', label: 'Oak Hardwood' },
                    { id: 'grey_tile', label: 'Grey Tile' },
                    { id: 'marble', label: 'White Marble' },
                    { id: 'carpet', label: 'Cozy Carpet' },
                    { id: 'concrete', label: 'Concrete' }
                  ].map((f) => (
                    <button
                      key={f.id}
                      onClick={() => setFloorStyle(f.id as FloorStyle)}
                      className={`p-2 rounded-xl text-left font-medium transition-all ${
                        floorStyle === f.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                  <button
                    onClick={() => floorFileInputRef.current?.click()}
                    className={`p-2 rounded-xl text-left font-medium flex items-center gap-1.5 border border-dashed transition-all ${
                      floorStyle === 'custom_photo'
                        ? 'bg-blue-600/30 border-blue-400 text-white'
                        : 'bg-white/5 border-white/20 text-blue-400 hover:bg-white/10'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Floor</span>
                  </button>
                </div>
              </div>

              {/* Wall Surface Replication */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>Wall Finish Replication</span>
                  <Palette className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'white_plaster', label: 'White Plaster' },
                    { id: 'warm_beige', label: 'Warm Beige' },
                    { id: 'slate_grey', label: 'Slate Grey' },
                    { id: 'brick', label: 'Brick Masonry' }
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => setWallStyle(w.id as WallStyle)}
                      className={`p-2 rounded-xl text-left font-medium transition-all ${
                        wallStyle === w.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {w.label}
                    </button>
                  ))}
                  <button
                    onClick={() => wallFileInputRef.current?.click()}
                    className={`p-2 rounded-xl text-left font-medium flex items-center gap-1.5 border border-dashed transition-all ${
                      wallStyle === 'custom_photo'
                        ? 'bg-blue-600/30 border-blue-400 text-white'
                        : 'bg-white/5 border-white/20 text-blue-400 hover:bg-white/10'
                    }`}
                  >
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Wall</span>
                  </button>
                </div>
              </div>

              {/* Lighting & Sun Angle */}
              <div className="space-y-2 pt-3 border-t border-white/10">
                <div className="flex items-center justify-between font-semibold text-slate-300">
                  <span>Sunlight & Atmosphere</span>
                  <Sun className="w-3.5 h-3.5 text-slate-500" />
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'daylight', label: 'Daylight Sun', icon: <Sun className="w-3.5 h-3.5" /> },
                    { id: 'golden_hour', label: 'Golden Hour', icon: <Flame className="w-3.5 h-3.5" /> },
                    { id: 'warm_interior', label: 'Warm Interior', icon: <Sparkles className="w-3.5 h-3.5" /> },
                    { id: 'night_studio', label: 'Night Studio', icon: <Moon className="w-3.5 h-3.5" /> }
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLightingPreset(l.id as LightingPreset)}
                      className={`p-2 rounded-xl text-left font-medium flex items-center gap-2 transition-all ${
                        lightingPreset === l.id
                          ? 'bg-blue-600 text-white shadow-md'
                          : 'bg-white/5 hover:bg-white/10 text-slate-300'
                      }`}
                    >
                      {l.icon}
                      <span>{l.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Imported 3D Photogrammetry Models List */}
              {importedMeshes.length > 0 && (
                <div className="space-y-2 pt-3 border-t border-white/10">
                  <div className="flex items-center justify-between font-semibold text-slate-300">
                    <span>Imported 3D Scans ({importedMeshes.length})</span>
                  </div>
                  <div className="space-y-1.5">
                    {importedMeshes.map((mesh) => (
                      <div
                        key={mesh.id}
                        className="flex items-center justify-between p-2.5 bg-white/5 rounded-xl border border-white/5"
                      >
                        <div className="truncate max-w-[180px]">
                          <div className="font-medium text-slate-200 truncate">{mesh.name}</div>
                          <div className="text-[10px] text-blue-400 font-mono uppercase">{mesh.fileType} Model</div>
                        </div>
                        <button
                          onClick={() => removeImportedMesh(mesh.id)}
                          className="p-1 text-slate-500 hover:text-red-400 transition-colors"
                          title="Remove Scan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
