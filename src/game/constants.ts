// ============================================================
// Game Constants
// ============================================================

export const LANE_COUNT = 5;
export const LANE_WIDTH = 3.5;

export const LANE_POSITIONS: readonly number[] = [-7, -3.5, 0, 3.5, 7];

export const ROAD_WIDTH = LANE_COUNT * LANE_WIDTH; // 17.5 units

export const SEGMENT_LENGTH = 120;
export const SEGMENT_COUNT  = 6;

// Player speed (world-units/s  × 3.6 = km/h)
export const PLAYER_MIN_SPEED  = 15;   // ~54 km/h
export const PLAYER_MAX_SPEED  = 62;   // ~223 km/h
export const PLAYER_ACCEL      = 14;
export const PLAYER_BRAKE      = 20;
export const PLAYER_AUTO_ACCEL = 2.2;

export const LANE_CHANGE_SPEED = 6.5;  // lateral lerp rate

// Camera
export const CAMERA_HEIGHT = 3.2;
export const CAMERA_BEHIND = 6.0;
export const CAMERA_LERP   = 0.08;

// Traffic pool
export const TRAFFIC_POOL_SIZE      = 24;
export const TRAFFIC_SPAWN_AHEAD    = 170;
export const TRAFFIC_DESPAWN_BEHIND = 40;
export const TRAFFIC_MIN_SPEED      = 5;
export const TRAFFIC_MAX_SPEED      = 20;

// Scoring
export const SCORE_OVERTAKE      = 10;
export const SCORE_CLOSE_BONUS   = 25;
export const SCORE_NEAR_MISS     = 50;  // very tight lateral pass
export const CLOSE_OVERTAKE_DIST = LANE_WIDTH * 1.5;
export const NEAR_MISS_DIST      = LANE_WIDTH * 0.6;

// Difficulty ramp – every N metres driven, increase traffic density
export const DIFFICULTY_INTERVAL = 500; // metres

// Available paint colours for traffic
export const TRAFFIC_COLORS = [
  '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
  '#9b59b6', '#1abc9c', '#e67e22', '#95a5a6',
  '#c0392b', '#2980b9', '#27ae60', '#d35400',
  '#16a085', '#8e44ad', '#f1c40f', '#ecf0f1',
  '#ffffff', '#111111', '#0d3b66', '#7b2d00',
];

// Traffic vehicle types
export type VehicleType = 'sedan' | 'hatchback' | 'suv' | 'semi';
export const VEHICLE_TYPES: VehicleType[] = ['sedan', 'hatchback', 'suv', 'semi'];
