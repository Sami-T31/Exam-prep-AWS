'use client';

import { useCallback, useEffect, useRef } from 'react';

interface ClickSparkProps {
  children: React.ReactNode;
  sparkColor?: string;
  sparkSize?: number;
  sparkRadius?: number;
  sparkCount?: number;
  duration?: number;
  easing?: 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';
  extraScale?: number;
  className?: string;
}

interface Spark {
  x: number;
  y: number;
  angle: number;
  startTime: number;
}

export function ClickSpark({
  children,
  sparkColor,
  sparkSize = 12,
  sparkRadius = 18,
  sparkCount = 10,
  duration = 450,
  easing = 'ease-out',
  extraScale = 1,
  className,
}: ClickSparkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const sparksRef = useRef<Spark[]>([]);
  const sparkColorRef = useRef('#c49a6c');

  useEffect(() => {
    if (sparkColor) {
      sparkColorRef.current = sparkColor;
      return;
    }

    const html = document.documentElement;
    const updateColor = () => {
      sparkColorRef.current =
        getComputedStyle(html).getPropertyValue('--accent-color').trim() || '#c49a6c';
    };

    updateColor();

    const observer = new MutationObserver(updateColor);
    observer.observe(html, {
      attributes: true,
      attributeFilter: ['class', 'style'],
    });

    return () => {
      observer.disconnect();
    };
  }, [sparkColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    let resizeTimeout: ReturnType<typeof setTimeout> | undefined;

    const resizeCanvas = () => {
      const { width, height } = container.getBoundingClientRect();
      const nextWidth = Math.max(Math.ceil(width), 1);
      const nextHeight = Math.max(Math.ceil(height), 1);

      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }
    };

    const handleResize = () => {
      if (resizeTimeout) clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(resizeCanvas, 80);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);
    resizeCanvas();

    return () => {
      resizeObserver.disconnect();
      if (resizeTimeout) clearTimeout(resizeTimeout);
    };
  }, []);

  const easeFunc = useCallback(
    (t: number) => {
      switch (easing) {
        case 'linear':
          return t;
        case 'ease-in':
          return t * t;
        case 'ease-in-out':
          return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        default:
          return t * (2 - t);
      }
    },
    [easing],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    let animationId = 0;

    const draw = (timestamp: number) => {
      context.clearRect(0, 0, canvas.width, canvas.height);

      sparksRef.current = sparksRef.current.filter((spark) => {
        const elapsed = timestamp - spark.startTime;
        if (elapsed >= duration) {
          return false;
        }

        const progress = elapsed / duration;
        const eased = easeFunc(progress);
        const distance = eased * sparkRadius * extraScale;
        const lineLength = sparkSize * (1 - eased);

        const startX = spark.x + distance * Math.cos(spark.angle);
        const startY = spark.y + distance * Math.sin(spark.angle);
        const endX = spark.x + (distance + lineLength) * Math.cos(spark.angle);
        const endY = spark.y + (distance + lineLength) * Math.sin(spark.angle);

        context.strokeStyle = sparkColorRef.current;
        context.lineWidth = 2;
        context.globalAlpha = 1 - progress;
        context.beginPath();
        context.moveTo(startX, startY);
        context.lineTo(endX, endY);
        context.stroke();

        return true;
      });

      context.globalAlpha = 1;
      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [duration, easeFunc, extraScale, sparkRadius, sparkSize]);

  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const now = performance.now();

    const sparks = Array.from({ length: sparkCount }, (_, index) => ({
      x,
      y,
      angle: (2 * Math.PI * index) / sparkCount,
      startTime: now,
    }));

    sparksRef.current.push(...sparks);
  };

  return (
    <div
      ref={containerRef}
      className={className ?? 'relative min-h-screen'}
      onClick={handleClick}
    >
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-30 h-full w-full"
      />
      <div className="relative z-10 min-h-screen">{children}</div>
    </div>
  );
}
