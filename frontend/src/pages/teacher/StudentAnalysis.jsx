import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Cell,
} from 'recharts';
import {
  getClassroomStudents, getStudentPortfolio, generateStudentAIInsights,
} from '../../api/client';
import toast from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import {
  User, Printer, Sparkles, TrendingUp, TrendingDown, Minus,
  CheckCircle, XCircle, AlertCircle, Code2, Calendar, Trophy,
  Target, Zap, BookOpen, ShieldAlert, ThumbsUp, Lightbulb,
  ChevronDown, ChevronUp, Activity, Star, ArrowLeft,
} from 'lucide-react';

/* ─── helpers ──────────────────────────────────────────────────────────────── */
const scoreColor   = (s) => s >= 80 ? '#22c55e' : s >= 50 ? '#f59e0b' : '#ef4444';
const scoreTailwind = (s) => s >= 80 ? 'text-success' : s >= 50 ? 'text-warning' : 'text-error';
const scoreBg      = (s) => s >= 80 ? 'bg-success/10 border-success/20' : s >= 50 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20';

const RISK_META = {
  excellent:        { label: 'Excellent',        color: 'text-success',  bg: 'bg-success/10 border-success/20',  dot: 'bg-success'  },
  on_track:         { label: 'On Track',          color: 'text-primary',  bg: 'bg-primary/10 border-primary/20',  dot: 'bg-primary'  },
  needs_attention:  { label: 'Needs Attention',   color: 'text-warning',  bg: 'bg-warning/10 border-warning/20',  dot: 'bg-warning'  },
  at_risk:          { label: 'At Risk',            color: 'text-error',    bg: 'bg-error/10 border-error/20',      dot: 'bg-error'    },
  unknown:          { label: 'Unknown',            color: 'text-text-muted', bg: 'bg-overlay/5 border-overlay/10', dot: 'bg-overlay/30' },
};

const DIFF_COLOR = { easy: 'text-success bg-success/10 border-success/20', medium: 'text-warning bg-warning/10 border-warning/20', hard: 'text-error bg-error/10 border-error/20' };

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface border border-overlay/[0.1] rounded-xl px-3 py-2.5 shadow-2xl text-xs space-y-1">
      <p className="text-text-muted font-semibold">{label}</p>
      {payload.map((p, i) => (
        <div key={i} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: p.color || p.stroke }} />
          <span className="text-text-muted">{p.name}:</span>
          <span className="text-text-primary font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ─── StatCard ──────────────────────────────────────────────────────────────── */
const StatCard = ({ icon: Icon, label, value, sub, color = 'text-text-primary', border = '' }) => (
  <div className={`flex-1 min-w-[120px] rounded-2xl border p-4 bg-surface flex flex-col gap-1.5 ${border || 'border-overlay/[0.07]'}`}>
    <div className="flex items-center gap-2">
      <Icon className={`h-4 w-4 ${color} shrink-0`} />
      <span className="text-[11px] text-text-muted font-medium uppercase tracking-wide">{label}</span>
    </div>
    <p className={`text-2xl font-black ${color} leading-none`}>{value}</p>
    {sub && <p className="text-[11px] text-text-muted">{sub}</p>}
  </div>
);

/* ─── AssignmentCard (expandable) ────────────────────────────────────────────── */
const AssignmentRow = ({ a, index }) => {
  const [open, setOpen] = useState(false);
  const sub = a.submission;

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all print:break-inside-avoid ${
      a.submitted ? (sub?.final_score >= 80 ? 'border-success/15' : sub?.final_score >= 50 ? 'border-warning/15' : 'border-error/15') : 'border-overlay/[0.07]'
    } bg-surface`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 hover:bg-overlay/[0.02] transition-colors text-left print:cursor-default"
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
          a.submitted ? scoreBg(sub?.final_score ?? 0) : 'bg-overlay/[0.05] border-overlay/[0.08] border'
        }`}>
          <span className={a.submitted ? scoreTailwind(sub?.final_score ?? 0) : 'text-text-muted'}>{index + 1}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold text-text-primary truncate">{a.assignment_name}</p>
            <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${DIFF_COLOR[a.difficulty] || DIFF_COLOR.medium}`}>{a.difficulty}</span>
          </div>
          <p className="text-xs text-text-muted mt-0.5 truncate">{a.package_title}</p>
        </div>

        <div className="flex items-center gap-4 shrink-0 text-right">
          {a.submitted ? (
            <>
              <div>
                <p className={`text-lg font-black ${scoreTailwind(sub.final_score)}`}>{sub.final_score.toFixed(1)}%</p>
                <p className="text-[10px] text-text-muted">Final</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-text-primary">{sub.test_pass_rate.toFixed(0)}%</p>
                <p className="text-[10px] text-text-muted">Tests</p>
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-bold text-text-primary">{sub.quality_score}</p>
                <p className="text-[10px] text-text-muted">Quality</p>
              </div>
            </>
          ) : (
            <span className="text-xs text-text-muted italic">Not submitted</span>
          )}
          <div className="print:hidden">
            {open ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
          </div>
        </div>
      </button>

      {/* Expanded detail */}
      {(open || false) && sub && (
        <div className="border-t border-overlay/[0.05] px-5 py-4 space-y-5 print:block">
          {/* Metrics row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Final Score', value: `${sub.final_score.toFixed(1)}%`, color: scoreTailwind(sub.final_score) },
              { label: 'Test Pass Rate', value: `${sub.test_pass_rate.toFixed(0)}%`, color: sub.test_pass_rate === 100 ? 'text-success' : sub.test_pass_rate >= 50 ? 'text-warning' : 'text-error' },
              { label: 'Code Quality', value: `${sub.quality_score}/100`, color: sub.quality_score >= 75 ? 'text-success' : sub.quality_score >= 50 ? 'text-warning' : 'text-error' },
              { label: 'Penalty', value: `-${sub.error_penalty}`, color: sub.error_penalty > 0 ? 'text-error' : 'text-success' },
            ].map(m => (
              <div key={m.label} className="rounded-xl bg-overlay/[0.03] border border-overlay/[0.05] px-3 py-2.5">
                <p className="text-[10px] text-text-muted mb-1">{m.label}</p>
                <p className={`text-base font-black ${m.color}`}>{m.value}</p>
              </div>
            ))}
          </div>

          {/* Test results */}
          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Test Cases</p>
            <div className="flex flex-wrap gap-2">
              {sub.test_results.map((r, i) => (
                <div key={i} className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border ${r.passed ? 'bg-success/5 border-success/15 text-success' : 'bg-error/5 border-error/15 text-error'}`}>
                  {r.passed ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                  <span className="font-medium">TC {i + 1}</span>
                  <span className="opacity-60">{r.type === 'hidden' ? 'hidden' : 'sample'}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quality comments */}
          {sub.quality_comments?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2">Quality Feedback</p>
              <div className="space-y-1.5">
                {sub.quality_comments.map((c, i) => (
                  <div key={i} className="flex gap-2 text-xs text-text-secondary bg-overlay/[0.03] border border-overlay/[0.05] rounded-lg px-3 py-2">
                    <AlertCircle className="h-3.5 w-3.5 text-text-muted shrink-0 mt-0.5" />
                    {c}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submitted at + code snippet */}
          <div className="flex items-center justify-between text-[11px] text-text-muted">
            <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Submitted {new Date(sub.submitted_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} IST</span>
            {Object.keys(sub.error_counts || {}).length > 0 && (
              <span className="text-error">{Object.entries(sub.error_counts).map(([k, v]) => `${k} ×${v}`).join(', ')}</span>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold text-text-muted uppercase tracking-widest mb-2 flex items-center gap-1.5">
              <Code2 className="h-3.5 w-3.5" /> Submitted Code
            </p>
            <pre className="rounded-xl bg-black/50 border border-overlay/[0.07] p-4 text-xs font-mono text-text-primary overflow-x-auto max-h-64 leading-relaxed scrollbar-thin scrollbar-thumb-overlay/20 scrollbar-track-transparent">
              <code>{sub.code}</code>
            </pre>
          </div>
        </div>
      )}
      {/* Print always shows detail */}
      <div className="hidden print:block border-t border-overlay/[0.05] px-5 py-4 space-y-3">
        {sub && (
          <>
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div><span className="text-text-muted">Final: </span><strong>{sub.final_score.toFixed(1)}%</strong></div>
              <div><span className="text-text-muted">Test Pass: </span><strong>{sub.test_pass_rate.toFixed(0)}%</strong></div>
              <div><span className="text-text-muted">Quality: </span><strong>{sub.quality_score}/100</strong></div>
              <div><span className="text-text-muted">Penalty: </span><strong>-{sub.error_penalty}</strong></div>
            </div>
            <div className="flex flex-wrap gap-1">
              {sub.test_results.map((r, i) => (
                <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${r.passed ? 'border-success/20 text-success' : 'border-error/20 text-error'}`}>
                  TC{i+1} {r.passed ? '✓' : '✗'} ({r.type})
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

/* ─── Main Page ─────────────────────────────────────────────────────────────── */
export default function StudentAnalysis() {
  const { classroomId } = useAuth();
  const [students, setStudents] = useState([]);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [portfolio, setPortfolio] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [loadingPortfolio, setLoadingPortfolio] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  const printRef = useRef(null);

  // Load students
  useEffect(() => {
    if (!classroomId) return;
    getClassroomStudents(classroomId)
      .then(r => setStudents(r.data))
      .catch(() => toast.error('Failed to load students'));
  }, [classroomId]);

  // Load portfolio when student changes
  useEffect(() => {
    setPortfolio(null);
    setAiInsights(null);
    if (!selectedStudentId || !classroomId) return;
    setLoadingPortfolio(true);
    getStudentPortfolio(classroomId, selectedStudentId)
      .then(r => setPortfolio(r.data))
      .catch(() => toast.error('Failed to load student data'))
      .finally(() => setLoadingPortfolio(false));
  }, [selectedStudentId, classroomId]);

  const handleGenerateAI = async () => {
    const targetStudentId = selectedStudentId;
    setLoadingAI(true);
    try {
      const r = await generateStudentAIInsights(classroomId, targetStudentId);
      if (selectedStudentId === targetStudentId) {
        setAiInsights(r.data);
        toast.success('AI insights ready!');
      }
    } catch {
      toast.error('AI analysis failed');
    } finally {
      setLoadingAI(false);
    }
  };

  const handlePrint = () => window.print();

  /* ─── derived chart data ─────────────────────────────────────────────────── */
  const submittedAssignments = portfolio?.assignments?.filter(a => a.submitted) ?? [];

  const scoreChartData = submittedAssignments.map((a, i) => ({
    name: `A${i + 1}`,
    fullName: a.assignment_name,
    score: a.submission.final_score,
    quality: a.submission.quality_score,
    tests: a.submission.test_pass_rate,
  }));

  const errorData = Object.entries(portfolio?.summary?.error_frequency ?? {})
    .map(([name, value]) => ({ name: name.replace('_', ' '), value }))
    .sort((a, b) => b.value - a.value);

  const radarData = submittedAssignments.length > 0 ? [
    { subject: 'Consistency',   value: Math.min(100, 100 - (portfolio.summary.best_score - portfolio.summary.worst_score)) },
    { subject: 'Test Pass',      value: portfolio.summary.avg_test_pass_rate },
    { subject: 'Code Quality',   value: portfolio.summary.avg_quality_score },
    { subject: 'Completion',     value: portfolio.summary.completion_rate },
    { subject: 'Avg Score',      value: portfolio.summary.avg_score },
    { subject: 'Best Score',     value: portfolio.summary.best_score },
  ] : [];

  const risk = aiInsights ? RISK_META[aiInsights.risk_level] || RISK_META.unknown : null;

  /* ─── score trend ────────────────────────────────────────────────────────── */
  const trend = scoreChartData.length >= 2
    ? scoreChartData[scoreChartData.length - 1].score - scoreChartData[0].score
    : 0;
  const TrendIcon = trend > 5 ? TrendingUp : trend < -5 ? TrendingDown : Minus;
  const trendColor = trend > 5 ? 'text-success' : trend < -5 ? 'text-error' : 'text-text-muted';

  /* ─── render ─────────────────────────────────────────────────────────────── */
  return (
    <div ref={printRef} className="space-y-6 print:space-y-4">

      {/* ── Print styles injected ───────────────────────────────────────────── */}
      <style>{`
        @media print {
          body { background: white !important; color: black !important; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          nav, aside, header { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          @page { margin: 1.5cm; }
        }
      `}</style>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Student Analysis</h1>
          <p className="text-text-muted text-sm mt-0.5">Deep performance insights for individual students</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select
              value={selectedStudentId}
              onChange={e => setSelectedStudentId(e.target.value)}
            >
              <option value="" disabled>Select a student...</option>
              {students.map(s => (
                <option key={s.id} value={s.id}>{s.name || s.email}</option>
              ))}
            </Select>
          </div>
          {portfolio && (
            <Button variant="outline" onClick={handlePrint} className="gap-2 shrink-0">
              <Printer className="h-4 w-4" /> Print Report
            </Button>
          )}
        </div>
      </div>

      {/* Print header (only in print) */}
      {portfolio && (
        <div className="hidden print:block mb-6 pb-4 border-b border-gray-300">
          <h1 className="text-2xl font-bold">Student Performance Report</h1>
          <p className="text-sm text-gray-500 mt-1">Generated {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST</p>
        </div>
      )}

      {/* ── Empty / loading state ────────────────────────────────────────────── */}
      {!selectedStudentId && (
        <div className="rounded-2xl border-2 border-dashed border-overlay/[0.07] py-20 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-overlay/[0.05] border border-overlay/[0.08] flex items-center justify-center">
            <User className="h-7 w-7 text-text-muted opacity-50" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-text-primary">Select a Student</h3>
            <p className="text-sm text-text-muted mt-1">Choose a student from the dropdown to see their full performance report</p>
          </div>
        </div>
      )}

      {loadingPortfolio && (
        <div className="flex items-center justify-center py-20">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
        </div>
      )}

      {/* ── Portfolio loaded ─────────────────────────────────────────────────── */}
      {portfolio && !loadingPortfolio && (() => {
        const s = portfolio.summary;
        const st = portfolio.student;
        return (
          <>
            {/* Student identity card */}
            <div className="rounded-2xl border border-overlay/[0.07] bg-surface p-5 flex flex-col sm:flex-row items-start sm:items-center gap-5">
              {st.photo_url ? (
                <img src={st.photo_url} alt={st.name} className="h-14 w-14 rounded-2xl object-cover border border-overlay/[0.1] shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/[0.15] flex items-center justify-center text-xl font-black text-primary shrink-0">
                  {st.name?.charAt(0)?.toUpperCase() ?? 'S'}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold text-text-primary">{st.name}</h2>
                <p className="text-sm text-text-muted">{st.email}</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Joined {new Date(st.joined_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'long', year: 'numeric' })}
                </p>
              </div>
              {/* Trend badge */}
              {scoreChartData.length >= 2 && (
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm font-semibold ${trendColor} bg-overlay/[0.04] border-overlay/[0.08]`}>
                  <TrendIcon className="h-4 w-4" />
                  {trend > 5 ? 'Improving' : trend < -5 ? 'Declining' : 'Steady'}
                  {Math.abs(trend) > 0.5 && <span className="text-xs opacity-70">({trend > 0 ? '+' : ''}{trend.toFixed(1)}%)</span>}
                </div>
              )}
            </div>

            {/* ── Stat cards ──────────────────────────────────────────────────── */}
            <div className="flex gap-3 flex-wrap">
              <StatCard icon={Activity}   label="Avg Score"   value={`${s.avg_score}%`}        color={scoreTailwind(s.avg_score)} border={scoreBg(s.avg_score)} />
              <StatCard icon={Trophy}     label="Best Score"  value={`${s.best_score}%`}        color="text-success"  />
              <StatCard icon={Target}     label="Test Pass"   value={`${s.avg_test_pass_rate}%`} color="text-primary"  />
              <StatCard icon={Star}       label="Avg Quality" value={`${s.avg_quality_score}`}   color="text-warning"  sub="out of 100" />
              <StatCard icon={BookOpen}   label="Completion"  value={`${s.completion_rate}%`}   color={s.completion_rate === 100 ? 'text-success' : 'text-text-primary'} sub={`${s.submitted_count}/${s.total_assignments}`} />
            </div>

            {/* ── Charts row ──────────────────────────────────────────────────── */}
            {scoreChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Score + Quality trend (span 2) */}
                <Card className="lg:col-span-2 border-none shadow-soft bg-surface overflow-hidden print:break-inside-avoid">
                  <CardHeader className="border-b border-overlay/[0.05] py-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm font-semibold flex items-center gap-2">
                        <TrendingUp className="h-4 w-4 text-text-muted" /> Score Progression
                      </CardTitle>
                      <div className="flex items-center gap-3 text-[11px] text-text-muted">
                        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full inline-block bg-primary/60" /> Score</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full inline-block bg-warning/50" /> Quality</span>
                        <span className="flex items-center gap-1.5"><span className="h-2 w-5 rounded-full inline-block bg-success/50" /> Tests</span>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-2 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={scoreChartData} margin={{ top: 12, right: 12, bottom: 0, left: -20 }}>
                        <defs>
                          <linearGradient id="gradScore" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradQual" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="#f59e0b" stopOpacity={0.25} />
                            <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                          </linearGradient>
                          <linearGradient id="gradTests" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%"  stopColor="#22c55e" stopOpacity={0.2} />
                            <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} tickCount={5} />
                        <Tooltip content={<ChartTip />} cursor={{ stroke: 'rgba(255,255,255,0.07)', strokeWidth: 1, fill: 'rgba(255,255,255,0.02)' }} />
                        <Area type="monotone" dataKey="score"   name="Final Score" stroke="#6366f1" strokeWidth={2}   fill="url(#gradScore)" dot={{ fill: '#6366f1', r: 3.5, strokeWidth: 2, stroke: '#18181b' }} activeDot={{ r: 5, fill: '#6366f1', stroke: '#18181b', strokeWidth: 2 }} />
                        <Area type="monotone" dataKey="quality" name="Quality"     stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradQual)"  dot={{ fill: '#f59e0b', r: 3, strokeWidth: 2, stroke: '#18181b' }}   strokeDasharray="5 3" activeDot={{ r: 4, fill: '#f59e0b' }} />
                        <Area type="monotone" dataKey="tests"   name="Test Pass %"  stroke="#22c55e" strokeWidth={1.5} fill="url(#gradTests)" dot={false} strokeDasharray="2 4" activeDot={{ r: 4, fill: '#22c55e' }} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Radar chart */}
                <Card className="border-none shadow-soft bg-surface overflow-hidden print:break-inside-avoid">
                  <CardHeader className="border-b border-overlay/[0.05] py-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <Activity className="h-4 w-4 text-text-muted" /> Skill Radar
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 h-[220px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData} margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                        <PolarGrid stroke="rgba(255,255,255,0.06)" />
                        <PolarAngleAxis dataKey="subject" tick={{ fill: '#71717a', fontSize: 10 }} />
                        <PolarRadiusAxis domain={[0, 100]} tick={false} axisLine={false} />
                        <Radar name="Student" dataKey="value" stroke="rgba(255,255,255,0.5)" fill="rgba(255,255,255,0.08)" strokeWidth={1.5} dot={{ fill: '#fafafa', r: 3, strokeWidth: 0 }} />
                        <Tooltip content={<ChartTip />} />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Error distribution + Test pass per assignment ──────────────── */}
            {scoreChartData.length > 0 && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Test pass rate per assignment */}
                <Card className="border-none shadow-soft bg-surface overflow-hidden print:break-inside-avoid">
                  <CardHeader className="border-b border-overlay/[0.05] py-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-text-muted" /> Test Pass Rate / Assignment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-2 h-[200px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={scoreChartData} barSize={20} margin={{ top: 5, right: 10, bottom: 0, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.04)" />
                        <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                        <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                        <Bar dataKey="tests" name="Test Pass %" radius={[4, 4, 0, 0]}>
                          {scoreChartData.map((entry, i) => (
                            <Cell key={i} fill={entry.tests >= 80 ? '#22c55e' : entry.tests >= 50 ? '#f59e0b' : '#ef4444'} fillOpacity={0.75} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Error frequency */}
                <Card className="border-none shadow-soft bg-surface overflow-hidden print:break-inside-avoid">
                  <CardHeader className="border-b border-overlay/[0.05] py-3">
                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                      <ShieldAlert className="h-4 w-4 text-text-muted" /> Error Pattern Frequency
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 h-[200px]">
                    {errorData.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center gap-2 text-center">
                        <CheckCircle className="h-8 w-8 text-success opacity-40" />
                        <p className="text-sm text-text-muted">No errors recorded — clean submissions!</p>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={errorData} layout="vertical" barSize={14} margin={{ top: 0, right: 10, bottom: 0, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="rgba(255,255,255,0.04)" />
                          <XAxis type="number" allowDecimals={false} domain={[0, dataMax => Math.ceil(dataMax + 0.5)]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                          <YAxis type="category" dataKey="name" tick={{ fill: '#a1a1aa', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
                          <Tooltip content={<ChartTip />} cursor={{ fill: 'rgba(255,255,255,0.03)' }} />
                          <Bar dataKey="value" name="Occurrences" radius={[0, 4, 4, 0]}>
                            {errorData.map((entry, i) => {
                              const colors = ['#ef4444','#f97316','#eab308','#a855f7','#3b82f6','#06b6d4','#ec4899'];
                              return <Cell key={i} fill={colors[i % colors.length]} fillOpacity={0.7} />;
                            })}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── AI Insights ──────────────────────────────────────────────────── */}
            <Card className="border-none shadow-soft bg-surface overflow-hidden print:break-inside-avoid">
              <CardHeader className="border-b border-overlay/[0.05] py-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-semibold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" /> AI Learning Insights
                  </CardTitle>
                  {!aiInsights && (
                    <Button size="sm" onClick={handleGenerateAI} disabled={loadingAI} className="gap-2 print:hidden">
                      {loadingAI
                        ? <><div className="animate-spin h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full" /> Analyzing...</>
                        : <><Sparkles className="h-3.5 w-3.5" /> Generate Insights</>
                      }
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="py-5">
                {!aiInsights ? (
                  <div className="flex flex-col items-center py-8 gap-3 text-center">
                    <div className="w-12 h-12 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center">
                      <Sparkles className="h-5 w-5 text-primary/60" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-text-primary">AI-powered student assessment</p>
                      <p className="text-xs text-text-muted mt-1">Click "Generate Insights" to get a deep analysis of this student's patterns, strengths, and recommended interventions</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 animate-in fade-in duration-500">
                    {/* Risk badge + overview */}
                    <div className={`flex flex-col sm:flex-row sm:items-start gap-4 p-4 rounded-2xl border ${risk.bg}`}>
                      <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border self-start shrink-0 ${risk.bg} ${risk.color}`}>
                        <span className={`h-2 w-2 rounded-full ${risk.dot}`} />
                        {risk.label}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm text-text-primary leading-relaxed">{aiInsights.overall_assessment}</p>
                        {aiInsights.improvement_trend && (
                          <p className="text-xs text-text-muted mt-2 italic flex items-center gap-1.5">
                            <TrendIcon className={`h-3.5 w-3.5 ${trendColor}`} />
                            {aiInsights.improvement_trend}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Strong + Struggling */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-success uppercase tracking-widest flex items-center gap-1.5">
                          <ThumbsUp className="h-3.5 w-3.5" /> Strongest Areas
                        </p>
                        {aiInsights.strongest_areas.map((a, i) => (
                          <div key={i} className="flex gap-2.5 items-start bg-success/5 border border-success/10 rounded-xl px-3 py-2.5">
                            <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                            <span className="text-xs text-text-secondary leading-snug">{a}</span>
                          </div>
                        ))}
                      </div>
                      <div className="space-y-2">
                        <p className="text-[11px] font-bold text-error uppercase tracking-widest flex items-center gap-1.5">
                          <AlertCircle className="h-3.5 w-3.5" /> Struggling Areas
                        </p>
                        {aiInsights.struggling_areas.map((a, i) => (
                          <div key={i} className="flex gap-2.5 items-start bg-error/5 border border-error/10 rounded-xl px-3 py-2.5">
                            <XCircle className="h-3.5 w-3.5 text-error mt-0.5 shrink-0" />
                            <span className="text-xs text-text-secondary leading-snug">{a}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Recommendations */}
                    <div className="space-y-2">
                      <p className="text-[11px] font-bold text-warning uppercase tracking-widest flex items-center gap-1.5">
                        <Lightbulb className="h-3.5 w-3.5" /> Recommended Actions for Teacher
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {aiInsights.recommendations.map((r, i) => (
                          <div key={i} className="flex gap-3 items-start bg-overlay/[0.03] border border-overlay/[0.06] rounded-xl px-3 py-3">
                            <div className="w-5 h-5 rounded-full bg-warning/15 text-warning flex items-center justify-center text-[10px] font-black shrink-0 mt-0.5">{i + 1}</div>
                            <span className="text-xs text-text-muted leading-snug">{r}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Personality note */}
                    {aiInsights.personality_note && (
                      <div className="flex gap-2.5 items-start bg-overlay/[0.03] border border-overlay/[0.06] rounded-xl px-4 py-3">
                        <Zap className="h-4 w-4 text-primary/50 shrink-0 mt-0.5" />
                        <p className="text-xs text-text-muted italic leading-snug">{aiInsights.personality_note}</p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* ── Assignment breakdown ─────────────────────────────────────────── */}
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-text-primary uppercase tracking-widest flex items-center gap-2">
                <BookOpen className="h-4 w-4 text-text-muted" /> Assignment Breakdown
                <span className="text-text-muted font-normal">({portfolio.assignments.length})</span>
              </h2>
              {portfolio.assignments.map((a, i) => (
                <AssignmentRow key={a.assignment_id} a={a} index={i} />
              ))}
            </div>
          </>
        );
      })()}
    </div>
  );
}
