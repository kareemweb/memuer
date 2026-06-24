import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Play, RotateCcw, Volume2, Award, ShieldAlert, Zap, Flame, Sparkles } from 'lucide-react';

interface GameProps {
  onClose: () => void;
}

type Difficulty = 'easy' | 'medium' | 'hard';

function VirtualJoystick({ onChange }: { onChange: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const knobRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(false);
  const touchIdRef = useRef<number | null>(null);

  useEffect(() => {
    const handleMove = (clientX: number, clientY: number) => {
      const base = baseRef.current;
      const knob = knobRef.current;
      if (!base || !knob) return;

      const rect = base.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      let dx = clientX - centerX;
      let dy = clientY - centerY;

      const maxRadius = rect.width / 2 - 14; 
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance > maxRadius) {
        dx = (dx / distance) * maxRadius;
        dy = (dy / distance) * maxRadius;
      }

      knob.style.transform = `translate(${dx}px, ${dy}px)`;
      onChange(dx / maxRadius, dy / maxRadius);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (activeRef.current) return;
      const touch = e.changedTouches[0];
      if (!touch) return;
      
      activeRef.current = true;
      touchIdRef.current = touch.identifier;
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!activeRef.current || touchIdRef.current === null) return;
      for (let i = 0; i < e.touches.length; i++) {
        if (e.touches[i].identifier === touchIdRef.current) {
          handleMove(e.touches[i].clientX, e.touches[i].clientY);
          break;
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (!activeRef.current || touchIdRef.current === null) return;
      let ended = false;
      for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === touchIdRef.current) {
          ended = true;
          break;
        }
      }

      if (ended) {
        activeRef.current = false;
        touchIdRef.current = null;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        onChange(0, 0);
      }
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (activeRef.current) return;
      activeRef.current = true;
      handleMove(e.clientX, e.clientY);
      
      const handleMouseMove = (me: MouseEvent) => {
        if (!activeRef.current) return;
        handleMove(me.clientX, me.clientY);
      };

      const handleMouseUp = () => {
        activeRef.current = false;
        if (knobRef.current) {
          knobRef.current.style.transform = 'translate(0px, 0px)';
        }
        onChange(0, 0);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    };

    const baseEl = baseRef.current;
    if (baseEl) {
      baseEl.addEventListener('touchstart', handleTouchStart, { passive: false });
      baseEl.addEventListener('mousedown', handleMouseDown);
    }
    
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      if (baseEl) {
        baseEl.removeEventListener('touchstart', handleTouchStart);
        baseEl.removeEventListener('mousedown', handleMouseDown);
      }
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [onChange]);

  return (
    <div 
      ref={baseRef}
      className="relative w-28 h-28 bg-zinc-900 border-2 border-zinc-800 rounded-full flex items-center justify-center p-1 select-none touch-none shadow-xl shadow-black/60"
    >
      <div className="absolute inset-2 border border-zinc-800/40 rounded-full pointer-events-none" />
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/[0.02] to-transparent pointer-events-none" />
      <div className="absolute w-[1px] h-full bg-zinc-800/30 left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute h-[1px] w-full bg-zinc-800/30 top-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute w-3 h-3 rounded-full bg-zinc-800/80 border border-zinc-700/50 pointer-events-none" />

      <div
        ref={knobRef}
        className="absolute w-12 h-12 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 border border-amber-300/40 flex items-center justify-center text-white cursor-grab active:cursor-grabbing shadow-lg shadow-amber-950/30 select-none touch-none transition-shadow hover:shadow-amber-500/10 pointer-events-auto"
        style={{ transform: 'translate(0px, 0px)', willChange: 'transform' }}
      >
        <div className="w-8 h-8 rounded-full border border-white/20 bg-white/10 flex items-center justify-center">
          <div className="w-3 h-3 rounded-full bg-white/40 shadow-inner" />
        </div>
      </div>
    </div>
  );
}

export function EgyptFootballGame({ onClose }: GameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium');
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'gameover'>('menu');
  const [egyptScore, setEgyptScore] = useState(0);
  const [iranScore, setIranScore] = useState(0);
  const [timer, setTimer] = useState(60); // 60 seconds match
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [announcement, setAnnouncement] = useState<string | null>(null);

  // Cool down states and refs
  const [goalCooldown, setGoalCooldown] = useState(0);
  const goalCooldownRef = useRef(false);
  const [opponentStunned, setOpponentStunned] = useState(false);
  const opponentStunnedRef = useRef(false);
  const [tackleCooldown, setTackleCooldown] = useState(0);
  const tackleCooldownRef = useRef(0);
  
  // Single keypress state refs
  const shootKeyPressedRef = useRef(false);
  const tackleKeyPressedRef = useRef(false);
  const tackleActiveRef = useRef(false);

  // Visual effects and ball-stuck detection
  const shootEffectRef = useRef<{ x: number; y: number; radius: number; opacity: number } | null>(null);
  const tackleEffectRef = useRef<{ x: number; y: number; type: 'success' | 'lunge'; duration: number } | null>(null);
  const ballStuckTimeRef = useRef<number | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const requestRef = useRef<number | null>(null);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Keyboard input states
  const keysRef = useRef<{ [key: string]: boolean }>({});

  // Mobile virtual joystick/button states
  const mobileInputRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Game object positions and velocities
  const ballRef = useRef({
    x: 300,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 12,
    friction: 0.985,
  });

  const playerRef = useRef({
    x: 150,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 18,
    speed: 5.2,
  });

  const opponentRef = useRef({
    x: 450,
    y: 200,
    vx: 0,
    vy: 0,
    radius: 18,
    speed: 3.5, // depends on difficulty
  });

  // Goal dimensions
  const pitchWidth = 600;
  const pitchHeight = 400;
  const goalHeight = 120;
  const goalTop = (pitchHeight - goalHeight) / 2;
  const goalBottom = goalTop + goalHeight;

  // Sound effects generator
  const playSynthSound = (type: 'whistle' | 'kick' | 'goal' | 'cheer' | 'boo' | 'tackle' | 'shoot') => {
    if (!soundEnabled) return;
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContextClass) return;
      const ctx = new AudioContextClass();
      const now = ctx.currentTime;

      if (type === 'whistle') {
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        osc1.frequency.setValueAtTime(1800, now);
        osc2.frequency.setValueAtTime(1820, now);
        
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.05);
        gain.gain.linearRampToValueAtTime(0.15, now + 0.25);
        gain.gain.linearRampToValueAtTime(0, now + 0.35);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(ctx.destination);
        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.35);
        osc2.stop(now + 0.35);
      } else if (type === 'kick') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(150, now);
        osc.frequency.exponentialRampToValueAtTime(40, now + 0.1);
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.1);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
      } else if (type === 'shoot') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(320, now);
        osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.15);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.15);
      } else if (type === 'tackle') {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(600, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.2);
        gain.gain.setValueAtTime(0.25, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.2);
      } else if (type === 'goal') {
        // High ascending cheer sweep
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.6);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.6);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 0.6);
      } else if (type === 'cheer') {
        // Generate noise for crowd roar
        const bufferSize = ctx.sampleRate * 2.5;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let j = 0; j < bufferSize; j++) {
          data[j] = Math.random() * 2 - 1;
        }

        const noise = ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(400, now);
        filter.frequency.exponentialRampToValueAtTime(800, now + 0.4);
        filter.frequency.exponentialRampToValueAtTime(300, now + 2.0);
        filter.Q.value = 1.5;

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, now);
        gain.gain.linearRampToValueAtTime(0.2, now + 0.3);
        gain.gain.exponentialRampToValueAtTime(0.1, now + 1.5);
        gain.gain.linearRampToValueAtTime(0, now + 2.5);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        noise.start(now);
        noise.stop(now + 2.5);
      }
    } catch (e) {
      console.warn("WebAudio synthesis error:", e);
    }
  };

  const startGame = () => {
    setEgyptScore(0);
    setIranScore(0);
    setTimer(60);
    setGameState('playing');
    setAnnouncement('READY...');
    resetPositions();

    goalCooldownRef.current = true;
    setGoalCooldown(3);
    opponentStunnedRef.current = false;
    setOpponentStunned(false);
    tackleCooldownRef.current = 0;
    setTackleCooldown(0);
    shootEffectRef.current = null;
    tackleEffectRef.current = null;
    ballStuckTimeRef.current = null;

    playSynthSound('kick');

    // Trigger initial 3-second kickoff countdown
    const cdInterval = setInterval(() => {
      setGoalCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(cdInterval);
          setAnnouncement('KICK OFF!');
          playSynthSound('whistle');
          setTimeout(() => {
            playSynthSound('cheer');
          }, 150);
          setTimeout(() => {
            setAnnouncement(null);
            goalCooldownRef.current = false;
          }, 1200);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Setup timer
    if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current!);
          setGameState('gameover');
          playSynthSound('whistle');
          return 0;
        }
        // Match timer is paused during the 3-second kickoff countdown!
        if (goalCooldownRef.current) {
          return prev;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetPositions = () => {
    // Reset positions to match starts
    ballRef.current.x = 300;
    ballRef.current.y = 200;
    ballRef.current.vx = 0;
    ballRef.current.vy = 0;

    playerRef.current.x = 150;
    playerRef.current.y = 200;
    playerRef.current.vx = 0;
    playerRef.current.vy = 0;

    opponentRef.current.x = 450;
    opponentRef.current.y = 200;
    opponentRef.current.vx = 0;
    opponentRef.current.vy = 0;
  };

  const handleShoot = () => {
    if (gameState !== 'playing' || goalCooldownRef.current) return;
    const ball = ballRef.current;
    const player = playerRef.current;
    const dx = ball.x - player.x;
    const dy = ball.y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Shooting range (increased to 50 for great response on tablet and keyboard)
    if (dist < 50) {
      playSynthSound('shoot');
      const force = 18.5;
      
      // If player is moving, shoot in the player's movement direction. Otherwise, shoot in the direction of the ball.
      let shootX = dx;
      let shootY = dy;
      if (player.vx !== 0 || player.vy !== 0) {
        shootX = player.vx;
        shootY = player.vy;
      }
      
      const shootDist = Math.sqrt(shootX * shootX + shootY * shootY);
      if (shootDist > 0) {
        ball.vx = (shootX / shootDist) * force;
        ball.vy = (shootY / shootDist) * force;
      } else {
        ball.vx = force; // fallback forward
        ball.vy = 0;
      }

      // Add a nice visual indicator of a powerful shot
      shootEffectRef.current = { x: ball.x, y: ball.y, radius: 10, opacity: 1 };
    }
  };

  const handleTackle = () => {
    if (gameState !== 'playing' || goalCooldownRef.current) return;
    if (tackleCooldownRef.current > 0 || tackleActiveRef.current) return;

    // Trigger tackle lunge
    tackleActiveRef.current = true;
    playSynthSound('tackle');

    const player = playerRef.current;
    let dx = player.vx;
    let dy = player.vy;
    
    // If player is not moving, tackle towards the ball
    if (dx === 0 && dy === 0) {
      const ball = ballRef.current;
      dx = ball.x - player.x;
      dy = ball.y - player.y;
    }

    const dist = Math.sqrt(dx * dx + dy * dy);
    const speedMultiplier = 2.4;
    
    if (dist > 0.1) {
      player.vx = (dx / dist) * player.speed * speedMultiplier;
      player.vy = (dy / dist) * player.speed * speedMultiplier;
      player.x += player.vx * 1.5; // instant initial lunge burst
      player.y += player.vy * 1.5;
    }

    // After 150ms, end the tackle lunge
    setTimeout(() => {
      tackleActiveRef.current = false;
    }, 150);

    // Put tackle on cooldown for 2.5 seconds
    tackleCooldownRef.current = 2.5;
    setTackleCooldown(2.5);

    // Decrement visual cooldown state
    const cdInterval = setInterval(() => {
      setTackleCooldown((prev) => {
        const nextVal = Math.max(0, prev - 0.1);
        if (nextVal <= 0) {
          clearInterval(cdInterval);
        }
        return nextVal;
      });
    }, 100);

    // Check for collision with the opponent or ball to steal it
    const opponent = opponentRef.current;
    const ball = ballRef.current;
    const odx = opponent.x - player.x;
    const ody = opponent.y - player.y;
    const odist = Math.sqrt(odx * odx + ody * ody);

    // Stun opponent if in tackle range
    if (odist < 55) {
      // Successful Tackle!
      playSynthSound('whistle');
      
      // Stun the opponent AI for 1.2 seconds!
      opponentStunnedRef.current = true;
      setOpponentStunned(true);
      setTimeout(() => {
        opponentStunnedRef.current = false;
        setOpponentStunned(false);
      }, 1200);

      // Place the ball nicely in front of Egypt player
      ball.x = player.x + 24;
      ball.y = player.y;
      ball.vx = 4; // slow roll forward
      ball.vy = 0;

      // Draw a successful tackle splash
      tackleEffectRef.current = { x: player.x + odx/2, y: player.y + ody/2, type: 'success', duration: 300 };
    } else {
      // Missed tackle lunge effect
      tackleEffectRef.current = { x: player.x, y: player.y, type: 'lunge', duration: 150 };
    }
  };

  // Keyboard handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysRef.current[key] = true;
      
      // Instantly trigger defensive fallback on 'r' key
      if (key === 'r') {
        playerRef.current.x = 150;
        playerRef.current.y = 200;
        playerRef.current.vx = 0;
        playerRef.current.vy = 0;
        playSynthSound('kick');
      }

      // Prevent browser scrolling with arrow keys inside the game modal
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current[e.key.toLowerCase()] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  // Set CPU opponent speed based on difficulty
  const getOpponentSpeed = () => {
    switch (difficulty) {
      case 'easy': return 2.2;
      case 'medium': return 3.2;
      case 'hard': return 4.5;
    }
  };

  // Game loop updates
  useEffect(() => {
    if (gameState !== 'playing') return;

    const updatePhysics = () => {
      const ball = ballRef.current;
      const player = playerRef.current;
      const opponent = opponentRef.current;

      // If we are in a goal kickoff cooldown, freeze positions
      if (goalCooldownRef.current) {
        ball.x = 300;
        ball.y = 200;
        ball.vx = 0;
        ball.vy = 0;

        player.x = 150;
        player.y = 200;
        player.vx = 0;
        player.vy = 0;

        opponent.x = 450;
        opponent.y = 200;
        opponent.vx = 0;
        opponent.vy = 0;
        return;
      }

      // --- Single Keydown Triggers within Physics Frame ---
      if (keysRef.current[' '] || keysRef.current['f'] || keysRef.current['k']) {
        if (!shootKeyPressedRef.current) {
          handleShoot();
          shootKeyPressedRef.current = true;
        }
      } else {
        shootKeyPressedRef.current = false;
      }

      if (keysRef.current['shift'] || keysRef.current['e'] || keysRef.current['j']) {
        if (!tackleKeyPressedRef.current) {
          handleTackle();
          tackleKeyPressedRef.current = true;
        }
      } else {
        tackleKeyPressedRef.current = false;
      }

      // Update active visual effects
      if (shootEffectRef.current) {
        shootEffectRef.current.radius += 2.2;
        shootEffectRef.current.opacity -= 0.05;
        if (shootEffectRef.current.opacity <= 0) {
          shootEffectRef.current = null;
        }
      }

      // --- 1. Keyboard Controls / Player Movement ---
      let dx = 0;
      let dy = 0;

      if (keysRef.current['w'] || keysRef.current['arrowup']) dy -= 1;
      if (keysRef.current['s'] || keysRef.current['arrowdown']) dy += 1;
      if (keysRef.current['a'] || keysRef.current['arrowleft']) dx -= 1;
      if (keysRef.current['d'] || keysRef.current['arrowright']) dx += 1;

      // Virtual mobile inputs
      if (mobileInputRef.current.x !== 0 || mobileInputRef.current.y !== 0) {
        dx = mobileInputRef.current.x;
        dy = mobileInputRef.current.y;
      }

      // Normalize diagonal vector
      if (dx !== 0 && dy !== 0) {
        const length = Math.sqrt(dx * dx + dy * dy);
        dx /= length;
        dy /= length;
      }

      // If slide tackling is active, lunge is handled, otherwise normal movement
      if (!tackleActiveRef.current) {
        // Apply extra speed scaling on mobile devices to make the gameplay fast-paced and hyper-responsive
        const isMobileJoystick = mobileInputRef.current.x !== 0 || mobileInputRef.current.y !== 0;
        const currentSpeed = isMobileJoystick ? player.speed * 1.35 : player.speed;
        player.vx = dx * currentSpeed;
        player.vy = dy * currentSpeed;
      }

      player.x += player.vx;
      player.y += player.vy;

      // Keep player inside bounds
      player.x = Math.max(player.radius, Math.min(pitchWidth - player.radius, player.x));
      player.y = Math.max(player.radius, Math.min(pitchHeight - player.radius, player.y));


      // --- 2. CPU AI / Opponent Movement ---
      const opponentSpeed = getOpponentSpeed();
      
      if (opponentStunnedRef.current) {
        // Stunned by Egypt player's tackle!
        opponent.vx = 0;
        opponent.vy = 0;
      } else {
        // Calculate CPU action based on difficulty
        let targetX = 450;
        let targetY = 200;

        const distToBall = Math.sqrt((opponent.x - ball.x) ** 2 + (opponent.y - ball.y) ** 2);
        
        let shouldChase = false;
        if (difficulty === 'easy') {
          shouldChase = ball.x > 250 && distToBall < 220;
        } else if (difficulty === 'medium') {
          shouldChase = ball.x > 150;
        } else {
          shouldChase = true;
        }

        if (shouldChase) {
          // Head towards ball.
          if (ball.x > pitchWidth - 35) {
            // Ball is in the corner or near right wall. Target the ball directly or slightly left
            targetX = ball.x - 5;
          } else {
            // Normal case: stay slightly behind the ball to push it left (Egypt's side)
            targetX = ball.x + 12;
          }
          targetY = ball.y;
        } else {
          // Go back to defensive position
          targetX = 480;
          targetY = 200 + (ball.y - 200) * 0.5; // lazy tracking
        }

        // CLAMP targets exactly to physical boundary so AI can run all the way to corners to reach the ball!
        const minCPUX = opponent.radius;
        const maxCPUX = pitchWidth - opponent.radius;
        const minCPUY = opponent.radius;
        const maxCPUY = pitchHeight - opponent.radius;

        targetX = Math.max(minCPUX, Math.min(maxCPUX, targetX));
        targetY = Math.max(minCPUY, Math.min(maxCPUY, targetY));

        const cpuDx = targetX - opponent.x;
        const cpuDy = targetY - opponent.y;
        const cpuDist = Math.sqrt(cpuDx * cpuDx + cpuDy * cpuDy);

        if (cpuDist > 3) {
          opponent.vx = (cpuDx / cpuDist) * opponentSpeed;
          opponent.vy = (cpuDy / cpuDist) * opponentSpeed;
        } else {
          opponent.vx = 0;
          opponent.vy = 0;
        }
      }

      opponent.x += opponent.vx;
      opponent.y += opponent.vy;

      // Opponent bounds
      opponent.x = Math.max(opponent.radius, Math.min(pitchWidth - opponent.radius, opponent.x));
      opponent.y = Math.max(opponent.radius, Math.min(pitchHeight - opponent.radius, opponent.y));


      // --- 3. Ball Physics & Friction ---
      ball.x += ball.vx;
      ball.y += ball.vy;

      ball.vx *= ball.friction;
      ball.vy *= ball.friction;

      // Stop microscopic slides
      if (Math.abs(ball.vx) < 0.05) ball.vx = 0;
      if (Math.abs(ball.vy) < 0.05) ball.vy = 0;

      // --- Unstuck ball logic ---
      const ballInCorner = 
        (ball.x < 50 || ball.x > pitchWidth - 50) && 
        (ball.y < 50 || ball.y > pitchHeight - 50);

      if (ballInCorner && Math.abs(ball.vx) < 0.1 && Math.abs(ball.vy) < 0.1) {
        if (!ballStuckTimeRef.current) {
          ballStuckTimeRef.current = Date.now();
        } else if (Date.now() - ballStuckTimeRef.current > 1500) {
          // Ball has been stuck in corner for 1.5s, give a nudge towards the center
          const targetCX = pitchWidth / 2;
          const targetCY = pitchHeight / 2;
          const sdx = targetCX - ball.x;
          const sdy = targetCY - ball.y;
          const sdist = Math.sqrt(sdx * sdx + sdy * sdy);
          if (sdist > 0) {
            ball.vx = (sdx / sdist) * 5;
            ball.vy = (sdy / sdist) * 5;
          }
          ballStuckTimeRef.current = null;
        }
      } else {
        ballStuckTimeRef.current = null;
      }


      // --- 4. Circle Collisions (Player / Ball) ---
      [player, opponent].forEach((p, idx) => {
        const pdx = ball.x - p.x;
        const pdy = ball.y - p.y;
        const pdist = Math.sqrt(pdx * pdx + pdy * pdy);
        const minDist = p.radius + ball.radius;

        if (pdist < minDist) {
          // Play kick sound!
          if (Math.abs(p.vx) > 0.5 || Math.abs(p.vy) > 0.5 || Math.abs(ball.vx) > 1) {
            playSynthSound('kick');
          }

          // Push ball away from player (elastic elastic collision)
          const overlap = minDist - pdist;
          const forceX = pdx / pdist;
          const forceY = pdy / pdist;

          // Push out of overlap
          ball.x += forceX * overlap;
          ball.y += forceY * overlap;

          // Transfer velocity
          ball.vx = forceX * 6.5 + p.vx * 0.8;
          ball.vy = forceY * 6.5 + p.vy * 0.8;
        }
      });


      // --- 5. Goal & Boundary Collisions ---
      // Left Goal check
      if (ball.x - ball.radius <= 0) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
          // Iran scores!
          setIranScore((prev) => prev + 1);
          setAnnouncement('🇮🇷 GOAL FOR IRAN!');
          playSynthSound('goal');
          
          // Initiate 3-second cool down
          goalCooldownRef.current = true;
          setGoalCooldown(3);
          resetPositions();
          
          const cdInterval = setInterval(() => {
            setGoalCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(cdInterval);
                setAnnouncement('KICK OFF!');
                playSynthSound('whistle');
                setTimeout(() => {
                  setAnnouncement(null);
                  goalCooldownRef.current = false;
                }, 1200);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Left Wall Bounce
          ball.x = ball.radius;
          ball.vx = -ball.vx * 0.6;
        }
      }

      // Right Goal check
      if (ball.x + ball.radius >= pitchWidth) {
        if (ball.y >= goalTop && ball.y <= goalBottom) {
          // Egypt scores!
          setEgyptScore((prev) => prev + 1);
          setAnnouncement('🇪🇬 GOAL FOR EGYPT!!!');
          playSynthSound('goal');
          playSynthSound('cheer');
          
          // Initiate 3-second cool down
          goalCooldownRef.current = true;
          setGoalCooldown(3);
          resetPositions();

          const cdInterval = setInterval(() => {
            setGoalCooldown((prev) => {
              if (prev <= 1) {
                clearInterval(cdInterval);
                setAnnouncement('KICK OFF!');
                playSynthSound('whistle');
                setTimeout(() => {
                  setAnnouncement(null);
                  goalCooldownRef.current = false;
                }, 1200);
                return 0;
              }
              return prev - 1;
            });
          }, 1000);
        } else {
          // Right Wall Bounce
          ball.x = pitchWidth - ball.radius;
          ball.vx = -ball.vx * 0.6;
        }
      }

      // Top & Bottom Bounce
      if (ball.y - ball.radius <= 0) {
        ball.y = ball.radius;
        ball.vy = -ball.vy * 0.6;
      }
      if (ball.y + ball.radius >= pitchHeight) {
        ball.y = pitchHeight - ball.radius;
        ball.vy = -ball.vy * 0.6;
      }

      // Keep players from pushing ball completely out of bounds behind goal post
      if (ball.x < 15 && (ball.y < goalTop || ball.y > goalBottom)) {
        ball.x = 15;
        ball.vx = Math.abs(ball.vx) * 0.5;
      }
      if (ball.x > pitchWidth - 15 && (ball.y < goalTop || ball.y > goalBottom)) {
        ball.x = pitchWidth - 15;
        ball.vx = -Math.abs(ball.vx) * 0.5;
      }
    };

    // Draw frame
    const draw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const ball = ballRef.current;
      const player = playerRef.current;
      const opponent = opponentRef.current;

      // Clear Pitch (Grass background)
      ctx.fillStyle = '#1e3f20'; // Stadium dark green
      ctx.fillRect(0, 0, pitchWidth, pitchHeight);

      // Pitch Grass Striping
      const stripeWidth = 50;
      for (let i = 0; i < pitchWidth; i += stripeWidth * 2) {
        ctx.fillStyle = '#224624'; // slightly lighter green stripe
        ctx.fillRect(i, 0, stripeWidth, pitchHeight);
      }

      // Pitch Markings
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 3;

      // Outer border
      ctx.strokeRect(5, 5, pitchWidth - 10, pitchHeight - 10);

      // Center Line
      ctx.beginPath();
      ctx.moveTo(pitchWidth / 2, 5);
      ctx.lineTo(pitchWidth / 2, pitchHeight - 5);
      ctx.stroke();

      // Center Circle
      ctx.beginPath();
      ctx.arc(pitchWidth / 2, pitchHeight / 2, 60, 0, Math.PI * 2);
      ctx.stroke();

      // Center Spot
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.beginPath();
      ctx.arc(pitchWidth / 2, pitchHeight / 2, 4, 0, Math.PI * 2);
      ctx.fill();

      // Penalty Boxes
      // Left box
      ctx.strokeRect(5, 100, 80, 200);
      // Right box
      ctx.strokeRect(pitchWidth - 85, 100, 80, 200);

      // Penalty Spot
      ctx.beginPath();
      ctx.arc(60, 200, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pitchWidth - 60, 200, 3, 0, Math.PI * 2);
      ctx.fill();

      // Goal Nets Render
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 4;
      
      // Left goal frame
      ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.fillRect(0, goalTop, 15, goalHeight);
      ctx.strokeRect(0, goalTop, 15, goalHeight);

      // Right goal frame
      ctx.fillRect(pitchWidth - 15, goalTop, 15, goalHeight);
      ctx.strokeRect(pitchWidth - 15, goalTop, 15, goalHeight);

      // --- Draw Egypt Player ---
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ef4444'; // Red Egypt
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Egypt flag stripe representation inside circle
      ctx.fillStyle = '#000000';
      ctx.fillRect(player.x - 12, player.y + 6, 24, 6); // Black stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(player.x - 12, player.y - 2, 24, 8); // White stripe
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(player.x - 12, player.y - 12, 24, 10); // Red stripe

      // Gold eagle emblem dot
      ctx.fillStyle = '#fbbf24';
      ctx.beginPath();
      ctx.arc(player.x, player.y + 2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Egypt label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('EGY', player.x, player.y - 24);

      // --- Draw Iran Opponent ---
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#22c55e';
      ctx.beginPath();
      ctx.arc(opponent.x, opponent.y, opponent.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#22c55e'; // Green Iran
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();

      // Iran flag stripes
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(opponent.x - 12, opponent.y + 6, 24, 6); // Red stripe
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(opponent.x - 12, opponent.y - 2, 24, 8); // White stripe
      ctx.fillStyle = '#22c55e';
      ctx.fillRect(opponent.x - 12, opponent.y - 12, 24, 10); // Green stripe

      // Emblem red dot
      ctx.fillStyle = '#ef4444';
      ctx.beginPath();
      ctx.arc(opponent.x, opponent.y + 2, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Iran label
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('IRN', opponent.x, opponent.y - 24);


      // --- Draw Soccer Ball (High-fidelity Adidas Trionda Replica) ---
      ctx.save();
      
      // Translational context for rotation
      ctx.translate(ball.x, ball.y);
      const rollAngle = (ball.x + ball.y) * 0.12;
      ctx.rotate(rollAngle);

      // Base white sphere
      ctx.beginPath();
      ctx.arc(0, 0, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = '#ffffff';
      ctx.fill();

      // Curved panel colors from the picture (Trionda dynamic swooshes)
      // Panel 1: Red (Adidas branded)
      // Panel 2: Blue (FIFA branded)
      // Panel 3: Green (TRIONDA branded)
      const panelColors = ['#dc2626', '#1d4ed8', '#10b981'];

      for (let i = 0; i < 3; i++) {
        ctx.save();
        ctx.rotate((i * Math.PI * 2) / 3);

        // Draw curved elegant swoosh panel
        ctx.beginPath();
        const outerRad = ball.radius - 1.2;
        ctx.moveTo(outerRad * Math.cos(-0.35), outerRad * Math.sin(-0.35));
        
        ctx.quadraticCurveTo(
          ball.radius * 0.32 * Math.cos(0.52), 
          ball.radius * 0.32 * Math.sin(0.52),
          ball.radius * 0.8 * Math.cos(0.58), 
          ball.radius * 0.8 * Math.sin(0.58)
        );
        
        ctx.quadraticCurveTo(
          ball.radius * 0.85 * Math.cos(0.12),
          ball.radius * 0.85 * Math.sin(0.12),
          outerRad * Math.cos(-0.35),
          outerRad * Math.sin(-0.35)
        );
        
        ctx.fillStyle = panelColors[i];
        ctx.fill();

        // Draw fine high-fidelity details to resemble the picture exactly
        if (i === 0) {
          // Red Panel: White Adidas-style diagonal stripes
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
          ctx.lineWidth = 0.9;
          ctx.beginPath();
          ctx.moveTo(ball.radius * 0.72 * Math.cos(-0.1), ball.radius * 0.72 * Math.sin(-0.1));
          ctx.lineTo(ball.radius * 0.45 * Math.cos(0.22), ball.radius * 0.45 * Math.sin(0.22));
          
          ctx.moveTo(ball.radius * 0.82 * Math.cos(-0.02), ball.radius * 0.82 * Math.sin(-0.02));
          ctx.lineTo(ball.radius * 0.55 * Math.cos(0.28), ball.radius * 0.55 * Math.sin(0.28));
          
          ctx.moveTo(ball.radius * 0.92 * Math.cos(0.06), ball.radius * 0.92 * Math.sin(0.06));
          ctx.lineTo(ball.radius * 0.65 * Math.cos(0.34), ball.radius * 0.65 * Math.sin(0.34));
          ctx.stroke();
        } else if (i === 1) {
          // Blue Panel: FIFA Trophy-like shield details
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.radius * 0.64 * Math.cos(0.24), ball.radius * 0.64 * Math.sin(0.24), 1.6, 0, Math.PI * 2);
          ctx.fill();

          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 0.65;
          ctx.beginPath();
          ctx.moveTo(ball.radius * 0.64 * Math.cos(0.24), ball.radius * 0.64 * Math.sin(0.24));
          ctx.lineTo(ball.radius * 0.46 * Math.cos(0.32), ball.radius * 0.46 * Math.sin(0.32));
          ctx.stroke();
        } else if (i === 2) {
          // Green Panel: "TRIONDA" badge styling with dark dynamic curves and a white block
          ctx.strokeStyle = '#022c22';
          ctx.lineWidth = 1.1;
          ctx.beginPath();
          ctx.arc(0, 0, ball.radius * 0.62, 0.12, 0.42);
          ctx.stroke();

          // Mini badge representation
          ctx.fillStyle = '#ffffff';
          ctx.beginPath();
          ctx.arc(ball.radius * 0.66 * Math.cos(0.26), ball.radius * 0.66 * Math.sin(0.26), 1.3, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.restore();
      }

      // Fine contour lines between panels
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
      ctx.lineWidth = 0.5;
      for (let i = 0; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(0, 0);
        const lRad = (i * Math.PI * 2) / 3;
        ctx.quadraticCurveTo(
          ball.radius * 0.52 * Math.cos(lRad + 0.38),
          ball.radius * 0.52 * Math.sin(lRad + 0.38),
          ball.radius * Math.cos(lRad),
          ball.radius * Math.sin(lRad)
        );
        ctx.stroke();
      }

      ctx.restore();

      // 3D Spherical overlay and Shading
      ctx.save();
      const ballGrad = ctx.createRadialGradient(
        ball.x - ball.radius * 0.35, 
        ball.y - ball.radius * 0.35, 
        ball.radius * 0.05, 
        ball.x, 
        ball.y, 
        ball.radius
      );
      ballGrad.addColorStop(0, 'rgba(255, 255, 255, 0.5)'); // light glare reflection
      ballGrad.addColorStop(0.45, 'rgba(255, 255, 255, 0.0)');
      ballGrad.addColorStop(0.82, 'rgba(0, 0, 0, 0.12)');  // mid shadow
      ballGrad.addColorStop(1, 'rgba(0, 0, 0, 0.52)');     // deep side sphere shade

      ctx.beginPath();
      ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
      ctx.fillStyle = ballGrad;
      ctx.fill();

      // Crisp border outline
      ctx.lineWidth = 1.3;
      ctx.strokeStyle = '#0f172a';
      ctx.stroke();
      ctx.restore();

      // --- Draw Dynamic Shoot Effect ---
      if (shootEffectRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(shootEffectRef.current.x, shootEffectRef.current.y, shootEffectRef.current.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(245, 158, 11, ${shootEffectRef.current.opacity})`;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }

      // --- Draw Slide Tackle Trails ---
      if (tackleActiveRef.current) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(player.x, player.y, player.radius + 6, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(14, 165, 233, 0.5)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.restore();
      }

      // --- Draw Tackle Impact Splash ---
      if (tackleEffectRef.current && tackleEffectRef.current.type === 'success') {
        ctx.save();
        ctx.beginPath();
        ctx.arc(tackleEffectRef.current.x, tackleEffectRef.current.y, 25, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(251, 191, 36, 0.25)';
        ctx.fill();
        ctx.strokeStyle = '#fbbf24';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      }

      // --- Draw Opponent Stunned Stars ---
      if (opponentStunnedRef.current) {
        ctx.save();
        const stunAngle = (Date.now() / 150) % (Math.PI * 2);
        const starRadius = 8;
        ctx.fillStyle = '#facc15'; // yellow stars
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        
        // Draw 3 spinning stars above Iran player's head
        for (let i = 0; i < 3; i++) {
          const angle = stunAngle + (i * Math.PI * 2) / 3;
          const sx = opponent.x + Math.cos(angle) * starRadius;
          const sy = opponent.y - 25 + Math.sin(angle) * 3; // flat elliptical orbit
          ctx.fillText('★', sx, sy);
        }
        ctx.restore();
      }

      // --- Draw 3-second Kickoff Countdown Overlay ---
      if (goalCooldownRef.current && goalCooldown > 0) {
        ctx.save();
        ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
        ctx.fillRect(0, 0, pitchWidth, pitchHeight);
        
        // Circular progress card background
        ctx.beginPath();
        ctx.arc(pitchWidth / 2, pitchHeight / 2, 45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
        ctx.fill();
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 4;
        ctx.stroke();

        // Big countdown number
        ctx.fillStyle = '#ffffff';
        ctx.font = 'black 36px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(goalCooldown.toString(), pitchWidth / 2, pitchHeight / 2);
        
        ctx.fillStyle = '#f59e0b';
        ctx.font = 'bold 10px sans-serif';
        ctx.fillText('PREPARING KICK OFF', pitchWidth / 2, pitchHeight / 2 + 65);
        ctx.restore();
      }
    };

    const loop = () => {
      updatePhysics();
      draw();
      requestRef.current = requestAnimationFrame(loop);
    };

    requestRef.current = requestAnimationFrame(loop);

    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState, difficulty, soundEnabled]);

  const handleCanvasTouch = (e: React.TouchEvent<HTMLCanvasElement>) => {
    if (gameState !== 'playing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const touch = e.touches[0];
    if (!touch) return;

    // Map client coordinates to 600x400 internal canvas coordinates
    const clientX = touch.clientX - rect.left;
    const clientY = touch.clientY - rect.top;

    const x = (clientX / rect.width) * pitchWidth;
    const y = (clientY / rect.height) * pitchHeight;

    const player = playerRef.current;
    
    // Smoothly interpolate towards the touch coordinate
    const dx = x - player.x;
    const dy = y - player.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > 5) {
      player.vx = (dx / dist) * player.speed;
      player.vy = (dy / dist) * player.speed;
      
      // Instantly nudge closer to the drag pointer for high response
      player.x += player.vx;
      player.y += player.vy;
    } else {
      player.vx = 0;
      player.vy = 0;
    }
  };

  return (
    <div id="egypt-football-game-overlay" className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="relative w-full max-w-[650px] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl shadow-black/50"
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-900/60">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">🏆</span>
            <div>
              <h3 className="text-base font-bold text-zinc-100 tracking-wide">Stadium Clash: Egypt vs Iran</h3>
              <p className="text-[11px] text-zinc-500 font-medium">Interactive Mini Football Challenge</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-lg border transition-all ${
                soundEnabled ? 'bg-zinc-800 border-zinc-700 text-zinc-200' : 'bg-transparent border-zinc-800 text-zinc-600'
              }`}
            >
              <Volume2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-lg border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Menu Screen */}
        <AnimatePresence mode="wait">
          {gameState === 'menu' && (
            <motion.div
              key="menu"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              className="p-6 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="flex items-center justify-center gap-6">
                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-red-600 border-4 border-zinc-800 flex items-center justify-center text-3xl shadow-lg shadow-red-600/20 select-none">🇪🇬</div>
                  <span className="mt-2 text-sm font-bold text-zinc-100">Egypt</span>
                  <span className="text-[10px] text-zinc-500 font-medium font-mono">PLAYER</span>
                </div>

                <div className="text-zinc-600 font-black text-2xl tracking-wider font-mono px-3 py-1 bg-zinc-900/50 rounded-lg">VS</div>

                <div className="flex flex-col items-center">
                  <div className="w-16 h-16 rounded-full bg-emerald-600 border-4 border-zinc-800 flex items-center justify-center text-3xl shadow-lg shadow-emerald-600/20 select-none">🇮🇷</div>
                  <span className="mt-2 text-sm font-bold text-zinc-100">Iran</span>
                  <span className="text-[10px] text-zinc-500 font-medium font-mono">CPU</span>
                </div>
              </div>

              <div className="w-full max-w-[340px] space-y-3">
                <label className="text-xs text-zinc-400 font-semibold tracking-wider uppercase block text-left">
                  Choose Difficulty
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['easy', 'medium', 'hard'] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setDifficulty(level)}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold uppercase tracking-wider transition-all ${
                        difficulty === level
                          ? 'bg-amber-500/15 border-amber-500 text-amber-400 shadow-sm shadow-amber-500/5'
                          : 'bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700'
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/60 max-w-[400px] text-left text-xs text-zinc-400 space-y-2">
                <p className="font-bold text-zinc-300">Controls Instruction:</p>
                <ul className="list-disc list-inside space-y-1 pl-1">
                  <li>Use <span className="font-mono text-amber-400 font-black bg-zinc-800 px-1 py-0.5 rounded">W A S D</span> or <span className="font-mono text-amber-400 font-black bg-zinc-800 px-1 py-0.5 rounded">↑ ↓ ← →</span> keys to run.</li>
                  <li>Collide with the football to dribble or shoot!</li>
                  <li>Score in the right goal post to score for Egypt!</li>
                  <li>On mobile, use the interactive on-screen joystick below the pitch.</li>
                </ul>
              </div>

              <button
                onClick={startGame}
                className="w-full max-w-[280px] py-3.5 px-6 rounded-xl bg-gradient-to-r from-red-600 via-amber-500 to-emerald-600 text-white font-bold tracking-wider hover:opacity-90 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 fill-white" />
                KICK OFF MATCH
              </button>
            </motion.div>
          )}

          {/* Playing Screen */}
          {gameState === 'playing' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="p-4 flex flex-col items-center"
            >
              {/* Live Scoreboard Header */}
              <div className="w-full flex items-center justify-between px-3 py-2 bg-zinc-900/60 border border-zinc-800 rounded-xl mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-xl">🇪🇬</span>
                  <span className="text-xs font-bold text-zinc-300">EGYPT</span>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-2xl font-black text-red-400">{egyptScore}</span>
                  <span className="text-zinc-600 font-mono font-bold">:</span>
                  <span className="font-mono text-2xl font-black text-emerald-400">{iranScore}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-zinc-300">IRAN</span>
                  <span className="text-xl">🇮🇷</span>
                </div>

                <div className="border-l border-zinc-800 pl-4 py-1 flex flex-col items-end">
                  <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">Time Remaining</span>
                  <span className={`font-mono text-lg font-bold tracking-tight ${timer < 15 ? 'text-red-500 animate-pulse' : 'text-zinc-100'}`}>
                    00:{timer < 10 ? `0${timer}` : timer}
                  </span>
                </div>
              </div>

              {/* Game Announcement Overlay */}
              <div className="relative w-full aspect-[3/2] max-h-[360px] border border-zinc-800 rounded-xl overflow-hidden bg-zinc-950 select-none touch-none">
                <canvas
                  ref={canvasRef}
                  width={600}
                  height={400}
                  className="w-full h-full object-contain select-none touch-none"
                  onTouchStart={(e) => {
                    e.preventDefault();
                    handleCanvasTouch(e);
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault();
                    handleCanvasTouch(e);
                  }}
                  onTouchEnd={() => {
                    mobileInputRef.current = { x: 0, y: 0 };
                  }}
                />

                <AnimatePresence>
                  {announcement && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.7 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.7 }}
                      className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-xs"
                    >
                      <span className="text-2xl font-extrabold text-amber-400 tracking-wider uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
                        {announcement}
                      </span>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Unified Tactile Controller for ALL Devices (PC, Tablet, Mobile) */}
              <div className="mt-4 grid grid-cols-2 gap-3 w-full">
                {/* Joystick & Movement Controls */}
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl">
                  <div className="text-center mb-1.5">
                    <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-widest block">RUN & DRIBBLE</span>
                    <span className="text-[7px] sm:text-[8px] text-zinc-500 font-medium tracking-wide hidden sm:block">[Drag Joystick or Key WASD/Arrows]</span>
                  </div>
                  <VirtualJoystick
                    onChange={(x, y) => {
                      mobileInputRef.current = { x, y };
                    }}
                  />
                </div>

                {/* Tactile Special Moves Controls */}
                <div className="flex flex-col items-center justify-center p-2.5 sm:p-3 bg-zinc-900/40 border border-zinc-800/60 rounded-2xl space-y-2">
                  <div className="text-center">
                    <span className="text-[9px] sm:text-[10px] text-zinc-400 uppercase font-bold tracking-widest block">TACTICAL ABILITIES</span>
                    <span className="text-[7px] sm:text-[8px] text-zinc-500 font-medium tracking-wide hidden sm:block">[Press buttons or Keys]</span>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-1.5 sm:gap-2 w-full h-full">
                    {/* Shoot Button */}
                    <button
                      onClick={handleShoot}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-red-600/15 hover:bg-red-600/25 border border-red-500/40 text-red-400 font-black text-[9px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center space-y-1 group"
                    >
                      <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-400 group-hover:scale-110 transition-transform duration-200" />
                      <span className="uppercase tracking-wider">Shoot</span>
                      <span className="text-[7px] text-red-500 font-mono font-bold hidden sm:inline">[Space / F]</span>
                    </button>

                    {/* Tackle Button */}
                    <button
                      onClick={handleTackle}
                      disabled={tackleCooldown > 0}
                      className={`py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl border font-black text-[9px] sm:text-xs transition-all flex flex-col items-center justify-center space-y-1 group relative overflow-hidden ${
                        tackleCooldown > 0
                          ? 'bg-zinc-900/80 border-zinc-800 text-zinc-600 cursor-not-allowed'
                          : 'bg-amber-600/15 hover:bg-amber-600/25 border-amber-500/40 text-amber-400 hover:scale-[1.02] active:scale-95'
                      }`}
                    >
                      {tackleCooldown > 0 && (
                        <div 
                          className="absolute bottom-0 left-0 h-1 bg-amber-500/50 transition-all duration-100"
                          style={{ width: `${(tackleCooldown / 2.5) * 100}%` }}
                        />
                      )}
                      <Flame className={`w-3.5 h-3.5 sm:w-4 sm:h-4 transition-transform duration-200 ${tackleCooldown > 0 ? 'text-zinc-600' : 'text-amber-400 group-hover:scale-110'}`} />
                      <span className="uppercase tracking-wider">
                        {tackleCooldown > 0 ? `${tackleCooldown.toFixed(1)}s` : 'Tackle'}
                      </span>
                      <span className={`text-[7px] font-mono font-bold hidden sm:inline ${tackleCooldown > 0 ? 'text-zinc-700' : 'text-amber-500'}`}>
                        [Shift / E]
                      </span>
                    </button>

                    {/* Defend / Teleport Button */}
                    <button
                      onClick={() => {
                        // Reset player directly to defensive fallback position
                        playerRef.current.x = 150;
                        playerRef.current.y = 200;
                        playerRef.current.vx = 0;
                        playerRef.current.vy = 0;
                        playSynthSound('kick');
                      }}
                      className="py-2.5 sm:py-3 px-1 sm:px-2 rounded-xl bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 font-black text-[9px] sm:text-xs hover:scale-[1.02] active:scale-95 transition-all flex flex-col items-center justify-center space-y-1 group"
                    >
                      <ShieldAlert className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-400 group-hover:scale-110 transition-transform duration-200" />
                      <span className="uppercase tracking-wider">Defend</span>
                      <span className="text-[7px] text-zinc-500 font-mono font-bold hidden sm:inline">[R]</span>
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Game Over Screen */}
          {gameState === 'gameover' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="p-8 flex flex-col items-center justify-center text-center space-y-6"
            >
              <div className="w-20 h-20 bg-amber-500/10 border border-amber-500/30 rounded-full flex items-center justify-center text-amber-500 text-4xl">
                {egyptScore > iranScore ? '👑' : egyptScore < iranScore ? '💀' : '🤝'}
              </div>

              <div>
                <h3 className="text-xl font-black text-zinc-100 tracking-wide uppercase">
                  {egyptScore > iranScore 
                    ? 'EGYPT VICTORIOUS!!!' 
                    : egyptScore < iranScore 
                      ? 'IRAN WON THE MATCH' 
                      : 'MATCH ENDED IN DRAW'}
                </h3>
                <p className="text-xs text-zinc-500 mt-1">Final Score After Full Time (60s)</p>
              </div>

              <div className="flex items-center justify-center gap-8 py-3 px-8 bg-zinc-900/50 border border-zinc-800 rounded-2xl font-mono">
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-zinc-400">EGYPT</span>
                  <span className="text-4xl font-black text-red-500">{egyptScore}</span>
                </div>
                <div className="text-zinc-600 text-xl font-bold">:</div>
                <div className="flex flex-col items-center">
                  <span className="text-sm font-bold text-zinc-400">IRAN</span>
                  <span className="text-4xl font-black text-emerald-500">{iranScore}</span>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full max-w-[340px]">
                <button
                  onClick={startGame}
                  className="flex-1 py-3 px-5 bg-amber-500 text-black font-extrabold rounded-xl hover:bg-amber-400 transition-all flex items-center justify-center gap-2 text-xs uppercase tracking-wider"
                >
                  <RotateCcw className="w-4 h-4" />
                  REMATCH
                </button>
                <button
                  onClick={() => setGameState('menu')}
                  className="flex-1 py-3 px-5 bg-zinc-900 border border-zinc-800 text-zinc-300 font-extrabold rounded-xl hover:bg-zinc-800 transition-all text-xs uppercase tracking-wider"
                >
                  MAIN MENU
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
