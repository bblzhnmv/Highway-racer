import * as THREE from 'three';
import { Controls } from './controls';
import {
  LANE_POSITIONS,
  PLAYER_MIN_SPEED, PLAYER_MAX_SPEED,
  PLAYER_ACCEL, PLAYER_BRAKE, PLAYER_AUTO_ACCEL,
  LANE_CHANGE_SPEED,
} from './constants';
import { createPlayerMesh } from './createCar';

export class Player {
  readonly mesh: THREE.Group;

  speed = PLAYER_MIN_SPEED;
  worldZ = 0;

  // Exposed to GameEngine for camera shake
  laneChanging = false;

  private laneIndex = 2;
  private laneChangeDir = 0;   // -1 left, 0 none, 1 right

  // Wheel spin angle
  private wheelAngle = 0;

  readonly halfWidth = 1.05;
  readonly halfDepth = 2.1;

  constructor(private scene: THREE.Scene) {
    this.mesh = createPlayerMesh('#cc2200');
    // The car asset is built facing +Z (headlights at +Z end).
    // Game forward direction is -Z, so rotate 180° so the front faces -Z.
    this.mesh.rotation.y = Math.PI;
    this.mesh.position.set(LANE_POSITIONS[this.laneIndex], 0, this.worldZ);
    this.scene.add(this.mesh);
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
    // Restore base 180° orientation; zero out lean/yaw overrides
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
    this.mesh.position.z  = this.worldZ;

    // Detect when lane change is complete
    if (Math.abs(dx) < 0.05) {
      this.laneChanging = false;
      this.laneChangeDir = 0;
    }

    // Body roll (z) + yaw (y) during lane change.
    // Base orientation is Math.PI (180°); yaw offset is added on top.
    // dx positive = moving right → roll right (negative z), yaw left (negative offset from PI)
    const rollTarget = -dx * 0.08;
    const yawTarget  = Math.PI - dx * 0.03;
    this.mesh.rotation.z = THREE.MathUtils.lerp(this.mesh.rotation.z, rollTarget, 0.14);
    this.mesh.rotation.y = THREE.MathUtils.lerp(this.mesh.rotation.y, yawTarget, 0.14);

    // Spin wheels proportional to speed
    this.wheelAngle += this.speed * dt * 2.2;
    // Wheels are children indices 0-based — we can tag them by name in createCar if needed;
    // for now we rotate the whole group slightly to simulate wheel spin on forward axis.
    // (Full per-wheel spin would require naming wheel meshes)
  }
}
