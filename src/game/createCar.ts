import { getModel } from './modelLoader';
import * as THREE from 'three';
import { VehicleType } from './constants';

// ─────────────────────────────────────────────────────────────
//  Shared material helpers
// ─────────────────────────────────────────────────────────────
function bodyMat(color: string) {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.65,
    roughness: 0.35,
    envMapIntensity: 1.2,
  });
}
const glassMat = new THREE.MeshStandardMaterial({
  color: '#9fd8f5', transparent: true, opacity: 0.55,
  metalness: 0.1, roughness: 0.05,
});
const wheelMat = new THREE.MeshStandardMaterial({ color: '#111', roughness: 0.92, metalness: 0.0 });
const rimMat   = new THREE.MeshStandardMaterial({ color: '#b0b0b0', metalness: 0.85, roughness: 0.25 });
const darkMat  = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.9 });
const chromeMat= new THREE.MeshStandardMaterial({ color: '#cccccc', metalness: 1.0, roughness: 0.15 });
const headEmit = new THREE.MeshStandardMaterial({
  color: '#ffffff', emissive: '#fffbe0', emissiveIntensity: 2.5,
  roughness: 0.1,
});
const tailEmit = new THREE.MeshStandardMaterial({
  color: '#ff2200', emissive: '#ff1100', emissiveIntensity: 2.0,
});

function wheels(group: THREE.Group, positions: [number,number,number][], radius = 0.38) {
  const wGeo = new THREE.CylinderGeometry(radius, radius, 0.25, 16);
  const rGeo = new THREE.CylinderGeometry(radius * 0.62, radius * 0.62, 0.27, 10);
  for (const [x, y, z] of positions) {
    const w = new THREE.Mesh(wGeo, wheelMat); w.rotation.z = Math.PI/2;
    w.position.set(x, y, z); w.castShadow = true; group.add(w);
    const r = new THREE.Mesh(rGeo, rimMat); r.rotation.z = Math.PI/2;
    r.position.set(x, y, z); group.add(r);
  }
}

// ─────────────────────────────────────────────────────────────
//  PLAYER CAR — low-poly sports coupe
// ─────────────────────────────────────────────────────────────
export function createPlayerMesh(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);

  // Lower body — wide aggressive stance
  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.48, 4.2), mat);
  lower.position.y = 0.54; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);

  // Rear haunch
  const haunch = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.28, 1.4), mat);
  haunch.position.set(0, 0.82, -1.2); haunch.castShadow = true; g.add(haunch);

  // Cabin — sloped wedge shape (approximated by two overlapping boxes)
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.52, 2.0), mat);
  cabin.position.set(0, 1.22, -0.18); cabin.castShadow = true; g.add(cabin);

  // Roof
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.12, 1.5), mat);
  roof.position.set(0, 1.5, -0.22); g.add(roof);

  // Windshields
  const fwd = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.44, 0.08), glassMat);
  fwd.position.set(0, 1.15, 0.88); fwd.rotation.x = -0.22; g.add(fwd);
  const rwd = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.38, 0.08), glassMat);
  rwd.position.set(0, 1.12, -1.2); rwd.rotation.x = 0.28; g.add(rwd);

  // Side windows
  for (const sx of [-0.86, 0.86]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 1.5), glassMat);
    sw.position.set(sx, 1.2, -0.18); g.add(sw);
  }

  // Splitter / diffuser
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.06, 0.5), darkMat);
  splitter.position.set(0, 0.24, 2.1); g.add(splitter);

  // Rear spoiler
  const spoilerBase = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.06, 0.18), mat);
  spoilerBase.position.set(0, 1.56, -2.0); g.add(spoilerBase);
  for (const sx of [-0.72, 0.72]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.22, 0.12), chromeMat);
    strut.position.set(sx, 1.38, -2.0); g.add(strut);
  }

  // Headlights — twin units
  for (const hx of [-0.7, 0.7]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.16, 0.07), headEmit);
    hl.position.set(hx, 0.7, 2.12); g.add(hl);
    // DRL strip
    const drl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.05, 0.06), headEmit);
    drl.position.set(hx, 0.84, 2.12); g.add(drl);
  }

  // Tail lights — wide strip
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.06), tailEmit);
  tail.position.set(0, 0.68, -2.12); g.add(tail);

  // Bumpers
  const fb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.12), darkMat);
  fb.position.set(0, 0.38, 2.15); g.add(fb);
  const rb = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.22, 0.12), darkMat);
  rb.position.set(0, 0.38, -2.15); g.add(rb);

  // Exhaust tips
  for (const ex of [-0.45, 0.45]) {
    const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.18, 8), chromeMat);
    tip.rotation.x = Math.PI/2; tip.position.set(ex, 0.34, -2.18); g.add(tip);
  }

  wheels(g, [
    [-1.08, 0.38,  1.42],
    [ 1.08, 0.38,  1.42],
    [-1.08, 0.38, -1.42],
    [ 1.08, 0.38, -1.42],
  ]);

  return g;
}

// ─────────────────────────────────────────────────────────────
//  TRAFFIC – sedan (GLB model)
// ─────────────────────────────────────────────────────────────
function createSedan(color: string): THREE.Group {
  const model = getModel('sedan');
  if (model) {
    model.scale.set(1.0, 1.0, 1.0);
    model.rotation.y = 0;
    model.position.set(0, 0, 0);
    return model;
  }
  // Fallback to procedural if model not loaded
  return createProceduralSedan(color);
}

function createProceduralSedan(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.5, 4.0), mat);
  lower.position.y = 0.55; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.54, 1.9), mat);
  cabin.position.set(0, 1.18, -0.25); cabin.castShadow = true; g.add(cabin);

  const fwd = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.42, 0.07), glassMat);
  fwd.position.set(0, 1.08, 0.76); g.add(fwd);
  const rwd = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.38, 0.07), glassMat);
  rwd.position.set(0, 1.08, -1.22); g.add(rwd);
  for (const sx of [-0.82, 0.82]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.36, 1.42), glassMat);
    sw.position.set(sx, 1.12, -0.25); g.add(sw);
  }

  for (const hx of [-0.6, 0.6]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.15, 0.07), headEmit);
    hl.position.set(hx, 0.66, 2.05); g.add(hl);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.12, 0.06), tailEmit);
  tail.position.set(0, 0.65, -2.05); g.add(tail);

  wheels(g, [[-1.05, 0.36, 1.38],[ 1.05, 0.36, 1.38],[-1.05, 0.36,-1.38],[ 1.05, 0.36,-1.38]]);
  return g;
}

// ─────────────────────────────────────────────────────────────
//  TRAFFIC – hatchback (GLB model - Toyota Hilux)
// ─────────────────────────────────────────────────────────────
function createHatchback(color: string): THREE.Group {
  const model = getModel('hatchback');
  if (model) {
    model.scale.set(0.01, 0.01, 0.01);
    model.rotation.y = 0;
    model.position.set(0, -1, 0);
    return model;
  }
  return createProceduralHatchback(color);
}

function createProceduralHatchback(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 3.6), mat);
  lower.position.y = 0.55; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(1.62, 0.62, 2.0), mat);
  cabin.position.set(0, 1.22, -0.2); cabin.castShadow = true; g.add(cabin);

  const fwd = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.44, 0.07), glassMat);
  fwd.position.set(0, 1.1, 0.72); g.add(fwd);
  const rwd = new THREE.Mesh(new THREE.BoxGeometry(1.52, 0.5, 0.07), glassMat);
  rwd.position.set(0, 1.12, -1.2); rwd.rotation.x = 0.18; g.add(rwd);
  for (const sx of [-0.82, 0.82]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.44, 1.52), glassMat);
    sw.position.set(sx, 1.16, -0.2); g.add(sw);
  }

  for (const hx of [-0.55, 0.55]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.15, 0.07), headEmit);
    hl.position.set(hx, 0.66, 1.84); g.add(hl);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.12, 0.06), tailEmit);
  tail.position.set(0, 0.82, -1.84); g.add(tail);

  wheels(g, [[-1.0, 0.36, 1.24],[ 1.0, 0.36, 1.24],[-1.0, 0.36,-1.24],[ 1.0, 0.36,-1.24]]);
  return g;
}

// ─────────────────────────────────────────────────────────────
//  TRAFFIC – SUV (GLB model)
// ─────────────────────────────────────────────────────────────
function createSUV(color: string): THREE.Group {
  const model = getModel('suv');
  if (model) {
    model.scale.set(1.0, 1.0, 1.0);
    model.rotation.y = 0;
    model.position.set(0, 0, 0);
    return model;
  }
  return createProceduralSUV(color);
}

function createProceduralSUV(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);

  const lower = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.6, 4.4), mat);
  lower.position.y = 0.62; lower.castShadow = true; lower.receiveShadow = true; g.add(lower);

  const cabin = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.72, 2.6), mat);
  cabin.position.set(0, 1.44, -0.2); cabin.castShadow = true; g.add(cabin);

  const fwd = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.52, 0.08), glassMat);
  fwd.position.set(0, 1.3, 1.1); g.add(fwd);
  const rwd = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.5, 0.08), glassMat);
  rwd.position.set(0, 1.3, -1.5); g.add(rwd);
  for (const sx of [-1.01, 1.01]) {
    const sw = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.48, 1.9), glassMat);
    sw.position.set(sx, 1.34, -0.2); g.add(sw);
  }
  const rack = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.06, 2.2), darkMat);
  rack.position.set(0, 1.84, -0.2); g.add(rack);
  for (const rz of [-0.9, 0, 0.9]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.05, 0.06), darkMat);
    bar.position.set(0, 1.87, rz); g.add(bar);
  }

  for (const hx of [-0.8, 0.8]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.18, 0.08), headEmit);
    hl.position.set(hx, 0.8, 2.24); g.add(hl);
  }
  const tail = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.14, 0.07), tailEmit);
  tail.position.set(0, 0.8, -2.24); g.add(tail);

  wheels(g, [[-1.12, 0.44, 1.52],[ 1.12, 0.44, 1.52],[-1.12, 0.44,-1.52],[ 1.12, 0.44,-1.52]], 0.44);
  return g;
}

// ─────────────────────────────────────────────────────────────
//  TRAFFIC – semi truck (cab + trailer)
// ─────────────────────────────────────────────────────────────
function createSemi(color: string): THREE.Group {
  const g = new THREE.Group();
  const mat = bodyMat(color);
  const trailerMat = new THREE.MeshStandardMaterial({ color: '#888888', roughness: 0.8, metalness: 0.1 });

  // Cab
  const cabBase = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.9, 2.8), mat);
  cabBase.position.set(0, 0.75, 3.8); cabBase.castShadow = true; cabBase.receiveShadow = true; g.add(cabBase);
  const cabTop = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.9, 2.2), mat);
  cabTop.position.set(0, 1.65, 3.6); cabTop.castShadow = true; g.add(cabTop);

  // Cab windshield
  const cabWind = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.7, 0.08), glassMat);
  cabWind.position.set(0, 1.62, 5.06); g.add(cabWind);

  // Exhaust stacks
  for (const ex of [-0.9, 0.9]) {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.2, 8), chromeMat);
    stack.position.set(ex, 2.4, 3.4); g.add(stack);
  }

  // Headlights
  for (const hx of [-0.9, 0.9]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.2, 0.08), headEmit);
    hl.position.set(hx, 0.82, 5.24); g.add(hl);
  }

  // Trailer
  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.4, 1.6, 8.0), trailerMat);
  trailer.position.set(0, 1.1, -2.0); trailer.castShadow = true; trailer.receiveShadow = true; g.add(trailer);

  // Trailer tail lights
  const ttail = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.15, 0.07), tailEmit);
  ttail.position.set(0, 0.42, -6.04); g.add(ttail);

  // Cab wheels
  wheels(g, [
    [-1.22, 0.46, 4.6],[ 1.22, 0.46, 4.6],
    [-1.22, 0.46, 2.8],[ 1.22, 0.46, 2.8],
  ], 0.46);
  // Trailer wheels
  wheels(g, [
    [-1.22, 0.44,-3.2],[ 1.22, 0.44,-3.2],
    [-1.22, 0.44,-4.6],[ 1.22, 0.44,-4.6],
  ], 0.44);

  return g;
}

// ─────────────────────────────────────────────────────────────
//  Public API
// ─────────────────────────────────────────────────────────────

/** Build the player's sports-car mesh */
export function createCarMesh(color: string): THREE.Group {
  return createPlayerMesh(color);
}

/** Build a traffic vehicle of the given type */
export function createTrafficMesh(type: VehicleType, color: string): THREE.Group {
  switch (type) {
    case 'sedan':    return createSedan(color);
    case 'hatchback':return createHatchback(color);
    case 'suv':      return createSUV(color);
    case 'semi':     return createSemi(color);
  }
}

/** Half-extents for traffic bounding boxes (used by collision.ts) */
export function vehicleHalfExtents(type: VehicleType): { w: number; d: number } {
  switch (type) {
    case 'sedan':    return { w: 1.0, d: 2.0 };
    case 'hatchback':return { w: 0.95, d: 1.8 };
    case 'suv':      return { w: 1.1, d: 2.2 };
    case 'semi':     return { w: 1.2, d: 5.5 };
  }
}
