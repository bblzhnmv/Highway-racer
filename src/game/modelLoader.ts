import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const loader = new GLTFLoader();
const modelCache = new Map<string, THREE.Group>();

export async function preloadModels(): Promise<void> {
  const models = [
    { name: 'sedan', path: '/Car.glb' },
    { name: 'hatchback', path: '/Toyota_Hilux_97.glb' },
    { name: 'suv', path: '/SUV.glb' },
  ];

  const promises = models.map(({ name, path }) => {
    return new Promise<void>((resolve, reject) => {
      loader.load(
        path,
        (gltf) => {
          const model = gltf.scene;
          model.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          modelCache.set(name, model);
          console.log(`✅ Loaded model: ${name}`);
          resolve();
        },
        undefined,
        (error) => {
          console.error(`❌ Failed to load ${name}:`, error);
          reject(error);
        }
      );
    });
  });

  await Promise.all(promises);
}

export function getModel(name: string): THREE.Group | null {
  const model = modelCache.get(name);
  return model ? model.clone() : null;
}
