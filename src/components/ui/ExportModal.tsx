import React, { useState } from 'react';
import { useRoomStore } from '../../store/useRoomStore';
import { exportRoomPlanJSON, exportSceneGLTF, exportSceneOBJ, generateAppleRoomPlanJSON } from '../../utils/exporter';
import { Download, FileCode, Box, Copy, Check, Upload, X, Layers } from 'lucide-react';

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

  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');

  if (!isOpen) return null;

  const roomPlanJson = generateAppleRoomPlanJSON(walls, objects, unit);
  const jsonPreview = JSON.stringify(roomPlanJson, null, 2);

  const handleCopyJson = () => {
    navigator.clipboard.writeText(jsonPreview);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
                type: (obj.name?.toLowerCase().includes('bed') ? 'bed' : obj.category === 'seating' ? 'sofa' : 'desk') as any,
                name: obj.name || 'Imported Object',
                position: { x: obj.position[0], y: obj.position[1], z: obj.position[2] },
                dimensions: { width: obj.dimensions[0], height: obj.dimensions[1], depth: obj.dimensions[2] },
                rotation: { yaw: obj.rotationEulerDeg ? (obj.rotationEulerDeg[1] * Math.PI) / 180 : 0 },
                materialStyle: 'modern_white'
              });
            });
          }

          onClose();
        }
      } catch (err) {
        alert('Failed to parse RoomPlan JSON. Please verify the file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-4 bg-black/70 backdrop-blur-md">
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-5 md:p-6 shadow-2xl text-white">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-blue-500/20 text-blue-400 rounded-2xl border border-blue-500/30">
              <Download className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">Export & Data Persistence</h3>
              <p className="text-xs text-slate-400">Export as Apple RoomPlan JSON, GLTF 3D or OBJ</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 mt-4 p-1 bg-white/5 rounded-2xl border border-white/5">
          <button
            onClick={() => setActiveTab('export')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'export' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Export Room
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 py-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'import' ? 'bg-blue-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            Import JSON
          </button>
        </div>

        {activeTab === 'export' ? (
          <div className="mt-5 space-y-4">
            {/* Export Format Cards */}
            <div className="grid grid-cols-3 gap-3">
              {/* Apple RoomPlan JSON */}
              <div
                onClick={() => exportRoomPlanJSON(walls, objects, `${roomName.replace(/\s+/g, '_')}_roomplan.json`)}
                className="group p-4 bg-white/5 hover:bg-blue-600/15 border border-white/10 hover:border-blue-500/40 rounded-2xl cursor-pointer transition-all"
              >
                <div className="p-2 w-fit bg-blue-500/20 text-blue-400 rounded-xl group-hover:bg-blue-500 group-hover:text-white transition-colors">
                  <FileCode className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-blue-300">RoomPlan JSON</h4>
                <p className="text-[11px] text-slate-400 mt-1">Apple CapturedRoom standard schema</p>
              </div>

              {/* GLTF / GLB */}
              <div
                onClick={() => {
                  const scene = (window as any).__THREE_SCENE__;
                  if (scene) {
                    exportSceneGLTF(scene, true, roomName.replace(/\s+/g, '_'));
                  } else {
                    exportRoomPlanJSON(walls, objects);
                  }
                }}
                className="group p-4 bg-white/5 hover:bg-indigo-600/15 border border-white/10 hover:border-indigo-500/40 rounded-2xl cursor-pointer transition-all"
              >
                <div className="p-2 w-fit bg-indigo-500/20 text-indigo-400 rounded-xl group-hover:bg-indigo-500 group-hover:text-white transition-colors">
                  <Box className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-indigo-300">GLTF / GLB 3D</h4>
                <p className="text-[11px] text-slate-400 mt-1">Standard WebGL & AR 3D model</p>
              </div>

              {/* Universal OBJ */}
              <div
                onClick={() => {
                  const scene = (window as any).__THREE_SCENE__;
                  if (scene) {
                    exportSceneOBJ(scene, `${roomName.replace(/\s+/g, '_')}.obj`);
                  } else {
                    exportRoomPlanJSON(walls, objects);
                  }
                }}
                className="group p-4 bg-white/5 hover:bg-purple-600/15 border border-white/10 hover:border-purple-500/40 rounded-2xl cursor-pointer transition-all"
              >
                <div className="p-2 w-fit bg-purple-500/20 text-purple-400 rounded-xl group-hover:bg-purple-500 group-hover:text-white transition-colors">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-semibold mt-3 text-slate-200 group-hover:text-purple-300">Wavefront OBJ</h4>
                <p className="text-[11px] text-slate-400 mt-1">Universal CAD & 3D software</p>
              </div>
            </div>

            {/* JSON Live Preview Box */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>RoomPlan Schema Preview:</span>
                <button
                  onClick={handleCopyJson}
                  className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors font-medium"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy JSON'}</span>
                </button>
              </div>
              <pre className="h-44 overflow-y-auto p-3 bg-black/40 border border-white/10 rounded-2xl font-mono text-[11px] text-slate-300 leading-relaxed no-scrollbar">
                {jsonPreview}
              </pre>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-center py-8">
            <div className="max-w-xs mx-auto border-2 border-dashed border-white/20 hover:border-blue-400 rounded-3xl p-6 transition-colors cursor-pointer relative">
              <input
                type="file"
                accept=".json"
                onChange={handleFileUpload}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
              <Upload className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-200">Upload RoomPlan JSON</div>
              <div className="text-xs text-slate-400 mt-1">Select a exported .json room file</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
