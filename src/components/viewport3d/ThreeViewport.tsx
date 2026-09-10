import React, { useEffect, useRef, useCallback, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { useRoomStore } from '../../store/useRoomStore';
import { buildWallMesh, createTextSprite } from './WallMeshBuilder';
import { createProceduralFurniture } from './ProceduralFurniture';
import { formatDimension, snapToGrid } from '../../utils/math';
import { getFloorMaterial } from '../../utils/textures';
import { load3DModelFile } from '../../utils/meshLoader';
import { triggerHaptic } from '../../utils/sound';
import { Box, Compass, Eye, RotateCw, UploadCloud, Sun, Moon, Sparkles, Flame, Layers } from 'lucide-react';

export const ThreeViewport: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orbitControlsRef = useRef<OrbitControls | null>(null);
  const transformControlsRef = useRef<TransformControls | null>(null);

  // Light and Surface Refs
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const keyLightRef = useRef<THREE.DirectionalLight | null>(null);
  const fillLightRef = useRef<THREE.DirectionalLight | null>(null);
  const rimLightRef = useRef<THREE.DirectionalLight | null>(null);
  const ambientLightRef = useRef<THREE.AmbientLight | null>(null);

  // Scene elements groups
  const wallsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const objectsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const dimensionsGroupRef = useRef<THREE.Group>(new THREE.Group());
  const importedGroupRef = useRef<THREE.Group>(new THREE.Group());

  // Subscribe to Zustand store
  const walls = useRoomStore((state) => state.walls);
  const objects = useRoomStore((state) => state.objects);
  const selectedId = useRoomStore((state) => state.selectedId);
  const selectedType = useRoomStore((state) => state.selectedType);
  const unit = useRoomStore((state) => state.unit);
  const renderStyle = useRoomStore((state) => state.renderStyle);
  const setRenderStyle = useRoomStore((state) => state.setRenderStyle);
  const floorStyle = useRoomStore((state) => state.floorStyle);
  const customFloorTexture = useRoomStore((state) => state.customFloorTexture);
  const wallStyle = useRoomStore((state) => state.wallStyle);
  const customWallTexture = useRoomStore((state) => state.customWallTexture);
  const lightingPreset = useRoomStore((state) => state.lightingPreset);
  const setLightingPreset = useRoomStore((state) => state.setLightingPreset);
  const addImportedMesh = useRoomStore((state) => state.addImportedMesh);
  const selectElement = useRoomStore((state) => state.selectElement);
  const clearSelection = useRoomStore((state) => state.clearSelection);

  // Transform mode state ('translate' | 'rotate')
  const [transformMode, setTransformMode] = useState<'translate' | 'rotate'>('translate');
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isLoadingModel, setIsLoadingModel] = useState(false);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f1117); // Sleek Apple obsidian dark
    scene.fog = new THREE.FogExp2(0x0f1117, 0.035);
    sceneRef.current = scene;
    (window as any).__THREE_SCENE__ = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(6, 6, 7);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.outline = 'none';
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.maxPolarAngle = Math.PI / 2 - 0.02; // prevent going below floor
    orbit.minDistance = 1.5;
    orbit.maxDistance = 25;
    orbit.target.set(0, 0.5, 0);
    orbitControlsRef.current = orbit;

    // 5. Transform Controls (Gizmo)
    const transform = new TransformControls(camera, renderer.domElement);
    transform.size = 0.75;
    transform.space = 'world';
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
    });

    transform.addEventListener('objectChange', () => {
      if (transform.object && transform.object.userData.id) {
        const id = transform.object.userData.id;
        const pos = transform.object.position;
        const rotY = transform.object.rotation.y;

        const snapVal = useRoomStore.getState().gridSnap ? 0.1 : 0.01;
        useRoomStore.getState().updateObject(id, {
          position: {
            x: Number(snapToGrid(pos.x, snapVal).toFixed(2)),
            y: Number(pos.y.toFixed(2)),
            z: Number(snapToGrid(pos.z, snapVal).toFixed(2))
          },
          rotation: {
            yaw: Number(rotY.toFixed(3))
          }
        });
      }
    });

    scene.add(transform.getHelper());
    transformControlsRef.current = transform;

    // 6. Lighting (Architectural Studio Lighting)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);
    ambientLightRef.current = ambientLight;

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
    keyLight.position.set(8, 14, 8);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.width = 2048;
    keyLight.shadow.mapSize.height = 2048;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 30;
    keyLight.shadow.camera.left = -10;
    keyLight.shadow.camera.right = 10;
    keyLight.shadow.camera.top = 10;
    keyLight.shadow.camera.bottom = -10;
    keyLight.shadow.bias = -0.0003;
    keyLight.shadow.radius = 3;
    scene.add(keyLight);
    keyLightRef.current = keyLight;

    const fillLight = new THREE.DirectionalLight(0x90cdf4, 0.4);
    fillLight.position.set(-6, 8, -6);
    scene.add(fillLight);
    fillLightRef.current = fillLight;

    const rimLight = new THREE.DirectionalLight(0xfef08a, 0.25);
    rimLight.position.set(0, 5, -8);
    scene.add(rimLight);
    rimLightRef.current = rimLight;

    // 7. Architectural Floor & Grid
    const floorGeom = new THREE.PlaneGeometry(30, 30);
    const floorMat = getFloorMaterial(floorStyle, customFloorTexture || undefined);
    const floorMesh = new THREE.Mesh(floorGeom, floorMat);
    floorMesh.rotation.x = -Math.PI / 2;
    floorMesh.position.y = -0.002;
    floorMesh.receiveShadow = true;
    floorMesh.name = 'FloorMesh';
    scene.add(floorMesh);
    floorMeshRef.current = floorMesh;

    // Dynamic Floor Grid (0.5m & 1m divisions)
    const gridHelper = new THREE.GridHelper(30, 30, 0x3b82f6, 0x1e293b);
    gridHelper.position.y = 0;
    gridHelper.name = 'FloorGrid';
    scene.add(gridHelper);

    // Add Groups to Scene
    scene.add(wallsGroupRef.current);
    scene.add(objectsGroupRef.current);
    scene.add(dimensionsGroupRef.current);
    scene.add(importedGroupRef.current);

    // 8. Animation Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    // 9. Window Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      transform.dispose();
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Transform Mode (Translate / Rotate)
  useEffect(() => {
    if (transformControlsRef.current) {
      transformControlsRef.current.setMode(transformMode);
      if (transformMode === 'rotate') {
        transformControlsRef.current.showX = false;
        transformControlsRef.current.showY = true;
        transformControlsRef.current.showZ = false;
      } else {
        transformControlsRef.current.showX = true;
        transformControlsRef.current.showY = false;
        transformControlsRef.current.showZ = true;
      }
    }
  }, [transformMode]);

  // Drag & Drop 3D Photogrammetry Models (.glb, .gltf, .obj)
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    const files = e.dataTransfer.files;
    if (files.length === 0) return;

    const file = files[0];
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'glb' && ext !== 'gltf' && ext !== 'obj') {
      alert('Please drop a valid 3D scan file (.glb, .gltf, or .obj).');
      return;
    }

    try {
      setIsLoadingModel(true);
      const result = await load3DModelFile(file);
      importedGroupRef.current.add(result.group);

      addImportedMesh({
        id: `mesh-${Date.now()}`,
        name: file.name,
        url: URL.createObjectURL(file),
        fileType: ext as any,
        position: { x: 0, y: 0, z: 0 },
        scale: { x: 1, y: 1, z: 1 },
        rotation: { yaw: 0 }
      });
      setIsLoadingModel(false);
    } catch (err: any) {
      setIsLoadingModel(false);
      alert(`Error loading 3D model: ${err.message}`);
    }
  };

  // Update Floor Material when floorStyle or customFloorTexture changes
  useEffect(() => {
    if (floorMeshRef.current) {
      floorMeshRef.current.material = getFloorMaterial(floorStyle, customFloorTexture || undefined);
    }
  }, [floorStyle, customFloorTexture]);

  // Update Studio Lighting when lightingPreset changes
  useEffect(() => {
    if (!keyLightRef.current || !ambientLightRef.current || !fillLightRef.current || !rimLightRef.current) return;
    const key = keyLightRef.current;
    const amb = ambientLightRef.current;
    const fill = fillLightRef.current;
    const rim = rimLightRef.current;

    switch (lightingPreset) {
      case 'daylight':
        key.color.setHex(0xffffff);
        key.intensity = 1.2;
        key.position.set(8, 14, 8);
        amb.color.setHex(0xffffff);
        amb.intensity = 0.65;
        fill.color.setHex(0x90cdf4);
        fill.intensity = 0.4;
        rim.color.setHex(0xfef08a);
        rim.intensity = 0.25;
        break;
      case 'golden_hour':
        key.color.setHex(0xffa94d);
        key.intensity = 1.6;
        key.position.set(14, 6, 4);
        amb.color.setHex(0xfb923c);
        amb.intensity = 0.5;
        fill.color.setHex(0xf97316);
        fill.intensity = 0.45;
        rim.color.setHex(0xfde047);
        rim.intensity = 0.5;
        break;
      case 'warm_interior':
        key.color.setHex(0xffedd5);
        key.intensity = 1.0;
        key.position.set(0, 10, 0);
        amb.color.setHex(0xfef3c7);
        amb.intensity = 0.8;
        fill.color.setHex(0xfde047);
        fill.intensity = 0.35;
        rim.color.setHex(0xffedd5);
        rim.intensity = 0.3;
        break;
      case 'night_studio':
        key.color.setHex(0x38bdf8);
        key.intensity = 0.7;
        key.position.set(-8, 10, -8);
        amb.color.setHex(0x0f172a);
        amb.intensity = 0.35;
        fill.color.setHex(0x1e293b);
        fill.intensity = 0.3;
        rim.color.setHex(0x60a5fa);
        rim.intensity = 0.8;
        break;
    }
  }, [lightingPreset]);

  // Re-render Walls when walls state, wallStyle, or selectedId changes
  useEffect(() => {
    const group = wallsGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    walls.forEach((wall) => {
      const isSelected = selectedId === wall.id && selectedType === 'wall';
      const wallMesh = buildWallMesh(wall, isSelected, unit, wallStyle, customWallTexture || undefined, renderStyle);
      group.add(wallMesh);
    });
  }, [walls, selectedId, selectedType, unit, wallStyle, customWallTexture, renderStyle]);

  // Re-render Furniture Objects when objects or selection changes
  useEffect(() => {
    const group = objectsGroupRef.current;
    while (group.children.length > 0) {
      const child = group.children[0];
      group.remove(child);
    }

    let selectedMeshObject: THREE.Object3D | null = null;

    objects.forEach((obj) => {
      const isSelected = selectedId === obj.id && selectedType === 'object';
      const objGroup = createProceduralFurniture(obj, isSelected, renderStyle);
      group.add(objGroup);

      if (isSelected) {
        selectedMeshObject = objGroup;
      }
    });

    // Attach or detach TransformControls
    if (transformControlsRef.current) {
      if (selectedMeshObject) {
        transformControlsRef.current.attach(selectedMeshObject);
      } else {
        transformControlsRef.current.detach();
      }
    }
  }, [objects, selectedId, selectedType, renderStyle]);

  // Update 3D Dimension Overlays for Selected Object
  useEffect(() => {
    const dimGroup = dimensionsGroupRef.current;
    while (dimGroup.children.length > 0) {
      dimGroup.remove(dimGroup.children[0]);
    }

    if (selectedType === 'object' && selectedId) {
      const obj = objects.find((o) => o.id === selectedId);
      if (obj) {
        const { width: W, depth: D, height: H } = obj.dimensions;
        const posX = obj.position.x;
        const posZ = obj.position.z;
        const yaw = obj.rotation.yaw;

        const objDimContainer = new THREE.Group();
        objDimContainer.position.set(posX, 0, posZ);
        objDimContainer.rotation.y = yaw;

        // Front Width line
        const wSprite = createTextSprite(`W: ${formatDimension(W, unit)}`, 'rgba(0, 122, 255, 0.9)');
        wSprite.position.set(0, 0.05, D / 2 + 0.25);
        objDimContainer.add(wSprite);

        // Side Depth line
        const dSprite = createTextSprite(`D: ${formatDimension(D, unit)}`, 'rgba(0, 122, 255, 0.9)');
        dSprite.position.set(W / 2 + 0.25, 0.05, 0);
        objDimContainer.add(dSprite);

        // Height badge
        const hSprite = createTextSprite(`H: ${formatDimension(H, unit)}`, 'rgba(52, 199, 89, 0.9)');
        hSprite.position.set(0, H + 0.2, 0);
        objDimContainer.add(hSprite);

        dimGroup.add(objDimContainer);
      }
    }
  }, [selectedId, selectedType, objects, unit]);

  // Raycasting Click Interaction (Selection)
  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      // If clicking gizmo, do nothing
      if (transformControlsRef.current?.dragging) return;
      if (!rendererRef.current || !cameraRef.current || !sceneRef.current) return;

      const rect = rendererRef.current.domElement.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, cameraRef.current);

      // Check furniture objects first
      const objIntersects = raycaster.intersectObjects(objectsGroupRef.current.children, true);
      if (objIntersects.length > 0) {
        let curr: THREE.Object3D | null = objIntersects[0].object;
        while (curr && curr.parent && curr.parent !== objectsGroupRef.current) {
          curr = curr.parent;
        }
        if (curr && curr.userData && curr.userData.id) {
          selectElement(curr.userData.id, 'object');
          return;
        }
      }

      // Check walls
      const wallIntersects = raycaster.intersectObjects(wallsGroupRef.current.children, true);
      if (wallIntersects.length > 0) {
        let curr: THREE.Object3D | null = wallIntersects[0].object;
        while (curr && curr.parent && curr.parent !== wallsGroupRef.current) {
          curr = curr.parent;
        }
        if (curr && curr.userData && curr.userData.id) {
          selectElement(curr.userData.id, 'wall');
          return;
        }
      }

      // If clicked on empty floor or background, clear selection
      if (e.target === rendererRef.current.domElement) {
        clearSelection();
      }
    },
    [selectElement, clearSelection]
  );

  // Camera preset animations
  const setCameraPreset = (preset: 'perspective' | 'isometric' | 'top') => {
    if (!cameraRef.current || !orbitControlsRef.current) return;
    const camera = cameraRef.current;
    const orbit = orbitControlsRef.current;

    switch (preset) {
      case 'perspective':
        camera.position.set(6, 6, 7);
        orbit.target.set(0, 0.5, 0);
        break;
      case 'isometric':
        camera.position.set(8, 8, 8);
        orbit.target.set(0, 0, 0);
        break;
      case 'top':
        camera.position.set(0, 11, 0.01);
        orbit.target.set(0, 0, 0);
        break;
    }
    orbit.update();
  };

  return (
    <div
      className="relative w-full h-full overflow-hidden select-none"
      onPointerDown={handlePointerDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing touch-none" />

      {/* Floating 3D Controls Pill */}
      <div className="absolute top-3 right-3 md:left-24 md:right-auto z-10 flex items-center gap-1.5 p-1.5 vision-panel rounded-full shadow-2xl border border-white/15 backdrop-blur-3xl max-w-[calc(100vw-1.5rem)] overflow-x-auto no-scrollbar">
        <button
          onClick={() => {
            triggerHaptic('light');
            setCameraPreset('perspective');
          }}
          title="Perspective View"
          className="px-3 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium active:scale-95"
        >
          <Eye className="w-3.5 h-3.5 text-cyan-400" />
          <span>3D Orbit</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setCameraPreset('isometric');
          }}
          title="Isometric View"
          className="px-3 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium active:scale-95"
        >
          <Box className="w-3.5 h-3.5 text-blue-400" />
          <span>Isometric</span>
        </button>

        <button
          onClick={() => {
            triggerHaptic('light');
            setCameraPreset('top');
          }}
          title="Top-Down Plan"
          className="px-3 py-1.5 rounded-full text-slate-300 hover:text-white hover:bg-white/10 transition-colors flex items-center gap-1.5 text-xs font-medium active:scale-95"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Top</span>
        </button>

        {/* Apple Dollhouse vs Textured Mode Switcher */}
        <div className="flex items-center p-0.5 vision-pill rounded-full">
          <button
            onClick={() => {
              triggerHaptic('selection');
              setRenderStyle('dollhouse');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
              renderStyle === 'dollhouse'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md vision-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3 h-3 text-cyan-200" />
            <span>Dollhouse</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic('selection');
              setRenderStyle('textured');
            }}
            className={`px-2.5 py-1 rounded-full text-[11px] font-semibold flex items-center gap-1 transition-all ${
              renderStyle === 'textured'
                ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-md vision-glow-cyan'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="w-3 h-3" />
            <span>Materials</span>
          </button>
        </div>

        {selectedType === 'object' && (
          <div className="flex items-center gap-1 pl-2 border-l border-white/15">
            <button
              onClick={() => setTransformMode('translate')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                transformMode === 'translate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Move
            </button>
            <button
              onClick={() => setTransformMode('rotate')}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                transformMode === 'rotate'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              <RotateCw className="w-3 h-3" />
              <span>Rotate</span>
            </button>
          </div>
        )}

        {/* Lighting Atmosphere Presets */}
        <div className="flex items-center gap-1 pl-2 border-l border-white/15">
          <button
            onClick={() => setLightingPreset('daylight')}
            title="Daylight Lighting"
            className={`p-1.5 rounded-lg transition-all ${
              lightingPreset === 'daylight'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sun className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLightingPreset('golden_hour')}
            title="Golden Sunset Lighting"
            className={`p-1.5 rounded-lg transition-all ${
              lightingPreset === 'golden_hour'
                ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLightingPreset('warm_interior')}
            title="Warm Interior Lighting"
            className={`p-1.5 rounded-lg transition-all ${
              lightingPreset === 'warm_interior'
                ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setLightingPreset('night_studio')}
            title="Night Studio Lighting"
            className={`p-1.5 rounded-lg transition-all ${
              lightingPreset === 'night_studio'
                ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Moon className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* 3D Photogrammetry Scan Drag-and-Drop Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-8 bg-blue-950/70 backdrop-blur-xl border-4 border-dashed border-blue-400/80 rounded-3xl m-4 pointer-events-none">
          <div className="text-center space-y-3">
            <UploadCloud className="w-16 h-16 text-blue-400 mx-auto animate-bounce" />
            <h3 className="text-xl font-bold text-white tracking-tight">Drop 3D Scan to Replicate Room</h3>
            <p className="text-xs text-blue-200 font-mono">Supports .GLB, .GLTF, and .OBJ Photogrammetry Models</p>
          </div>
        </div>
      )}

      {/* Loading Model Indicator */}
      {isLoadingModel && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-30 px-5 py-2.5 bg-slate-900/90 backdrop-blur-xl border border-blue-500/40 rounded-full shadow-2xl flex items-center gap-3">
          <Sparkles className="w-4 h-4 text-blue-400 animate-spin" />
          <span className="text-xs font-semibold text-slate-200">Reconstructing Photogrammetry 3D Scan...</span>
        </div>
      )}

      {/* Subtle Spatial Watermark */}
      <div className="hidden sm:block absolute bottom-24 md:bottom-4 left-4 pointer-events-none text-[11px] font-medium tracking-wider uppercase text-slate-500/60 bg-slate-950/40 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/5">
        LiDAR Parametric Mesh Engine • 60 FPS
      </div>
    </div>
  );
};
