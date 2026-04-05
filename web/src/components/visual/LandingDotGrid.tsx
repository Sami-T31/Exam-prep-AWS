'use client';

import { useEffect, useRef } from 'react';

interface LandingDotGridProps {
  className?: string;
}

export function LandingDotGrid({ className }: LandingDotGridProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<number | null>(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    active: false,
    entered: false,
    lastMoveAt: 0,
  });
  const trailRef = useRef<Array<{ x: number; y: number; life: number }>>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const spacing = 28;
    const dotRadius = 1.8;
    const traceRadius = 160;
    const pulseRadius = 90;

    const toRgb = (value: string) => {
      const trimmed = value.trim();
      if (trimmed.startsWith('#')) {
        const hex = trimmed.slice(1);
        const normalized =
          hex.length === 3
            ? hex
                .split('')
                .map((char) => char + char)
                .join('')
            : hex;

        const int = Number.parseInt(normalized, 16);
        return {
          r: (int >> 16) & 255,
          g: (int >> 8) & 255,
          b: int & 255,
        };
      }

      const match = trimmed.match(/\d+(\.\d+)?/g);
      if (!match || match.length < 3) {
        return { r: 196, g: 154, b: 108 };
      }

      return {
        r: Number(match[0]),
        g: Number(match[1]),
        b: Number(match[2]),
      };
    };

    const withAlpha = (value: string, alpha: number) => {
      const { r, g, b } = toRgb(value);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const palette = () => {
      const styles = getComputedStyle(document.documentElement);
      const isDark = document.documentElement.classList.contains('dark');
      const accent = styles.getPropertyValue('--accent-color').trim() || '#c49a6c';

      return {
        baseDot: isDark ? 'rgba(241, 207, 170, 0.18)' : 'rgba(143, 97, 50, 0.18)',
        activeDot: accent,
        glow: isDark ? withAlpha(accent, 0.22) : withAlpha(accent, 0.2),
      };
    };

    const resize = () => {
      const rect = parent.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      canvas.height = Math.max(1, Math.floor(rect.height * dpr));
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const addTrailPoint = (x: number, y: number) => {
      trailRef.current.push({ x, y, life: 1 });
      if (trailRef.current.length > 12) {
        trailRef.current.shift();
      }
    };

    const handleMove = (event: PointerEvent) => {
      const rect = parent.getBoundingClientRect();
      pointerRef.current.x = event.clientX - rect.left;
      pointerRef.current.y = event.clientY - rect.top;
      pointerRef.current.active = true;
      pointerRef.current.entered = true;
      pointerRef.current.lastMoveAt = performance.now();
      addTrailPoint(pointerRef.current.x, pointerRef.current.y);
    };

    const handleLeave = () => {
      pointerRef.current.active = false;
    };

    const updateTrail = () => {
      trailRef.current = trailRef.current
        .map((point) => ({ ...point, life: point.life - 0.03 }))
        .filter((point) => point.life > 0);
    };

    const draw = () => {
      const rect = parent.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const colors = palette();
      const now = performance.now();

      if (!reduceMotion) {
        updateTrail();
      }

      context.clearRect(0, 0, width, height);

      context.fillStyle = colors.baseDot;
      for (let y = spacing / 2; y < height; y += spacing) {
        for (let x = spacing / 2; x < width; x += spacing) {
          let intensity = 0;

          if (pointerRef.current.entered) {
            const dx = x - pointerRef.current.x;
            const dy = y - pointerRef.current.y;
            const dist = Math.hypot(dx, dy);
            if (dist < traceRadius) {
              intensity = Math.max(intensity, 1 - dist / traceRadius);
            }
          }

          for (const point of trailRef.current) {
            const dx = x - point.x;
            const dy = y - point.y;
            const dist = Math.hypot(dx, dy);
            if (dist < pulseRadius) {
              intensity = Math.max(intensity, point.life * (1 - dist / pulseRadius));
            }
          }

          const radius = dotRadius + intensity * 1.7;
          context.beginPath();
          context.arc(x, y, radius, 0, Math.PI * 2);
          context.fillStyle =
            intensity > 0.02
              ? withAlpha(colors.activeDot, Math.min(0.88, 0.24 + intensity * 0.58))
              : colors.baseDot;
          context.fill();
        }
      }

      if (pointerRef.current.entered) {
        const idle = Math.min(1, (now - pointerRef.current.lastMoveAt) / 1200);
        const glowAlpha = pointerRef.current.active ? 0.22 : Math.max(0, 0.18 - idle * 0.18);

        if (glowAlpha > 0) {
          const gradient = context.createRadialGradient(
            pointerRef.current.x,
            pointerRef.current.y,
            0,
            pointerRef.current.x,
            pointerRef.current.y,
            180,
          );
          gradient.addColorStop(0, withAlpha(colors.activeDot, glowAlpha));
          gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
          context.fillStyle = gradient;
          context.fillRect(0, 0, width, height);
        }
      }

      frameRef.current = requestAnimationFrame(draw);
    };

    resize();
    parent.addEventListener('pointermove', handleMove);
    parent.addEventListener('pointerleave', handleLeave);
    window.addEventListener('resize', resize);
    frameRef.current = requestAnimationFrame(draw);

    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
      parent.removeEventListener('pointermove', handleMove);
      parent.removeEventListener('pointerleave', handleLeave);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div className={className ?? 'absolute inset-0 overflow-hidden rounded-[2rem]'}>
      <div className="landing-dot-grid-glow" />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="absolute inset-0 h-full w-full"
      />
    </div>
  );
}
