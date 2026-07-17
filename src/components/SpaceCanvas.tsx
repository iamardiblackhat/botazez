'use client';

import { useEffect, useRef } from 'react';

/**
 * ═══════════════════════════════════════════════════════════════
 *  SpaceCanvas — isolated cosmic background overlay
 * ═══════════════════════════════════════════════════════════════
 *  DELIBERATELY DECOUPLED FROM THE DATA PIPELINE.
 *  - No props, no app state, no sockets, no API/data arrays.
 *  - Never reads or touches the map, tracking, or plotting layers.
 *  - pointer-events: none  → cannot intercept map interaction.
 *  - mix-blend-mode: screen → only ADDS light over the dark scene.
 *  - Idles at ~0 CPU: rAF runs ONLY while a comet is animating
 *    (a few seconds every 1.5–4 minutes); otherwise nothing loops.
 *  Purely decorative. Safe to remove at any time with zero side effects.
 * ═══════════════════════════════════════════════════════════════
 */
export default function SpaceCanvas() {
  const ref = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0;
    let H = 0;
    let stars: { x: number; y: number; r: number; a: number }[] = [];
    let raf = 0;
    let cometTimer: ReturnType<typeof setTimeout> | undefined;

    const buildStars = () => {
      const count = Math.round((W * H) / 16000); // subtle density
      stars = [];
      for (let i = 0; i < count; i++) {
        stars.push({
          x: Math.random() * W,
          y: Math.random() * H,
          r: Math.random() * 1.1 + 0.2,
          a: Math.random() * 0.28 + 0.08, // faint — reads as space, not haze
        });
      }
    };

    const drawStars = () => {
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = '#bcd4ff';
      for (const s of stars) {
        ctx.globalAlpha = s.a;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const resize = () => {
      W = window.innerWidth;
      H = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      buildStars();
      drawStars();
    };

    // ── Occasional comet: a bright head with a fading tail ──
    const launchComet = () => {
      const sx = Math.random() * W;
      const sy = -30 - Math.random() * H * 0.2;
      const angle = (Math.random() * 0.45 + 0.18) * Math.PI; // heading downward
      const speed = Math.random() * 5 + 7;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const vx = Math.cos(angle) * speed * dir;
      const vy = Math.sin(angle) * speed;
      let x = sx;
      let y = sy;
      const trail: { x: number; y: number }[] = [];
      let life = 0;

      const step = () => {
        life++;
        x += vx;
        y += vy;
        trail.push({ x, y });
        if (trail.length > 28) trail.shift();

        drawStars(); // repaint faint stars each frame (cheap)

        // tail
        ctx.lineCap = 'round';
        for (let i = 1; i < trail.length; i++) {
          const t = i / trail.length;
          ctx.globalAlpha = t * 0.5;
          ctx.strokeStyle = '#8fd4ff';
          ctx.lineWidth = t * 2.2;
          ctx.beginPath();
          ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
          ctx.lineTo(trail[i].x, trail[i].y);
          ctx.stroke();
        }

        // head glow
        ctx.globalAlpha = 0.95;
        const g = ctx.createRadialGradient(x, y, 0, x, y, 6);
        g.addColorStop(0, 'rgba(224,246,255,0.95)');
        g.addColorStop(1, 'rgba(140,210,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        const off = x < -80 || x > W + 80 || y > H + 80;
        if (life < 260 && !off) {
          raf = requestAnimationFrame(step);
        } else {
          drawStars(); // settle back to the static field
          scheduleComet();
        }
      };
      raf = requestAnimationFrame(step);
    };

    const scheduleComet = () => {
      const delay = 90000 + Math.random() * 150000; // 1.5–4 minutes
      cometTimer = setTimeout(launchComet, delay);
    };

    resize();
    window.addEventListener('resize', resize);
    scheduleComet();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(raf);
      if (cometTimer) clearTimeout(cometTimer);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      aria-hidden="true"
      style={{
        position: 'fixed',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 30,
        mixBlendMode: 'screen',
      }}
    />
  );
}
