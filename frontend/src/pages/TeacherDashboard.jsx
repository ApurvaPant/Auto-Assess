import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import {
    PlusCircle, Users, BookOpen, ClipboardList, TrendingUp,
    ArrowUpRight, Send, Clock, CheckCircle2, FileText,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import client from '../api/client';
import { useAuth } from '../contexts/AuthContext';

// ─── Color Palette ────────────────────────────────────────────────────────────
// Score-bucket gradient: red → orange → yellow → lime → emerald
const DIST_COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#10b981'];
const DIST_LABELS = ['0-20', '21-40', '41-60', '61-80', '81-100'];

const scoreColor  = (s) => s >= 80 ? '#22c55e' : s >= 60 ? '#84cc16' : s >= 40 ? '#f59e0b' : '#ef4444';
const rateColor   = (r) => r >= 80 ? '#22c55e' : r >= 50 ? '#f59e0b' : '#ef4444';
const rateTailwind = (r) => r >= 80 ? 'text-success' : r >= 50 ? 'text-warning' : 'text-error';

// ─── Shared Tooltip ───────────────────────────────────────────────────────────
const ChartTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
        <div className="bg-surface border border-overlay/[0.1] rounded-xl px-3 py-2.5 shadow-2xl text-xs space-y-1">
            {label && <p className="text-text-muted font-semibold mb-0.5">{label}</p>}
            {payload.map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.color || p.fill }} />
                    <span className="text-text-muted">{p.name}:</span>
                    <span className="text-text-primary font-bold">{typeof p.value === 'number' ? p.value.toFixed(1) : p.value}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Stat Card ────────────────────────────────────────────────────────────────
const StatCard = ({ title, value, subtext, Icon, iconBg, iconColor }) => (
    <Card className="border-none bg-surface shadow-soft group hover:bg-overlay/[0.02] transition-all duration-200">
        <CardContent className="p-5">
            <div className="flex items-start justify-between mb-4">
                <p className="text-[11px] font-semibold text-text-muted uppercase tracking-widest">{title}</p>
                <div className={`h-7 w-7 rounded-lg flex items-center justify-center border transition-all ${iconBg}`}>
                    <Icon className={`h-3.5 w-3.5 ${iconColor}`} />
                </div>
            </div>
            <p className="text-3xl font-bold text-text-primary tracking-tight leading-none">{value}</p>
            <p className="text-[11px] text-text-muted mt-2">{subtext}</p>
        </CardContent>
    </Card>
);

// ─── Performance Chart (Avg vs Top) ──────────────────────────────────────────
const PerformanceChart = ({ data }) => {
    const hasData = data && data.length > 0;
    return (
        <Card className="border-none bg-surface shadow-soft h-full">
            <CardHeader className="pb-2 border-b border-overlay/[0.05]">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold text-text-primary">Assignment Performance</CardTitle>
                        <p className="text-xs text-text-muted mt-0.5">Avg vs top score per released assignment</p>
                    </div>
                    {hasData && (
                        <div className="flex items-center gap-4 text-[11px] text-text-muted">
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-3 rounded-sm inline-block" style={{ background: 'rgba(99,102,241,0.55)' }} />Avg
                            </span>
                            <span className="flex items-center gap-1.5">
                                <span className="h-2 w-3 rounded-sm inline-block" style={{ background: 'rgba(99,102,241,1)' }} />Top
                            </span>
                        </div>
                    )}
                </div>
            </CardHeader>
            <CardContent className="pt-4 h-[220px]">
                {!hasData ? (
                    <EmptyChart label="No published results yet" />
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data} barGap={4} barCategoryGap="38%">
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(128,128,128,0.07)" />
                            <XAxis dataKey="name" tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis domain={[0, 100]} tick={{ fill: '#71717a', fontSize: 11 }} axisLine={false} tickLine={false} width={26} />
                            <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(99,102,241,0.04)' }} />
                            <Bar dataKey="avg" fill="rgba(99,102,241,0.45)" name="Average" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="top" fill="rgba(99,102,241,0.95)" name="Top"     radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );
};

// ─── Score Distribution (Donut) ───────────────────────────────────────────────
const ScoreDistribution = ({ data }) => {
    const total = data.reduce((s, d) => s + d.count, 0);
    const hasData = total > 0;
    return (
        <Card className="border-none bg-surface shadow-soft h-full">
            <CardHeader className="pb-2 border-b border-overlay/[0.05]">
                <CardTitle className="text-sm font-semibold text-text-primary">Score Distribution</CardTitle>
                <p className="text-xs text-text-muted mt-0.5">
                    {hasData ? `${total} graded submission${total !== 1 ? 's' : ''}` : 'Awaiting graded results'}
                </p>
            </CardHeader>
            <CardContent className="pt-4">
                {!hasData ? (
                    <EmptyChart label="No released scores yet" small />
                ) : (
                    <div className="flex items-center gap-5">
                        <div className="flex-shrink-0 relative">
                            <PieChart width={110} height={110}>
                                <Pie
                                    data={data}
                                    cx={50} cy={50}
                                    innerRadius={33} outerRadius={50}
                                    dataKey="count"
                                    strokeWidth={0}
                                    paddingAngle={2}
                                >
                                    {data.map((_, i) => (
                                        <Cell key={i} fill={DIST_COLORS[i]} fillOpacity={0.85} />
                                    ))}
                                </Pie>
                                <Tooltip content={({ active, payload }) => {
                                    if (!active || !payload?.length) return null;
                                    const d = payload[0].payload;
                                    return (
                                        <div className="bg-surface border border-overlay/[0.08] rounded-xl px-2.5 py-1.5 shadow-xl text-xs">
                                            <p className="text-text-primary font-semibold">{d.range}</p>
                                            <p className="text-text-muted">{d.count} student{d.count !== 1 ? 's' : ''}</p>
                                        </div>
                                    );
                                }} />
                            </PieChart>
                            {/* Center label */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <p className="text-[11px] font-bold text-text-muted">{total}</p>
                            </div>
                        </div>
                        <div className="flex-1 space-y-2 min-w-0">
                            {data.map((d, i) => (
                                <div key={d.range} className="flex items-center gap-2">
                                    <span className="h-2 w-2 rounded-full shrink-0" style={{ background: DIST_COLORS[i] }} />
                                    <span className="text-[10px] w-12 shrink-0 text-text-muted font-medium">{DIST_LABELS[i]}</span>
                                    <div className="flex-1 h-1.5 bg-overlay/[0.06] rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-700"
                                            style={{ width: `${total ? (d.count / total) * 100 : 0}%`, background: DIST_COLORS[i] }}
                                        />
                                    </div>
                                    <span className="text-[10px] w-4 text-right shrink-0 text-text-muted tabular-nums">{d.count}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ─── Submission Rate ──────────────────────────────────────────────────────────
const SubmissionRates = ({ data }) => {
    const hasData = data && data.length > 0;
    return (
        <Card className="border-none bg-surface shadow-soft h-full">
            <CardHeader className="pb-2 border-b border-overlay/[0.05]">
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-semibold text-text-primary">Submission Rates</CardTitle>
                        <p className="text-xs text-text-muted mt-0.5">Students who submitted per assignment</p>
                    </div>
                    <Link to="/teacher/assign">
                        <button className="text-[11px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
                            Manage <ArrowUpRight className="h-3 w-3" />
                        </button>
                    </Link>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {!hasData ? (
                    <div className="py-6 text-center">
                        <p className="text-xs text-text-muted">No assignments created yet</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {data.map((item) => (
                            <div key={item.name}>
                                <div className="flex items-center justify-between mb-1.5">
                                    <span className="text-xs font-medium text-text-primary truncate max-w-[160px]">{item.name}</span>
                                    <div className="flex items-center gap-2 shrink-0 ml-2">
                                        {item.released
                                            ? <CheckCircle2 className="h-3 w-3 text-success" />
                                            : <Clock className="h-3 w-3 text-text-muted opacity-40" />
                                        }
                                        <span className="text-[11px] text-text-muted tabular-nums">{item.submitted}/{item.total}</span>
                                        <span className={`text-[11px] font-bold w-9 text-right tabular-nums ${rateTailwind(item.rate)}`}>
                                            {item.rate}%
                                        </span>
                                    </div>
                                </div>
                                <div className="h-2 bg-overlay/[0.06] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${item.rate}%`, background: rateColor(item.rate) }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

// ─── Recent Activity ──────────────────────────────────────────────────────────
const ActivityFeed = ({ items }) => (
    <Card className="border-none bg-surface shadow-soft h-full">
        <CardHeader className="pb-2 border-b border-overlay/[0.05]">
            <div className="flex items-center justify-between">
                <div>
                    <CardTitle className="text-sm font-semibold text-text-primary">Recent Submissions</CardTitle>
                    <p className="text-xs text-text-muted mt-0.5">Latest student activity</p>
                </div>
                <Link to="/teacher/results">
                    <button className="text-[11px] text-text-muted hover:text-text-primary transition-colors flex items-center gap-1">
                        View all <ArrowUpRight className="h-3 w-3" />
                    </button>
                </Link>
            </div>
        </CardHeader>
        <CardContent className="pt-2 px-0">
            {!items?.length ? (
                <div className="px-5 py-8 text-center">
                    <p className="text-xs text-text-muted">No submissions yet</p>
                </div>
            ) : (
                <div className="divide-y divide-overlay/[0.04]">
                    {items.map((item, i) => {
                        const sc = item.score;
                        const dot = sc >= 80 ? '#22c55e' : sc >= 60 ? '#84cc16' : sc >= 40 ? '#f59e0b' : '#ef4444';
                        const scText = sc >= 80 ? 'text-success' : sc >= 60 ? 'text-lime-400' : sc >= 40 ? 'text-warning' : 'text-error';
                        return (
                            <div key={i} className="flex items-center gap-3 px-5 py-3 hover:bg-overlay/[0.02] transition-colors">
                                {/* Avatar with colour ring based on score */}
                                <div
                                    className="h-7 w-7 rounded-full flex items-center justify-center text-[11px] font-bold text-surface flex-shrink-0"
                                    style={{ background: sc !== null ? dot : 'rgba(255,255,255,0.1)' }}
                                >
                                    {item.user.charAt(0).toUpperCase()}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium text-text-primary truncate">{item.user}</p>
                                    <p className="text-[11px] text-text-muted truncate">{item.action}</p>
                                </div>
                                <div className="text-right flex-shrink-0">
                                    {sc !== null ? (
                                        <p className={`text-xs font-bold tabular-nums ${scText}`}>{sc}%</p>
                                    ) : (
                                        <span className="text-[10px] font-medium bg-warning/10 text-warning border border-warning/20 px-1.5 py-0.5 rounded-md">Pending</span>
                                    )}
                                    <p className="text-[10px] text-text-muted mt-0.5">{item.time}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </CardContent>
    </Card>
);

// ─── Empty Placeholder ────────────────────────────────────────────────────────
const EmptyChart = ({ label, small }) => (
    <div className={`h-full flex flex-col items-center justify-center gap-2 ${small ? 'py-4' : ''}`}>
        <div className="flex items-end gap-1 opacity-[0.07]">
            {[28, 44, 35, 56, 40].map((h, i) => (
                <div key={i} className="w-5 rounded-t-sm" style={{ height: `${h}px`, background: DIST_COLORS[i] }} />
            ))}
        </div>
        <p className="text-[11px] text-text-muted opacity-60 mt-1">{label}</p>
    </div>
);

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function TeacherDashboard() {
    const { classroomId } = useAuth();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchStats = () => {
        client.get('/teacher/stats', { params: { classroom_id: classroomId } })
            .then(res => setStats(res.data))
            .catch((e) => console.error('Stats fetch failed:', e))
            .finally(() => setLoading(false));
    };

    useEffect(() => {
        fetchStats();
        const interval = setInterval(fetchStats, 30000);
        return () => clearInterval(interval);
    }, [classroomId]);

    const s = stats || {};
    const L = loading ? '—' : undefined;

    const avg = s.avg_score ?? 0;

    const statCards = [
        {
            title: 'Students',
            value: L ?? s.total_students ?? 0,
            subtext: 'Enrolled in system',
            Icon: Users,
            iconBg: 'bg-blue-500/10 border-blue-500/20',
            iconColor: 'text-blue-400',
        },
        {
            title: 'Total Submissions',
            value: L ?? s.total_submissions ?? 0,
            subtext: 'Across all assignments',
            Icon: Send,
            iconBg: 'bg-violet-500/10 border-violet-500/20',
            iconColor: 'text-violet-400',
        },
        {
            title: 'Question Packages',
            value: L ?? s.total_questions ?? 0,
            subtext: 'AI-generated',
            Icon: BookOpen,
            iconBg: 'bg-teal-500/10 border-teal-500/20',
            iconColor: 'text-teal-400',
        },
        {
            title: 'Pending Release',
            value: L ?? s.pending_assignments ?? 0,
            subtext: 'Results not published yet',
            Icon: Clock,
            iconBg: 'bg-amber-500/10 border-amber-500/20',
            iconColor: 'text-amber-400',
        },
        {
            title: 'Avg. Score',
            value: L ?? (avg > 0 ? `${avg}%` : 'N/A'),
            subtext: 'From released results',
            Icon: TrendingUp,
            iconBg: avg >= 70 ? 'bg-success/10 border-success/20' : avg >= 40 ? 'bg-warning/10 border-warning/20' : 'bg-error/10 border-error/20',
            iconColor: avg >= 70 ? 'text-success' : avg >= 40 ? 'text-warning' : 'text-error',
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-500">

            {/* Stat Cards */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-5">
                {statCards.map((card) => (
                    <StatCard key={card.title} {...card} />
                ))}
            </div>

            {/* Row 2: Performance + Distribution */}
            <div className="grid gap-4 lg:grid-cols-5">
                <div className="lg:col-span-3">
                    <PerformanceChart data={s.chart_data || []} />
                </div>
                <div className="lg:col-span-2">
                    <ScoreDistribution data={s.score_distribution || [
                        { range: '0-20',   count: 0 },
                        { range: '21-40',  count: 0 },
                        { range: '41-60',  count: 0 },
                        { range: '61-80',  count: 0 },
                        { range: '81-100', count: 0 },
                    ]} />
                </div>
            </div>

            {/* Row 3: Submission Rates + Activity */}
            <div className="grid gap-4 lg:grid-cols-2">
                <SubmissionRates data={s.submission_rates || []} />
                <ActivityFeed items={s.recent_activity || []} />
            </div>

            {/* Quick Links */}
            <div className="grid gap-3 sm:grid-cols-3">
                {[
                    { label: 'Generate Questions', desc: 'Create AI-powered packages',      to: '/teacher/generate', Icon: PlusCircle,   accent: 'group-hover:text-teal-400',   ring: 'group-hover:border-teal-500/25   group-hover:bg-teal-500/5'   },
                    { label: 'Manage Assignments', desc: 'Assign packages to students',      to: '/teacher/assign',   Icon: ClipboardList, accent: 'group-hover:text-violet-400', ring: 'group-hover:border-violet-500/25 group-hover:bg-violet-500/5' },
                    { label: 'Review Results',     desc: 'Grade and publish student scores', to: '/teacher/results',  Icon: FileText,      accent: 'group-hover:text-blue-400',   ring: 'group-hover:border-blue-500/25   group-hover:bg-blue-500/5'   },
                ].map(({ label, desc, to, Icon, accent, ring }) => (
                    <Link key={label} to={to}>
                        <div className={`group flex items-center justify-between p-4 rounded-xl bg-surface border border-overlay/[0.05] transition-all duration-150 cursor-pointer ${ring}`}>
                            <div className="flex items-center gap-3">
                                <div className={`h-7 w-7 rounded-lg bg-overlay/[0.04] border border-overlay/[0.07] flex items-center justify-center text-text-muted transition-colors ${accent}`}>
                                    <Icon className="h-3.5 w-3.5" />
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-text-primary">{label}</p>
                                    <p className="text-[11px] text-text-muted mt-0.5">{desc}</p>
                                </div>
                            </div>
                            <ArrowUpRight className={`h-4 w-4 text-text-muted transition-colors flex-shrink-0 ml-2 ${accent}`} />
                        </div>
                    </Link>
                ))}
            </div>
        </div>
    );
}
