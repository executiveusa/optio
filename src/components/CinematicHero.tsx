/**
 * CinematicHero — Full-screen metamorphosis entry experience
 * ──────────────────────────────────────────────────────────────
 * 5-scene animated sequence: cocoon → butterfly emerge → title → CTA
 * Uses Canvas 2D particle system, CSS keyframe sequences, and clip-path reveals.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';

interface CinematicHeroProps {
  /** Called when user clicks "Entrar" or skips */
  onEnter: () => void;
  /** Logo image path */
  logoSrc?: string;
  /** Brand name to assemble */
  brandName?: string;
}

// ─── PARTICLE CLASS ──────────────────────────────────────────────────────────

type ParticleColor = [number, number, number];

class Particle {
  x: number; y: number; vx: number; vy: number;
  r: number; life: number; maxLife: number;
  color: ParticleColor;
  W: number; H: number;

  constructor(W: number, H: number) {
    this.W = W; this.H = H;
    this.x = 0; this.y = 0; this.vx = 0; this.vy = 0;
    this.r = 0; this.life = 0; this.maxLife = 0;
    this.color = [43, 143, 217];
    this.reset();
  }

  reset() {
    this.x = Math.random() * this.W;
    this.y = Math.random() * this.H;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = -Math.random() * 0.4 - 0.1;
    this.r = Math.random() * 1.5 + 0.5;
    this.life = Math.random();
    this.maxLife = Math.random() * 0.6 + 0.4;
    const roll = Math.random();
    if (roll < 0.5) this.color = [43, 143, 217];       // morpho blue
    else if (roll < 0.8) this.color = [94, 196, 232];   // cyan
    else this.color = [196, 150, 60];                   // gold
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.life += 0.003;
    if (this.life > this.maxLife || this.y < -10 || this.x < -10 || this.x > this.W + 10)
      this.reset();
  }

  draw(ctx: CanvasRenderingContext2D) {
    const alpha = Math.sin((this.life / this.maxLife) * Math.PI) * 0.5;
    const [r, g, b] = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
    ctx.fill();
  }
}

// ─── COMPONENT ───────────────────────────────────────────────────────────────

type ScenePhase = 'cocoon' | 'dissolve' | 'emerge' | 'title' | 'cta' | 'done';

export default function CinematicHero({
  onEnter,
  logoSrc = 'METAMORPHOSIS/metamorfosis logo.png',
  brandName = 'Metamorfosis',
}: CinematicHeroProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animRef = useRef<number>(0);
  const [phase, setPhase] = useState<ScenePhase>('cocoon');
  const [charsVisible, setCharsVisible] = useState<boolean[]>([]);
  const timerRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  // ─── PARTICLE LOOP ──────────────────────────────────────────

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const count = window.innerWidth < 430 ? 40 : 80;
    particlesRef.current = Array.from({ length: count },
      () => new Particle(canvas.width, canvas.height));

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => {
        p.W = canvas.width; p.H = canvas.height;
        p.update(); p.draw(ctx);
      });
      animRef.current = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animRef.current);
    };
  }, []);

  // ─── SCENE TIMELINE ─────────────────────────────────────────

  useEffect(() => {
    const t = (ms: number, fn: () => void) => {
      const id = setTimeout(fn, ms);
      timerRefs.current.push(id);
      return id;
    };

    // Scene 1-2: cocoon → dissolve at 3s
    t(3000, () => setPhase('dissolve'));

    // Scene 3: emerge at 3.8s
    t(3800, () => setPhase('emerge'));

    // Scene 4: title at 5.5s
    t(5500, () => {
      setPhase('title');
      // Stagger character reveals
      brandName.split('').forEach((_, i) => {
        t(5500 + i * 80, () => {
          setCharsVisible(prev => {
            const next = [...prev];
            next[i] = true;
            return next;
          });
        });
      });
    });

    // Scene 5: CTA at 7s
    t(7000, () => setPhase('cta'));

    return () => timerRefs.current.forEach(clearTimeout);
  }, [brandName]);

  // Init chars array
  useEffect(() => {
    setCharsVisible(new Array(brandName.length).fill(false));
  }, [brandName]);

  // ─── SKIP ───────────────────────────────────────────────────

  const handleSkip = useCallback(() => {
    timerRefs.current.forEach(clearTimeout);
    setPhase('cta');
    setCharsVisible(new Array(brandName.length).fill(true));
  }, [brandName]);

  // ─── ENTER ──────────────────────────────────────────────────

  const handleEnter = useCallback(() => {
    setPhase('done');
    setTimeout(onEnter, 600);
  }, [onEnter]);

  // ─── STYLES ─────────────────────────────────────────────────

  const showCocoon = phase === 'cocoon' || phase === 'dissolve';
  const showButterfly = phase === 'emerge' || phase === 'title' || phase === 'cta' || phase === 'done';
  const showTitle = phase === 'title' || phase === 'cta' || phase === 'done';
  const showCta = phase === 'cta' || phase === 'done';

  return (
    <div style={{
      position: 'fixed', inset: 0, background: '#0a0e1a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      overflow: 'hidden',
      opacity: phase === 'done' ? 0 : 1,
      transition: 'opacity 0.6s ease',
    }}>
      {/* Google Fonts */}
      <link rel="stylesheet"
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=Playfair+Display:wght@400;500;600;700&display=swap" />

      {/* Particle canvas */}
      <canvas ref={canvasRef} style={{ position: 'absolute', inset: 0, zIndex: 0 }} />

      {/* Vignette */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        background: 'radial-gradient(ellipse 70% 70% at center, transparent 30%, #0a0e1a 90%)',
      }} />

      {/* Skip button */}
      {phase !== 'cta' && phase !== 'done' && (
        <button onClick={handleSkip} style={{
          position: 'absolute', top: 24, right: 24, zIndex: 10,
          background: 'transparent',
          border: '1px solid rgba(237,240,245,0.15)',
          color: 'rgba(237,240,245,0.4)',
          fontSize: '12px', fontFamily: "'DM Sans', sans-serif",
          padding: '6px 16px', borderRadius: '8px', cursor: 'pointer',
          opacity: phase === 'cocoon' ? 0 : 1,
          transition: 'opacity 0.4s',
        }}>
          Saltar
        </button>
      )}

      {/* ── Cocoon ──────────────────────────────────── */}
      {showCocoon && (
        <div style={{
          position: 'relative', zIndex: 2,
          width: 120, height: 160,
          opacity: phase === 'dissolve' ? 0 : 1,
          transform: phase === 'dissolve' ? 'scale(0.8)' : 'scale(1)',
          filter: phase === 'dissolve' ? 'blur(8px)' : 'blur(0)',
          transition: 'all 1.2s ease',
        }}>
          {/* Glow */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 60, height: 80,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(232,208,128,0.4), transparent 70%)',
            borderRadius: '50%',
            animation: 'cocoonPulse 2s 1.5s ease-in-out infinite',
          }} />
          {/* Threads SVG */}
          <svg viewBox="0 0 120 160" fill="none" style={{ width: '100%', height: '100%', position: 'absolute', inset: 0 }}>
            <ellipse cx="60" cy="80" rx="30" ry="50"
              stroke="rgba(232,208,128,0.25)" strokeWidth="0.8"
              strokeDasharray="400" strokeDashoffset="400"
              style={{ animation: 'threadSpin 3s 0.5s ease forwards' }} />
            <ellipse cx="60" cy="80" rx="35" ry="55"
              stroke="rgba(94,196,232,0.15)" strokeWidth="0.5"
              strokeDasharray="500" strokeDashoffset="500"
              style={{ animation: 'threadSpin 3.5s 0.8s ease forwards' }} />
            <ellipse cx="60" cy="80" rx="25" ry="45"
              stroke="rgba(196,150,60,0.2)" strokeWidth="0.6"
              strokeDasharray="350" strokeDashoffset="350"
              style={{ animation: 'threadSpin 2.8s 0.3s ease forwards' }} />
            <path d="M60,30 Q80,50 60,80 Q40,110 60,130"
              stroke="rgba(232,208,128,0.18)" strokeWidth="0.5"
              strokeDasharray="300" strokeDashoffset="300"
              style={{ animation: 'threadSpin 4s 1s ease forwards' }} />
            <path d="M60,30 Q40,50 60,80 Q80,110 60,130"
              stroke="rgba(94,196,232,0.12)" strokeWidth="0.4"
              strokeDasharray="300" strokeDashoffset="300"
              style={{ animation: 'threadSpin 4s 1.2s ease forwards' }} />
          </svg>
        </div>
      )}

      {/* ── Butterfly ───────────────────────────────── */}
      {showButterfly && (
        <div style={{
          position: 'relative', zIndex: 3,
          opacity: phase === 'emerge' ? undefined : 1,
          animation: phase === 'emerge'
            ? 'butterflyReveal 1.8s ease forwards'
            : 'butterflyHover 4s ease-in-out infinite',
        }}>
          {/* Light burst */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 400, height: 400,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(circle, rgba(94,196,232,0.15) 0%, rgba(43,143,217,0.05) 40%, transparent 70%)',
            borderRadius: '50%',
            opacity: phase === 'emerge' ? undefined : 0.3,
            animation: phase === 'emerge' ? 'burstGlow 2s ease forwards' : undefined,
          }} />
          <img
            src={logoSrc}
            alt="Metamorfosis"
            style={{
              width: 'clamp(180px, 40vw, 260px)',
              height: 'clamp(180px, 40vw, 260px)',
              objectFit: 'contain',
              filter: 'drop-shadow(0 0 30px rgba(43,143,217,0.4)) drop-shadow(0 0 60px rgba(43,143,217,0.15))',
              position: 'relative',
            }}
          />
        </div>
      )}

      {/* ── Title ───────────────────────────────────── */}
      {showTitle && (
        <div style={{
          position: 'relative', zIndex: 4,
          textAlign: 'center', marginTop: 32,
          opacity: 1,
        }}>
          <div style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(24px, 6vw, 42px)',
            fontWeight: 500,
            letterSpacing: '0.12em',
            color: '#edf0f5',
            lineHeight: 1,
          }}>
            {brandName.split('').map((ch, i) => (
              <span key={i} style={{
                display: 'inline-block',
                opacity: charsVisible[i] ? 1 : 0,
                transform: charsVisible[i] ? 'translateY(0)' : 'translateY(12px)',
                filter: charsVisible[i] ? 'blur(0)' : 'blur(4px)',
                transition: 'all 0.5s ease',
              }}>
                {ch}
              </span>
            ))}
          </div>
          {/* Underline */}
          <div style={{
            width: charsVisible.every(Boolean) ? 180 : 0,
            height: 1, margin: '12px auto 0',
            background: 'linear-gradient(90deg, transparent, rgba(196,150,60,0.6), transparent)',
            transition: 'width 1s 0.3s ease',
          }} />
        </div>
      )}

      {/* ── CTA ─────────────────────────────────────── */}
      {showCta && (
        <div style={{
          position: 'relative', zIndex: 4,
          marginTop: 48,
          opacity: phase === 'cta' ? 1 : 0,
          transition: 'opacity 0.6s ease',
        }}>
          {/* Glow backdrop */}
          <div style={{
            position: 'absolute', top: '50%', left: '50%',
            width: 200, height: 60,
            transform: 'translate(-50%, -50%)',
            background: 'radial-gradient(ellipse, rgba(43,143,217,0.12), transparent 70%)',
            borderRadius: '50%',
            animation: 'subtlePulse 3s ease-in-out infinite',
          }} />
          <button onClick={handleEnter} style={{
            fontFamily: "'DM Sans', sans-serif",
            fontSize: 15, fontWeight: 500,
            letterSpacing: '0.15em', textTransform: 'uppercase' as const,
            color: '#edf0f5',
            background: 'transparent',
            border: '1px solid rgba(196,150,60,0.4)',
            padding: '14px 48px', borderRadius: 8,
            cursor: 'pointer',
            position: 'relative',
            transition: 'border-color 0.2s, background 0.2s',
          }}
          onMouseEnter={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(196,150,60,0.7)';
            (e.target as HTMLButtonElement).style.background = 'rgba(196,150,60,0.08)';
          }}
          onMouseLeave={e => {
            (e.target as HTMLButtonElement).style.borderColor = 'rgba(196,150,60,0.4)';
            (e.target as HTMLButtonElement).style.background = 'transparent';
          }}
          >
            Entrar
          </button>
        </div>
      )}

      {/* Keyframe animations injected as style tag */}
      <style>{`
        @keyframes cocoonPulse {
          0%, 100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.7; transform: translate(-50%, -50%) scale(1.15); }
        }
        @keyframes threadSpin {
          from { stroke-dashoffset: 800; }
          to { stroke-dashoffset: 0; }
        }
        @keyframes butterflyReveal {
          0% { opacity: 0; transform: scale(0.5); filter: blur(6px) brightness(2); }
          40% { opacity: 1; filter: blur(0) brightness(1.3); }
          100% { opacity: 1; transform: scale(1); filter: blur(0) brightness(1); }
        }
        @keyframes butterflyHover {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
        @keyframes burstGlow {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.5); }
          50% { opacity: 1; }
          100% { opacity: 0.3; transform: translate(-50%, -50%) scale(1); }
        }
        @keyframes subtlePulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }
      `}</style>
    </div>
  );
}
