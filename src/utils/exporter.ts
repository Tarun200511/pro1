import * as THREE from 'three';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import { OBJExporter } from 'three/examples/jsm/exporters/OBJExporter.js';
import { USDZExporter } from 'three/examples/jsm/exporters/USDZExporter.js';
import type { Wall, RoomObject, AppleRoomPlanSchema, UnitType } from '../types/room';
import { calculateRoomArea, distance2D } from './math';

/**
 * Builds Apple RoomPlan specification JSON
 */
export function generateAppleRoomPlanJSON(
  walls: Wall[],
  objects: RoomObject[],
  unit: UnitType = 'm'
): AppleRoomPlanSchema {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let maxHeight = 2.6;

  walls.forEach(w => {
    minX = Math.min(minX, w.start.x, w.end.x);
    maxX = Math.max(maxX, w.start.x, w.end.x);
    minZ = Math.min(minZ, w.start.z, w.end.z);
    maxZ = Math.max(maxZ, w.start.z, w.end.z);
    maxHeight = Math.max(maxHeight, w.height);
  });

  if (minX === Infinity) {
    minX = -2; maxX = 2; minZ = -2; maxZ = 2;
  }

  const width = Math.max(0.1, maxX - minX);
  const depth = Math.max(0.1, maxZ - minZ);
  const area = calculateRoomArea(walls);

  const formattedWalls = walls.map(w => {
    const len = distance2D(w.start, w.end);
    return {
      identifier: w.id,
      start: [w.start.x, 0, w.start.z] as [number, number, number],
      end: [w.end.x, 0, w.end.z] as [number, number, number],
      dimensions: [len, w.height, w.thickness] as [number, number, number],
      openings: w.openings.map(op => ({
        identifier: op.id,
        category: op.type,
        offset: op.offset,
        dimensions: [op.width, op.height, op.elevation] as [number, number, number]
      }))
    };
  });

  const formattedObjects = objects.map(obj => {
    // Generate 4x4 column-major transformation matrix
    const matrix = new THREE.Matrix4();
    const pos = new THREE.Vector3(obj.position.x, obj.position.y + obj.dimensions.height / 2, obj.position.z);
    const rot = new THREE.Euler(0, obj.rotation.yaw, 0);
    const quat = new THREE.Quaternion().setFromEuler(rot);
    const scale = new THREE.Vector3(1, 1, 1);
    matrix.compose(pos, quat, scale);

    return {
      identifier: obj.id,
      category: obj.category,
      name: obj.name,
      confidence: 'high' as const,
      dimensions: [obj.dimensions.width, obj.dimensions.height, obj.dimensions.depth] as [number, number, number],
      transform: Array.from(matrix.elements),
      position: [obj.position.x, obj.position.y, obj.position.z] as [number, number, number],
      rotationEulerDeg: [0, (obj.rotation.yaw * 180) / Math.PI, 0] as [number, number, number]
    };
  });

  return {
    version: '1.2.0',
    captureDate: new Date().toISOString(),
    unit: unit === 'ft' ? 'feet' : 'meters',
    roomDimensions: {
      width: Number(width.toFixed(2)),
      depth: Number(depth.toFixed(2)),
      height: Number(maxHeight.toFixed(2)),
      estimatedAreaSqMeters: Number(area.toFixed(2))
    },
    walls: formattedWalls,
    objects: formattedObjects
  };
}

/**
 * Trigger file download helper
 */
export function downloadFile(content: BlobPart, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Exports Apple RoomPlan JSON
 */
export function exportRoomPlanJSON(walls: Wall[], objects: RoomObject[], filename = 'roomplan_export.json') {
  const data = generateAppleRoomPlanJSON(walls, objects);
  const jsonStr = JSON.stringify(data, null, 2);
  downloadFile(jsonStr, filename, 'application/json');
}

/**
 * Exports Three.js scene to GLTF / GLB
 */
export function exportSceneGLTF(scene: THREE.Scene, isBinary = true, filename = 'room_model') {
  const exporter = new GLTFExporter();
  
  // Clone or filter elements (skip helpers and gizmos)
  const exportGroup = new THREE.Group();
  scene.traverse(child => {
    if (
      child instanceof THREE.Mesh &&
      !child.name.includes('Helper') &&
      !child.name.includes('Gizmo') &&
      !child.name.includes('Dimension') &&
      !child.name.includes('FloorGrid')
    ) {
      exportGroup.add(child.clone());
    }
  });

  exporter.parse(
    exportGroup,
    gltf => {
      if (gltf instanceof ArrayBuffer) {
        downloadFile(gltf, `${filename}.glb`, 'model/gltf-binary');
      } else {
        const output = JSON.stringify(gltf, null, 2);
        downloadFile(output, `${filename}.gltf`, 'model/gltf+json');
      }
    },
    error => {
      console.error('Error exporting GLTF:', error);
    },
    { binary: isBinary }
  );
}

/**
 * Exports Three.js scene to OBJ
 */
export function exportSceneOBJ(scene: THREE.Scene, filename = 'room_model.obj') {
  const exporter = new OBJExporter();
  const exportGroup = new THREE.Group();
  
  scene.traverse(child => {
    if (
      child instanceof THREE.Mesh &&
      !child.name.includes('Helper') &&
      !child.name.includes('Gizmo') &&
      !child.name.includes('Dimension') &&
      !child.name.includes('FloorGrid')
    ) {
      exportGroup.add(child.clone());
    }
  });

  const result = exporter.parse(exportGroup);
  downloadFile(result, filename, 'text/plain');
}

/**
 * Exports Three.js scene to Apple USDZ (for native iOS / QuickLook AR)
 */
export async function exportSceneUSDZ(scene: THREE.Scene, filename = 'room_model') {
  const exporter = new USDZExporter();
  const exportGroup = new THREE.Group();

  scene.traverse(child => {
    if (
      child instanceof THREE.Mesh &&
      !child.name.includes('Helper') &&
      !child.name.includes('Gizmo') &&
      !child.name.includes('Dimension') &&
      !child.name.includes('FloorGrid')
    ) {
      exportGroup.add(child.clone());
    }
  });

  try {
    const arrayBuffer = await exporter.parseAsync(exportGroup);
    downloadFile(arrayBuffer as BlobPart, `${filename}.usdz`, 'model/vnd.usdz+zip');
  } catch (err) {
    console.error('Error exporting USDZ:', err);
  }
}

