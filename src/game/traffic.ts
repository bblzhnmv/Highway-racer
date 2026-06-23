import * as THREE from 'three';
import {
  LANE_POSITIONS, VehicleType, VEHICLE_TYPES,
  TRAFFIC_POOL_SIZE, TRAFFIC_SPAWN_AHEAD, TRAFFIC_DESPAWN_BEHIND,
  TRAFFIC_MIN_SPEED, TRAFFIC_MAX_SPEED, TRAFFIC_COLORS,
  SCORE_OVERTAKE, SCORE_CLOSE_BONUS, SCORE_NEAR_MISS,
  CLOSE_OVERTAKE_DIST, NEAR_MISS_DIST,
} from './constants';
import { createTrafficMesh, vehicleHalfExtents } from './createCar';

export interface TrafficCar {
  mesh: THREE.Group;
  worldZ: number;
  speed: number;
  lane: number;
  targetLane: number;         // for lane-change AI
  wasScored: boolean;
  active: boolean;
  type: VehicleType;
  halfWidth: number;
  halfDepth: number;
  // AI personality
  drivingStyle: 'slow' | 'normal' | 'fast' | 'erratic';
  laneChangeTimer: number;    // seconds until next AI lane change decision
  brakingFactor: number;      // 0-1, applied when too close to car ahead
}

/**
 * TrafficManager – pooled NPC traffic with basic lane-change AI.
 */
export class TrafficManager {
  private pool: TrafficCar[] = [];

  constructor(
    private scene: THREE.Scene,
    private onScore: (points: number, label?: string) => void,
  ) {
    this.buildPool();
  }

  // ─── pool ────────────────────────────────────────────────────────────────
  private buildPool() {
    for (let i = 0; i < TRAFFIC_POOL_SIZE; i++) {
      const type  = VEHICLE_TYPES[i % VEHICLE_TYPES.length];
      const color = TRAFFIC_COLORS[i % TRAFFIC_COLORS.length];
      const mesh  = createTrafficMesh(type, color);
      mesh.visible = false;
      // Traffic faces the player (player looks at -Z; traffic drives in -Z too)
      mesh.rotation.y = Math.PI;
      this.scene.add(mesh);

      const ext = vehicleHalfExtents(type);
      this.pool.push({
        mesh, worldZ: 0, speed: 0, lane: 0, targetLane: 0,
        wasScored: false, active: false,
        type, halfWidth: ext.w, halfDepth: ext.d,
        drivingStyle: 'normal', laneChangeTimer: 3 + Math.random() * 4,
        brakingFactor: 1.0,
      });
    }
  }

  private findInactive(): TrafficCar | null {
    return this.pool.find(c => !c.active) ?? null;
  }

  private activate(car: TrafficCar, lane: number, worldZ: number) {
    car.lane       = lane;
    car.targetLane = lane;
    car.worldZ     = worldZ;
    const styles: TrafficCar['drivingStyle'][] = ['slow', 'normal', 'fast', 'erratic'];
    car.drivingStyle = styles[Math.floor(Math.random() * styles.length)];

    // Speed based on personality
    let minS = TRAFFIC_MIN_SPEED, maxS = TRAFFIC_MAX_SPEED;
    if (car.drivingStyle === 'slow')    { minS *= 0.6; maxS *= 0.65; }
    if (car.drivingStyle === 'fast')    { minS *= 1.1; maxS *= 1.2; }
    if (car.drivingStyle === 'erratic') { maxS *= 1.3; }

    car.speed          = minS + Math.random() * (maxS - minS);
    car.wasScored      = false;
    car.active         = true;
    car.brakingFactor  = 1.0;
    car.laneChangeTimer= 4 + Math.random() * 6;
    car.mesh.position.set(LANE_POSITIONS[lane], 0, worldZ);
    car.mesh.visible   = true;
  }

  private deactivate(car: TrafficCar) {
    car.active = false;
    car.mesh.visible = false;
  }

  private trySpawnAhead(playerZ: number) {
    const car = this.findInactive();
    if (!car) return;
    const lane   = Math.floor(Math.random() * 5);
    const spawnZ = playerZ - TRAFFIC_SPAWN_AHEAD - Math.random() * 30;
    const tooClose = this.pool.some(
      c => c.active && c.lane === lane && Math.abs(c.worldZ - spawnZ) < 28,
    );
    if (!tooClose) this.activate(car, lane, spawnZ);
  }

  // ─── public ──────────────────────────────────────────────────────────────
  spawnInitial(playerZ: number) {
    for (const car of this.pool) this.deactivate(car);
    for (let i = 0; i < 10; i++) {
      const inactive = this.findInactive();
      if (!inactive) break;
      const lane   = Math.floor(Math.random() * 5);
      const spawnZ = playerZ - 35 - i * 14 - Math.random() * 8;
      this.activate(inactive, lane, spawnZ);
    }
  }

  update(dt: number, playerZ: number, playerX: number) {
    for (const car of this.pool) {
      if (!car.active) continue;

      // ── AI lane change ──────────────────────────────────────
      car.laneChangeTimer -= dt;
      if (car.laneChangeTimer <= 0) {
        car.laneChangeTimer = 4 + Math.random() * 7;
        if (car.drivingStyle === 'erratic' || Math.random() < 0.35) {
          const dir   = Math.random() < 0.5 ? -1 : 1;
          const newLane = car.targetLane + dir;
          if (newLane >= 0 && newLane <= 4) {
            // Check if lane is clear
            const blocked = this.pool.some(other =>
              other !== car && other.active && other.lane === newLane &&
              Math.abs(other.worldZ - car.worldZ) < 14,
            );
            if (!blocked) car.targetLane = newLane;
          }
        }
      }

      // Smoothly slide to target lane
      const targetX = LANE_POSITIONS[car.targetLane];
      car.mesh.position.x += (targetX - car.mesh.position.x) * Math.min(3.5 * dt, 1.0);
      car.lane = Math.round((car.mesh.position.x - LANE_POSITIONS[0]) / (LANE_POSITIONS[1] - LANE_POSITIONS[0]));
      car.lane = Math.max(0, Math.min(4, car.lane));

      // ── Collision avoidance with car ahead ──────────────────
      car.brakingFactor = 1.0;
      for (const other of this.pool) {
        if (!other.active || other === car) continue;
        if (other.lane !== car.targetLane) continue;
        const gap = car.worldZ - other.worldZ; // positive = car is behind other
        if (gap > 0 && gap < 20) {
          car.brakingFactor = Math.max(0.3, gap / 20);
        }
      }

      car.worldZ -= car.speed * car.brakingFactor * dt;
      car.mesh.position.z = car.worldZ;

      // Slight body lean during lane change
      const lateralDelta = targetX - car.mesh.position.x;
      car.mesh.rotation.z = THREE.MathUtils.lerp(car.mesh.rotation.z, lateralDelta * 0.05, 0.1);

      // ── Overtake / near-miss scoring ──────────────────────────
      if (!car.wasScored && playerZ < car.worldZ) {
        car.wasScored = true;
        this.onScore(SCORE_OVERTAKE, '+10');

        const lateralDist = Math.abs(LANE_POSITIONS[car.targetLane] - playerX);
        if (lateralDist <= NEAR_MISS_DIST) {
          this.onScore(SCORE_NEAR_MISS, 'NEAR MISS! +50');
        } else if (lateralDist <= CLOSE_OVERTAKE_DIST) {
          this.onScore(SCORE_CLOSE_BONUS, 'CLOSE! +25');
        }
      }

      // ── Recycle ────────────────────────────────────────────────
      if (car.worldZ > playerZ + TRAFFIC_DESPAWN_BEHIND) {
        this.deactivate(car);
        this.trySpawnAhead(playerZ);
      }
    }

    // Trickle spawn
    if (Math.random() < 0.018) this.trySpawnAhead(playerZ);
  }

  getActiveCars(): TrafficCar[] {
    return this.pool.filter(c => c.active);
  }

  reset(playerZ: number) {
    this.spawnInitial(playerZ);
  }
}
