import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getAssignmentDetails, releaseResults } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import {
    ArrowLeft, Users, CheckCircle2, Clock, TrendingUp,
    Trophy, RefreshCw, Send, Search, ChevronUp, ChevronDown,
    AlertCircle,
} from 'lucide-react';

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (val, suffix = '') => val != null ? `${val}${suffix}` : '—';

const diffColor = (d) => ({
    easy:   'bg-success/10 text-success border-success/20',
    medium: 'bg-warning/10 text-warning border-warning/20',
    hard:   'bg-error/10   text-error   border-error/20',
}[d] || 'bg-overlay/10 text-text-muted border-overlay/10');

const scoreColor = (s) => {
    if (s == null) return 'text-text-muted';
    if (s >= 80) return 'text-success';
    if (s >= 50) return 'text-warning';
    return 'text-error';
};

const relTime = (iso) => {
    if (!iso) return '—';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1)   return 'just now';
    if (m < 60)  return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)  return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
};

const fmtTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
    }) + ' IST';
};

// ─── Stat Mini Card ───────────────────────────────────────────────────────────
const Stat = ({ label, value, Icon, sub }) => (
    <Card className="border-none bg-surface shadow-soft">
        <CardContent className="p-4">
            <div className="flex items-start justify-between mb-3">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">{label}</p>
                <div className="h-6 w-6 rounded-md bg-overlay/[0.05] border border-overlay/[0.07] flex items-center justify-center">
                    <Icon className="h-3 w-3 text-text-muted" />
                </div>
            </div>
            <p className="text-2xl font-bold text-text-primary tracking-tight">{value}</p>
            {sub && <p className="text-[11px] text-text-muted mt-1">{sub}</p>}
        </CardContent>
    </Card>
);

// ─── Release Modal ────────────────────────────────────────────────────────────
const ReleaseModal = ({ onConfirm, onClose, releasing }) => {
    const [alpha, setAlpha] = useState(0.6);
    const [beta,  setBeta]  = useState(0.4);
    const [gamma, setGamma] = useState(10);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
            <div className="bg-surface border border-overlay/[0.08] rounded-2xl p-6 w-full max-w-sm shadow-2xl mx-4">
                <h3 className="text-base font-semibold text-text-primary mb-1">Release Results</h3>
                <p className="text-xs text-text-muted mb-5">Configure scoring weights before publishing.</p>

                {[
                    { label: 'Test Score Weight (α)', value: alpha, set: setAlpha, max: 1, step: 0.05 },
                    { label: 'Quality Weight (β)',    value: beta,  set: setBeta,  max: 1, step: 0.05 },
                    { label: 'Error Penalty (γ)',     value: gamma, set: setGamma, max: 50, step: 1 },
                ].map(({ label, value, set, max, step }) => (
                    <div key={label} className="mb-4">
                        <div className="flex justify-between mb-1.5">
                            <label className="text-xs text-text-muted">{label}</label>
                            <span className="text-xs font-semibold text-text-primary tabular-nums">{value}</span>
                        </div>
                        <input
                            type="range" min={0} max={max} step={step} value={value}
                            onChange={e => set(parseFloat(e.target.value))}
                            className="w-full accent-white h-1 rounded-full bg-overlay/10"
                        />
                    </div>
                ))}

                <div className="flex gap-2 mt-5">
                    <button onClick={onClose} className="flex-1 py-2 text-sm text-text-muted border border-overlay/[0.08] rounded-lg hover:bg-overlay/[0.04] transition-colors">
                        Cancel
                    </button>
                    <Button onClick={() => onConfirm(alpha, beta, gamma)} isLoading={releasing} className="flex-1 text-sm shadow-none">
                        Publish
                    </Button>
                </div>
            </div>
        </div>
    );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AssignmentDetail() {
    const { id } = useParams();
    const [data, setData]         = useState(null);
    const [loading, setLoading]   = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [filter, setFilter]     = useState('all');   // all | submitted | pending
    const [search, setSearch]     = useState('');
    const [sort, setSort]         = useState({ key: 'roll', dir: 'asc' });
    const [showRelease, setShowRelease] = useState(false);
    const [releasing, setReleasing] = useState(false);
    const intervalRef = useRef(null);

    const fetchData = useCallback(async (silent = false) => {
        if (!silent) setLoading(true); else setRefreshing(true);
        try {
            const res = await getAssignmentDetails(id);
            setData(res.data);
        } catch {
            if (!silent) toast.error('Failed to load assignment details.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [id]);

    useEffect(() => {
        fetchData(false);
        // Auto-refresh every 20 seconds
        intervalRef.current = setInterval(() => fetchData(true), 20000);
        return () => clearInterval(intervalRef.current);
    }, [fetchData]);

    const handleRelease = async (alpha, beta, gamma) => {
        setReleasing(true);
        try {
            await releaseResults(id, alpha, beta, gamma);
            toast.success('Results published!');
            setShowRelease(false);
            fetchData(true);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to release results.');
        } finally {
            setReleasing(false);
        }
    };

    const toggleSort = (key) => {
        setSort(prev => prev.key === key
            ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
            : { key, dir: 'asc' }
        );
    };

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-overlay/30" />
        </div>
    );

    if (!data) return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
            <AlertCircle className="h-8 w-8 text-text-muted opacity-40" />
            <p className="text-sm text-text-muted">Assignment not found.</p>
            <Link to="/teacher/assign"><Button variant="ghost" size="sm">Go back</Button></Link>
        </div>
    );

    // Filter + search + sort
    const filtered = (data.students || [])
        .filter(s => filter === 'all' || s.status === filter)
        .filter(s => {
            const q = search.toLowerCase();
            return !q || String(s.roll).includes(q) || s.name.toLowerCase().includes(q);
        })
        .sort((a, b) => {
            const dir = sort.dir === 'asc' ? 1 : -1;
            if (sort.key === 'roll')    return (a.roll - b.roll) * dir;
            if (sort.key === 'name')    return a.name.localeCompare(b.name) * dir;
            if (sort.key === 'score')   return ((a.final_score ?? -1) - (b.final_score ?? -1)) * dir;
            if (sort.key === 'submitted_at') return ((a.submitted_at ?? '') < (b.submitted_at ?? '') ? -1 : 1) * dir;
            return 0;
        });

    const SortIcon = ({ k }) => {
        if (sort.key !== k) return <ChevronUp className="h-3 w-3 opacity-20" />;
        return sort.dir === 'asc'
            ? <ChevronUp className="h-3 w-3 text-text-primary" />
            : <ChevronDown className="h-3 w-3 text-text-primary" />;
    };

    const submissionPct = data.total_students > 0
        ? Math.round(data.submitted_count / data.total_students * 100)
        : 0;

    return (
        <>
            {showRelease && (
                <ReleaseModal
                    onConfirm={handleRelease}
                    onClose={() => setShowRelease(false)}
                    releasing={releasing}
                />
            )}

            <div className="space-y-5 animate-in fade-in duration-300">

                {/* ── Header ── */}
                <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Link to="/teacher/assign">
                            <button className="h-8 w-8 rounded-lg border border-overlay/[0.07] bg-overlay/[0.04] flex items-center justify-center text-text-muted hover:text-text-primary hover:border-overlay/[0.14] transition-colors shrink-0">
                                <ArrowLeft className="h-4 w-4" />
                            </button>
                        </Link>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-text-primary truncate">{data.name}</h2>
                            <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-text-muted">
                                    Created {fmtTime(data.created_at)}
                                </span>
                                {data.results_released
                                    ? <span className="text-[11px] font-medium bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle2 className="h-3 w-3" />Published</span>
                                    : <span className="text-[11px] font-medium bg-warning/10 text-warning border border-warning/20 px-2 py-0.5 rounded flex items-center gap-1"><Clock className="h-3 w-3" />Pending</span>
                                }
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <button
                            onClick={() => fetchData(true)}
                            className={`h-8 w-8 rounded-lg border border-overlay/[0.07] bg-overlay/[0.04] flex items-center justify-center text-text-muted hover:text-text-primary transition-colors ${refreshing ? 'animate-spin' : ''}`}
                            title="Refresh"
                        >
                            <RefreshCw className="h-3.5 w-3.5" />
                        </button>
                        {!data.results_released && data.submitted_count > 0 && (
                            <Button size="sm" onClick={() => setShowRelease(true)} className="gap-1.5 shadow-none text-xs">
                                <Send className="h-3.5 w-3.5" />
                                Release Results
                            </Button>
                        )}
                    </div>
                </div>

                {/* ── Stat Cards ── */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Stat label="Total Students" value={data.total_students} Icon={Users} />
                    <Stat
                        label="Submitted"
                        value={`${data.submitted_count} (${submissionPct}%)`}
                        Icon={CheckCircle2}
                        sub={`${data.pending_count} pending`}
                    />
                    <Stat
                        label="Avg. Score"
                        value={fmt(data.avg_score, '%')}
                        Icon={TrendingUp}
                        sub={data.results_released ? 'from released results' : 'publish to unlock'}
                    />
                    <Stat
                        label="Top Score"
                        value={fmt(data.top_score, '%')}
                        Icon={Trophy}
                        sub={data.results_released ? 'highest in class' : 'publish to unlock'}
                    />
                </div>

                {/* ── Submission progress bar ── */}
                <div className="bg-surface border-none rounded-xl p-4 shadow-soft">
                    <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-medium text-text-muted">Submission Progress</p>
                        <p className="text-xs font-semibold text-text-primary tabular-nums">
                            {data.submitted_count} / {data.total_students} students
                        </p>
                    </div>
                    <div className="h-2 bg-overlay/[0.06] rounded-full overflow-hidden">
                        <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                                width: `${submissionPct}%`,
                                background: submissionPct === 100
                                    ? 'rgba(34,197,94,0.7)'
                                    : submissionPct >= 60
                                    ? 'rgba(255,255,255,0.6)'
                                    : 'rgba(255,255,255,0.3)',
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-1 mt-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-overlay/20 animate-pulse" />
                        <p className="text-[10px] text-text-muted">Auto-refreshes every 20 seconds</p>
                    </div>
                </div>

                {/* ── Roster Table ── */}
                <Card className="border-none bg-surface shadow-soft">
                    <CardHeader className="pb-3 border-b border-overlay/[0.05]">
                        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                            <div className="flex-1">
                                <CardTitle className="text-sm font-semibold text-text-primary">Student Roster</CardTitle>
                                <p className="text-[11px] text-text-muted mt-0.5">
                                    {filtered.length} student{filtered.length !== 1 ? 's' : ''} shown
                                </p>
                            </div>

                            {/* Search */}
                            <div className="relative">
                                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-muted pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Search roll or name…"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                    className="pl-8 pr-3 py-1.5 text-xs bg-overlay/[0.04] border border-overlay/[0.07] rounded-lg text-text-primary placeholder:text-text-muted focus:outline-none focus:border-overlay/20 w-48"
                                />
                            </div>

                            {/* Filter tabs */}
                            <div className="flex rounded-lg bg-overlay/[0.04] border border-overlay/[0.07] p-0.5 text-xs gap-0.5">
                                {[
                                    { key: 'all',       label: 'All',       count: data.total_students },
                                    { key: 'submitted', label: 'Submitted', count: data.submitted_count },
                                    { key: 'pending',   label: 'Pending',   count: data.pending_count },
                                ].map(({ key, label, count }) => (
                                    <button
                                        key={key}
                                        onClick={() => setFilter(key)}
                                        className={`px-3 py-1 rounded-md font-medium transition-colors ${
                                            filter === key
                                                ? 'bg-overlay/[0.09] text-text-primary'
                                                : 'text-text-muted hover:text-text-primary'
                                        }`}
                                    >
                                        {label}
                                        <span className="ml-1.5 opacity-60">{count}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardHeader>

                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-overlay/[0.05]">
                                        {[
                                            { key: 'roll',         label: 'Roll No.' },
                                            { key: 'name',         label: 'Name' },
                                            { key: null,           label: 'Package' },
                                            { key: null,           label: 'Status' },
                                            { key: 'score',        label: 'Score' },
                                            { key: 'submitted_at', label: 'Submitted' },
                                        ].map(({ key, label }) => (
                                            <th
                                                key={label}
                                                onClick={key ? () => toggleSort(key) : undefined}
                                                className={`px-4 py-3 text-left font-semibold text-text-muted tracking-wide ${key ? 'cursor-pointer hover:text-text-primary select-none' : ''}`}
                                            >
                                                <span className="flex items-center gap-1">
                                                    {label}
                                                    {key && <SortIcon k={key} />}
                                                </span>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/[0.03]">
                                    {filtered.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-4 py-10 text-center text-text-muted">
                                                No students match the current filter.
                                            </td>
                                        </tr>
                                    ) : filtered.map((s) => (
                                        <tr key={s.roll} className="hover:bg-overlay/[0.02] transition-colors">
                                            {/* Roll */}
                                            <td className="px-4 py-3 font-mono font-semibold text-text-primary">
                                                {s.roll}
                                            </td>
                                            {/* Name */}
                                            <td className="px-4 py-3 max-w-[160px]">
                                                <div className="flex items-center gap-2">
                                                    {s.photo_url ? (
                                                        <img src={s.photo_url} alt="" className="h-6 w-6 rounded-full object-cover border border-overlay/10 shrink-0" />
                                                    ) : (
                                                        <div className="h-6 w-6 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-[10px] font-bold text-primary shrink-0">
                                                            {(s.name || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-text-primary truncate">{s.name}</span>
                                                </div>
                                            </td>
                                            {/* Package */}
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2 max-w-[180px]">
                                                    <span className="truncate text-text-secondary">{s.package_title}</span>
                                                    <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded border ${diffColor(s.package_difficulty)}`}>
                                                        {s.package_difficulty}
                                                    </span>
                                                </div>
                                            </td>
                                            {/* Status */}
                                            <td className="px-4 py-3">
                                                {s.status === 'submitted' ? (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-success/10 text-success border border-success/20 px-2 py-0.5 rounded">
                                                        <CheckCircle2 className="h-3 w-3" />Submitted
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-overlay/[0.05] text-text-muted border border-overlay/[0.08] px-2 py-0.5 rounded">
                                                        <Clock className="h-3 w-3" />Pending
                                                    </span>
                                                )}
                                            </td>
                                            {/* Score */}
                                            <td className="px-4 py-3">
                                                {!data.results_released ? (
                                                    <span className="text-text-muted opacity-40 text-[11px]">Not published</span>
                                                ) : s.final_score != null ? (
                                                    <div>
                                                        <span className={`font-bold tabular-nums ${scoreColor(s.final_score)}`}>
                                                            {s.final_score}%
                                                        </span>
                                                        <div className="text-[10px] text-text-muted mt-0.5 tabular-nums">
                                                            Test {fmt(s.raw_test_score, '%')} · Q {fmt(s.quality_score)}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <span className="text-text-muted">—</span>
                                                )}
                                            </td>
                                            {/* Submitted At */}
                                            <td className="px-4 py-3 text-text-muted">
                                                {s.submitted_at ? (
                                                    <div>
                                                        <p>{fmtTime(s.submitted_at)}</p>
                                                        <p className="text-[10px] opacity-60">{relTime(s.submitted_at)}</p>
                                                    </div>
                                                ) : '—'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </>
    );
}
