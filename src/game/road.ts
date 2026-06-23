import * as THREE from 'three';
import { LANE_COUNT, ROAD_WIDTH, SEGMENT_COUNT, SEGMENT_LENGTH } from './constants';

const TOTAL_ROAD   = SEGMENT_COUNT * SEGMENT_LENGTH;
const GRASS_W      = 80;
const GRASS_LENGTH = 900;
const TREE_COUNT   = 60;

/**
 * Road — infinite looping highway with improved visuals:
 *  • Asphalt with subtle specular normal variation
 *  • Wider textured shoulder + painted kerb line
 *  • Animated lane markings via UV offset
 *  • Procedural roadside scenery (trees + lamp-posts)
 */
export class Road {
  private segments: THREE.Group[] = [];
  private roadTexture!: THREE.Texture;
  private shoulderTexture!: THREE.Texture;
  private grassMeshes: THREE.Mesh[] = [];
  private sceneryGroup!: THREE.Group;

  constructor(private scene: THREE.Scene) {
    this.buildRoadTexture();
    this.buildShoulderTexture();
    this.buildSegments();
    this.buildGrass();
    this.buildScenery();
  }

  // ─── textures ────────────────────────────────────────────────────────────
  private buildRoadTexture() {
    const W = 512, H = 512;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d')!;

    // Dark asphalt base with grain
    ctx.fillStyle = '#333333';
    ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 6000; i++) {
      const v = 20 + Math.random() * 30;
      ctx.fillStyle = `rgba(${v},${v},${v},${0.12 + Math.random() * 0.1})`;
      ctx.fillRect(Math.random() * W, Math.random() * H, 2 + Math.random()*2, 2 + Math.random()*2);
    }
    // Small cracks
    for (let i = 0; i < 8; i++) {
      ctx.strokeStyle = 'rgba(0,0,0,0.18)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      const x0 = Math.random()*W, y0 = Math.random()*H;
      ctx.moveTo(x0, y0);
      ctx.lineTo(x0 + (Math.random()-0.5)*40, y0 + Math.random()*60);
      ctx.stroke();
    }

    const laneW = W / LANE_COUNT;
    // Yellow solid edge lines
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, 0, 6, H); ctx.fillRect(W-6, 0, 6, H);
    // White dashed dividers
    ctx.fillStyle = '#ffffff';
    const dash = 80, gap = 50, cycle = dash + gap;
    for (let lane = 1; lane < LANE_COUNT; lane++) {
      const x = Math.round(lane * laneW);
      for (let y = 0; y < H; y += cycle) ctx.fillRect(x-2, y, 4, dash);
    }

    this.roadTexture = new THREE.CanvasTexture(cv);
    this.roadTexture.wrapS = THREE.RepeatWrapping;
    this.roadTexture.wrapT = THREE.RepeatWrapping;
    this.roadTexture.repeat.set(1, SEGMENT_LENGTH / 22);
    this.roadTexture.anisotropy = 8;
  }

  private buildShoulderTexture() {
    const cv = document.createElement('canvas');
    cv.width = 64; cv.height = 64;
    const ctx = cv.getContext('2d')!;
    ctx.fillStyle = '#555555'; ctx.fillRect(0, 0, 64, 64);
    // Rumble strip pattern
    for (let y = 0; y < 64; y += 16) {
      ctx.fillStyle = '#ffcc00'; ctx.fillRect(0, y, 64, 8);
      ctx.fillStyle = '#555555'; ctx.fillRect(0, y+8, 64, 8);
    }
    this.shoulderTexture = new THREE.CanvasTexture(cv);
    this.shoulderTexture.wrapS = THREE.RepeatWrapping;
    this.shoulderTexture.wrapT = THREE.RepeatWrapping;
    this.shoulderTexture.repeat.set(1, SEGMENT_LENGTH / 4);
  }

  // ─── segments ────────────────────────────────────────────────────────────
  private buildSegments() {
    const roadMat = new THREE.MeshStandardMaterial({
      map: this.roadTexture,
      roughness: 0.82,
      metalness: 0.06,
      envMapIntensity: 0.3,
    });
    const shoulderMat = new THREE.MeshStandardMaterial({
      map: this.shoulderTexture,
      roughness: 0.9, metalness: 0.0,
    });
    const barMat = new THREE.MeshStandardMaterial({
      color: '#c8c8c8', metalness: 0.8, roughness: 0.25,
    });
    const postMat = new THREE.MeshStandardMaterial({
      color: '#aaaaaa', metalness: 0.6, roughness: 0.4,
    });
    const concreteMat = new THREE.MeshStandardMaterial({
      color: '#909090', roughness: 0.85, metalness: 0.0,
    });

    const halfW    = ROAD_WIDTH / 2;
    const shoulderW = 1.8;

    for (let i = 0; i < SEGMENT_COUNT; i++) {
      const group = new THREE.Group();

      // Road plane
      const road = new THREE.Mesh(new THREE.PlaneGeometry(ROAD_WIDTH, SEGMENT_LENGTH), roadMat);
      road.rotation.x = -Math.PI / 2; road.receiveShadow = true; group.add(road);

      // Shoulders
      for (const sx of [-1, 1]) {
        const sh = new THREE.Mesh(
          new THREE.PlaneGeometry(shoulderW, SEGMENT_LENGTH), shoulderMat,
        );
        sh.rotation.x = -Math.PI / 2;
        sh.position.set(sx * (halfW + shoulderW / 2), 0.002, 0);
        sh.receiveShadow = true; group.add(sh);
      }

      // Kerb (raised concrete strip)
      for (const sx of [-1, 1]) {
        const kerb = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.12, SEGMENT_LENGTH), concreteMat);
        kerb.position.set(sx * (halfW + shoulderW + 0.11), 0.06, 0);
        kerb.receiveShadow = true; group.add(kerb);
      }

      // Guardrail beam
      for (const sx of [-1, 1]) {
        const rail = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.48, SEGMENT_LENGTH), barMat);
        rail.position.set(sx * (halfW + shoulderW + 0.55), 0.52, 0);
        rail.castShadow = true; group.add(rail);
      }

      // Posts every 8 units
      for (let pz = -SEGMENT_LENGTH/2 + 4; pz < SEGMENT_LENGTH/2; pz += 8) {
        for (const sx of [-1, 1]) {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), postMat);
          post.position.set(sx * (halfW + shoulderW + 0.55), 0.32, pz);
          group.add(post);
        }
      }

      group.position.z = -i * SEGMENT_LENGTH - SEGMENT_LENGTH / 2;
      this.segments.push(group);
      this.scene.add(group);
    }
  }

  // ─── grass ───────────────────────────────────────────────────────────────
  private buildGrass() {
    // Two grass tiers — close (bright) and far (darker)
    const nearMat = new THREE.MeshStandardMaterial({ color: '#4a9028', roughness: 1.0 });
    const farMat  = new THREE.MeshStandardMaterial({ color: '#2d6e18', roughness: 1.0 });
    const halfW   = ROAD_WIDTH / 2 + 1.8; // just outside kerb

    for (const sx of [-1, 1]) {
      const near = new THREE.Mesh(new THREE.PlaneGeometry(24, GRASS_LENGTH), nearMat);
      near.rotation.x = -Math.PI / 2;
      near.position.set(sx * (halfW + 12), -0.01, 0);
      near.receiveShadow = true; this.scene.add(near); this.grassMeshes.push(near);

      const far = new THREE.Mesh(new THREE.PlaneGeometry(56, GRASS_LENGTH), farMat);
      far.rotation.x = -Math.PI / 2;
      far.position.set(sx * (halfW + 50), -0.01, 0);
      this.scene.add(far); this.grassMeshes.push(far);
    }
  }

  // ─── scenery ─────────────────────────────────────────────────────────────
  private buildScenery() {
    this.sceneryGroup = new THREE.Group();

    const trunkMat  = new THREE.MeshStandardMaterial({ color: '#5c3317', roughness: 0.95 });
    const canopyMat = new THREE.MeshStandardMaterial({ color: '#2d7a18', roughness: 1.0 });
    const lampMat   = new THREE.MeshStandardMaterial({ color: '#888888', metalness: 0.7, roughness: 0.3 });
    const bulbMat   = new THREE.MeshStandardMaterial({ color: '#fffbe0', emissive: '#ffeeaa', emissiveIntensity: 2.5 });

    const halfW = ROAD_WIDTH / 2 + 3.5;

    for (let i = 0; i < TREE_COUNT; i++) {
      const z   = -(i * 18 + Math.random() * 10);
      const sx  = Math.random() < 0.5 ? -1 : 1;
      const xOff= halfW + 8 + Math.random() * 20;
      const h   = 3 + Math.random() * 4;

      // Trunk
      const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, h, 7), trunkMat);
      trunk.position.set(sx * xOff, h/2, z); trunk.castShadow = true;
      this.sceneryGroup.add(trunk);

      // Canopy (stacked cones for pine, sphere for deciduous)
      const isPine = Math.random() < 0.55;
      if (isPine) {
        for (let c = 0; c < 3; c++) {
          const cr = 1.1 - c * 0.25;
          const cone = new THREE.Mesh(new THREE.ConeGeometry(cr, 1.6, 7), canopyMat);
          cone.position.set(sx * xOff, h + 0.5 + c * 1.1, z); cone.castShadow = true;
          this.sceneryGroup.add(cone);
        }
      } else {
        const r     = 1.4 + Math.random() * 0.6;
        const canopy= new THREE.Mesh(new THREE.SphereGeometry(r, 7, 5), canopyMat);
        canopy.position.set(sx * xOff, h + r * 0.7, z); canopy.castShadow = true;
        this.sceneryGroup.add(canopy);
      }
    }

    // Lamp posts every 30 units
    for (let i = 0; i < 30; i++) {
      const z  = -(i * 30 + 10);
      for (const sx of [-1, 1]) {
        const poleH = 6;
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, poleH, 6), lampMat);
        pole.position.set(sx * (ROAD_WIDTH/2 + 2.4), poleH/2, z); pole.castShadow = true;
        this.sceneryGroup.add(pole);

        // Arm
        const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1.4, 5), lampMat);
        arm.rotation.z = sx * -Math.PI/2;
        arm.position.set(sx * (ROAD_WIDTH/2 + 2.4 + sx * 0.7), poleH, z);
        this.sceneryGroup.add(arm);

        // Bulb
        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 6, 4), bulbMat);
        bulb.position.set(sx * (ROAD_WIDTH/2 + 2.4 + sx * 1.4), poleH - 0.14, z);
        this.sceneryGroup.add(bulb);
      }
    }

    this.scene.add(this.sceneryGroup);
  }

  // ─── update ──────────────────────────────────────────────────────────────
  update(playerZ: number) {
    // Recycle road segments
    for (const seg of this.segments) {
      if (seg.position.z > playerZ + SEGMENT_LENGTH * 0.6) {
        seg.position.z -= TOTAL_ROAD;
      }
      if (seg.position.z < playerZ - (SEGMENT_COUNT - 0.5) * SEGMENT_LENGTH) {
        seg.position.z += TOTAL_ROAD;
      }
    }

    // Scroll road texture
    this.roadTexture.offset.y = -playerZ / 22;

    // Slide grass planes
    for (const g of this.grassMeshes) {
      g.position.z = playerZ - GRASS_LENGTH / 2 + 60;
    }

    // Slide scenery with player
    this.sceneryGroup.position.z = playerZ;
  }
}
