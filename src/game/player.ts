import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Controls } from './controls';
import {
  LANE_POSITIONS,
  PLAYER_MIN_SPEED, PLAYER_MAX_SPEED,
  PLAYER_ACCEL, PLAYER_BRAKE, PLAYER_AUTO_ACCEL,
  LANE_CHANGE_SPEED,
} from './constants';

export class Player {
  readonly mesh: THREE.Group;

  speed = PLAYER_MIN_SPEED;
  worldZ = 0;
  laneChanging = false;

  private laneIndex = 2;
  private laneChangeDir = 0;

  readonly halfWidth = 1.05;
  readonly halfDepth = 2.1;

  constructor(private scene: THREE.Scene) {
    this.mesh = new THREE.Group();
    this.mesh.position.set(LANE_POSITIONS[this.laneIndex], 0, this.worldZ);
    this.scene.add(this.mesh);

    // Загружаем GLB модель
    const loader = new GLTFLoader();
    loader.load('/CAR_Model.glb', (gltf) => {
      const model = gltf.scene;

      // Масштабируем и позиционируем модель
      model.scale.set(0.01, 0.01, 0.01);
      model.rotation.y = 0;
      model.position.set(0, 0, 0);

      model.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });

      this.mesh.add(model);
    });
  }

  moveLeft()  { this.laneIndex = Math.max(0, this.laneIndex - 1); this.laneChangeDir = -1; this.laneChanging = true; }
  moveRight() { this.laneIndex = Math.min(LANE_POSITIONS.length - 1, this.laneIndex + 1); this.laneChangeDir = 1; this.laneChanging = true; }

  update(dt: number, controls: Controls) {
    this.updateSpeed(dt, controls);
    this.worldZ -= this.speed * dt;
    this.updateMesh(dt);
  }

  get x()   { return this.mesh.position.x; }
  get kmh() { return Math.round(this.speed * 3.6); }

  reset() {
    this.speed = PLAYER_MIN_SPEED;
    this.worldZ = 0;
    this.laneIndex = 2;
    this.laneChanging = false;
    this.laneChangeDir = 0;
    this.mesh.position.set(LANE_POSITIONS[this.laneIndex], 0, 0);
    this.mesh.rotation.set(0, Math.PI, 0);
  }

  private updateSpeed(dt: number, controls: Controls) {
    if (controls.up) {
      this.speed = Math.min(this.speed + PLAYER_ACCEL * dt, PLAYER_MAX_SPEED);
    } else if (controls.down) {
      this.speed = Math.max(this.speed - PLAYER_BRAKE * dt, PLAYER_MIN_SPEED);
    } else {
      this.speed = Math.min(this.speed + PLAYER_AUTO_ACCEL * dt, PLAYER_MAX_SPEED);
    }
  }

  private updateMesh(dt: number) {
    const targetX = LANE_POSITIONS[this.laneIndex];
    const dx = targetX - this.mesh.position.x;

    this.mesh.position.x += dx * Math.min(LANE_CHANGE_SPEED * dt, 1.0);
    this.mesh.position.z = this.worldZ;

    if (Math.abs(dx) < 0.05) {
      this.laneChanging = false;
      this.laneChangeDir = 0;
    }

    const rollTarget = -dx * 0.08;
    const yawTarget  = Math.PI - dx * 0.03;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, rollTarget, 0.14);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, yawTarget, 0.14);
  }
}
