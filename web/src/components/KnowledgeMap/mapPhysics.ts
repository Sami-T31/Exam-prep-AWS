/**
 * Minimal 2D force simulation for the knowledge-map mind graph.
 *
 * Three forces:
 *   1. Repulsion — all visible node pairs push each other apart.
 *   2. Spring — linked nodes are pulled toward an ideal distance.
 *   3. Centering — the root node drifts toward (0, 0).
 *
 * After velocities settle, nodes get a gentle idle float so the map
 * feels alive.
 */

export interface PhysicsNode {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  depth: number;
  parentId: string | null;
  /** Phase offset for idle drift animation. */
  phase: number;
  /** Whether this node participates in the simulation. */
  visible: boolean;
}

export interface PhysicsLink {
  sourceId: string;
  targetId: string;
}

// ── Tuning constants ───────────────────────────────────────────────────

const REPULSION_STRENGTH = 0.4;
const REPULSION_MIN_DIST_FACTOR = 5;
const SPRING_STRENGTH = 0.016;
const IDEAL_DIST_D1 = 140; // root → grade
const IDEAL_DIST_D2 = 110; // grade → subject
const CENTER_PULL = 0.008;
const DAMPING = 0.86;
const IDLE_THRESHOLD = 0.4;
const IDLE_AMP_X = 0.06;
const IDLE_AMP_Y = 0.08;

// ── Initial layout ─────────────────────────────────────────────────────

/**
 * Place nodes geometrically so the simulation has a reasonable starting
 * point. Hidden nodes are still positioned so that if they become visible
 * after being teleported to their parent, the springs know the ideal
 * structure.
 */
export function initialLayout(nodes: PhysicsNode[], links: PhysicsLink[]): void {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const root = nodes.find((n) => n.depth === 0);
  if (root) {
    root.x = 0;
    root.y = 0;
  }

  // Depth-1 ring (grades)
  const d1 = nodes.filter((n) => n.depth === 1);
  d1.forEach((n, i) => {
    const angle = (i / d1.length) * Math.PI * 2 - Math.PI / 2;
    n.x = Math.cos(angle) * IDEAL_DIST_D1;
    n.y = Math.sin(angle) * IDEAL_DIST_D1;
  });

  // Depth-2: fan out from parent (subjects around their grade)
  const childrenOf = new Map<string, PhysicsNode[]>();
  for (const link of links) {
    const parent = byId.get(link.sourceId);
    const child = byId.get(link.targetId);
    if (!parent || !child || child.depth !== 2) continue;
    if (!childrenOf.has(link.sourceId)) childrenOf.set(link.sourceId, []);
    childrenOf.get(link.sourceId)!.push(child);
  }
  for (const [parentId, children] of childrenOf) {
    const parent = byId.get(parentId);
    if (!parent) continue;
    const baseAngle = Math.atan2(parent.y, parent.x);
    const spread = Math.min(Math.PI * 0.8, children.length * 0.35);
    children.forEach((c, i) => {
      const frac = children.length === 1 ? 0 : (i / (children.length - 1)) - 0.5;
      const angle = baseAngle + frac * spread;
      c.x = parent.x + Math.cos(angle) * IDEAL_DIST_D2;
      c.y = parent.y + Math.sin(angle) * IDEAL_DIST_D2;
    });
  }
}

// ── Simulation tick ────────────────────────────────────────────────────

export function simulate(
  nodes: PhysicsNode[],
  links: PhysicsLink[],
  time: number,
  nodeMap: Map<string, PhysicsNode>,
  draggedId: string | null,
): void {
  const visible = nodes.filter((n) => n.visible);

  // 1. Repulsion
  for (let i = 0; i < visible.length; i++) {
    for (let j = i + 1; j < visible.length; j++) {
      const a = visible[i]!;
      const b = visible[j]!;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const dist = Math.sqrt(dx * dx + dy * dy) || 1;
      const minDist = (a.radius + b.radius) * REPULSION_MIN_DIST_FACTOR;
      if (dist < minDist) {
        const force = ((minDist - dist) / dist) * REPULSION_STRENGTH;
        a.vx += dx * force;
        a.vy += dy * force;
        b.vx -= dx * force;
        b.vy -= dy * force;
      }
    }
  }

  // 2. Spring attraction along links
  for (const link of links) {
    const s = nodeMap.get(link.sourceId);
    const t = nodeMap.get(link.targetId);
    if (!s?.visible || !t?.visible) continue;
    const dx = t.x - s.x;
    const dy = t.y - s.y;
    const dist = Math.sqrt(dx * dx + dy * dy) || 1;
    const ideal = s.depth === 0 ? IDEAL_DIST_D1 : IDEAL_DIST_D2;
    const force = ((dist - ideal) / dist) * SPRING_STRENGTH;
    s.vx += dx * force;
    s.vy += dy * force;
    t.vx -= dx * force;
    t.vy -= dy * force;
  }

  // 3. Center the root
  const root = nodeMap.get('root');
  if (root) {
    root.vx += -root.x * CENTER_PULL;
    root.vy += -root.y * CENTER_PULL;
  }

  // 4. Integrate
  for (const n of visible) {
    if (n.id === draggedId) continue;
    n.vx *= DAMPING;
    n.vy *= DAMPING;
    n.x += n.vx;
    n.y += n.vy;

    // Idle drift when nearly still
    const speed = Math.abs(n.vx) + Math.abs(n.vy);
    if (speed < IDLE_THRESHOLD) {
      n.x += Math.sin(time * 0.4 + n.phase) * IDLE_AMP_X;
      n.y += Math.cos(time * 0.3 + n.phase * 1.3) * IDLE_AMP_Y;
    }
  }
}
