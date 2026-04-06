'use client';

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import type { MapNode, MapLink } from './useKnowledgeMapData';
import {
  initialLayout,
  simulate,
  type PhysicsNode,
  type PhysicsLink,
} from './mapPhysics';

// ── Visual constants ───────────────────────────────────────────────────

const BG = '#0a0a0f';

const RADIUS_ROOT = 32;
const RADIUS_GRADE = 20;
const RADIUS_SUBJECT = 12;

const PARTICLE_COUNT = 120;
const PARTICLE_MAX_R = 1.4;
const PARTICLE_SPEED = 0.15;

const CAMERA_LERP = 0.06;
const EXPAND_ZOOM_BOOST = 1.15;
const MAX_ZOOM = 3;

function nodeRadius(depth: number): number {
  if (depth === 0) return RADIUS_ROOT;
  if (depth === 1) return RADIUS_GRADE;
  return RADIUS_SUBJECT;
}

function coverageColor(coverage: number): string {
  if (coverage >= 100) return '#34d399';
  if (coverage >= 50) return '#2dd4bf';
  if (coverage > 0) return '#fbbf24';
  return '#78716c';
}

function coverageGlow(coverage: number): string {
  if (coverage >= 100) return 'rgba(52,211,153,0.25)';
  if (coverage >= 50) return 'rgba(45,212,191,0.20)';
  if (coverage > 0) return 'rgba(251,191,36,0.15)';
  return 'rgba(120,113,108,0.08)';
}

// ── Ambient particle ───────────────────────────────────────────────────

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  opacity: number;
}

function makeParticles(w: number, h: number): Particle[] {
  return Array.from({ length: PARTICLE_COUNT }, () => ({
    x: (Math.random() - 0.5) * w * 3,
    y: (Math.random() - 0.5) * h * 3,
    vx: (Math.random() - 0.5) * PARTICLE_SPEED,
    vy: (Math.random() - 0.5) * PARTICLE_SPEED,
    r: Math.random() * PARTICLE_MAX_R + 0.4,
    opacity: Math.random() * 0.35 + 0.08,
  }));
}

// ── Tooltip state ──────────────────────────────────────────────────────

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  node: MapNode | null;
}

// ── Component ──────────────────────────────────────────────────────────

interface Props {
  nodes: MapNode[];
  links: MapLink[];
}

export default function KnowledgeMapCanvas({ nodes, links }: Props) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);
  const particlesRef = useRef<Particle[]>([]);

  // Camera state (pan + zoom) and smooth target
  const camRef = useRef({ x: 0, y: 0, zoom: 1 });
  const camTargetRef = useRef<{ x: number; y: number; zoom: number } | null>(null);

  // Interaction refs
  const dragRef = useRef<{
    nodeId: string | null;
    isPanning: boolean;
    startX: number;
    startY: number;
    camStartX: number;
    camStartY: number;
    moved: boolean;
  } | null>(null);

  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    node: null,
  });

  // Expanded node IDs — children of these nodes are shown.
  // Initially empty: only root is visible, everything else hidden.
  const [expandedIds, setExpandedIds] = useState<Set<string>>(() => new Set());

  // ── Build physics nodes ────────────────────────────────────────────

  const { physicsNodes, physicsLinks, physicsMap, dataMap } = useMemo(() => {
    const pNodes: PhysicsNode[] = nodes.map((n) => ({
      id: n.id,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      radius: nodeRadius(n.depth),
      depth: n.depth,
      parentId: n.parentId,
      phase: Math.random() * Math.PI * 2,
      visible: n.depth === 0, // only root visible initially
    }));
    const pLinks: PhysicsLink[] = links.map((l) => ({
      sourceId: l.sourceId,
      targetId: l.targetId,
    }));
    const pMap = new Map(pNodes.map((n) => [n.id, n]));
    const dMap = new Map(nodes.map((n) => [n.id, n]));
    initialLayout(pNodes, pLinks);
    return { physicsNodes: pNodes, physicsLinks: pLinks, physicsMap: pMap, dataMap: dMap };
  }, [nodes, links]);

  // Sync expanded state → physics visibility.
  // Newly-visible nodes teleport to their parent's position so they
  // "branch out" via the physics simulation.
  useEffect(() => {
    for (const pn of physicsNodes) {
      const wasVisible = pn.visible;
      if (pn.depth === 0) {
        pn.visible = true;
      } else if (pn.depth === 1) {
        pn.visible = expandedIds.has('root');
      } else if (pn.depth === 2) {
        pn.visible = expandedIds.has(pn.parentId ?? '');
      }

      // Teleport newly-visible nodes to parent position for a branch-out effect
      if (!wasVisible && pn.visible && pn.parentId) {
        const parent = physicsMap.get(pn.parentId);
        if (parent) {
          pn.x = parent.x + (Math.random() - 0.5) * 8;
          pn.y = parent.y + (Math.random() - 0.5) * 8;
          pn.vx = 0;
          pn.vy = 0;
        }
      }
    }
  }, [expandedIds, physicsNodes, physicsMap]);

  // ── Canvas sizing ──────────────────────────────────────────────────

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const dpr = Math.min(window.devicePixelRatio, 2);
    const rect = container.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvas.style.width = `${rect.width}px`;
    canvas.style.height = `${rect.height}px`;
    particlesRef.current = makeParticles(rect.width, rect.height);
  }, []);

  useLayoutEffect(() => {
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [resize]);

  // ── World <-> screen helpers ───────────────────────────────────────

  const worldToScreen = useCallback(
    (wx: number, wy: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const dpr = Math.min(window.devicePixelRatio, 2);
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const cam = camRef.current;
      return [
        (wx - cam.x) * cam.zoom + cw / 2,
        (wy - cam.y) * cam.zoom + ch / 2,
      ];
    },
    [],
  );

  const screenToWorld = useCallback(
    (sx: number, sy: number): [number, number] => {
      const canvas = canvasRef.current;
      if (!canvas) return [0, 0];
      const dpr = Math.min(window.devicePixelRatio, 2);
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const cam = camRef.current;
      return [
        (sx - cw / 2) / cam.zoom + cam.x,
        (sy - ch / 2) / cam.zoom + cam.y,
      ];
    },
    [],
  );

  // ── Hit test ───────────────────────────────────────────────────────

  const hitTest = useCallback(
    (sx: number, sy: number): PhysicsNode | null => {
      const [wx, wy] = screenToWorld(sx, sy);
      const zoom = camRef.current.zoom;
      for (let i = physicsNodes.length - 1; i >= 0; i--) {
        const pn = physicsNodes[i]!;
        if (!pn.visible) continue;
        const dx = pn.x - wx;
        const dy = pn.y - wy;
        const hitR = pn.radius + 6 / zoom;
        if (dx * dx + dy * dy <= hitR * hitR) return pn;
      }
      return null;
    },
    [physicsNodes, screenToWorld],
  );

  // ── Auto-zoom helper ──────────────────────────────────────────────

  const animateCameraToward = useCallback((targetNode: PhysicsNode) => {
    const cam = camRef.current;
    camTargetRef.current = {
      x: cam.x * 0.55 + targetNode.x * 0.45,
      y: cam.y * 0.55 + targetNode.y * 0.45,
      zoom: Math.min(cam.zoom * EXPAND_ZOOM_BOOST, MAX_ZOOM),
    };
  }, []);

  // ── Pointer events ─────────────────────────────────────────────────

  const getCanvasXY = useCallback((e: React.PointerEvent | PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasXY(e);
      const hit = hitTest(x, y);
      const cam = camRef.current;
      dragRef.current = {
        nodeId: hit?.id ?? null,
        isPanning: !hit,
        startX: e.clientX,
        startY: e.clientY,
        camStartX: cam.x,
        camStartY: cam.y,
        moved: false,
      };
      (e.target as HTMLCanvasElement).setPointerCapture(e.pointerId);
    },
    [getCanvasXY, hitTest],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const { x, y } = getCanvasXY(e);
      const drag = dragRef.current;

      if (drag) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) + Math.abs(dy) > 4) drag.moved = true;

        if (drag.isPanning) {
          const cam = camRef.current;
          cam.x = drag.camStartX - dx / cam.zoom;
          cam.y = drag.camStartY - dy / cam.zoom;
          camTargetRef.current = null; // cancel any lerp
        } else if (drag.nodeId) {
          const pn = physicsMap.get(drag.nodeId);
          if (pn) {
            const [wx, wy] = screenToWorld(x, y);
            pn.x = wx;
            pn.y = wy;
            pn.vx = 0;
            pn.vy = 0;
          }
        }
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
        return;
      }

      // Hover
      const hit = hitTest(x, y);
      const canvas = canvasRef.current;
      if (canvas) canvas.style.cursor = hit ? 'pointer' : 'grab';

      if (hit) {
        const dn = dataMap.get(hit.id) ?? null;
        setTooltip({ visible: true, x: e.clientX + 14, y: e.clientY - 8, node: dn });
      } else {
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    },
    [getCanvasXY, hitTest, physicsMap, screenToWorld, dataMap],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent<HTMLCanvasElement>) => {
      const drag = dragRef.current;
      dragRef.current = null;
      if (!drag || drag.moved) return;

      const { x, y } = getCanvasXY(e);
      const hit = hitTest(x, y);
      if (!hit) return;
      const dn = dataMap.get(hit.id);
      if (!dn) return;

      // Root or grade: toggle expand/collapse
      if (dn.depth <= 1 && dn.childIds.length > 0) {
        const isExpanded = expandedIds.has(dn.id);
        setExpandedIds((prev) => {
          const next = new Set(prev);
          if (isExpanded) {
            // Collapse: remove this node and all its descendants from expanded
            next.delete(dn.id);
            for (const childId of dn.childIds) next.delete(childId);
          } else {
            next.add(dn.id);
          }
          return next;
        });
        if (!isExpanded) {
          animateCameraToward(hit);
        }
      } else if (dn.href) {
        router.push(dn.href);
      }
    },
    [getCanvasXY, hitTest, dataMap, expandedIds, router, animateCameraToward],
  );

  const handleWheel = useCallback((e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const cam = camRef.current;
    const factor = e.deltaY < 0 ? 1.08 : 1 / 1.08;
    cam.zoom = Math.max(0.2, Math.min(MAX_ZOOM, cam.zoom * factor));
    camTargetRef.current = null;
  }, []);

  // ── Animation loop ─────────────────────────────────────────────────

  useEffect(() => {
    let t0 = performance.now();

    function frame() {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const now = performance.now();
      const time = (now - t0) / 1000;
      const dpr = Math.min(window.devicePixelRatio, 2);
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;

      // Physics tick
      simulate(
        physicsNodes,
        physicsLinks,
        time,
        physicsMap,
        dragRef.current?.nodeId ?? null,
      );

      // Smooth camera lerp
      const cam = camRef.current;
      const target = camTargetRef.current;
      if (target) {
        cam.x += (target.x - cam.x) * CAMERA_LERP;
        cam.y += (target.y - cam.y) * CAMERA_LERP;
        cam.zoom += (target.zoom - cam.zoom) * CAMERA_LERP;
        if (
          Math.abs(cam.x - target.x) < 0.3 &&
          Math.abs(cam.y - target.y) < 0.3 &&
          Math.abs(cam.zoom - target.zoom) < 0.005
        ) {
          camTargetRef.current = null;
        }
      }

      ctx.save();
      ctx.scale(dpr, dpr);

      // Background
      ctx.fillStyle = BG;
      ctx.fillRect(0, 0, cw, ch);

      // Ambient particles (screen-space)
      const particles = particlesRef.current;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < -cw) p.x += cw * 3;
        if (p.x > cw * 2) p.x -= cw * 3;
        if (p.y < -ch) p.y += ch * 3;
        if (p.y > ch * 2) p.y -= ch * 3;

        const psx = p.x + cam.x * 0.05;
        const psy = p.y + cam.y * 0.05;
        ctx.globalAlpha = p.opacity;
        ctx.fillStyle = '#6688cc';
        ctx.beginPath();
        ctx.arc(psx, psy, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Transform to world coordinates
      ctx.translate(cw / 2, ch / 2);
      ctx.scale(cam.zoom, cam.zoom);
      ctx.translate(-cam.x, -cam.y);

      // Draw links
      for (const link of physicsLinks) {
        const s = physicsMap.get(link.sourceId);
        const t = physicsMap.get(link.targetId);
        if (!s?.visible || !t?.visible) continue;
        const dn = dataMap.get(link.targetId);
        const color = dn?.color ?? '#555';

        const mx = (s.x + t.x) / 2;
        const my = (s.y + t.y) / 2 - 12;

        ctx.strokeStyle = color;
        ctx.globalAlpha = 0.18;
        ctx.lineWidth = 1.5 / cam.zoom;
        ctx.beginPath();
        ctx.moveTo(s.x, s.y);
        ctx.quadraticCurveTo(mx, my, t.x, t.y);
        ctx.stroke();

        // Traveling particle along link
        const frac = ((time * 0.25 + (s.phase ?? 0)) % 1);
        const u = 1 - frac;
        const px = u * u * s.x + 2 * u * frac * mx + frac * frac * t.x;
        const py = u * u * s.y + 2 * u * frac * my + frac * frac * t.y;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(px, py, 1.8 / cam.zoom, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Draw nodes
      for (const pn of physicsNodes) {
        if (!pn.visible) continue;
        const dn = dataMap.get(pn.id);
        if (!dn) continue;

        const r = pn.radius;
        const pulse = Math.sin(time * 2 + pn.phase) * 0.04 + 1;
        const drawR = r * pulse;

        // Glow
        const glow = coverageGlow(dn.coverage);
        const gradient = ctx.createRadialGradient(pn.x, pn.y, drawR * 0.5, pn.x, pn.y, drawR * 2.5);
        gradient.addColorStop(0, glow);
        gradient.addColorStop(1, 'transparent');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(pn.x, pn.y, drawR * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Core circle
        ctx.fillStyle = dn.color;
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(pn.x, pn.y, drawR, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;

        // Coverage arc (ring around the node)
        if (dn.coverage > 0) {
          const arcAngle = (dn.coverage / 100) * Math.PI * 2;
          const ringR = drawR + 4;
          ctx.strokeStyle = coverageColor(dn.coverage);
          ctx.lineWidth = 3;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.arc(pn.x, pn.y, ringR, -Math.PI / 2, -Math.PI / 2 + arcAngle);
          ctx.stroke();
        }

        // Background track for the ring
        const trackR = drawR + 4;
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pn.x, pn.y, trackR, 0, Math.PI * 2);
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e8e8e8';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const fontSize = pn.depth === 0 ? 14 : pn.depth === 1 ? 12 : 10;
        ctx.font = `600 ${fontSize}px Inter, system-ui, sans-serif`;
        const labelY = pn.y + drawR + 8;
        const label = dn.label;
        const maxLabelW = pn.depth === 2 ? 80 : 120;
        let displayLabel = label;
        if (ctx.measureText(label).width > maxLabelW) {
          while (displayLabel.length > 0 && ctx.measureText(displayLabel + '…').width > maxLabelW) {
            displayLabel = displayLabel.slice(0, -1);
          }
          displayLabel += '…';
        }
        ctx.fillText(displayLabel, pn.x, labelY);

        // Coverage % below label
        ctx.font = `500 ${fontSize - 1}px Inter, system-ui, sans-serif`;
        ctx.fillStyle = coverageColor(dn.coverage);
        ctx.fillText(`${dn.coverage}%`, pn.x, labelY + fontSize + 3);

        // Expand/collapse indicator for root and grade nodes with children
        if (pn.depth <= 1 && dn.childIds.length > 0) {
          const isExpanded = expandedIds.has(pn.id);
          const indicatorR = pn.depth === 0 ? 7 : 5;
          const ix = pn.x + drawR * 0.75;
          const iy = pn.y - drawR * 0.75;
          ctx.fillStyle = isExpanded ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.7)';
          ctx.beginPath();
          ctx.arc(ix, iy, indicatorR, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = BG;
          ctx.font = `bold ${indicatorR * 1.8}px Inter, system-ui, sans-serif`;
          ctx.textBaseline = 'middle';
          ctx.fillText(isExpanded ? '−' : '+', ix, iy + 0.5);
          ctx.textBaseline = 'top';
        }
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(rafRef.current);
  }, [physicsNodes, physicsLinks, physicsMap, dataMap, expandedIds]);

  // ── Render ─────────────────────────────────────────────────────────

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden" style={{ background: BG }}>
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
        className="block h-full w-full touch-none"
      />

      {/* Legend */}
      <div className="absolute bottom-4 right-4 flex flex-wrap gap-3 rounded-lg border border-white/10 bg-[rgba(14,14,20,0.85)] px-3 py-2 text-[11px] text-white/50">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#78716c' }} />
          Not started
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#fbbf24' }} />
          In progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#2dd4bf' }} />
          Good progress
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#34d399' }} />
          Complete
        </span>
      </div>

      {/* Controls */}
      <div className="absolute bottom-4 left-4 flex gap-1.5">
        <button
          type="button"
          onClick={() => {
            camRef.current = { x: 0, y: 0, zoom: 1 };
            camTargetRef.current = null;
          }}
          className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.12] hover:text-white"
        >
          Reset View
        </button>
        <button
          type="button"
          onClick={() => {
            const all = new Set<string>();
            all.add('root');
            nodes.filter((n) => n.depth === 1).forEach((n) => all.add(n.id));
            setExpandedIds(all);
          }}
          className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.12] hover:text-white"
        >
          Expand All
        </button>
        <button
          type="button"
          onClick={() => setExpandedIds(new Set())}
          className="rounded-md border border-white/10 bg-white/[0.06] px-3 py-1.5 text-[11px] font-medium text-white/60 transition hover:bg-white/[0.12] hover:text-white"
        >
          Collapse All
        </button>
      </div>

      {/* Hint */}
      <div className="absolute left-4 top-4 text-[11px] text-white/30">
        Drag to pan · Scroll to zoom · Click to explore · Click subjects to view chapters
      </div>

      {/* Tooltip */}
      {tooltip.visible && tooltip.node && (
        <div
          className="pointer-events-none fixed z-50 max-w-[220px] rounded-lg border border-white/10 bg-[rgba(18,18,24,0.95)] px-3 py-2 text-[13px] leading-relaxed text-white/80"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          <p className="font-semibold text-white/90">{tooltip.node.label}</p>
          <p className="mt-0.5 text-[11px] text-white/50">
            {tooltip.node.coveredChapters}/{tooltip.node.totalChapters} chapters covered
          </p>
          <p className="text-[11px]">
            <span style={{ color: coverageColor(tooltip.node.coverage) }}>
              {tooltip.node.coverage}% chapter coverage
            </span>
          </p>
        </div>
      )}
    </div>
  );
}
