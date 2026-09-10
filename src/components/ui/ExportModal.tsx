import React, { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import {
  exportRoomPlanJSON,
  exportSceneGLTF,
  exportSceneOBJ,
  exportSceneUSDZ,
  generateAppleRoomPlanJSON
} from '../../utils/exporter';
import { formatArea } from '../../utils/math';
import { triggerHaptic } from '../../utils/sound';
import {
  Download,
  FileCode,
  Box,
  Copy,
  Check,
  Upload,
  X,
  Layers,
  Smartphone,
  HardDrive,
  Trash2,
  FolderOpen
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export const ExportModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const walls = useRoomStore((state) => state.walls);
  const objects = useRoomStore((state) => state.objects);
  const unit = useRoomStore((state) => state.unit);
  const roomName = useRoomStore((state) => state.roomName);
  const addWall = useRoomStore((state) => state.addWall);
  const addObject = useRoomStore((state) => state.addObject);
  const clearRoom = useRoomStore((state) => state.clearRoom);

  // Offline Room Vault
  const savedRooms = useRoomStore((state) => state.savedRooms);
  const saveCurrentRoom = useRoomStore((state) => state.saveCurrentRoom);
  const loadSavedRoom = useRoomStore((state) => state.loadSavedRoom);
  const deleteSavedRoom = useRoomStore((state) => state.deleteSavedRoom);

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'vault' | 'import'>('export');
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);

  if (!isOpen) return null;

  const roomPlanJson = generateAppleRoomPlanJSON(walls, objects, unit);
  const jsonPreview = JSON.stringify(roomPlanJson, null, 2);

  const handleCopyJson = () => {
    triggerHaptic('light');
    navigator.clipboard.writeText(jsonPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveToVault = () => {
    triggerHaptic('medium');
    saveCurrentRoom();
    setSaveSuccessNotice(true);
    setTimeout(() => setSaveSuccessNotice(false), 2500);
  };

  const handleLoadRoomFromVault = (id: string) => {
    triggerHaptic('medium');
    loadSavedRoom(id);
    onClose();
  };

  const handleDeleteFromVault = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    triggerHaptic('light');
    deleteSavedRoom(id);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed.walls && Array.isArray(parsed.walls)) {
          clearRoom();
          // Restore walls
          parsed.walls.forEach((w: any) => {
            addWall({
              id: w.identifier || `wall-${Date.now()}-${Math.random()}`,
              name: `Wall`,
              start: { x: w.start[0], z: w.start[2] },
              end: { x: w.end[0], z: w.end[2] },
              height: w.dimensions ? w.dimensions[1] : 2.6,
              thickness: w.dimensions ? w.dimensions[2] : 0.15,
              openings: (w.openings || []).map((op: any) => ({
                id: op.identifier || `op-${Date.now()}`,
                type: op.category === 'door' ? 'door' : 'window',
                offset: op.offset || 1.0,
                width: op.dimensions ? op.dimensions[0] : 0.9,
                height: op.dimensions ? op.dimensions[1] : 2.1,
                elevation: op.dimensions ? op.dimensions[2] : 0
              }))
            });
          });

          // Restore objects
          if (parsed.objects && Array.isArray(parsed.objects)) {
            parsed.objects.forEach((obj: any) => {
              addObject({
                id: obj.identifier || `obj-${Date.now()}-${Math.random()}`,
                category: obj.category || 'seating',
                type: (obj.name?.toLowerCase().includes('bed') ? 'bed' : obj.category === 'seating' ? 'sofa' : 'table') as any,
                name: obj.name || 'Imported Object',
                position: { x: obj.position[0], y: obj.position[1], z: obj.position[2] },
                dimensions: { width: obj.dimensions[0], height: obj.dimensions[1], depth: obj.dimensions[2] },
                rotation: { yaw: obj.rotationEulerDeg ? (obj.rotationEulerDeg[1] * Math.PI) / 180 : 0 },
                confidence: obj.confidence || 'high',
                materialStyle: 'modern_white'
              });
            });
          }

          onClose();
        }
      } catch {
        alert('Failed to parse RoomPlan JSON. Please verify the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto vision-panel border border-white/15 rounded-3xl p-5 md:p-7 shadow-2xl text-white backdrop-blur-3xl">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 text-cyan-400 rounded-2xl border border-cyan-500/30 vision-glow-cyan">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold tracking-tight font-display">Cross-Platform Export & Vault</h3>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 rounded-full font-mono-digits">
                  Multi-OS
                </span>
              </div>
              <p className="text-xs text-slate-400">Apple USDZ, RoomPlan JSON, GLTF/GLB 3D, and Offline Vault</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 mt-4 p-1 vision-pill rounded-2xl">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('export');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'export'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md vision-glow-cyan font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Export Formats
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('vault');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'vault'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md vision-glow-cyan font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Room Vault ({savedRooms.length})
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setActiveTab('import');
            }}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'import'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md vision-glow-cyan font-bold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Import JSON
          </button>
        </div>

        {/* TAB 1: EXPORT FORMATS */}
        {activeTab === 'export' && (
          <div className="mt-5 space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {/* Apple RoomPlan JSON */}
              <div
                onClick={() => {
                  triggerHaptic('medium');
                  exportRoomPlanJSON(walls, objects, `${roomName.replace(/\s+/g, '_')}_roomplan.json`);
                }}
                className="group p-4 bg-white/5 hover:bg-cyan-600/15 border border-white/10 hover:border-cyan-500/40 rounded-2xl cursor-pointer transition-all active:scale-95"
              >
                <div className="p-2 w-fit bg-cyan-500/20 text-cyan-400 rounded-xl group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                  <FileCode className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-cyan-300">RoomPlan JSON</h4>
                <p className="text-[11px] text-slate-400 mt-1">Apple CapturedRoom official schema</p>
              </div>

              {/* Apple USDZ QuickLook */}
              <div
                onClick={() => {
                  triggerHaptic('medium');
                  const scene = (window as any).__THREE_SCENE__;
                  if (scene) {
                    exportSceneUSDZ(scene, roomName.replace(/\s+/g, '_'));
                  } else {
                    exportRoomPlanJSON(walls, objects);
                  }
                }}
                className="group p-4 bg-white/5 hover:bg-blue-600/15 border border-white/10 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all active:scale-95"
              >
                <div className="p-2 w-fit bg-blue-500/20 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <Smartphone className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-blue-300">Apple USDZ</h4>
                <p className="text-[11px] text-slate-400 mt-1">iOS Quick Look & VisionOS AR</p>
              </div>

              {/* GLTF / GLB */}
              <div
                onClick={() => {
                  triggerHaptic('medium');
                  const scene = (window as any).__THREE_SCENE__;
                  if (scene) {
                    exportSceneGLTF(scene, true, roomName.replace(/\s+/g, '_'));
                  } else {
                    exportRoomPlanJSON(walls, objects);
                  }
                }}
                className="group p-4 bg-white/5 hover:bg-indigo-600/15 border border-white/10 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition-all active:scale-95"
              >
                <div className="p-2 w-fit bg-indigo-500/20 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Box className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-indigo-300">GLTF / GLB</h4>
                <p className="text-[11px] text-slate-400 mt-1">Android, WebGL & 3D software</p>
              </div>

              {/* Wavefront OBJ */}
              <div
                onClick={() => {
                  triggerHaptic('medium');
                  const scene = (window as any).__THREE_SCENE__;
                  if (scene) {
                    exportSceneOBJ(scene, `${roomName.replace(/\s+/g, '_')}.obj`);
                  } else {
                    exportRoomPlanJSON(walls, objects);
                  }
                }}
                className="group p-4 bg-white/5 hover:bg-purple-600/15 border border-white/10 hover:border-purple-500/40 rounded-2xl cursor-pointer transition-all active:scale-95"
              >
                <div className="p-2 w-fit bg-purple-500/20 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-purple-300">CAD OBJ</h4>
                <p className="text-[11px] text-slate-400 mt-1">Universal CAD & 3D software</p>
              </div>
            </div>

            {/* JSON Live Preview */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Apple CapturedRoom Schema Preview:</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="h-40 overflow-y-auto p-3 bg-black/40 border border-white/10 rounded-2xl font-mono text-[11px] text-slate-300 leading-relaxed no-scrollbar">
                {jsonPreview}
              </pre>
            </div>
          </div>
        )}

        {/* TAB 2: OFFLINE VAULT */}
        {activeTab === 'vault' && (
          <div className="mt-5 space-y-4">
            {/* Quick Save Current Room Button */}
            <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200">Save Current Room to Offline Vault</div>
                <div className="text-[11px] text-slate-400">100% offline & local in your browser/device storage</div>
              </div>
              <button
                onClick={handleSaveToVault}
                className="px-4 py-2.5 bg-cyan-600 hover:bg-cyan-500 active:scale-95 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/25 flex items-center gap-1.5 transition-all"
              >
                <HardDrive className="w-4 h-4" />
                <span>{saveSuccessNotice ? 'Saved to Vault!' : 'Save Room'}</span>
              </button>
            </div>

            {/* Saved Rooms List */}
            <div className="space-y-2 max-h-60 overflow-y-auto pr-1 no-scrollbar">
              {savedRooms.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No rooms saved yet. Click "Save Room" above to store your layouts locally.
                </div>
              ) : (
                savedRooms.map((r) => (
                  <div
                    key={r.id}
                    onClick={() => handleLoadRoomFromVault(r.id)}
                    className="group flex items-center justify-between p-3.5 bg-white/5 hover:bg-cyan-600/15 border border-white/10 hover:border-cyan-500/30 rounded-2xl cursor-pointer transition-all active:scale-[0.99]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-slate-800 text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white rounded-xl transition-colors">
                        <FolderOpen className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-200 group-hover:text-white">
                          {r.name}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {new Date(r.savedAt).toLocaleDateString()} • {formatArea(r.metadata.area, unit)} •{' '}
                          {r.metadata.wallCount} walls • {r.metadata.objectCount} objects
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleLoadRoomFromVault(r.id)}
                        className="px-3 py-1 bg-cyan-500/20 hover:bg-cyan-500 text-cyan-300 hover:text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        Restore
                      </button>
                      <button
                        onClick={(e) => handleDeleteFromVault(e, r.id)}
                        className="p-1.5 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Delete from Vault"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* TAB 3: IMPORT JSON */}
        {activeTab === 'import' && (
          <div className="mt-5 space-y-4 text-center py-8">
            <div className="max-w-xs mx-auto border-2 border-dashed border-white/20 hover:border-cyan-400 rounded-3xl p-6 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-200">Upload RoomPlan JSON</div>
              <div className="text-xs text-slate-400 mt-1">Select an exported .json room file to restore</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
