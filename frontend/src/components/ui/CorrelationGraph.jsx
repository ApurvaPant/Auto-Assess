import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

/* ── cluster palette ─────────────────────────────────────────────────────── */
const CLUSTER_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
const CLUSTER_DIM    = ['rgba(34,197,94,0.14)', 'rgba(245,158,11,0.14)', 'rgba(239,68,68,0.14)'];

const NODE_R = 18;
const KNN    = 3;   // nearest neighbours each node connects to

/* ── helpers ─────────────────────────────────────────────────────────────── */
function getInitials(name = '') {
  const parts = name.trim().split(/\s+/);
  return parts.length >= 2
    ? (parts[0][0] + parts[1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function buildEdges(students) {
  if (!students?.length) return [];
  const keys = ['avg_score', 'avg_test_score', 'avg_quality', 'completion_rate'];

  // normalize each metric to [0, 1]
  const normed = keys.map(key => {
    const vals = students.map(s => s[key] ?? 0);
    const min  = Math.min(...vals);
    const max  = Math.max(...vals);
    const rng  = max - min || 1;
    return vals.map(v => (v - min) / rng);
  });

  const n = students.length;
  const edgeMap = {};

  for (let i = 0; i < n; i++) {
    // compute distance from i to every other node
    const dists = [];
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      let s = 0;
      for (const row of normed) s += (row[i] - row[j]) ** 2;
      dists.push({ j, d: Math.sqrt(s) });
    }
    dists.sort((a, b) => a.d - b.d);

    for (const { j } of dists.slice(0, KNN)) {
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (!edgeMap[key]) {
        edgeMap[key] = {
          from:        Math.min(i, j),
          to:          Math.max(i, j),
          sameCluster: students[i].cluster === students[j].cluster,
        };
      }
    }
  }

  return Object.values(edgeMap);
}

/* ── component ───────────────────────────────────────────────────────────── */
export function CorrelationGraph({ students }) {
  const canvasRef  = useRef(null);
  const stateRef   = useRef(null);
  const rafRef     = useRef(null);
  const hoveredRef = useRef(null);
  const [tooltip, setTooltip] = useState(null);

  const edges = useMemo(() => buildEdges(students ?? []), [students]);

  /* ── init physics state ──────────────────────────────────────────────── */
  const initState = useCallback((w, h) => {
    if (!students?.length) return;
    const cx = w / 2, cy = h / 2;
    const n  = students.length;
    const r  = Math.min(w, h) * 0.32;
    stateRef.current = {
      nodes: students.map((s, i) => {
        const angle  = (i / n) * Math.PI * 2 - Math.PI / 2;
        const jitter = 0.12;
        return {
          x:             cx + Math.cos(angle) * r * (1 - jitter + Math.random() * jitter * 2),
          y:             cy + Math.sin(angle) * r * (1 - jitter + Math.random() * jitter * 2),
          vx:            0,
          vy:            0,
          name:          s.name,
          initials:      getInitials(s.name),
          cluster:       s.cluster ?? 0,
          cluster_label: s.cluster_label ?? '',
          avg_score:     s.avg_score ?? 0,
        };
      }),
      edges,
      drag:  null,
      frame: 0,
    };
  }, [students, edges]);

  /* ── physics tick ────────────────────────────────────────────────────── */
  const tick = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    const { nodes } = st;
    const canvas = canvasRef.current;
    if (!canvas) return;

    st.frame++;

    // Once settled and undragged, skip physics to save CPU
    if (st.frame > 450 && st.drag === null) {
      let ke = 0;
      for (const n of nodes) ke += n.vx * n.vx + n.vy * n.vy;
      if (ke < 0.01) return;
    }

    const w = canvas.width, h = canvas.height;
    const cx = w / 2, cy = h / 2;

    // cooling: reduce forces as simulation ages
    const cool      = Math.max(0.08, 1 - st.frame / 220);
    const repulsion = (3500 + nodes.length * 70) * cool + 400;
    const gravity   = 0.055 * cool + 0.008;
    const restLen   = Math.max(75, 130 - nodes.length * 1.2);
    const damping   = st.frame > 120 ? 0.92 : 0.84;

    const fx = new Float32Array(nodes.length);
    const fy = new Float32Array(nodes.length);

    // node–node repulsion
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const dx = nodes[j].x - nodes[i].x;
        const dy = nodes[j].y - nodes[i].y;
        const d2 = Math.max(dx * dx + dy * dy, 0.01);
        const d  = Math.sqrt(d2);
        const f  = repulsion / d2;
        const nx = (dx / d) * f, ny = (dy / d) * f;
        fx[i] -= nx; fy[i] -= ny;
        fx[j] += nx; fy[j] += ny;
      }
    }

    // spring attraction along edges
    for (const e of st.edges) {
      const a = nodes[e.from], b = nodes[e.to];
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const f  = (d - restLen) * 0.05;
      const nx = (dx / d) * f, ny = (dy / d) * f;
      fx[e.from] += nx; fy[e.from] += ny;
      fx[e.to]   -= nx; fy[e.to]   -= ny;
    }

    // center gravity + integrate
    for (let i = 0; i < nodes.length; i++) {
      if (st.drag === i) continue;
      fx[i] += (cx - nodes[i].x) * gravity;
      fy[i] += (cy - nodes[i].y) * gravity;
      nodes[i].vx = (nodes[i].vx + fx[i]) * damping;
      nodes[i].vy = (nodes[i].vy + fy[i]) * damping;
      nodes[i].x  = Math.max(NODE_R + 6, Math.min(w - NODE_R - 6, nodes[i].x + nodes[i].vx));
      nodes[i].y  = Math.max(NODE_R + 6, Math.min(h - NODE_R - 6, nodes[i].y + nodes[i].vy));
    }
  }, []);

  /* ── canvas draw ─────────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const st     = stateRef.current;
    if (!canvas || !st) return;
    const ctx  = canvas.getContext('2d');
    const { nodes, edges: edgeList } = st;
    const w    = canvas.width, h = canvas.height;
    const hov  = hoveredRef.current;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0d0f14';
    ctx.fillRect(0, 0, w, h);

    // subtle dot grid
    ctx.fillStyle = 'rgba(255,255,255,0.025)';
    for (let gx = 28; gx < w; gx += 28)
      for (let gy = 28; gy < h; gy += 28) {
        ctx.beginPath();
        ctx.arc(gx, gy, 0.75, 0, Math.PI * 2);
        ctx.fill();
      }

    // edges
    for (const e of edgeList) {
      const a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) continue;
      const isConn = hov === null || hov === e.from || hov === e.to;
      ctx.globalAlpha = isConn ? (e.sameCluster ? 0.4 : 0.1) : 0.03;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = e.sameCluster ? CLUSTER_COLORS[a.cluster % CLUSTER_COLORS.length] : '#374151';
      ctx.lineWidth   = e.sameCluster ? 1.5 : 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // nodes
    for (let i = 0; i < nodes.length; i++) {
      const n    = nodes[i];
      const isHov = hov === i;
      const isDim = hov !== null && !isHov;
      const col  = CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length];
      const dim  = CLUSTER_DIM[n.cluster % CLUSTER_DIM.length];

      ctx.globalAlpha = isDim ? 0.18 : 1;

      // hover ring
      if (isHov) {
        ctx.beginPath();
        ctx.arc(n.x, n.y, NODE_R + 7, 0, Math.PI * 2);
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1;
        ctx.globalAlpha = 0.22;
        ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // fill circle
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      ctx.fillStyle = isHov ? col : dim;
      ctx.fill();

      // border
      ctx.beginPath();
      ctx.arc(n.x, n.y, NODE_R, 0, Math.PI * 2);
      ctx.strokeStyle = col;
      ctx.lineWidth   = isHov ? 2 : 1.5;
      ctx.stroke();

      // initials
      ctx.font          = 'bold 9px Inter, system-ui, sans-serif';
      ctx.textAlign     = 'center';
      ctx.textBaseline  = 'middle';
      ctx.fillStyle     = isHov ? '#fff' : col;
      ctx.fillText(n.initials, n.x, n.y);

      ctx.globalAlpha = 1;
    }
  }, []);

  /* ── animation loop ──────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !students?.length) return;
    const p = canvas.parentElement;
    canvas.width  = p.offsetWidth  || 640;
    canvas.height = p.offsetHeight || 380;
    initState(canvas.width, canvas.height);

    const loop = () => {
      tick();
      draw();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [students, initState, tick, draw]);

  /* ── resize ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const p = canvas.parentElement;
      if (p.offsetWidth && p.offsetHeight) {
        canvas.width  = p.offsetWidth;
        canvas.height = p.offsetHeight;
        initState(p.offsetWidth, p.offsetHeight);
      }
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [initState]);

  /* ── pointer events ──────────────────────────────────────────────────── */
  const getNodeAt = useCallback((mx, my) => {
    const nodes = stateRef.current?.nodes;
    if (!nodes) return -1;
    return nodes.findIndex(n => Math.hypot(n.x - mx, n.y - my) <= NODE_R + 4);
  }, []);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const st = stateRef.current;

    if (st?.drag !== null) {
      st.nodes[st.drag].x  = mx;
      st.nodes[st.drag].y  = my;
      st.nodes[st.drag].vx = 0;
      st.nodes[st.drag].vy = 0;
      return;
    }

    const idx = getNodeAt(mx, my);
    hoveredRef.current = idx >= 0 ? idx : null;

    if (idx >= 0) {
      const n = st.nodes[idx];
      setTooltip({ x: mx + 14, y: my - 10, name: n.name, cluster_label: n.cluster_label, avg_score: n.avg_score, cluster: n.cluster });
      canvas.style.cursor = 'grab';
    } else {
      setTooltip(null);
      canvas.style.cursor = 'default';
    }
  }, [getNodeAt]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const idx  = getNodeAt(e.clientX - rect.left, e.clientY - rect.top);
    if (idx >= 0) {
      stateRef.current.drag  = idx;
      // re-engage physics briefly after drag
      stateRef.current.frame = Math.min(stateRef.current.frame, 60);
      canvas.style.cursor    = 'grabbing';
    }
  }, [getNodeAt]);

  const handleMouseUp = useCallback(() => {
    if (stateRef.current) stateRef.current.drag = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (stateRef.current) stateRef.current.drag = null;
    hoveredRef.current = null;
    setTooltip(null);
  }, []);

  /* ── derive cluster legend from actual students ───────────────────────── */
  const clusterLegend = useMemo(() => {
    const map = {};
    for (const s of (students ?? [])) {
      const c = s.cluster ?? 0;
      if (!(c in map)) map[c] = s.cluster_label ?? `Cluster ${c + 1}`;
    }
    return Object.entries(map).map(([c, label]) => ({ cluster: +c, label }));
  }, [students]);

  /* ── render ──────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-3">
      <div
        className="relative rounded-2xl overflow-hidden border border-overlay/[0.08]"
        style={{ height: 420 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />

        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-[#0d0f14] border border-white/[0.08] rounded-xl px-3 py-2 shadow-2xl text-xs min-w-[140px]"
            style={{ left: tooltip.x, top: tooltip.y, transform: 'translateY(-100%)' }}
          >
            <p className="font-bold text-white mb-0.5">{tooltip.name}</p>
            <p className="text-[10px] mb-1" style={{ color: CLUSTER_COLORS[tooltip.cluster % CLUSTER_COLORS.length] }}>
              {tooltip.cluster_label}
            </p>
            <p className="text-white/50">Score: {tooltip.avg_score}%</p>
          </div>
        )}

        <div className="absolute bottom-3 right-3 text-[10px] text-white/20 pointer-events-none select-none">
          Drag to explore
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 px-1">
        {clusterLegend.map(({ cluster, label }) => (
          <div key={cluster} className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CLUSTER_COLORS[cluster % CLUSTER_COLORS.length] }} />
            <span className="text-[11px] text-text-muted">{label}</span>
          </div>
        ))}
        <span className="text-[11px] text-text-muted opacity-50">· edges connect similar students</span>
      </div>
    </div>
  );
}
