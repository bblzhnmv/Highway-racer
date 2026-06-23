import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameData } from './game/GameEngine';
import { HUD } from './components/HUD';

const INITIAL_DATA: GameData = {
  state: 'menu',
  speed: 0,
  score: 0,
  bestScore: parseInt(localStorage.getItem('hr_best') ?? '0', 10),
  distance: 0,
  combo: 0,
  scoreEvents: [],
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameData, setGameData] = useState<GameData>(INITIAL_DATA);

  const [webglError, setWebglError] = useState(false);

  // Create the game engine once when the canvas is ready
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check WebGL support before creating the engine
    const testGl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (!testGl) {
      setWebglError(true);
      return;
    }

    let engine: GameEngine;
    try {
      engine = new GameEngine(canvas);
    } catch {
      setWebglError(true);
      return;
    }

    // The engine calls this every frame to update the HUD
    engine.onUpdate = setGameData;
    engineRef.current = engine;

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Keyboard shortcut: P to pause / resume
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyP') engineRef.current?.togglePause();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, []);

  const handleStart   = useCallback(() => engineRef.current?.start(), []);
  const handlePause   = useCallback(() => engineRef.current?.togglePause(), []);
  const handleRestart = useCallback(() => engineRef.current?.restart(), []);

  if (webglError) {
    return (
      <div style={{
        width: '100vw', height: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#111', color: '#fff',
        fontFamily: 'Inter, sans-serif', gap: '1rem', textAlign: 'center', padding: '2rem',
      }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 900 }}>WebGL Not Available</h1>
        <p style={{ color: 'rgba(255,255,255,0.7)', maxWidth: 400 }}>
          This game requires WebGL. Please open it in a modern desktop browser
          (Chrome, Firefox, or Edge) with hardware acceleration enabled.
        </p>
      </div>
    );
  }

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', position: 'relative', background: '#000' }}>
      {/* Three.js renders into this canvas */}
      <canvas
        ref={canvasRef}
        style={{ display: 'block', width: '100%', height: '100%' }}
      />

      {/* React HUD overlaid on top */}
      <HUD
        data={gameData}
        onStart={handleStart}
        onPause={handlePause}
        onRestart={handleRestart}
      />
    </div>
  );
}
