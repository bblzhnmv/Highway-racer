import { preloadModels } from './modelLoader';
import * as THREE from 'three';
import { Controls } from './controls';
import { Road } from './road';
import { Player } from './player';
import { TrafficManager } from './traffic';
import { checkCollision } from './collision';
import {
  CAMERA_HEIGHT, CAMERA_BEHIND, CAMERA_LERP,
  PLAYER_MAX_SPEED, PLAYER_MIN_SPEED,
} from './constants';

export type GameState = 'menu' | 'playing' | 'paused' | 'gameover';

export interface ScoreEvent {
  label: string;
  id: number;
  timestamp: number;
}

export interface GameData {
  state: GameState;
  speed: number;
  score: number;
  bestScore: number;
  distance: number;       // metres driven
  combo: number;          // consecutive overtakes
  scoreEvents: ScoreEvent[];
}

// ─── Particle system ─────────────────────────────────────────────────────────
class ParticleSystem {
  private particles: THREE.Points[] = [];
  private scene: THREE.Scene;

  constructor(scene: THREE.Scene) { this.scene = scene; }

  /** Spawn a burst of particles at world position */
  burst(pos: THREE.Vector3, count = 40, color = '#ff6600') {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const velocities: THREE.Vector3[] = [];

    for (let i = 0; i < count; i++) {
      positions[i*3]   = pos.x;
      positions[i*3+1] = pos.y + 0.5;
      positions[i*3+2] = pos.z;
      velocities.push(new THREE.Vector3(
        (Math.random()-0.5)*12,
        Math.random()*8 + 2,
        (Math.random()-0.5)*12,
      ));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const mat = new THREE.PointsMaterial({
      color, size: 0.25, transparent: true, opacity: 1.0,
      sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    (pts as any).__velocities = velocities;
    (pts as any).__life       = 1.2;
    this.scene.add(pts);
    this.particles.push(pts);
  }

  /** Spawn road sparks / tyre smoke */
  skid(pos: THREE.Vector3, count = 8) {
    this.burst(pos, count, '#aaaaaa');
  }

  update(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const pts  = this.particles[i] as any;
      pts.__life -= dt * 1.2;
      if (pts.__life <= 0) {
        this.scene.remove(pts);
        pts.geometry.dispose();
        (pts.material as THREE.Material).dispose();
        this.particles.splice(i, 1);
        continue;
      }
      const pos = pts.geometry.attributes.position.array as Float32Array;
      const vel = pts.__velocities as THREE.Vector3[];
      for (let j = 0; j < vel.length; j++) {
        vel[j].y -= 12 * dt;          // gravity
        pos[j*3]   += vel[j].x * dt;
        pos[j*3+1] += vel[j].y * dt;
        pos[j*3+2] += vel[j].z * dt;
      }
      pts.geometry.attributes.position.needsUpdate = true;
      (pts.material as THREE.PointsMaterial).opacity = Math.max(0, pts.__life);
    }
  }
}

// ─── Sound engine ────────────────────────────────────────────────────────────
class SoundEngine {
  private ctx: AudioContext | null = null;
  private engineGain!: GainNode;
  private engineOsc!: OscillatorNode;
  private engineRunning = false;

  private tryInit() {
    if (this.ctx) return;
    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.value = 0;
      this.engineGain.connect(this.ctx.destination);

      this.engineOsc = this.ctx.createOscillator();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.value = 80;

      // Add some harmonic distortion to make it sound more like an engine
      const dist = this.ctx.createWaveShaper();
      const curve = new Float32Array(256);
      for (let i = 0; i < 256; i++) {
        const x = (i * 2) / 256 - 1;
        curve[i] = ((Math.PI + 200) * x) / (Math.PI + 200 * Math.abs(x));
      }
      dist.curve = curve;

      this.engineOsc.connect(dist);
      dist.connect(this.engineGain);
      this.engineOsc.start();
      this.engineRunning = true;
    } catch { /* no audio */ }
  }

  start() {
    this.tryInit();
    if (!this.ctx || !this.engineRunning) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
    this.engineGain.gain.setTargetAtTime(0.04, this.ctx.currentTime, 0.3);
  }

  stop() {
    if (!this.ctx || !this.engineRunning) return;
    this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.4);
  }

  updateEngine(speedFraction: number) {
    if (!this.ctx || !this.engineRunning) return;
    // Map speed 0-1 → pitch 80-320 Hz
    const freq = 80 + speedFraction * 240;
    this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.08);
    const vol  = 0.025 + speedFraction * 0.055;
    this.engineGain.gain.setTargetAtTime(vol, this.ctx.currentTime, 0.1);
  }

  playCrash() {
    this.tryInit();
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.6, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / data.length * 3);
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const g = this.ctx.createGain(); g.gain.value = 0.35;
    src.connect(g); g.connect(this.ctx.destination); src.start();
  }

  playHorn() {
    this.tryInit();
    if (!this.ctx) return;
    const osc = this.ctx.createOscillator();
    osc.frequency.value = 420;
    const g = this.ctx.createGain(); g.gain.value = 0.12;
    osc.connect(g); g.connect(this.ctx.destination);
    osc.start(); osc.stop(this.ctx.currentTime + 0.18);
  }

  playSkid() {
    this.tryInit();
    if (!this.ctx) return;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.3, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / data.length) * 0.15;
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.connect(this.ctx.destination); src.start();
  }
}

// ─── Sky ─────────────────────────────────────────────────────────────────────
function buildSky(scene: THREE.Scene) {
  // Gradient sky dome using a large sphere with vertex colours
  const geo = new THREE.SphereGeometry(480, 16, 10);
  const colors: number[] = [];
  const posArr = geo.attributes.position.array as Float32Array;

  const horizon = new THREE.Color(0xffd09a);
  const zenith  = new THREE.Color(0x3a7ab5);
  const ground  = new THREE.Color(0x1a4a0a);

  for (let i = 0; i < posArr.length; i += 3) {
    const y = posArr[i + 1];
    const t = Math.max(0, Math.min(1, (y + 480) / 960));
    let c: THREE.Color;
    if (t > 0.5) {
      c = horizon.clone().lerp(zenith, (t - 0.5) * 2);
    } else {
      c = ground.clone().lerp(horizon, t * 2);
    }
    colors.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

  const mat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide });
  const sky  = new THREE.Mesh(geo, mat);
  scene.add(sky);
  return sky;
}

// ─── Sun halo ─────────────────────────────────────────────────────────────────
function buildSunHalo(scene: THREE.Scene) {
  const mat = new THREE.MeshBasicMaterial({
    color: 0xfffbe0, transparent: true, opacity: 0.92, side: THREE.DoubleSide,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4, 24), mat);
  disc.position.set(120, 90, -400);
  scene.add(disc);

  // Glow ring
  const glowMat = new THREE.MeshBasicMaterial({
    color: 0xffdd88, transparent: true, opacity: 0.22, side: THREE.DoubleSide,
  });
  const glow = new THREE.Mesh(new THREE.RingGeometry(4, 12, 24), glowMat);
  glow.position.copy(disc.position);
  scene.add(glow);

  return { disc, glow };
}

// ─────────────────────────────────────────────────────────────────────────────
// GameEngine
// ─────────────────────────────────────────────────────────────────────────────
export class GameEngine {
  private renderer: THREE.WebGLRenderer;
  private scene:    THREE.Scene;
  private camera:   THREE.PerspectiveCamera;

  private controls: Controls;
  private road:     Road;
  private player:   Player;
  private traffic:  TrafficManager;
  private particles: ParticleSystem;
  private sounds:   SoundEngine;

  private sun!: THREE.DirectionalLight;
  private sky!: THREE.Mesh;

  // State
  private gameState: GameState = 'menu';
  private score      = 0;
  private bestScore  = parseInt(localStorage.getItem('hr_best') ?? '0', 10);
  private distance   = 0;   // metres
  private combo      = 0;
  private comboTimer = 0;   // seconds remaining
  private COMBO_WINDOW = 5; // seconds between overtakes to maintain combo

  private scoreEvents: ScoreEvent[] = [];
  private eventIdCounter = 0;

  private animFrameId: number | null = null;
  private lastTime: number | null    = null;

  private prevLeft  = false;
  private prevRight = false;

  // Camera shake
  private shakeAmount = 0;

  public onUpdate?: (data: GameData) => void;

  // ──────────────────────────────────────────────────── constructor
  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled   = true;
    this.renderer.shadowMap.type      = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping         = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.outputColorSpace    = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0xd0c0a0, 0.0032);

    this.camera = new THREE.PerspectiveCamera(
      60, window.innerWidth / window.innerHeight, 0.1, 600,
    );
    this.camera.position.set(0, CAMERA_HEIGHT, CAMERA_BEHIND);

    this.setupLights();
    buildSky(this.scene);
    buildSunHalo(this.scene);

    this.controls = new Controls();
    this.controls.attach();

    this.road    = new Road(this.scene);
    this.player  = new Player(this.scene);
    this.particles = new ParticleSystem(this.scene);
    this.sounds    = new SoundEngine();

        // Load GLB models BEFORE creating traffic
    preloadModels().then(() => {
      console.log('✅ All models loaded');
      
      // Создаём TrafficManager ПОСЛЕ загрузки моделей
      this.traffic = new TrafficManager(this.scene, (pts, label) => {
        if (this.gameState !== 'playing') return;

        // Combo multiplier
        this.comboTimer = this.COMBO_WINDOW;
        this.combo++;
        const multiplier = Math.min(this.combo, 8);
        const earned     = pts * multiplier;
        this.score += earned;

        const displayLabel = multiplier > 1
          ? `${label ?? `+${pts}`} ×${multiplier}`
          : (label ?? `+${pts}`);

        this.pushEvent(displayLabel);

        // Play horn sound on near miss
        if (pts >= 50) this.sounds.playHorn();
      });
      
      this.traffic.spawnInitial(this.player.worldZ);
    }).catch((err) => {
      console.error('❌ Failed to load models:', err);
      // Fallback: создаём без GLB моделей
      this.traffic = new TrafficManager(this.scene, (pts, label) => {
        if (this.gameState !== 'playing') return;
        this.comboTimer = this.COMBO_WINDOW;
        this.combo++;
        const multiplier = Math.min(this.combo, 8);
        const earned     = pts * multiplier;
        this.score += earned;
        const displayLabel = multiplier > 1
          ? `${label ?? `+${pts}`} ×${multiplier}`
          : (label ?? `+${pts}`);
        this.pushEvent(displayLabel);
        if (pts >= 50) this.sounds.playHorn();
      });
      this.traffic.spawnInitial(this.player.worldZ);
    });

    window.addEventListener('resize', this.handleResize);
    this.beginLoop();
  }

  // ──────────────────────────────────────────────────── lights
  private setupLights() {
    const ambient = new THREE.AmbientLight(0xffeedd, 0.45);
    this.scene.add(ambient);

    this.sun = new THREE.DirectionalLight(0xfff5dd, 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.camera.near   = 1;
    this.sun.shadow.camera.far    = 220;
    this.sun.shadow.camera.left   = -45;
    this.sun.shadow.camera.right  =  45;
    this.sun.shadow.camera.top    =  45;
    this.sun.shadow.camera.bottom = -45;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.bias          = -0.0008;
    this.sun.shadow.normalBias    =  0.02;
    this.scene.add(this.sun.target);
    this.scene.add(this.sun);

    // Warm fill from below (ground bounce)
    const fill = new THREE.HemisphereLight(0xb0d8ff, 0x4a8820, 0.55);
    this.scene.add(fill);
  }

  // ──────────────────────────────────────────────────── resize
  private handleResize = () => {
    const w = window.innerWidth, h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(w, h);
  };

  // ──────────────────────────────────────────────────── public API
  start() {
    this.score    = 0;
    this.distance = 0;
    this.combo    = 0;
    this.comboTimer = 0;
    this.scoreEvents = [];
    this.gameState   = 'playing';
    this.player.reset();
    this.traffic.reset(this.player.worldZ);
    this.controls.reset();
    this.prevLeft = this.prevRight = false;
    this.shakeAmount = 0;
    this.camera.position.set(this.player.x, CAMERA_HEIGHT, this.player.worldZ + CAMERA_BEHIND);
    this.sounds.start();
  }

  togglePause() {
    if (this.gameState === 'playing') {
      this.gameState = 'paused';
      this.lastTime  = null;
      this.sounds.stop();
    } else if (this.gameState === 'paused') {
      this.gameState = 'playing';
      this.sounds.start();
    }
    this.notify();
  }

  restart() { this.start(); }

  dispose() {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId);
    this.controls.detach();
    window.removeEventListener('resize', this.handleResize);
    this.renderer.dispose();
    this.sounds.stop();
  }

  // ──────────────────────────────────────────────────── loop
  private beginLoop() {
    this.lastTime = null;
    const loop = (time: number) => {
      this.animFrameId = requestAnimationFrame(loop);
      this.tick(time);
    };
    this.animFrameId = requestAnimationFrame(loop);
  }

  private tick(time: number) {
    const dt = this.lastTime === null ? 0 : Math.min((time - this.lastTime) / 1000, 0.05);
    this.lastTime = time;

    if (this.gameState === 'playing' && dt > 0) {
      // Lane changes
      if (this.controls.left  && !this.prevLeft)  {
        this.player.moveLeft();
        this.particles.skid(new THREE.Vector3(this.player.x, 0, this.player.worldZ));
        this.sounds.playSkid();
      }
      if (this.controls.right && !this.prevRight) {
        this.player.moveRight();
        this.particles.skid(new THREE.Vector3(this.player.x, 0, this.player.worldZ));
        this.sounds.playSkid();
      }
      this.prevLeft  = this.controls.left;
      this.prevRight = this.controls.right;

      this.player.update(dt, this.controls);

      // Distance in metres (1 world unit ≈ 1 metre at this scale)
      this.distance += this.player.speed * dt;

      // Combo timeout
      if (this.comboTimer > 0) {
        this.comboTimer -= dt;
        if (this.comboTimer <= 0) this.combo = 0;
      }

      this.road.update(this.player.worldZ);
      this.traffic.update(dt, this.player.worldZ, this.player.x);
      this.particles.update(dt);

      // Camera shake at high speed
      const speedFrac = (this.player.speed - PLAYER_MIN_SPEED) / (PLAYER_MAX_SPEED - PLAYER_MIN_SPEED);
      

      // Engine sound
      this.sounds.updateEngine(speedFrac);

      // Collision
      if (checkCollision(this.player, this.traffic)) {
        this.handleGameOver();
        return;
      }

      // Purge old score events
      const now = time;
      this.scoreEvents = this.scoreEvents.filter(e => now - e.timestamp < 1800);
    }

    this.updateCamera(dt);

    // Sun follows player
    this.sun.position.set(this.player.x + 60, 80, this.player.worldZ + 40);
    this.sun.target.position.set(this.player.x, 0, this.player.worldZ - 10);
    this.sun.target.updateMatrixWorld();

    this.renderer.render(this.scene, this.camera);
    this.notify();
  }

  // ──────────────────────────────────────────────────── camera

 private updateCamera(_dt: number) {
  const px = this.player.x;
  const pz = this.player.worldZ;

  this.camera.position.x = px;
  this.camera.position.y = CAMERA_HEIGHT;
  this.camera.position.z = pz + CAMERA_BEHIND;

  const speedFrac = (this.player.speed - PLAYER_MIN_SPEED) / (PLAYER_MAX_SPEED - PLAYER_MIN_SPEED);
  if (speedFrac > 0.3) {
    const shake = (speedFrac - 0.3) * 0.06;
    this.camera.position.x += (Math.random() - 0.5) * shake;
    this.camera.position.y += (Math.random() - 0.5) * shake * 0.4;
  }

  this.camera.lookAt(px, 0.5, pz);
}

   
  

  // ──────────────────────────────────────────────────── game-over
  private handleGameOver() {
    this.sounds.playCrash();
    // Explosion particles at player position
    this.particles.burst(
      new THREE.Vector3(this.player.x, 0.5, this.player.worldZ),
      60, '#ff6600',
    );
    this.particles.burst(
      new THREE.Vector3(this.player.x, 0.5, this.player.worldZ),
      30, '#ffdd00',
    );
    this.sounds.stop();
    if (this.score > this.bestScore) {
      this.bestScore = this.score;
      localStorage.setItem('hr_best', String(this.bestScore));
    }
    this.gameState = 'gameover';
  }

  private pushEvent(label: string) {
    this.scoreEvents.unshift({ label, id: this.eventIdCounter++, timestamp: performance.now() });
    if (this.scoreEvents.length > 5) this.scoreEvents.pop();
  }

  // ──────────────────────────────────────────────────── HUD
  private notify() {
    this.onUpdate?.({
      state:       this.gameState,
      speed:       this.player.kmh,
      score:       this.score,
      bestScore:   this.bestScore,
      distance:    Math.floor(this.distance),
      combo:       this.combo,
      scoreEvents: [...this.scoreEvents],
    });
  }
}
