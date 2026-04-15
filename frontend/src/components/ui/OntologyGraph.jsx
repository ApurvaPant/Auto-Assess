/**
 * OntologyGraph — Palantir-style student-attribute ontology.
 *
 * Object model
 * ────────────
 *   Student  (main node)  — one per student, cluster-coloured
 *   Attribute (sub-node)  — 4 per student (T / Q / C / E)
 *
 * Link model
 * ──────────
 *   ownership  (solid)  — Student ──► Attribute
 *   similarity (dashed) — Attribute ‹──► Attribute (same type, different student,
 *                          value within SIMILARITY_THRESHOLD %)
 *
 * Physics
 * ───────
 *   Student nodes  : strong mutual repulsion + moderate centre gravity
 *   Attribute nodes: spring-tethered to their parent (rest ≈ 46 px)
 *                    + very weak similarity spring between cross-student peers
 *   All nodes      : inter-node repulsion (strength scaled by type pair)
 */
import { useRef, useEffect, useState, useCallback, useMemo } from 'react';

/* ── constants ─────────────────────────────────────────────────────────── */
const STUDENT_R  = 26;
const ATTR_R_MIN = 7;
const ATTR_R_MAX = 17;

const CLUSTER_COLORS = ['#4ade80', '#fbbf24', '#f87171', '#60a5fa', '#e879f9'];

// Attribute node metadata — order determines initial orbit angle
const ATTR_META = [
  { key: 'test_score',   label: 'Test Score',   letter: 'T', color: '#00e5ff' },
  { key: 'quality',      label: 'Code Quality',  letter: 'Q', color: '#c084fc' },
  { key: 'completeness', label: 'Completeness',  letter: 'C', color: '#fb923c' },
  { key: 'error',        label: 'Error-Free',    letter: 'E', color: '#4ade80' },
];

const SIMILARITY_THRESHOLD = 18; // % — connect attrs of same type within this range

/* ── helpers ───────────────────────────────────────────────────────────── */
function initials(name = '') {
  const p = name.trim().split(/\s+/);
  return p.length >= 2 ? (p[0][0] + p[1][0]).toUpperCase() : name.slice(0, 2).toUpperCase();
}

/** Extract all four normalised attribute values (0–100) for a student record. */
function attrValues(s) {
  return {
    test_score:   s.avg_test_score ?? 0,
    quality:      s.avg_quality    ?? 0,
    completeness: s.completion_rate ?? 0,
    // avg_penalty 0–5 → invert and scale so 0 penalty = 100 %
    error: Math.max(0, 100 - (s.avg_penalty ?? 0) * 20),
  };
}

function attrRadius(val) {
  return ATTR_R_MIN + (Math.max(0, Math.min(100, val)) / 100) * (ATTR_R_MAX - ATTR_R_MIN);
}

/* ── build flat node + edge arrays ─────────────────────────────────────── */
function buildGraph(students, visible) {
  const nodes = [];
  const edges = [];
  const visibleMeta = ATTR_META.filter(m => visible.includes(m.key));
  // bucket attr nodes by type for cross-student similarity pass
  const byType = {};
  visibleMeta.forEach(m => { byType[m.key] = []; });

  students.forEach((s, si) => {
    const sIdx = nodes.length;
    const av   = attrValues(s);
    nodes.push({
      id: `s${si}`, type: 'student', si,
      r: STUDENT_R,
      name: s.name, initials: initials(s.name ?? ''),
      cluster: s.cluster ?? 0, cluster_label: s.cluster_label ?? '',
      avg_score: s.avg_score ?? 0, av,
      parentIdx: null,
      x: 0, y: 0, vx: 0, vy: 0,
    });

    visibleMeta.forEach(({ key }, ai) => {
      const val  = av[key];
      const aIdx = nodes.length;
      nodes.push({
        id: `a${si}_${key}`, type: 'attr', si,
        attrType: key, value: val,
        r: attrRadius(val),
        parentIdx: sIdx,
        initAngle: (ai / visibleMeta.length) * Math.PI * 2,
        x: 0, y: 0, vx: 0, vy: 0,
      });
      // ownership edge
      edges.push({ from: sIdx, to: aIdx, kind: 'own' });
      byType[key].push({ nodeIdx: aIdx, value: val });
    });
  });

  // Cross-student similarity edges (same attribute type)
  for (const { key } of visibleMeta) {
    const list = byType[key];
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const diff = Math.abs(list[i].value - list[j].value);
        if (diff <= SIMILARITY_THRESHOLD) {
          edges.push({
            from: list[i].nodeIdx, to: list[j].nodeIdx,
            kind: 'sim', attrType: key,
            strength: 1 - diff / SIMILARITY_THRESHOLD,
          });
        }
      }
    }
  }

  return { nodes, edges };
}

/* ── OntologyGraph component ───────────────────────────────────────────── */
export function OntologyGraph({ students }) {
  const canvasRef = useRef(null);
  const stateRef  = useRef(null);
  const rafRef    = useRef(null);
  const hovRef    = useRef(null);
  const [tooltip, setTooltip] = useState(null);
  const [visible, setVisible] = useState(ATTR_META.map(m => m.key));

  const { nodes: tmpl, edges } = useMemo(
    () => buildGraph(students ?? [], visible),
    [students, visible]
  );

  /* ── initialise positions ───────────────────────────────────────────── */
  const initState = useCallback((w, h) => {
    if (!tmpl.length) return;
    const cx = w / 2, cy = h / 2;
    const sNodes = tmpl.filter(n => n.type === 'student');
    const ns     = sNodes.length;
    const ring   = Math.min(w, h) * 0.28;

    // Clone with positions (first student pass, attr placeholders)
    const nodes = tmpl.map(n => ({ ...n }));

    nodes.forEach((n, i) => {
      if (n.type === 'student') {
        const si  = sNodes.indexOf(tmpl[i]);
        const ang = (si / Math.max(ns, 1)) * Math.PI * 2 - Math.PI / 2;
        const jit = (Math.random() - 0.5) * ring * 0.12;
        n.x = cx + Math.cos(ang) * ring + jit;
        n.y = cy + Math.sin(ang) * ring + jit;
      }
    });

    // Second pass: attr nodes orbit parent
    nodes.forEach((n, i) => {
      if (n.type === 'attr') {
        const p = nodes[n.parentIdx];
        n.x = (p?.x ?? cx) + Math.cos(n.initAngle) * 58;
        n.y = (p?.y ?? cy) + Math.sin(n.initAngle) * 58;
      }
    });

    stateRef.current = { nodes, edges, drag: null, frame: 0 };
  }, [tmpl, edges]);

  /* ── physics tick ───────────────────────────────────────────────────── */
  const tick = useCallback(() => {
    const st = stateRef.current;
    if (!st) return;
    const { nodes } = st;
    const canvas = canvasRef.current;
    if (!canvas) return;

    st.frame++;

    // Early-out when kinetic energy dies
    if (st.frame > 600 && st.drag === null) {
      let ke = 0;
      for (const n of nodes) ke += n.vx * n.vx + n.vy * n.vy;
      if (ke < 0.004) return;
    }

    const w  = canvas.width, h = canvas.height;
    const cx = w / 2,        cy = h / 2;
    const cool    = Math.max(0.04, 1 - st.frame / 300);
    const damping = st.frame > 180 ? 0.89 : 0.81;

    const fx = new Float32Array(nodes.length);
    const fy = new Float32Array(nodes.length);

    // ── Pairwise repulsion ───────────────────────────────────────────────
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const ni = nodes[i], nj = nodes[j];
        const dx = nj.x - ni.x, dy = nj.y - ni.y;
        const d2 = Math.max(dx * dx + dy * dy, 1);
        const d  = Math.sqrt(d2);
        const minD = ni.r + nj.r + 6;

        let rep;
        if (ni.type === 'student' && nj.type === 'student') {
          rep = (5500 + nodes.length * 90) * cool + 450;
        } else if (ni.type !== nj.type) {
          rep = (1400 + nodes.length * 25) * cool + 160;
        } else {
          rep = (700  + nodes.length * 12) * cool + 90;
        }
        if (d < minD) rep *= 5; // hard-body push

        const f  = rep / d2;
        const nx = (dx / d) * f, ny = (dy / d) * f;
        fx[i] -= nx; fy[i] -= ny;
        fx[j] += nx; fy[j] += ny;
      }
    }

    // ── Spring forces (edges) ───────────────────────────────────────────
    for (const e of st.edges) {
      const a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) continue;
      const dx = b.x - a.x, dy = b.y - a.y;
      const d  = Math.sqrt(dx * dx + dy * dy) || 0.1;

      let k, rest;
      if (e.kind === 'own') {
        // Ownership: firm tether between student and its attr node
        k    = 0.14 * cool + 0.055;
        rest = 58;
      } else {
        // Similarity: very soft pull so similar attrs drift a bit closer
        k    = 0.004 * cool * (e.strength ?? 1);
        rest = 72;
      }

      const f  = (d - rest) * k;
      const nx = (dx / d) * f, ny = (dy / d) * f;
      fx[e.from] += nx; fy[e.from] += ny;
      fx[e.to]   -= nx; fy[e.to]   -= ny;
    }

    // ── Centre gravity + integrate ──────────────────────────────────────
    const g = 0.045 * cool + 0.007;
    for (let i = 0; i < nodes.length; i++) {
      if (st.drag === i) continue;
      const grav = nodes[i].type === 'student' ? g : g * 0.22;
      fx[i] += (cx - nodes[i].x) * grav;
      fy[i] += (cy - nodes[i].y) * grav;
      nodes[i].vx = Math.max(-10, Math.min(10, (nodes[i].vx + fx[i]) * damping));
      nodes[i].vy = Math.max(-10, Math.min(10, (nodes[i].vy + fy[i]) * damping));
      nodes[i].x  = Math.max(nodes[i].r + 4, Math.min(w - nodes[i].r - 4, nodes[i].x + nodes[i].vx));
      nodes[i].y  = Math.max(nodes[i].r + 4, Math.min(h - nodes[i].r - 4, nodes[i].y + nodes[i].vy));
    }
  }, []);

  /* ── canvas draw ────────────────────────────────────────────────────── */
  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const st     = stateRef.current;
    if (!canvas || !st) return;

    const ctx = canvas.getContext('2d');
    const { nodes, edges: el } = st;
    const w  = canvas.width, h = canvas.height;
    const hov = hovRef.current;

    // Background
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0c11';
    ctx.fillRect(0, 0, w, h);

    // Subtle dot grid
    ctx.fillStyle = 'rgba(255,255,255,0.018)';
    for (let gx = 30; gx < w; gx += 30)
      for (let gy = 30; gy < h; gy += 30) {
        ctx.beginPath(); ctx.arc(gx, gy, 0.65, 0, Math.PI * 2); ctx.fill();
      }

    // ── Compute highlight set ────────────────────────────────────────────
    let hiSet = null;
    if (hov !== null) {
      const hn = nodes[hov];
      hiSet = new Set([hov]);
      for (const e of el) {
        if (e.from === hov) hiSet.add(e.to);
        if (e.to   === hov) hiSet.add(e.from);
      }
      if (hn?.type === 'student') {
        // Also include all owned attr children
        nodes.forEach((n, i) => { if (n.parentIdx !== null && nodes[n.parentIdx]?.id === hn.id) hiSet.add(i); });
      } else if (hn?.type === 'attr' && hn.parentIdx !== null) {
        // Include parent + all siblings (other attrs of same student)
        hiSet.add(hn.parentIdx);
        nodes.forEach((n, i) => { if (n.type === 'attr' && n.parentIdx === hn.parentIdx) hiSet.add(i); });
      }
    }

    // ── Draw edges ───────────────────────────────────────────────────────
    ctx.save();
    for (const e of el) {
      const a = nodes[e.from], b = nodes[e.to];
      if (!a || !b) continue;
      const hi = !hiSet || (hiSet.has(e.from) && hiSet.has(e.to));

      if (e.kind === 'own') {
        const meta = ATTR_META.find(m => m.key === (a.attrType || b.attrType));
        ctx.globalAlpha = hi ? 0.45 : 0.04;
        ctx.strokeStyle = meta?.color ?? '#666';
        ctx.lineWidth   = 1;
        ctx.setLineDash([]);
      } else {
        const meta = ATTR_META.find(m => m.key === e.attrType);
        ctx.globalAlpha = hi ? (0.10 + (e.strength ?? 0.5) * 0.45) : 0.022;
        ctx.strokeStyle = meta?.color ?? '#888';
        ctx.lineWidth   = 0.5 + (e.strength ?? 0.5) * 1.5;
        ctx.setLineDash([3, 5]);
      }
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    ctx.restore();

    // ── Draw nodes (attrs beneath students) ──────────────────────────────
    const order = [...nodes.keys()].sort((a, b) =>
      (nodes[a].type === 'student' ? 1 : 0) - (nodes[b].type === 'student' ? 1 : 0)
    );

    for (const i of order) {
      const n    = nodes[i];
      const dim  = hiSet !== null && !hiSet.has(i);
      const isHov = hov === i;

      ctx.globalAlpha = dim ? 0.09 : 1;

      if (n.type === 'student') {
        const col  = CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length];

        // Pulse ring on hover
        if (isHov) {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 10, 0, Math.PI * 2);
          ctx.strokeStyle = col; ctx.lineWidth = 1.5;
          ctx.globalAlpha = 0.18; ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Fill
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? col : `${col}38`; ctx.fill();

        // Border
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = isHov ? 2.5 : 2; ctx.stroke();

        // Initials
        ctx.font = 'bold 10px Inter,system-ui,sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillStyle = isHov ? '#fff' : col;
        ctx.fillText(n.initials, n.x, n.y);

      } else {
        const meta   = ATTR_META.find(m => m.key === n.attrType);
        const col    = meta?.color ?? '#888';
        const letter = meta?.letter ?? '?';

        // Glow ring on hover
        if (isHov) {
          ctx.beginPath(); ctx.arc(n.x, n.y, n.r + 5, 0, Math.PI * 2);
          ctx.strokeStyle = col; ctx.lineWidth = 1;
          ctx.globalAlpha = 0.30; ctx.stroke();
          ctx.globalAlpha = 1;
        }

        // Fill
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.fillStyle = isHov ? col : `${col}45`; ctx.fill();

        // Border
        ctx.beginPath(); ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
        ctx.strokeStyle = col; ctx.lineWidth = 1.5; ctx.stroke();

        // Letter
        if (n.r >= 7) {
          ctx.font = `bold ${Math.round(n.r * 0.72)}px Inter,system-ui,sans-serif`;
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = isHov ? '#fff' : col;
          ctx.fillText(letter, n.x, n.y);
        }
      }

      ctx.globalAlpha = 1;
    }
  }, []);

  /* ── animation loop ─────────────────────────────────────────────────── */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !tmpl.length) return;
    const p = canvas.parentElement;
    canvas.width  = p.offsetWidth  || 700;
    canvas.height = p.offsetHeight || 500;
    initState(canvas.width, canvas.height);

    const loop = () => { tick(); draw(); rafRef.current = requestAnimationFrame(loop); };
    rafRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tmpl, initState, tick, draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ro = new ResizeObserver(() => {
      const p = canvas.parentElement;
      if (p.offsetWidth && p.offsetHeight) {
        canvas.width = p.offsetWidth; canvas.height = p.offsetHeight;
        initState(p.offsetWidth, p.offsetHeight);
      }
    });
    ro.observe(canvas.parentElement);
    return () => ro.disconnect();
  }, [initState]);

  /* ── pointer events ─────────────────────────────────────────────────── */
  const getAt = useCallback((mx, my) => {
    const nodes = stateRef.current?.nodes;
    if (!nodes) return -1;
    // Priority: student nodes (drawn on top)
    let best = -1;
    for (let i = nodes.length - 1; i >= 0; i--) {
      if (Math.hypot(nodes[i].x - mx, nodes[i].y - my) <= nodes[i].r + 5) {
        if (nodes[i].type === 'student') return i;
        if (best === -1) best = i;
      }
    }
    return best;
  }, []);

  const handleMouseMove = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left, my = e.clientY - rect.top;
    const st = stateRef.current;

    if (st?.drag !== null) {
      st.nodes[st.drag].x = mx; st.nodes[st.drag].y = my;
      st.nodes[st.drag].vx = 0; st.nodes[st.drag].vy = 0;
      return;
    }

    const idx = getAt(mx, my);
    hovRef.current = idx >= 0 ? idx : null;

    if (idx >= 0) {
      setTooltip({ x: mx + 14, y: my - 10, n: st.nodes[idx] });
      canvas.style.cursor = 'grab';
    } else {
      setTooltip(null);
      canvas.style.cursor = 'default';
    }
  }, [getAt]);

  const handleMouseDown = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const idx  = getAt(e.clientX - rect.left, e.clientY - rect.top);
    if (idx >= 0 && stateRef.current) {
      stateRef.current.drag  = idx;
      stateRef.current.frame = Math.min(stateRef.current.frame, 60);
      canvas.style.cursor    = 'grabbing';
    }
  }, [getAt]);

  const handleMouseUp = useCallback(() => {
    if (stateRef.current) stateRef.current.drag = null;
    if (canvasRef.current) canvasRef.current.style.cursor = 'default';
  }, []);

  const handleMouseLeave = useCallback(() => {
    if (stateRef.current) stateRef.current.drag = null;
    hovRef.current = null;
    setTooltip(null);
  }, []);

  /* ── tooltip content ────────────────────────────────────────────────── */
  const TooltipContent = ({ n }) => {
    if (!n) return null;
    if (n.type === 'student') {
      const col = CLUSTER_COLORS[n.cluster % CLUSTER_COLORS.length];
      return (
        <div className="space-y-2.5 min-w-[175px]">
          <div>
            <p className="font-bold text-white text-sm leading-tight">{n.name}</p>
            <p className="text-[10px] font-semibold mt-0.5" style={{ color: col }}>{n.cluster_label}</p>
          </div>
          <div className="space-y-1.5">
            {ATTR_META.map(({ key, label, letter, color }) => {
              const val = n.av?.[key] ?? 0;
              return (
                <div key={key} className="flex items-center gap-2">
                  <span className="text-[9px] font-black w-3.5 text-center" style={{ color }}>{letter}</span>
                  <span className="text-[10px] text-white/45 flex-1">{label}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-14 h-1 rounded-full bg-white/[0.06] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${val}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color }}>{val.toFixed(0)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="border-t border-white/[0.05] pt-1.5 flex items-center justify-between">
            <span className="text-[10px] text-white/35">Final avg</span>
            <span className="text-[11px] font-black text-white/80">{n.avg_score?.toFixed(1)}%</span>
          </div>
        </div>
      );
    }
    // Attribute node
    const meta       = ATTR_META.find(m => m.key === n.attrType);
    const col        = meta?.color ?? '#aaa';
    const parentNode = stateRef.current?.nodes[n.parentIdx];
    return (
      <div className="min-w-[140px] space-y-2">
        <div>
          <p className="font-bold text-sm" style={{ color: col }}>{meta?.label}</p>
          <p className="text-[10px] text-white/40">{parentNode?.name}</p>
        </div>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-black" style={{ color: col }}>{n.value?.toFixed(0)}</span>
          <span className="text-[10px] text-white/30 mb-1">/ 100</span>
        </div>
        <div className="h-1.5 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${n.value ?? 0}%`, backgroundColor: col }} />
        </div>
        <p className="text-[9px] text-white/25">
          {n.value >= 80 ? 'Excellent' : n.value >= 60 ? 'Good' : n.value >= 40 ? 'Average' : 'Needs work'}
        </p>
      </div>
    );
  };

  /* ── safe tooltip x clamp ───────────────────────────────────────────── */
  const tooltipLeft = tooltip
    ? Math.min(tooltip.x, (canvasRef.current?.offsetWidth ?? 700) - 210)
    : 0;

  /* ── render ─────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-4">

      {/* Attribute toggle pills */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[11px] text-text-muted uppercase tracking-widest font-semibold mr-1">
          Attributes:
        </span>
        {ATTR_META.map(({ key, label, letter, color }) => {
          const on = visible.includes(key);
          return (
            <button
              key={key}
              onClick={() => setVisible(v => on ? v.filter(k => k !== key) : [...v, key])}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold border transition-all"
              style={{
                borderColor:     color,
                color:           on ? '#fff' : color,
                backgroundColor: on ? color + 'cc' : color + '18',
              }}
            >
              <span className="text-[9px] font-black">{letter}</span>
              {label}
            </button>
          );
        })}
      </div>

      {/* Canvas area */}
      <div
        className="relative rounded-2xl overflow-hidden border border-overlay/[0.08]"
        style={{ height: 620 }}
      >
        <canvas
          ref={canvasRef}
          className="w-full h-full block"
          onMouseMove={handleMouseMove}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
        />

        {/* Tooltip */}
        {tooltip && (
          <div
            className="absolute pointer-events-none z-10 bg-[#0a0c11]/96 border border-white/[0.07] rounded-xl px-3.5 py-3 shadow-2xl backdrop-blur-sm text-xs"
            style={{ left: tooltipLeft, top: tooltip.y, transform: 'translateY(-100%)' }}
          >
            <TooltipContent n={tooltip.n} />
          </div>
        )}

        {/* Node-type legend — top-left overlay */}
        <div className="absolute top-3 left-3 space-y-1.5 pointer-events-none select-none">
          <p className="text-[9px] text-white/20 uppercase tracking-widest font-bold mb-2">
            Node Types
          </p>
          <div className="flex items-center gap-1.5">
            <div className="w-4 h-4 rounded-full border border-success/60 bg-success/10 flex-shrink-0" />
            <span className="text-[10px] text-white/30">Student</span>
          </div>
          {ATTR_META.map(({ key, letter, label, color }) =>
            !visible.includes(key) ? null : (
              <div key={key} className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full border flex items-center justify-center flex-shrink-0"
                  style={{ borderColor: color + '80', backgroundColor: color + '22' }}
                >
                  <span className="text-[6px] font-black" style={{ color }}>{letter}</span>
                </div>
                <span className="text-[10px] text-white/30">{label}</span>
              </div>
            )
          )}
        </div>

        {/* Edge-type legend — bottom-left */}
        <div className="absolute bottom-3 left-3 space-y-1.5 pointer-events-none select-none">
          <div className="flex items-center gap-2">
            <svg width="24" height="4" className="flex-shrink-0">
              <line x1="0" y1="2" x2="24" y2="2" stroke="rgba(255,255,255,0.22)" strokeWidth="1" />
            </svg>
            <span className="text-[9px] text-white/22">Ownership</span>
          </div>
          <div className="flex items-center gap-2">
            <svg width="24" height="4" className="flex-shrink-0">
              <line x1="0" y1="2" x2="24" y2="2" stroke="rgba(255,255,255,0.22)" strokeWidth="1" strokeDasharray="3 4" />
            </svg>
            <span className="text-[9px] text-white/22">Similarity (±{SIMILARITY_THRESHOLD}%)</span>
          </div>
        </div>

        {/* Drag hint */}
        <div className="absolute bottom-3 right-3 text-[9px] text-white/12 pointer-events-none select-none font-mono">
          ontology · drag to explore
        </div>
      </div>

      {/* Caption */}
      <p className="text-[11px] text-text-muted px-1 opacity-55 leading-relaxed">
        Each student expands into attribute sub-nodes whose <strong className="text-text-muted font-semibold">size</strong> encodes value.
        Dashed lines bridge students with similar performance in that dimension.
        Node size ∝ attribute value · similarity threshold ±{SIMILARITY_THRESHOLD}%.
      </p>
    </div>
  );
}
