import * as THREE from 'three';
import { FloorStyle, WallStyle } from '../types/room';

const textureCache = new Map<string, THREE.CanvasTexture>();

/**
 * Creates a procedural Wood Plank / Oak Parquet Texture
 */
export function createHardwoodTexture(): THREE.CanvasTexture {
  const cacheKey = 'floor-wood';
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#b08968';
  ctx.fillRect(0, 0, 512, 512);

  // Planks
  const plankH = 64;
  for (let y = 0; y < 512; y += plankH) {
    const shift = (y / plankH) % 2 === 0 ? 0 : 128;
    for (let x = -128; x < 512; x += 256) {
      const px = x + shift;
      // Slight tone variation per plank
      const tone = Math.sin(px * 12 + y) * 12;
      ctx.fillStyle = `rgb(${176 + tone}, ${137 + tone * 0.8}, ${104 + tone * 0.6})`;
      ctx.fillRect(px, y, 254, plankH - 2);

      // Wood grain lines
      ctx.strokeStyle = 'rgba(78, 52, 46, 0.15)';
      ctx.lineWidth = 1;
      for (let g = 0; g < 4; g++) {
        const gy = y + 8 + g * 14;
        ctx.beginPath();
        ctx.moveTo(px, gy);
        ctx.bezierCurveTo(px + 80, gy + 3, px + 160, gy - 2, px + 254, gy + 2);
        ctx.stroke();
      }
    }

    // Seam line
    ctx.strokeStyle = '#5c4033';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(512, y);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a Modern Grey Ceramic Tile Texture
 */
export function createTileTexture(): THREE.CanvasTexture {
  const cacheKey = 'floor-tile';
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Tile background
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 512);

  // Grid
  const tileSize = 128;
  for (let y = 0; y < 512; y += tileSize) {
    for (let x = 0; x < 512; x += tileSize) {
      const shade = Math.floor(Math.random() * 10);
      ctx.fillStyle = `rgb(${51 + shade}, ${65 + shade}, ${85 + shade})`;
      ctx.fillRect(x + 2, y + 2, tileSize - 4, tileSize - 4);
    }
  }

  // Grout lines
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 4;
  for (let i = 0; i <= 512; i += tileSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, 512);
    ctx.moveTo(0, i);
    ctx.lineTo(512, i);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a Marble Texture with soft veining
 */
export function createMarbleTexture(): THREE.CanvasTexture {
  const cacheKey = 'floor-marble';
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(0, 0, 512, 512);

  // Soft marble veins
  ctx.strokeStyle = 'rgba(148, 163, 184, 0.4)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.bezierCurveTo(140, 180, 260, 220, 380, 512);
  ctx.stroke();

  ctx.strokeStyle = 'rgba(100, 116, 139, 0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(350, 0);
  ctx.bezierCurveTo(280, 160, 210, 320, 120, 512);
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates a Textured Carpet
 */
export function createCarpetTexture(): THREE.CanvasTexture {
  const cacheKey = 'floor-carpet';
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#334155';
  ctx.fillRect(0, 0, 256, 256);

  // Noise specks for fabric weave
  const imgData = ctx.getImageData(0, 0, 256, 256);
  const data = imgData.data;
  for (let i = 0; i < data.length; i += 4) {
    const noise = (Math.random() - 0.5) * 25;
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
  }
  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(6, 6);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Creates Brick Wall Texture
 */
export function createBrickTexture(): THREE.CanvasTexture {
  const cacheKey = 'wall-brick';
  if (textureCache.has(cacheKey)) return textureCache.get(cacheKey)!;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#94a3b8'; // Mortar
  ctx.fillRect(0, 0, 512, 512);

  const brickH = 32;
  const brickW = 80;
  for (let y = 0; y < 512; y += brickH) {
    const shift = (y / brickH) % 2 === 0 ? 0 : brickW / 2;
    for (let x = -brickW; x < 512; x += brickW) {
      const px = x + shift;
      const redTone = Math.floor(Math.random() * 20);
      ctx.fillStyle = `rgb(${185 + redTone}, ${80 + redTone * 0.5}, ${60 + redTone * 0.3})`;
      ctx.fillRect(px + 2, y + 2, brickW - 4, brickH - 4);
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  textureCache.set(cacheKey, texture);
  return texture;
}

/**
 * Loads a real photo image URL as a Three.js Texture with repeating wrap
 */
export function loadPhotoTexture(url: string, repeatX = 3, repeatY = 3): Promise<THREE.Texture> {
  return new Promise((resolve) => {
    const loader = new THREE.TextureLoader();
    loader.load(
      url,
      (tex) => {
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(repeatX, repeatY);
        tex.needsUpdate = true;
        resolve(tex);
      },
      undefined,
      () => {
        // Fallback to hardwood
        resolve(createHardwoodTexture());
      }
    );
  });
}

/**
 * Returns the appropriate Three.js material for floor style
 */
export function getFloorMaterial(
  style: FloorStyle,
  customUrl?: string
): THREE.MeshStandardMaterial {
  switch (style) {
    case 'hardwood_oak':
      return new THREE.MeshStandardMaterial({
        map: createHardwoodTexture(),
        roughness: 0.4,
        metalness: 0.05
      });
    case 'grey_tile':
      return new THREE.MeshStandardMaterial({
        map: createTileTexture(),
        roughness: 0.3,
        metalness: 0.1
      });
    case 'marble':
      return new THREE.MeshStandardMaterial({
        map: createMarbleTexture(),
        roughness: 0.15,
        metalness: 0.05
      });
    case 'carpet':
      return new THREE.MeshStandardMaterial({
        map: createCarpetTexture(),
        roughness: 0.9,
        metalness: 0.0
      });
    case 'concrete':
      return new THREE.MeshStandardMaterial({
        color: 0x475569,
        roughness: 0.7,
        metalness: 0.1
      });
    case 'custom_photo':
      if (customUrl) {
        const tex = new THREE.TextureLoader().load(customUrl);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        tex.repeat.set(4, 4);
        return new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.4,
          metalness: 0.05
        });
      }
      return new THREE.MeshStandardMaterial({
        map: createHardwoodTexture(),
        roughness: 0.4,
        metalness: 0.05
      });
    default:
      return new THREE.MeshStandardMaterial({
        map: createHardwoodTexture(),
        roughness: 0.4,
        metalness: 0.05
      });
  }
}
