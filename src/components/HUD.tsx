import { GameData, ScoreEvent } from '../game/GameEngine';

interface HUDProps {
  data: GameData;
  onStart: () => void;
  onPause: () => void;
  onRestart: () => void;
}

// ─── Menu ────────────────────────────────────────────────────────────────────
function MenuScreen({ onStart, bestScore }: { onStart: () => void; bestScore: number }) {
  return (
    <div className="hud-overlay">
      <h1 className="hud-title">HIGHWAY<br/>RACER</h1>
      <p className="hud-subtitle">Overtake traffic to score points!</p>

      {bestScore > 0 && (
        <div className="best-score-badge">BEST: {bestScore}</div>
      )}

      <div className="controls-grid">
        <div className="control-row"><span className="key">W / ↑</span><span>Accelerate</span></div>
        <div className="control-row"><span className="key">S / ↓</span><span>Brake</span></div>
        <div className="control-row"><span className="key">A / ←</span><span>Lane Left</span></div>
        <div className="control-row"><span className="key">D / →</span><span>Lane Right</span></div>
        <div className="control-row"><span className="key">P</span><span>Pause</span></div>
      </div>

      <div className="scoring-hints">
        <span>+10 overtake</span>
        <span>·</span>
        <span>+25 close pass</span>
        <span>·</span>
        <span>+50 near miss</span>
        <span>·</span>
        <span>combo multiplier!</span>
      </div>

      <button className="hud-btn primary-btn" onClick={onStart}>START GAME</button>
    </div>
  );
}

// ─── Game Over ───────────────────────────────────────────────────────────────
function GameOverScreen({ score, bestScore, distance, onRestart }: {
  score: number; bestScore: number; distance: number; onRestart: () => void;
}) {
  const isNewBest = score === bestScore && score > 0;
  return (
    <div className="hud-overlay">
      <h1 className="hud-title gameover-title">GAME OVER</h1>
      {isNewBest && <p className="new-best-banner">🏆 NEW BEST!</p>}
      <div className="score-display">
        <div className="score-row"><span className="score-label">SCORE</span><span className="score-value">{score}</span></div>
        <div className="score-row"><span className="score-label">BEST</span><span className="score-value best-colour">{bestScore}</span></div>
        <div className="score-row"><span className="score-label">DISTANCE</span><span className="score-value">{distance}m</span></div>
      </div>
      <button className="hud-btn primary-btn" onClick={onRestart}>PLAY AGAIN</button>
    </div>
  );
}

// ─── Paused ──────────────────────────────────────────────────────────────────
function PausedScreen({ onResume, onRestart }: { onResume: () => void; onRestart: () => void }) {
  return (
    <div className="hud-overlay semi-overlay">
      <h2 className="paused-title">PAUSED</h2>
      <button className="hud-btn primary-btn" onClick={onResume}>RESUME</button>
      <button className="hud-btn secondary-btn" onClick={onRestart}>RESTART</button>
    </div>
  );
}

// ─── Speedometer canvas ──────────────────────────────────────────────────────
function Speedometer({ speed }: { speed: number }) {
  const MAX = 220;
  const pct = Math.min(speed / MAX, 1);

  // Color: green → yellow → red
  let color = '#00e676';
  if (pct > 0.55) color = '#ffeb3b';
  if (pct > 0.78) color = '#ff5252';

  const arcStyle: React.CSSProperties = {
    background: `conic-gradient(${color} ${pct * 270}deg, transparent 0deg)`,
  };

  return (
    <div className="speedometer-wrap">
      <div className="speedometer-arc-bg" />
      <div className="speedometer-arc" style={arcStyle} />
      <div className="speedometer-inner">
        <span className="speed-number">{speed}</span>
        <span className="speed-unit">km/h</span>
      </div>
    </div>
  );
}

// ─── Score popups ────────────────────────────────────────────────────────────
function ScorePopups({ events }: { events: ScoreEvent[] }) {
  return (
    <div style={{
      position: 'absolute',
      top: '5.5rem',
      left: '50%',
      transform: 'translateX(-50%)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '0.2rem',
      pointerEvents: 'none',
    }}>
      {events.map(e => (
        <div key={e.id} className="score-popup">{e.label}</div>
      ))}
    </div>
  );
}

// ─── Combo indicator ─────────────────────────────────────────────────────────
function ComboBar({ combo }: { combo: number }) {
  if (combo <= 1) return null;
  const mult = Math.min(combo, 8);
  return (
    <div style={{
      position: 'absolute',
      top: '3.2rem',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'linear-gradient(135deg, rgba(255,180,0,0.25), rgba(255,80,0,0.25))',
      border: '1px solid rgba(255,160,0,0.5)',
      borderRadius: '100px',
      padding: '0.18rem 0.75rem',
      pointerEvents: 'none',
    }}>
      <span style={{
        fontSize: '0.72rem',
        fontWeight: 900,
        letterSpacing: '0.1em',
        color: '#ffcc00',
        textShadow: '0 0 8px rgba(255,200,0,0.7)',
      }}>×{mult} COMBO</span>
    </div>
  );
}

// ─── Playing HUD ─────────────────────────────────────────────────────────────
function PlayingHUD({ data, onPause }: { data: GameData; onPause: () => void }) {
  const { speed, score, bestScore, distance, combo, scoreEvents } = data;
  return (
    <>
      {/* Speed — bottom-left */}
      <Speedometer speed={speed} />

      {/* Score — top-right */}
      <div className="hud-score-box">
        <div className="hud-score-row">
          <span className="hud-score-label">SCORE</span>
          <span className="hud-score-val">{score}</span>
        </div>
        <div className="hud-score-row">
          <span className="hud-score-label">BEST</span>
          <span className="hud-score-val best-colour">{bestScore}</span>
        </div>
        <div className="hud-score-row">
          <span className="hud-score-label">DIST</span>
          <span className="hud-score-val">{distance}m</span>
        </div>
      </div>

      {/* Combo */}
      <ComboBar combo={combo} />

      {/* Score popups */}
      <ScorePopups events={scoreEvents} />

      {/* Pause button */}
      <button className="hud-pause-btn" onClick={onPause} title="Pause (P)">⏸</button>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export function HUD({ data, onStart, onPause, onRestart }: HUDProps) {
  const { state } = data;

  if (state === 'menu') return <MenuScreen onStart={onStart} bestScore={data.bestScore} />;
  if (state === 'gameover') return (
    <GameOverScreen
      score={data.score} bestScore={data.bestScore}
      distance={data.distance} onRestart={onRestart}
    />
  );

  return (
    <>
      <PlayingHUD data={data} onPause={onPause} />
      {state === 'paused' && <PausedScreen onResume={onPause} onRestart={onRestart} />}
    </>
  );
}
