import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useChartTheme } from '../../hooks/useChartTheme';
import { getClassAnalysis } from '../../api/client';
import toast from 'react-hot-toast';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ZAxis, Legend,
  BarChart, Bar, Cell, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, ReferenceLine,
  LineChart, Line, ComposedChart, Area,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import {
  Users, TrendingUp, Star, CheckCircle, RefreshCw,
  AlertTriangle, Award, Target, BarChart2, Activity,
  Search, ArrowUp, ArrowDown, ArrowUpDown, ChevronDown,
  Lightbulb, Zap, ShieldAlert, GitCompare,
  GitBranch, TrendingDown, Sigma, Eye,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { CorrelationGraph } from '../../components/ui/CorrelationGraph';
import { OntologyGraph }   from '../../components/ui/OntologyGraph';

/* ─── constants ──────────────────────────────────────────────────────────────── */
const CLUSTER_COLORS = ['#22c55e', '#f59e0b', '#ef4444'];
const CLUSTER_BG     = ['bg-success/10 border-success/20', 'bg-warning/10 border-warning/20', 'bg-error/10 border-error/20'];
const CLUSTER_TEXT   = ['text-success', 'text-warning', 'text-error'];
const CLUSTER_DOT    = ['bg-success', 'bg-warning', 'bg-error'];

const TABS = [
  { id: 'overview',     label: 'Overview',      icon: BarChart2  },
  { id: 'clusters',     label: 'Clusters',      icon: Target     },
  { id: 'distribution', label: 'Distribution',  icon: Activity   },
  { id: 'correlation',  label: 'Correlation',   icon: Sigma      },
  { id: 'ontology',     label: 'Ontology',      icon: GitBranch  },
  { id: 'outliers',     label: 'Outliers',      icon: Eye        },
  { id: 'trends',       label: 'Trends',        icon: TrendingUp },
  { id: 'penalty',      label: 'Penalty',       icon: ShieldAlert},
  { id: 'compare',      label: 'Compare',       icon: GitCompare },
  { id: 'insights',     label: 'Insights',      icon: Lightbulb  },
  { id: 'atrisk',       label: 'At-Risk',       icon: AlertTriangle },
  { id: 'students',     label: 'All Students',  icon: Users      },
];

/* ─── pure maths helpers ─────────────────────────────────────────────────────── */
const pct      = (v) => `${v}%`;
const grade    = (v) => v >= 80 ? 'A' : v >= 65 ? 'B' : v >= 50 ? 'C' : v >= 35 ? 'D' : 'F';
const gradeColor = (v) => v >= 80 ? 'text-success' : v >= 65 ? 'text-primary' : v >= 50 ? 'text-warning' : 'text-error';

const mean = (arr) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const stdDev = (arr) => {
  const m = mean(arr);
  return Math.sqrt(arr.reduce((acc, v) => acc + (v - m) ** 2, 0) / arr.length);
};
const quantile = (sorted, q) => {
  const pos = q * (sorted.length - 1);
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return +(sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo)).toFixed(1);
};
const pearson = (xs, ys) => {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = mean(xs), my = mean(ys);
  const num = xs.reduce((acc, x, i) => acc + (x - mx) * (ys[i] - my), 0);
  const dx  = Math.sqrt(xs.reduce((acc, x) => acc + (x - mx) ** 2, 0));
  const dy  = Math.sqrt(ys.reduce((acc, y) => acc + (y - my) ** 2, 0));
  return dx === 0 || dy === 0 ? 0 : +(num / (dx * dy)).toFixed(2);
};

const scoreBucket = (v) =>
  v >= 80 ? '80–100' : v >= 60 ? '60–79' : v >= 40 ? '40–59' : v >= 20 ? '20–39' : '0–19';
const BUCKET_ORDER = ['0–19', '20–39', '40–59', '60–79', '80–100'];
const BUCKET_COLOR = ['#ef4444', '#f97316', '#f59e0b', '#22c55e', '#10b981'];

/* ─── shared tooltip components ──────────────────────────────────────────────── */
const ScatterTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  return (
    <div className="bg-surface border border-overlay/10 rounded-xl px-3 py-2.5 shadow-2xl text-xs space-y-1 min-w-[170px]">
      <div className="flex items-center gap-2 mb-1">
        {d.photo_url ? (
          <img src={d.photo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-overlay/10" />
        ) : (
          <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary">
            {(d.name || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <span className="font-semibold text-text-primary truncate">{d.name}</span>
      </div>
      {[
        ['Avg Score',   `${d.avg_score}%`],
        ['Test Score',  `${d.avg_test_score}%`],
        ['Quality',      d.avg_quality],
        ['Completion',  `${d.completion_rate}%`],
        ['Penalty',      d.avg_penalty],
        ['Grade',        grade(d.avg_score)],
      ].map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4">
          <span className="text-text-muted">{k}</span>
          <span className="font-bold text-text-primary">{v}</span>
        </div>
      ))}
      <div className={`mt-1 text-[10px] font-semibold ${CLUSTER_TEXT[d.cluster] ?? ''}`}>{d.cluster_label}</div>
    </div>
  );
};

const GenericTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-overlay/10 rounded-xl px-3 py-2 shadow-xl text-xs">
      {label && <p className="font-semibold text-text-primary mb-1">{label}</p>}
      {payload.map(p => (
        <div key={p.name} className="flex justify-between gap-4">
          <span className="text-text-muted">{p.name}</span>
          <span className="font-bold" style={{ color: p.fill || p.color || p.stroke }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── stat card ──────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-primary', badge }) => (
  <div className="flex-1 min-w-[140px] rounded-2xl border border-overlay/[0.07] bg-surface p-4 flex flex-col gap-1.5">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 shrink-0 ${color}`} />
        <span className="text-[11px] text-text-muted font-medium uppercase tracking-wide">{label}</span>
      </div>
      {badge && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary/10 text-primary">{badge}</span>}
    </div>
    <p className={`text-2xl font-black leading-none ${color}`}>{value}</p>
    {sub && <p className="text-[11px] text-text-muted leading-snug">{sub}</p>}
  </div>
);

/* ─── sortable table header ──────────────────────────────────────────────────── */
const SortTh = ({ label, sortKey, sortState, onSort }) => {
  const active = sortState.key === sortKey;
  const Icon   = active ? (sortState.dir === 'asc' ? ArrowUp : ArrowDown) : ArrowUpDown;
  return (
    <th className="px-4 py-3 font-medium cursor-pointer select-none group" onClick={() => onSort(sortKey)}>
      <div className="flex items-center gap-1">
        {label}
        <Icon className={`h-3 w-3 transition-opacity ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-40'}`} />
      </div>
    </th>
  );
};

/* ─── correlation cell ───────────────────────────────────────────────────────── */
const rColor = (r) => {
  const abs = Math.abs(r);
  if (abs >= 0.7) return r > 0 ? 'bg-success/20 text-success' : 'bg-error/20 text-error';
  if (abs >= 0.4) return r > 0 ? 'bg-success/10 text-success' : 'bg-error/10 text-error';
  return 'bg-overlay/[0.04] text-text-muted';
};

/* ─── Main Component ─────────────────────────────────────────────────────────── */
export default function ClassAnalysis() {
  const { classroomId } = useAuth();
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);
  const [tab,     setTab]     = useState('overview');
  const [search,  setSearch]  = useState('');
  const [sort,    setSort]    = useState({ key: 'avg_score', dir: 'desc' });
  const [cFilter, setCFilter] = useState('all');

  const ct = useChartTheme();

  const load = async () => {
    if (!classroomId) return;
    setLoading(true);
    try {
      const res = await getClassAnalysis(classroomId);
      setData(res.data);
    } catch { toast.error('Failed to load class analysis'); }
    finally   { setLoading(false); }
  };
  useEffect(() => { load(); }, [classroomId]);

  /* ── derived data ────────────────────────────────────────────────────────── */
  const students = useMemo(() => data?.students ?? [], [data]);
  const s        = data?.summary;
  const hasData  = students.length > 0;

  const byCluster = useMemo(() =>
    (data?.clusters ?? []).map(c => ({
      ...c,
      points: students.filter(st => st.cluster === c.id),
    })), [data, students]);

  /* — grade breakdown ——————————————————————————————————————————————————————— */
  const gradeBreakdown = useMemo(() => {
    const g = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    students.forEach(st => g[grade(st.avg_score)]++);
    const col = { A: '#22c55e', B: '#10b981', C: '#f59e0b', D: '#f97316', F: '#ef4444' };
    return Object.entries(g).map(([gr, count]) => ({ grade: gr, count, fill: col[gr] }));
  }, [students]);

  /* — score / completion distributions ————————————————————————————————————— */
  const scoreDistribution = useMemo(() => {
    const b = Object.fromEntries(BUCKET_ORDER.map(k => [k, 0]));
    students.forEach(st => b[scoreBucket(st.avg_score)]++);
    return BUCKET_ORDER.map((range, i) => ({ range, students: b[range], fill: BUCKET_COLOR[i] }));
  }, [students]);

  const completionDistribution = useMemo(() => {
    const b = { '0%': 0, '1–25%': 0, '26–50%': 0, '51–75%': 0, '76–100%': 0 };
    students.forEach(st => {
      const r = st.completion_rate;
      if (r === 0)        b['0%']++;
      else if (r <= 25)   b['1–25%']++;
      else if (r <= 50)   b['26–50%']++;
      else if (r <= 75)   b['51–75%']++;
      else                b['76–100%']++;
    });
    return Object.entries(b).map(([range, count]) => ({ range, count }));
  }, [students]);

  /* — radar data ——————————————————————————————————————————————————————————— */
  const radarData = useMemo(() => [
    { metric: 'Avg Score',  ...Object.fromEntries(byCluster.map(c => [c.label, c.avg_score])) },
    { metric: 'Quality',    ...Object.fromEntries(byCluster.map(c => [c.label, c.avg_quality])) },
    { metric: 'Completion', ...Object.fromEntries(byCluster.map(c => [c.label, c.avg_completion])) },
    { metric: 'Test Score', ...Object.fromEntries(byCluster.map(c => [c.label, c.avg_test_score ?? 0])) },
    { metric: 'Low Penalty',...Object.fromEntries(byCluster.map(c => [c.label, Math.max(0, 100 - (c.avg_penalty ?? 0) * 3)])) },
  ], [byCluster]);

  /* ── CORRELATION MATRIX ──────────────────────────────────────────────────── */
  const CORR_METRICS = [
    { key: 'avg_score',       label: 'Score'      },
    { key: 'avg_test_score',  label: 'Test Score' },
    { key: 'avg_quality',     label: 'Quality'    },
    { key: 'completion_rate', label: 'Completion' },
    { key: 'avg_penalty',     label: 'Penalty'    },
  ];

  const corrMatrix = useMemo(() => {
    if (students.length < 3) return null;
    return CORR_METRICS.map(r =>
      CORR_METRICS.map(c => pearson(
        students.map(st => st[r.key]),
        students.map(st => st[c.key]),
      ))
    );
  }, [students]);

  const topCorrelations = useMemo(() => {
    if (!corrMatrix) return [];
    const pairs = [];
    for (let i = 0; i < CORR_METRICS.length; i++)
      for (let j = i + 1; j < CORR_METRICS.length; j++)
        pairs.push({ a: CORR_METRICS[i].label, b: CORR_METRICS[j].label, r: corrMatrix[i][j] });
    return pairs.sort((x, y) => Math.abs(y.r) - Math.abs(x.r));
  }, [corrMatrix]);

  /* ── OUTLIER DETECTOR ────────────────────────────────────────────────────── */
  const outliers = useMemo(() => {
    if (students.length < 4) return { overperformers: [], underperformers: [] };
    const result = { overperformers: [], underperformers: [] };

    byCluster.forEach(c => {
      if (c.points.length < 2) return;
      const scores = c.points.map(p => p.avg_score);
      const m  = mean(scores);
      const sd = stdDev(scores);
      c.points.forEach(st => {
        const z = (st.avg_score - m) / (sd || 1);
        if (z > 1.5 && c.id > 0)  // in lower cluster but scoring high
          result.overperformers.push({ ...st, z: +z.toFixed(2), clusterLabel: c.label, clusterMean: +m.toFixed(1) });
        if (z < -1.5 && c.id < 2) // in higher cluster but scoring low
          result.underperformers.push({ ...st, z: +z.toFixed(2), clusterLabel: c.label, clusterMean: +m.toFixed(1) });
      });
    });
    result.overperformers.sort((a, b) => b.z - a.z);
    result.underperformers.sort((a, b) => a.z - b.z);
    return result;
  }, [byCluster, students]);

  /* ── QUARTILE / BOX-PLOT DATA ────────────────────────────────────────────── */
  const quartileData = useMemo(() => {
    if (!students.length) return [];
    const metrics = [
      { key: 'avg_score',       label: 'Score',      color: '#6366f1' },
      { key: 'avg_test_score',  label: 'Test Score', color: '#22c55e' },
      { key: 'avg_quality',     label: 'Quality',    color: '#f59e0b' },
      { key: 'completion_rate', label: 'Completion', color: '#06b6d4' },
    ];
    return metrics.map(m => {
      const vals = [...students.map(st => st[m.key])].sort((a, b) => a - b);
      return {
        name:    m.label,
        color:   m.color,
        min:     vals[0],
        q1:      quantile(vals, 0.25),
        median:  quantile(vals, 0.5),
        q3:      quantile(vals, 0.75),
        max:     vals[vals.length - 1],
        mean:    +mean(vals).toFixed(1),
      };
    });
  }, [students]);

  /* ── PENALTY DATA ────────────────────────────────────────────────────────── */
  const penaltyData = useMemo(() =>
    [...students].sort((a, b) => b.avg_penalty - a.avg_penalty)
      .map(s => ({ name: s.name.split(' ')[0], penalty: s.avg_penalty, score: s.avg_score, cluster: s.cluster })),
    [students]);

  const penaltyBuckets = useMemo(() => {
    const b = { 'None': 0, 'Low (1–5)': 0, 'Mid (6–15)': 0, 'High (>15)': 0 };
    students.forEach(s => {
      const p = s.avg_penalty;
      if (p === 0) b['None']++;
      else if (p <= 5) b['Low (1–5)']++;
      else if (p <= 15) b['Mid (6–15)']++;
      else b['High (>15)']++;
    });
    const colors = { 'None': '#22c55e', 'Low (1–5)': '#f59e0b', 'Mid (6–15)': '#f97316', 'High (>15)': '#ef4444' };
    return Object.entries(b).map(([range, count]) => ({ range, count, fill: colors[range] }));
  }, [students]);

  /* ── CLUSTER COMPARE ─────────────────────────────────────────────────────── */
  const clusterCompare = useMemo(() =>
    byCluster.map(c => ({
      name:       c.label.replace('High Performers', 'High').replace('Needs Support', 'At-Risk'),
      Score:      c.avg_score,
      Quality:    c.avg_quality,
      Completion: c.avg_completion,
      'Test':     c.avg_test_score ?? 0,
    })), [byCluster]);

  /* ── AT-RISK ─────────────────────────────────────────────────────────────── */
  const atRisk = useMemo(() =>
    [...students]
      .filter(st => st.avg_score < 40 || st.completion_rate < 50)
      .sort((a, b) => (a.avg_score + a.completion_rate) - (b.avg_score + b.completion_rate)),
    [students]);

  /* ── AUTO INSIGHTS ───────────────────────────────────────────────────────── */
  const insights = useMemo(() => {
    if (!students.length || !s) return [];
    const n    = students.length;
    const res  = [];
    const sd   = Math.round(stdDev(students.map(st => st.avg_score)));
    const avgP = Math.round(mean(students.map(st => st.avg_penalty)));
    const avgQ = Math.round(s.avg_quality);
    const avgC = Math.round(s.avg_completion);
    const high = byCluster.find(c => c.id === 0)?.count ?? 0;
    const low  = byCluster.find(c => c.id === 2)?.count ?? 0;

    if (sd > 25)  res.push({ type: 'warning', title: 'High Score Variance',        body: `±${sd}% std dev — mixed performance levels. Consider differentiated assignments or small-group review sessions.` });
    else if (sd < 10) res.push({ type: 'success', title: 'Consistent Class Performance', body: `Only ±${sd}% std dev. The class performs at a very uniform level — effective teaching and balanced assignments.` });

    if (s.avg_score >= 75) res.push({ type: 'success', title: 'Strong Class Average',         body: `${s.avg_score}% class average is excellent.` });
    else if (s.avg_score < 50) res.push({ type: 'error', title: 'Class Average Needs Attention', body: `${s.avg_score}% average — revisit core concepts and verify assignments are calibrated to current student level.` });

    if (avgP > 15) res.push({ type: 'error',   title: 'High Error Penalty Average', body: `Avg penalty of ${avgP} pts. Students frequently submit code with runtime errors — focus on debugging workshops.` });
    else if (avgP < 3) res.push({ type: 'success', title: 'Low Error Rates',        body: `Avg penalty only ${avgP} pts — students are submitting clean, error-free code.` });

    if (avgC < 60) res.push({ type: 'warning', title: 'Low Assignment Completion',  body: `Only ${avgC}% average completion. Check whether deadlines are clear and workload is appropriate.` });
    else if (avgC > 90) res.push({ type: 'success', title: 'Excellent Engagement', body: `${avgC}% completion rate — near-full submission across the class.` });

    if (avgQ < 40) res.push({ type: 'warning', title: 'Code Quality Concerns',     body: `Avg quality ${avgQ}/100. Run workshops on code style, structure, and best practices.` });
    else if (avgQ > 75) res.push({ type: 'success', title: 'High Code Quality',    body: `Avg quality ${avgQ}/100. Students consistently write clean, well-structured code.` });

    const never = students.filter(st => st.submissions === 0).length;
    if (never) res.push({ type: 'error', title: `${never} Student${never > 1 ? 's' : ''} Never Submitted`, body: `${never} student${never > 1 ? 's have' : ' has'} zero submissions — immediate outreach recommended.` });

    const mismatch = students.filter(st => st.avg_score >= 70 && st.avg_quality < 40).length;
    if (mismatch) res.push({ type: 'warning', title: 'Score/Quality Mismatch', body: `${mismatch} student${mismatch > 1 ? 's' : ''} score well on tests but have low code quality — they may solve problems correctly but write poor-structure code.` });

    if (low / n > 0.4) res.push({ type: 'error', title: 'Large "Needs Support" Cluster', body: `${low} students (${Math.round(low/n*100)}%) are in the lowest cluster — may indicate systemic difficulty with the material.` });
    if (high / n > 0.5) res.push({ type: 'success', title: 'Majority High Performers',   body: `${high} students (${Math.round(high/n*100)}%) are in the top cluster — the class is excelling overall.` });

    if (outliers.overperformers.length) res.push({ type: 'success', title: `${outliers.overperformers.length} Hidden High Performer${outliers.overperformers.length > 1 ? 's' : ''}`, body: `${outliers.overperformers.map(o => o.name.split(' ')[0]).join(', ')} are scoring significantly above their cluster — they may deserve advancement opportunities.` });
    if (outliers.underperformers.length) res.push({ type: 'warning', title: `${outliers.underperformers.length} Student${outliers.underperformers.length > 1 ? 's' : ''} Underperforming for Cluster`, body: `${outliers.underperformers.map(o => o.name.split(' ')[0]).join(', ')} are scoring significantly below their cluster average — they may need targeted support.` });

    if (topCorrelations[0]?.r) {
      const tc = topCorrelations[0];
      res.push({ type: 'info', title: `Strongest Correlation: ${tc.a} ↔ ${tc.b}`, body: `Pearson r = ${tc.r}. ${Math.abs(tc.r) >= 0.7 ? 'Very strong' : 'Moderate'} ${tc.r > 0 ? 'positive' : 'negative'} relationship — ${tc.r > 0 ? 'improving one tends to improve the other' : 'higher values of one are associated with lower values of the other'}.` });
    }

    return res;
  }, [students, s, byCluster, outliers, topCorrelations]);

  /* ── FILTERED STUDENTS TABLE ─────────────────────────────────────────────── */
  const filteredStudents = useMemo(() => {
    let list = [...students];
    if (search)     list = list.filter(st => st.name.toLowerCase().includes(search.toLowerCase()) || st.email.toLowerCase().includes(search.toLowerCase()));
    if (cFilter !== 'all') list = list.filter(st => st.cluster === parseInt(cFilter));
    list.sort((a, b) => sort.dir === 'asc' ? a[sort.key] - b[sort.key] : b[sort.key] - a[sort.key]);
    return list;
  }, [students, search, cFilter, sort]);

  const toggleSort = (key) =>
    setSort(prev => prev.key === key ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' });

  const trends = data?.assignment_trends ?? [];

  /* ── RENDER ──────────────────────────────────────────────────────────────── */
  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Class Analysis</h1>
          <p className="text-text-muted text-sm mt-0.5">
            K-means clustering · correlation · outlier detection · {s?.total_students ?? 0} students
          </p>
        </div>
        <div className="flex items-center gap-2">
          {atRisk.length > 0 && (
            <button onClick={() => setTab('atrisk')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-error/10 text-error border border-error/20 hover:bg-error/20 transition-colors">
              <AlertTriangle className="h-3.5 w-3.5" /> {atRisk.length} at-risk
            </button>
          )}
          {(outliers.overperformers.length + outliers.underperformers.length) > 0 && (
            <button onClick={() => setTab('outliers')}
              className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 transition-colors">
              <Eye className="h-3.5 w-3.5" /> {outliers.overperformers.length + outliers.underperformers.length} outlier{(outliers.overperformers.length + outliers.underperformers.length) !== 1 ? 's' : ''}
            </button>
          )}
          <Button variant="outline" size="sm" onClick={load} isLoading={loading} className="gap-2">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </Button>
        </div>
      </div>

      {loading && !data && (
        <div className="flex items-center justify-center py-24">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {!loading && data && !hasData && (
        <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-20 text-center">
          <Users className="h-10 w-10 text-text-muted opacity-40 mx-auto mb-3" />
          <p className="text-text-muted text-sm">No students in this classroom yet.</p>
        </div>
      )}

      {hasData && (
        <>
          {/* Summary stat row */}
          <div className="flex gap-3 flex-wrap">
            <StatCard icon={Users}        label="Students"    value={s.total_students}      color="text-text-primary" />
            <StatCard icon={TrendingUp}   label="Class Avg"   value={pct(s.avg_score)}       color="text-primary"  badge={grade(s.avg_score)} />
            <StatCard icon={Star}         label="Avg Quality" value={s.avg_quality}           color="text-warning"  sub="out of 100" />
            <StatCard icon={CheckCircle}  label="Completion"  value={pct(s.avg_completion)}  color="text-success" />
            <StatCard icon={Award}        label="Top Scorer"  value={pct(Math.max(...students.map(st => st.avg_score)))} color="text-primary" sub={[...students].sort((a,b)=>b.avg_score-a.avg_score)[0]?.name} />
            <StatCard icon={AlertTriangle} label="At-Risk"    value={atRisk.length}           color="text-error"    sub="score<40 or completion<50%" />
          </div>

          {/* Tabs */}
          <div className="flex flex-wrap gap-1 bg-surface rounded-xl p-1 border border-overlay/[0.07]">
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id ? 'bg-primary text-primary-foreground shadow' : 'text-text-muted hover:text-text-primary hover:bg-surface-dark/30'
                }`}>
                <t.icon className="h-3.5 w-3.5" />
                {t.label}
                {t.id === 'atrisk' && atRisk.length > 0 && (
                  <span className={`text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center ${tab === t.id ? 'bg-white/20' : 'bg-error/20 text-error'}`}>
                    {atRisk.length}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* ═══════════════════════════════════════════════════════════════════
              OVERVIEW
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'overview' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Grade Distribution</CardTitle>
                    <p className="text-[11px] text-text-muted mt-0.5">A ≥80 · B 65–79 · C 50–64 · D 35–49 · F &lt;35</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={gradeBreakdown} margin={{ top: 5, right: 10, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="grade" tick={{ fontSize: 12, fill: ct.tickFill }} />
                        <YAxis tick={{ fontSize: 11, fill: ct.tickFill }} allowDecimals={false} />
                        <Tooltip content={<GenericTip />} />
                        <Bar dataKey="count" name="Students" radius={[4,4,0,0]}>
                          {gradeBreakdown.map((e, i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-soft bg-surface lg:col-span-2">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Cluster Comparison</CardTitle>
                    <p className="text-[11px] text-text-muted mt-0.5">Average metrics per performance group</p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={clusterCompare} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <Tooltip content={<GenericTip />} />
                        <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} />
                        <Bar dataKey="Score"      fill="#6366f1" radius={[3,3,0,0]} />
                        <Bar dataKey="Quality"    fill="#f59e0b" radius={[3,3,0,0]} />
                        <Bar dataKey="Completion" fill="#22c55e" radius={[3,3,0,0]} />
                        <Bar dataKey="Test"       fill="#06b6d4" radius={[3,3,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Cluster legend pills */}
              <div className="flex flex-wrap gap-2">
                {byCluster.map(c => (
                  <span key={c.id} className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border ${CLUSTER_BG[c.id]}`}>
                    <span className={`h-2 w-2 rounded-full ${CLUSTER_DOT[c.id]}`} />
                    <span className={CLUSTER_TEXT[c.id]}>{c.label}</span>
                    <span className="text-text-muted font-normal">({c.count} · avg {c.avg_score}%)</span>
                  </span>
                ))}
              </div>

              {/* Top performers */}
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Top Performers</CardTitle>
                </CardHeader>
                <CardContent className="pt-3">
                  <div className="space-y-2.5">
                    {[...students].sort((a,b) => b.avg_score - a.avg_score).slice(0,5).map((st, idx) => (
                      <div key={st.id} className="flex items-center gap-3">
                        <span className={`text-xs font-black w-5 text-center ${idx === 0 ? 'text-warning' : 'text-text-muted'}`}>{idx+1}</span>
                        {st.photo_url
                          ? <img src={st.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-overlay/10 shrink-0" />
                          : <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">{(st.name||'?').charAt(0).toUpperCase()}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-text-primary truncate">{st.name}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <div className="h-1.5 flex-1 rounded-full bg-surface-dark/40 overflow-hidden">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${st.avg_score}%` }} />
                            </div>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={`text-sm font-black ${gradeColor(st.avg_score)}`}>{st.avg_score}%</span>
                          <p className="text-[10px] text-text-muted">{grade(st.avg_score)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              CLUSTERS
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'clusters' && (
            <div className="space-y-4">
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Cluster Radar</CardTitle>
                  <p className="text-[11px] text-text-muted mt-0.5">Multi-dimensional comparison of performance groups (Low Penalty = 100 − penalty×3)</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                      <PolarGrid stroke={ct.polarGrid} />
                      <PolarAngleAxis dataKey="metric" tick={{ fontSize: 11, fill: ct.tickFill }} />
                      <PolarRadiusAxis domain={[0,100]} tick={{ fontSize: 10, fill: ct.tickFill }} />
                      {byCluster.map(c => (
                        <Radar key={c.id} name={c.label} dataKey={c.label}
                          stroke={CLUSTER_COLORS[c.id]} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.12} strokeWidth={2} />
                      ))}
                      <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} />
                      <Tooltip content={<GenericTip />} />
                    </RadarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Test Score vs Code Quality</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="avg_test_score" type="number" domain={[0,100]} name="Test Score"
                          label={{ value: 'Avg Test Score (%)', position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis dataKey="avg_quality" type="number" domain={[0,100]} name="Quality"
                          label={{ value: 'Code Quality', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <ZAxis range={[55,55]} />
                        <Tooltip content={<ScatterTip />} />
                        {byCluster.map(c => <Scatter key={c.id} name={c.label} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.85} />)}
                        <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} wrapperStyle={{ paddingTop: 12 }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Score vs Completion Rate</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={260}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="completion_rate" type="number" domain={[0,100]} name="Completion"
                          label={{ value: 'Completion Rate (%)', position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis dataKey="avg_score" type="number" domain={[0,100]} name="Score"
                          label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <ZAxis range={[55,55]} />
                        <Tooltip content={<ScatterTip />} />
                        {byCluster.map(c => <Scatter key={c.id} name={c.label} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.85} />)}
                        <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} wrapperStyle={{ paddingTop: 12 }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Cluster breakdown cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {byCluster.map(c => (
                  <Card key={c.id} className={`border shadow-soft bg-surface ${CLUSTER_BG[c.id]}`}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className={`text-sm font-bold ${CLUSTER_TEXT[c.id]}`}>{c.label}</CardTitle>
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${CLUSTER_BG[c.id]} ${CLUSTER_TEXT[c.id]}`}>{c.count} student{c.count !== 1 ? 's' : ''}</span>
                      </div>
                      <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-[11px] text-text-muted">
                        <span>Score: <strong className="text-text-primary">{c.avg_score}%</strong></span>
                        <span>Quality: <strong className="text-text-primary">{c.avg_quality}</strong></span>
                        <span>Done: <strong className="text-text-primary">{c.avg_completion}%</strong></span>
                        <span>Test: <strong className="text-text-primary">{c.avg_test_score ?? '—'}%</strong></span>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                        {c.points.length === 0
                          ? <p className="text-xs text-text-muted py-2">No students.</p>
                          : c.points.map(st => (
                            <div key={st.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 bg-background/30">
                              {st.photo_url
                                ? <img src={st.photo_url} alt="" className="w-6 h-6 rounded-full object-cover border border-overlay/10 shrink-0" />
                                : <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${CLUSTER_BG[c.id]} ${CLUSTER_TEXT[c.id]}`}>{(st.name||'?').charAt(0).toUpperCase()}</div>
                              }
                              <span className="text-xs text-text-primary font-medium flex-1 truncate">{st.name}</span>
                              <span className={`text-[10px] font-bold tabular-nums ${CLUSTER_TEXT[c.id]}`}>{st.avg_score}%</span>
                            </div>
                          ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              DISTRIBUTION
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'distribution' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Score Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={scoreDistribution} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis tick={{ fontSize: 11, fill: ct.tickFill }} allowDecimals={false} />
                        <Tooltip content={<GenericTip />} />
                        <Bar dataKey="students" name="Students" radius={[4,4,0,0]}>
                          {scoreDistribution.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Completion Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={completionDistribution} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis tick={{ fontSize: 11, fill: ct.tickFill }} allowDecimals={false} />
                        <Tooltip content={<GenericTip />} />
                        <Bar dataKey="count" name="Students" fill="#6366f1" radius={[4,4,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Quartile / Box-plot summary */}
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Quartile Statistics</CardTitle>
                  <p className="text-[11px] text-text-muted mt-0.5">Min · Q1 · Median · Q3 · Max for each metric</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="space-y-4">
                    {quartileData.map(m => (
                      <div key={m.name}>
                        <div className="flex items-center justify-between mb-1.5">
                          <span className="text-xs font-semibold text-text-primary">{m.name}</span>
                          <span className="text-[11px] text-text-muted">mean: <strong style={{ color: m.color }}>{m.mean}%</strong></span>
                        </div>
                        <div className="relative h-6 flex items-center">
                          {/* Track */}
                          <div className="absolute inset-x-0 h-1.5 rounded-full bg-surface-dark/40" />
                          {/* IQR box */}
                          <div className="absolute h-4 rounded-sm opacity-60"
                            style={{
                              left:  `${m.q1}%`,
                              width: `${m.q3 - m.q1}%`,
                              backgroundColor: m.color,
                            }}
                          />
                          {/* Median line */}
                          <div className="absolute w-0.5 h-5 rounded-full"
                            style={{ left: `${m.median}%`, backgroundColor: m.color }} />
                          {/* Mean dot */}
                          <div className="absolute w-2.5 h-2.5 rounded-full border-2 border-surface"
                            style={{ left: `calc(${m.mean}% - 5px)`, backgroundColor: m.color }} />
                        </div>
                        <div className="flex justify-between mt-1 text-[10px] text-text-muted">
                          <span>Min: {m.min}%</span>
                          <span>Q1: {m.q1}%</span>
                          <span>Med: {m.median}%</span>
                          <span>Q3: {m.q3}%</span>
                          <span>Max: {m.max}%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Score stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {(() => {
                  const scores = students.map(st => st.avg_score).sort((a,b) => a-b);
                  const m = +mean(scores).toFixed(1);
                  return [
                    { label: 'Highest',  value: `${Math.max(...scores)}%`, color: 'text-success' },
                    { label: 'Lowest',   value: `${Math.min(...scores)}%`, color: 'text-error'   },
                    { label: 'Std Dev',  value: `±${Math.round(stdDev(scores))}%`, color: 'text-primary' },
                    { label: 'Median',   value: `${quantile(scores, 0.5)}%`, color: 'text-warning' },
                  ];
                })().map(item => (
                  <div key={item.label} className="rounded-xl border border-overlay/[0.07] bg-surface p-4">
                    <p className="text-[11px] text-text-muted uppercase tracking-wide font-medium">{item.label}</p>
                    <p className={`text-xl font-black mt-1 ${item.color}`}>{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              CORRELATION ANALYZER
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'correlation' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-start gap-3">
                <Sigma className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-[11px] text-text-muted mt-0.5">r ≥ 0.7 = strong · 0.4–0.7 = moderate · &lt;0.4 = weak. Negative values mean inverse relationship.</p>
                </div>
              </div>

              {students.length < 3 ? (
                <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-16 text-center">
                  <Sigma className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Need at least 3 students with data for correlation analysis.</p>
                </div>
              ) : (
                <>
                  {/* Knowledge graph */}
                  <Card className="border-none shadow-soft bg-surface overflow-hidden">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">Student Similarity Graph</CardTitle>
                      <p className="text-[11px] text-text-muted mt-0.5">Each node is a student. Edges connect students with similar performance profiles. Color = cluster.</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <CorrelationGraph students={students} />
                    </CardContent>
                  </Card>

                  {/* Matrix table */}
                  <Card className="border-none shadow-soft bg-surface overflow-hidden">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">Correlation Heatmap</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="text-left text-[10px] uppercase tracking-wider text-text-muted bg-surface-dark/40">
                            <th className="px-4 py-3 font-medium w-28">Metric</th>
                            {CORR_METRICS.map(m => <th key={m.key} className="px-3 py-3 font-medium text-center">{m.label}</th>)}
                          </tr>
                        </thead>
                        <tbody>
                          {corrMatrix && CORR_METRICS.map((row, i) => (
                            <tr key={row.key} className="border-t border-overlay/5">
                              <td className="px-4 py-3 font-semibold text-text-primary text-[11px]">{row.label}</td>
                              {CORR_METRICS.map((col, j) => (
                                <td key={col.key} className="px-3 py-3 text-center">
                                  {i === j
                                    ? <span className="text-text-muted font-bold">—</span>
                                    : <span className={`inline-block px-2 py-0.5 rounded font-bold tabular-nums text-[11px] ${rColor(corrMatrix[i][j])}`}>
                                        {corrMatrix[i][j] > 0 ? '+' : ''}{corrMatrix[i][j]}
                                      </span>
                                  }
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>

                  {/* Ranked correlation pairs */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Card className="border-none shadow-soft bg-surface">
                      <CardHeader className="border-b border-overlay/5 pb-3">
                        <CardTitle className="text-sm font-semibold text-text-primary">Correlation Rankings</CardTitle>
                        <p className="text-[11px] text-text-muted mt-0.5">Strongest relationships in your class data</p>
                      </CardHeader>
                      <CardContent className="pt-3">
                        <div className="space-y-2.5">
                          {topCorrelations.map((pair, i) => {
                            const abs = Math.abs(pair.r);
                            const strength = abs >= 0.7 ? 'Strong' : abs >= 0.4 ? 'Moderate' : 'Weak';
                            const dir = pair.r > 0 ? 'positive' : 'negative';
                            const col = abs >= 0.7 ? (pair.r > 0 ? 'text-success' : 'text-error') : abs >= 0.4 ? 'text-warning' : 'text-text-muted';
                            return (
                              <div key={i} className="flex items-center gap-3">
                                <span className="text-[10px] text-text-muted w-4 shrink-0">{i+1}</span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-semibold text-text-primary">{pair.a} ↔ {pair.b}</p>
                                  <p className="text-[10px] text-text-muted">{strength} {dir}</p>
                                </div>
                                <div className="w-20 h-1.5 rounded-full bg-surface-dark/40 overflow-hidden">
                                  <div className="h-full rounded-full"
                                    style={{ width: `${abs * 100}%`, backgroundColor: abs >= 0.7 ? (pair.r > 0 ? '#22c55e' : '#ef4444') : '#f59e0b' }} />
                                </div>
                                <span className={`text-xs font-black tabular-nums w-10 text-right ${col}`}>
                                  {pair.r > 0 ? '+' : ''}{pair.r}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Most predictive scatter */}
                    {topCorrelations[0] && (() => {
                      const tc = topCorrelations[0];
                      const keyA = CORR_METRICS.find(m => m.label === tc.a)?.key ?? 'avg_score';
                      const keyB = CORR_METRICS.find(m => m.label === tc.b)?.key ?? 'avg_quality';
                      return (
                        <Card className="border-none shadow-soft bg-surface">
                          <CardHeader className="border-b border-overlay/5 pb-3">
                            <CardTitle className="text-sm font-semibold text-text-primary">Strongest: {tc.a} vs {tc.b}</CardTitle>
                            <p className="text-[11px] text-text-muted mt-0.5">r = {tc.r} — hover dots for student details</p>
                          </CardHeader>
                          <CardContent className="pt-4">
                            <ResponsiveContainer width="100%" height={220}>
                              <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                                <XAxis dataKey={keyA} type="number" name={tc.a}
                                  label={{ value: tc.a, position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                                  tick={{ fontSize: 11, fill: ct.tickFill }} />
                                <YAxis dataKey={keyB} type="number" name={tc.b}
                                  label={{ value: tc.b, angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                                  tick={{ fontSize: 11, fill: ct.tickFill }} />
                                <ZAxis range={[50,50]} />
                                <Tooltip content={<ScatterTip />} />
                                {byCluster.map(c => <Scatter key={c.id} name={c.label} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.85} />)}
                                <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} wrapperStyle={{ paddingTop: 12 }} />
                              </ScatterChart>
                            </ResponsiveContainer>
                          </CardContent>
                        </Card>
                      );
                    })()}
                  </div>

                  {/* 2×2 scatter grid for key relationships */}
                  <Card className="border-none shadow-soft bg-surface">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">Score Predictor Scatter Grid</CardTitle>
                      <p className="text-[11px] text-text-muted mt-0.5">How well each metric predicts final score</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {[
                          { xKey: 'avg_test_score',  xLabel: 'Test Score',  r: corrMatrix?.[0]?.[1] },
                          { xKey: 'avg_quality',     xLabel: 'Quality',     r: corrMatrix?.[0]?.[2] },
                          { xKey: 'completion_rate', xLabel: 'Completion',  r: corrMatrix?.[0]?.[3] },
                          { xKey: 'avg_penalty',     xLabel: 'Penalty',     r: corrMatrix?.[0]?.[4] },
                        ].map(({ xKey, xLabel, r: rVal }) => (
                          <div key={xKey}>
                            <p className="text-[11px] font-semibold text-text-muted mb-1">{xLabel} → Score &nbsp;
                              <span className={rVal !== undefined ? rColor(rVal).replace('bg-', 'text-').split(' ')[0] : ''}>
                                {rVal !== undefined ? `r=${rVal > 0 ? '+' : ''}${rVal}` : ''}
                              </span>
                            </p>
                            <ResponsiveContainer width="100%" height={160}>
                              <ScatterChart margin={{ top: 5, right: 10, bottom: 18, left: -15 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                                <XAxis dataKey={xKey} type="number" name={xLabel}
                                  label={{ value: xLabel, position: 'insideBottom', offset: -8, fontSize: 10, fill: ct.tickFill }}
                                  tick={{ fontSize: 10, fill: ct.tickFill }} />
                                <YAxis dataKey="avg_score" type="number" domain={[0,100]} name="Score"
                                  tick={{ fontSize: 10, fill: ct.tickFill }} />
                                <ZAxis range={[35,35]} />
                                <Tooltip content={<ScatterTip />} />
                                {byCluster.map(c => <Scatter key={c.id} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.8} />)}
                              </ScatterChart>
                            </ResponsiveContainer>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ONTOLOGY GRAPH
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'ontology' && (
            <div className="space-y-4">
              <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-start gap-3">
                <GitBranch className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-semibold text-text-primary">Student-Attribute Ontology</p>
                  <p className="text-[11px] text-text-muted mt-0.5">
                    Each student (large node) radiates attribute sub-nodes — Test Score <span className="font-bold" style={{color:'#34d399'}}>T</span>, Quality <span className="font-bold" style={{color:'#a78bfa'}}>Q</span>, Completeness <span className="font-bold" style={{color:'#fb923c'}}>C</span>, Error-Free <span className="font-bold" style={{color:'#f87171'}}>E</span>.
                    Node size encodes value. Dashed edges cross-link students whose same-dimension values are within ±18 %.
                    Hover a node to inspect. Drag to rearrange.
                  </p>
                </div>
              </div>

              {students.length < 2 ? (
                <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-16 text-center">
                  <GitBranch className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Need at least 2 students with data for ontology view.</p>
                </div>
              ) : (
                <Card className="border-none shadow-soft bg-surface overflow-hidden">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary flex items-center gap-2">
                      <GitBranch className="h-4 w-4 text-primary" />
                      Student Ontology Graph
                    </CardTitle>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      {students.length} students · {students.length * 4} attribute nodes · Palantir-style object model
                    </p>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <OntologyGraph students={students} />
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              OUTLIER DETECTOR
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'outliers' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Overperformers */}
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-success" />
                      <CardTitle className="text-sm font-semibold text-text-primary">Hidden High Performers</CardTitle>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">Placed in lower cluster but scoring &gt;1.5σ above their cluster mean</p>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {outliers.overperformers.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center">No hidden high performers detected.</p>
                    ) : outliers.overperformers.map(st => (
                      <div key={st.id} className="flex items-center gap-3 rounded-xl p-3 bg-success/5 border border-success/15 mb-2">
                        {st.photo_url
                          ? <img src={st.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-overlay/10 shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-success/10 flex items-center justify-center font-bold text-success shrink-0">{(st.name||'?').charAt(0).toUpperCase()}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{st.name}</p>
                          <p className="text-[11px] text-text-muted">In "{st.clusterLabel}" · cluster avg {st.clusterMean}%</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-success">{st.avg_score}%</p>
                          <p className="text-[10px] text-success/70">+{st.z}σ above</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                {/* Underperformers */}
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <div className="flex items-center gap-2">
                      <TrendingDown className="h-4 w-4 text-warning" />
                      <CardTitle className="text-sm font-semibold text-text-primary">Underperforming for Group</CardTitle>
                    </div>
                    <p className="text-[11px] text-text-muted mt-0.5">Placed in higher cluster but scoring &gt;1.5σ below their cluster mean</p>
                  </CardHeader>
                  <CardContent className="pt-3">
                    {outliers.underperformers.length === 0 ? (
                      <p className="text-xs text-text-muted py-4 text-center">No cluster underperformers detected.</p>
                    ) : outliers.underperformers.map(st => (
                      <div key={st.id} className="flex items-center gap-3 rounded-xl p-3 bg-warning/5 border border-warning/15 mb-2">
                        {st.photo_url
                          ? <img src={st.photo_url} alt="" className="w-9 h-9 rounded-full object-cover border border-overlay/10 shrink-0" />
                          : <div className="w-9 h-9 rounded-full bg-warning/10 flex items-center justify-center font-bold text-warning shrink-0">{(st.name||'?').charAt(0).toUpperCase()}</div>
                        }
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-text-primary truncate">{st.name}</p>
                          <p className="text-[11px] text-text-muted">In "{st.clusterLabel}" · cluster avg {st.clusterMean}%</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-base font-black text-warning">{st.avg_score}%</p>
                          <p className="text-[10px] text-warning/70">{st.z}σ below</p>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Full scatter with outliers highlighted */}
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Score vs Quality — Outliers Visible</CardTitle>
                  <p className="text-[11px] text-text-muted mt-0.5">Each cluster shown separately; outliers are students far from their group centroid</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={300}>
                    <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                      <XAxis dataKey="avg_score" type="number" domain={[0,100]} name="Score"
                        label={{ value: 'Avg Score (%)', position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                        tick={{ fontSize: 11, fill: ct.tickFill }} />
                      <YAxis dataKey="avg_quality" type="number" domain={[0,100]} name="Quality"
                        label={{ value: 'Code Quality', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                        tick={{ fontSize: 11, fill: ct.tickFill }} />
                      <ZAxis range={[55,55]} />
                      <ReferenceLine x={s?.avg_score} stroke="rgba(99,102,241,0.25)" strokeDasharray="4 4" />
                      <ReferenceLine y={s?.avg_quality} stroke="rgba(245,158,11,0.25)" strokeDasharray="4 4" />
                      <Tooltip content={<ScatterTip />} />
                      {byCluster.map(c => <Scatter key={c.id} name={c.label} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.8} />)}
                      <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} wrapperStyle={{ paddingTop: 12 }} />
                    </ScatterChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Explanation */}
              <div className="rounded-xl border border-overlay/[0.07] bg-surface p-4 text-xs text-text-muted space-y-1">
                <p className="font-semibold text-text-primary text-sm mb-2">How Outlier Detection Works</p>
                <p>For each K-means cluster, we compute the <strong className="text-text-primary">mean</strong> and <strong className="text-text-primary">standard deviation</strong> of avg_score across all cluster members.</p>
                <p>Students with z-score &gt; +1.5σ from their cluster mean are <strong className="text-success">Hidden High Performers</strong> — K-means placed them in a lower group, but they actually score well above that group's average.</p>
                <p>Students with z-score &lt; −1.5σ from their cluster mean are <strong className="text-warning">Cluster Underperformers</strong> — K-means placed them in a higher group, but they score significantly below that group's average.</p>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ASSIGNMENT TRENDS
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'trends' && (
            <div className="space-y-4">
              {trends.length < 2 ? (
                <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-20 text-center">
                  <TrendingUp className="h-10 w-10 text-text-muted opacity-30 mx-auto mb-3" />
                  <p className="text-text-muted text-sm font-medium">Not enough assignment data yet.</p>
                  <p className="text-text-muted text-xs mt-1 opacity-70">Trends appear once 2+ assignments have been graded and released.</p>
                </div>
              ) : (
                <>
                  {/* Score + Quality + Test over assignments */}
                  <Card className="border-none shadow-soft bg-surface">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">Class Performance Over Assignments</CardTitle>
                      <p className="text-[11px] text-text-muted mt-0.5">How the class average evolves assignment by assignment</p>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ResponsiveContainer width="100%" height={280}>
                        <ComposedChart data={trends} margin={{ top: 10, right: 20, bottom: 20, left: -15 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                          <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.tickFill }} />
                          <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: ct.tickFill }} />
                          <Tooltip content={<GenericTip />} />
                          <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} />
                          <Area type="monotone" dataKey="avg_score"   name="Avg Score"   fill="#6366f1" stroke="#6366f1" fillOpacity={0.08} strokeWidth={2} dot={{ r: 4, fill: '#6366f1', stroke: ct.dotStroke, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                          <Line  type="monotone" dataKey="avg_quality" name="Avg Quality" stroke="#f59e0b" strokeWidth={1.5} strokeDasharray="5 3" dot={{ r: 3, fill: '#f59e0b', stroke: ct.dotStroke, strokeWidth: 1.5 }} />
                          <Line  type="monotone" dataKey="avg_test"    name="Avg Test %"  stroke="#22c55e" strokeWidth={1.5} strokeDasharray="2 4" dot={{ r: 3, fill: '#22c55e', stroke: ct.dotStroke, strokeWidth: 1.5 }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  {/* Submission rate + penalty trends */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <Card className="border-none shadow-soft bg-surface">
                      <CardHeader className="border-b border-overlay/5 pb-3">
                        <CardTitle className="text-sm font-semibold text-text-primary">Submission Rate per Assignment</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <BarChart data={trends} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.tickFill }} />
                            <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: ct.tickFill }} />
                            <Tooltip content={<GenericTip />} />
                            <ReferenceLine y={70} stroke="rgba(239,68,68,0.3)" strokeDasharray="4 4" label={{ value: '70%', fill: ct.refLabelFill, fontSize: 10 }} />
                            <Bar dataKey="submission_rate" name="Submission %" radius={[4,4,0,0]}>
                              {trends.map((e, i) => <Cell key={i} fill={e.submission_rate >= 80 ? '#22c55e' : e.submission_rate >= 60 ? '#f59e0b' : '#ef4444'} />)}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>

                    <Card className="border-none shadow-soft bg-surface">
                      <CardHeader className="border-b border-overlay/5 pb-3">
                        <CardTitle className="text-sm font-semibold text-text-primary">Avg Error Penalty per Assignment</CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ResponsiveContainer width="100%" height={220}>
                          <LineChart data={trends} margin={{ top: 5, right: 10, bottom: 20, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                            <XAxis dataKey="name" tick={{ fontSize: 10, fill: ct.tickFill }} />
                            <YAxis tick={{ fontSize: 11, fill: ct.tickFill }} />
                            <Tooltip content={<GenericTip />} />
                            <Line type="monotone" dataKey="avg_penalty" name="Avg Penalty" stroke="#ef4444" strokeWidth={2} dot={{ r: 4, fill: '#ef4444', stroke: ct.dotStroke, strokeWidth: 2 }} activeDot={{ r: 5 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Assignment detail table */}
                  <Card className="border-none shadow-soft bg-surface overflow-hidden">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">Assignment Breakdown</CardTitle>
                    </CardHeader>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted bg-surface-dark/40">
                            <th className="px-4 py-3 font-medium">Assignment</th>
                            <th className="px-4 py-3 font-medium">Avg Score</th>
                            <th className="px-4 py-3 font-medium">Avg Quality</th>
                            <th className="px-4 py-3 font-medium">Avg Test %</th>
                            <th className="px-4 py-3 font-medium">Avg Penalty</th>
                            <th className="px-4 py-3 font-medium">Submitted</th>
                            <th className="px-4 py-3 font-medium">Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {trends.map((t, i) => (
                            <tr key={i} className="border-t border-overlay/5 hover:bg-surface-dark/20 transition-colors">
                              <td className="px-4 py-3 font-medium text-text-primary">{t.name}</td>
                              <td className="px-4 py-3"><span className={`font-bold tabular-nums ${gradeColor(t.avg_score)}`}>{t.avg_score}%</span></td>
                              <td className="px-4 py-3 text-text-muted tabular-nums">{t.avg_quality}</td>
                              <td className="px-4 py-3 text-text-muted tabular-nums">{t.avg_test}%</td>
                              <td className="px-4 py-3 text-text-muted tabular-nums">{t.avg_penalty}</td>
                              <td className="px-4 py-3 text-text-muted tabular-nums">{t.submitted}/{t.total}</td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <div className="w-12 h-1.5 rounded-full bg-surface-dark/40 overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${t.submission_rate}%`, backgroundColor: t.submission_rate >= 80 ? '#22c55e' : t.submission_rate >= 60 ? '#f59e0b' : '#ef4444' }} />
                                  </div>
                                  <span className="text-xs text-text-muted tabular-nums">{t.submission_rate}%</span>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              PENALTY
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'penalty' && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Error Penalty Distribution</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={230}>
                      <BarChart data={penaltyBuckets} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="range" tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis tick={{ fontSize: 11, fill: ct.tickFill }} allowDecimals={false} />
                        <Tooltip content={<GenericTip />} />
                        <Bar dataKey="count" name="Students" radius={[4,4,0,0]}>
                          {penaltyBuckets.map((e,i) => <Cell key={i} fill={e.fill} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-soft bg-surface">
                  <CardHeader className="border-b border-overlay/5 pb-3">
                    <CardTitle className="text-sm font-semibold text-text-primary">Penalty vs Final Score</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ResponsiveContainer width="100%" height={230}>
                      <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                        <XAxis dataKey="avg_penalty" type="number" name="Penalty"
                          label={{ value: 'Avg Penalty (pts)', position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <YAxis dataKey="avg_score" type="number" domain={[0,100]} name="Score"
                          label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                          tick={{ fontSize: 11, fill: ct.tickFill }} />
                        <ZAxis range={[50,50]} />
                        <Tooltip content={<ScatterTip />} />
                        {byCluster.map(c => <Scatter key={c.id} name={c.label} data={c.points} fill={CLUSTER_COLORS[c.id]} fillOpacity={0.85} />)}
                        <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} wrapperStyle={{ paddingTop: 12 }} />
                      </ScatterChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Ranked horizontal bar */}
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Per-Student Penalty Ranking</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={Math.max(200, penaltyData.length * 28)}>
                    <BarChart data={penaltyData} layout="vertical" margin={{ top: 0, right: 20, bottom: 0, left: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={ct.gridStroke} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: ct.tickFill }} axisLine={false} tickLine={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: ct.tickFill }} axisLine={false} tickLine={false} width={70} />
                      <Tooltip content={<GenericTip />} />
                      <Bar dataKey="penalty" name="Avg Penalty" radius={[0,4,4,0]}>
                        {penaltyData.map((e,i) => <Cell key={i} fill={CLUSTER_COLORS[e.cluster]} fillOpacity={0.75} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              COMPARE
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'compare' && (
            <div className="space-y-4">
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">All Metrics by Cluster</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={clusterCompare} margin={{ top: 5, right: 20, bottom: 5, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                      <XAxis dataKey="name" tick={{ fontSize: 11, fill: ct.tickFill }} />
                      <YAxis domain={[0,100]} tick={{ fontSize: 11, fill: ct.tickFill }} />
                      <Tooltip content={<GenericTip />} />
                      <Legend formatter={v => <span style={{ fontSize: 11, color: ct.legendColor }}>{v}</span>} />
                      <Bar dataKey="Score"      fill="#6366f1" radius={[3,3,0,0]} />
                      <Bar dataKey="Quality"    fill="#f59e0b" radius={[3,3,0,0]} />
                      <Bar dataKey="Completion" fill="#22c55e" radius={[3,3,0,0]} />
                      <Bar dataKey="Test"       fill="#06b6d4" radius={[3,3,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* 4-Quadrant map */}
              <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">4-Quadrant Student Map</CardTitle>
                  <p className="text-[11px] text-text-muted mt-0.5">Score vs Completion — the 4 student archetypes</p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Stars',                  desc: 'High score + high completion', color: 'text-success', bg: 'bg-success/10 border-success/20', f: st => st.avg_score >= 60 && st.completion_rate >= 60 },
                      { label: 'Capable but Absent',     desc: 'High score + low completion',  color: 'text-warning', bg: 'bg-warning/10 border-warning/20', f: st => st.avg_score >= 60 && st.completion_rate < 60 },
                      { label: 'Engaged but Struggling', desc: 'Low score + high completion',  color: 'text-primary', bg: 'bg-primary/10 border-primary/20', f: st => st.avg_score < 60 && st.completion_rate >= 60 },
                      { label: 'Disengaged',             desc: 'Low score + low completion',   color: 'text-error',   bg: 'bg-error/10 border-error/20',     f: st => st.avg_score < 60 && st.completion_rate < 60 },
                    ].map(q => {
                      const members = students.filter(q.f);
                      return (
                        <div key={q.label} className={`rounded-xl border p-3 ${q.bg}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className={`font-bold text-xs ${q.color}`}>{q.label}</p>
                            <span className={`font-black text-lg leading-none ${q.color}`}>{members.length}</span>
                          </div>
                          <p className="text-[11px] text-text-muted">{q.desc}</p>
                          {members.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {members.slice(0,6).map(m => (
                                <span key={m.id} className="text-[10px] bg-background/40 rounded px-1.5 py-0.5 text-text-muted truncate max-w-[80px]">{m.name.split(' ')[0]}</span>
                              ))}
                              {members.length > 6 && <span className="text-[10px] text-text-muted">+{members.length - 6}</span>}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              INSIGHTS
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'insights' && (
            <div className="space-y-3">
              <div className="rounded-xl bg-primary/5 border border-primary/10 px-4 py-3 flex items-start gap-3">
                <Lightbulb className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-text-primary">Auto-Generated Insights</p>
                  <p className="text-[11px] text-text-muted mt-0.5">{insights.length} observation{insights.length !== 1 ? 's' : ''} · based on statistics, clusters, correlations, and outlier analysis</p>
                </div>
              </div>

              {insights.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-16 text-center">
                  <Zap className="h-8 w-8 text-text-muted opacity-30 mx-auto mb-2" />
                  <p className="text-text-muted text-sm">Not enough data yet for insights.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {insights.map((ins, i) => {
                    const cfg = {
                      success: { bg: 'bg-success/5 border-success/20', Icon: CheckCircle,  color: 'text-success' },
                      warning: { bg: 'bg-warning/5 border-warning/20', Icon: AlertTriangle, color: 'text-warning' },
                      error:   { bg: 'bg-error/5   border-error/20',   Icon: AlertTriangle, color: 'text-error'   },
                      info:    { bg: 'bg-primary/5  border-primary/20', Icon: Lightbulb,    color: 'text-primary'  },
                    }[ins.type] ?? {};
                    return (
                      <div key={i} className={`rounded-xl border p-4 ${cfg.bg}`}>
                        <div className="flex items-start gap-3">
                          <cfg.Icon className={`h-4 w-4 shrink-0 mt-0.5 ${cfg.color}`} />
                          <div>
                            <p className={`text-sm font-bold ${cfg.color}`}>{ins.title}</p>
                            <p className="text-[12px] text-text-muted mt-1 leading-relaxed">{ins.body}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Statistical summary card */}
              <Card className="border-none shadow-soft bg-surface mt-2">
                <CardHeader className="border-b border-overlay/5 pb-3">
                  <CardTitle className="text-sm font-semibold text-text-primary">Statistical Summary</CardTitle>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(() => {
                      const scores  = students.map(st => st.avg_score).sort((a,b) => a-b);
                      const m       = +mean(scores).toFixed(1);
                      const sd      = Math.round(stdDev(scores));
                      const med     = quantile(scores, 0.5);
                      const q1      = quantile(scores, 0.25);
                      const q3      = quantile(scores, 0.75);
                      return [
                        { label: 'Mean',   value: `${m}%`,        color: 'text-primary' },
                        { label: 'Median', value: `${med}%`,      color: 'text-warning' },
                        { label: 'Std Dev',value: `±${sd}%`,      color: 'text-text-muted' },
                        { label: 'IQR',    value: `${q1}–${q3}%`, color: 'text-success' },
                      ];
                    })().map(item => (
                      <div key={item.label} className="rounded-xl border border-overlay/[0.07] bg-surface p-3 text-center">
                        <p className="text-[10px] text-text-muted uppercase tracking-wide font-medium">{item.label}</p>
                        <p className={`text-lg font-black mt-1 ${item.color}`}>{item.value}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              AT-RISK
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'atrisk' && (
            <div className="space-y-4">
              {atRisk.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-success/20 py-16 text-center">
                  <CheckCircle className="h-10 w-10 text-success opacity-60 mx-auto mb-3" />
                  <p className="text-text-primary font-semibold">All students are on track!</p>
                  <p className="text-text-muted text-sm mt-1">No students with score &lt;40% or completion &lt;50%</p>
                </div>
              ) : (
                <>
                  <div className="rounded-xl bg-error/5 border border-error/20 px-4 py-3 flex items-start gap-3">
                    <AlertTriangle className="h-4 w-4 text-error shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-error">{atRisk.length} student{atRisk.length !== 1 ? 's' : ''} need attention</p>
                      <p className="text-[11px] text-text-muted mt-0.5">Flagged: avg score below 40% OR completion below 50%</p>
                    </div>
                  </div>

                  <div className="grid gap-3">
                    {atRisk.map(st => {
                      const issues = [];
                      if (st.avg_score < 40)        issues.push(`Score ${st.avg_score}%`);
                      if (st.completion_rate < 50)  issues.push(`Completion ${st.completion_rate}%`);
                      return (
                        <div key={st.id} className="rounded-xl border border-overlay/[0.07] bg-surface p-4 flex items-center gap-4">
                          {st.photo_url
                            ? <img src={st.photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-overlay/10 shrink-0" />
                            : <div className="w-10 h-10 rounded-full bg-error/10 border border-error/20 flex items-center justify-center text-sm font-bold text-error shrink-0">{(st.name||'?').charAt(0).toUpperCase()}</div>
                          }
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-text-primary text-sm truncate">{st.name}</p>
                            <p className="text-[11px] text-text-muted truncate">{st.email}</p>
                          </div>
                          <div className="flex flex-wrap gap-2 shrink-0">
                            {issues.map(issue => (
                              <span key={issue} className="text-[10px] font-bold px-2 py-1 rounded-lg bg-error/10 text-error border border-error/20">{issue}</span>
                            ))}
                          </div>
                          <div className="text-right shrink-0">
                            <p className="text-xs text-text-muted">Submitted</p>
                            <p className="text-sm font-bold text-text-primary">{st.submissions}/{st.total_assignments}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <Card className="border-none shadow-soft bg-surface">
                    <CardHeader className="border-b border-overlay/5 pb-3">
                      <CardTitle className="text-sm font-semibold text-text-primary">At-Risk: Score vs Completion</CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4">
                      <ResponsiveContainer width="100%" height={240}>
                        <ScatterChart margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={ct.gridStroke} />
                          <XAxis dataKey="completion_rate" type="number" domain={[0,100]} name="Completion"
                            label={{ value: 'Completion (%)', position: 'insideBottom', offset: -10, fontSize: 11, fill: ct.tickFill }}
                            tick={{ fontSize: 11, fill: ct.tickFill }} />
                          <YAxis dataKey="avg_score" type="number" domain={[0,100]} name="Score"
                            label={{ value: 'Avg Score (%)', angle: -90, position: 'insideLeft', offset: 10, fontSize: 11, fill: ct.tickFill }}
                            tick={{ fontSize: 11, fill: ct.tickFill }} />
                          <ZAxis range={[60,60]} />
                          <ReferenceLine x={50} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" label={{ value: '50% completion', fontSize: 10, fill: ct.refLabelFill, position: 'top' }} />
                          <ReferenceLine y={40} stroke="rgba(239,68,68,0.35)" strokeDasharray="4 4" label={{ value: '40% score', fontSize: 10, fill: ct.refLabelFill, position: 'right' }} />
                          <Tooltip content={<ScatterTip />} />
                          <Scatter name="At-Risk Students" data={atRisk} fill="#ef4444" fillOpacity={0.8} />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════
              ALL STUDENTS
          ════════════════════════════════════════════════════════════════════ */}
          {tab === 'students' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted" />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search students…"
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg bg-surface border border-overlay/[0.07] text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary/50" />
                </div>
                <div className="relative">
                  <select value={cFilter} onChange={e => setCFilter(e.target.value)}
                    className="appearance-none pl-3 pr-8 py-2 text-sm rounded-lg bg-surface border border-overlay/[0.07] text-text-primary focus:outline-none focus:ring-1 focus:ring-primary/50">
                    <option value="all">All Groups</option>
                    {byCluster.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                  </select>
                  <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                </div>
                <span className="text-xs text-text-muted">{filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}</span>
              </div>

              <Card className="border-none shadow-soft bg-surface overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-wider text-text-muted bg-surface-dark/40">
                        <th className="px-4 py-3 font-medium w-8">#</th>
                        <th className="px-4 py-3 font-medium">Student</th>
                        <th className="px-4 py-3 font-medium">Group</th>
                        <SortTh label="Avg Score"   sortKey="avg_score"       sortState={sort} onSort={toggleSort} />
                        <SortTh label="Test Score"  sortKey="avg_test_score"  sortState={sort} onSort={toggleSort} />
                        <SortTh label="Quality"     sortKey="avg_quality"     sortState={sort} onSort={toggleSort} />
                        <SortTh label="Completion"  sortKey="completion_rate" sortState={sort} onSort={toggleSort} />
                        <SortTh label="Penalty"     sortKey="avg_penalty"     sortState={sort} onSort={toggleSort} />
                        <th className="px-4 py-3 font-medium">Submitted</th>
                        <th className="px-4 py-3 font-medium">Grade</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredStudents.map((st, idx) => (
                        <tr key={st.id} className="border-t border-overlay/5 hover:bg-surface-dark/20 transition-colors">
                          <td className="px-4 py-3 text-xs text-text-muted tabular-nums">{idx+1}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {st.photo_url
                                ? <img src={st.photo_url} alt="" className="w-7 h-7 rounded-full object-cover border border-overlay/10 shrink-0" />
                                : <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[11px] font-bold text-primary shrink-0">{(st.name||'?').charAt(0).toUpperCase()}</div>
                              }
                              <div>
                                <p className="font-medium text-text-primary leading-tight">{st.name}</p>
                                <p className="text-[10px] text-text-muted">{st.email}</p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${CLUSTER_BG[st.cluster]} ${CLUSTER_TEXT[st.cluster]}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${CLUSTER_DOT[st.cluster]}`} />
                              {st.cluster_label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-14 h-1.5 rounded-full bg-surface-dark/40 overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${st.avg_score}%`, backgroundColor: CLUSTER_COLORS[st.cluster] }} />
                              </div>
                              <span className="font-bold text-text-primary tabular-nums text-xs">{st.avg_score}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-text-muted tabular-nums text-xs">{st.avg_test_score}%</td>
                          <td className="px-4 py-3 text-text-muted tabular-nums text-xs">{st.avg_quality}</td>
                          <td className="px-4 py-3 text-text-muted tabular-nums text-xs">{st.completion_rate}%</td>
                          <td className="px-4 py-3 text-text-muted tabular-nums text-xs">{st.avg_penalty}</td>
                          <td className="px-4 py-3 text-text-muted tabular-nums text-xs">{st.submissions}/{st.total_assignments}</td>
                          <td className="px-4 py-3">
                            <span className={`text-sm font-black ${gradeColor(st.avg_score)}`}>{grade(st.avg_score)}</span>
                          </td>
                        </tr>
                      ))}
                      {filteredStudents.length === 0 && (
                        <tr><td colSpan={10} className="px-4 py-10 text-center text-text-muted text-sm">No students match your filters.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
