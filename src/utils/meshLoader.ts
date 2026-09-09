import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';

export interface LoadedMeshResult {
  group: THREE.Group;
  dimensions: { width: number; height: number; depth: number };
}

/**
 * Loads a 3D file (.glb, .gltf, .obj) from File or URL, centers and grounds it
 */
export async function load3DModelFile(file: File): Promise<LoadedMeshResult> {
  const extension = file.name.split('.').pop()?.toLowerCase() || '';
  const url = URL.createObjectURL(file);

  return new Promise((resolve, reject) => {
    if (extension === 'glb' || extension === 'gltf') {
      const loader = new GLTFLoader();
      loader.load(
        url,
        (gltf) => {
          const group = processLoadedObject(gltf.scene, file.name);
          const bbox = new THREE.Box3().setFromObject(group);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          resolve({
            group,
            dimensions: { width: size.x, height: size.y, depth: size.z }
          });
        },
        undefined,
        (err) => reject(err)
      );
    } else if (extension === 'obj') {
      const loader = new OBJLoader();
      loader.load(
        url,
        (obj) => {
          const group = processLoadedObject(obj, file.name);
          const bbox = new THREE.Box3().setFromObject(group);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          resolve({
            group,
            dimensions: { width: size.x, height: size.y, depth: size.z }
          });
        },
        undefined,
        (err) => reject(err)
      );
    } else {
      reject(new Error(`Unsupported 3D file format: .${extension}. Please use .glb, .gltf, or .obj.`));
    }
  });
}

function processLoadedObject(object: THREE.Object3D, name: string): THREE.Group {
  const wrapper = new THREE.Group();
  wrapper.name = `imported-${name}`;

  // Enable shadows and physical materials
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = true;
      child.receiveShadow = true;
      if (child.material) {
        child.material.side = THREE.DoubleSide;
      }
    }
  });

  // Calculate bounding box to ground at y=0 and center at x=0, z=0
  const bbox = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  bbox.getCenter(center);
  const size = new THREE.Vector3();
  bbox.getSize(size);

  // Auto-scale if huge (common in raw photogrammetry mm vs meters)
  const maxDim = Math.max(size.x, size.y, size.z);
  if (maxDim > 100) {
    // Model is likely in millimeters or centimeters, normalize to meters
    const scaleFactor = 3.0 / maxDim;
    object.scale.set(scaleFactor, scaleFactor, scaleFactor);
    // Recalculate
    bbox.setFromObject(object);
    bbox.getCenter(center);
  }

  // Center horizontally and ground vertically
  object.position.x = -center.x;
  object.position.z = -center.z;
  object.position.y = -bbox.min.y;

  wrapper.add(object);
  return wrapper;
}
