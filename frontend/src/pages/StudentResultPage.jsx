import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudentResult, getStudentAnalysis } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
    ArrowLeft, CheckCircle, XCircle, Sparkles, ThumbsUp,
    Lightbulb, Target, AlertCircle, BookOpen, Code2,
    TrendingUp, Info, LogOut, Zap, Star, Shield, ChevronDown, Terminal
} from 'lucide-react';

/* ─── Score ring ─────────────────────────────────────────────────────────── */
const ScoreRing = ({ score, size = 120 }) => {
    const radius = 45;
    const circumference = 2 * Math.PI * radius;
    const filled = circumference - (score / 100) * circumference;
    const color = score >= 80 ? '#22c55e' : score >= 50 ? '#f59e0b' : '#ef4444';
    return (
        <svg width={size} height={size} viewBox="0 0 100 100" className="-rotate-90">
            <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(128,128,128,0.12)" strokeWidth="8" />
            <circle cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="8"
                strokeDasharray={circumference} strokeDashoffset={filled} strokeLinecap="round"
                style={{ transition: 'stroke-dashoffset 1.2s ease' }} />
        </svg>
    );
};

/* ─── Expandable test case row ───────────────────────────────────────────── */
const TestCaseRow = ({ index, result }) => {
    const [open, setOpen] = useState(false);
    const hasDetails = true;

    return (
        <div className={`rounded-xl border overflow-hidden transition-colors ${result.passed ? 'border-success/15 bg-success/[0.02]' : 'border-error/15 bg-error/[0.02]'}`}>
            <button
                type="button"
                onClick={() => hasDetails && setOpen(o => !o)}
                className={`w-full flex items-center justify-between px-3.5 py-3 text-left transition-colors ${hasDetails ? 'hover:bg-overlay/[0.03] cursor-pointer' : 'cursor-default'}`}
            >
                <div className="flex items-center gap-3">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${result.passed ? 'bg-success/15 text-success' : 'bg-error/15 text-error'}`}>
                        {result.passed ? <CheckCircle className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-text-primary leading-none">Test {index + 1}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2.5">
                    <span className={`text-[10px] font-black uppercase tracking-widest ${result.passed ? 'text-success' : 'text-error'}`}>
                        {result.passed ? 'PASS' : 'FAIL'}
                    </span>
                    {hasDetails && (
                        <ChevronDown className={`h-3.5 w-3.5 text-text-muted transition-transform duration-150 ${open ? 'rotate-180' : ''}`} />
                    )}
                </div>
            </button>

            {open && hasDetails && (
                <div className="border-t border-overlay/[0.06] px-3.5 pb-4 pt-3 space-y-3">
                    {/* Input */}
                    {result.input != null && (
                        <div>
                            <p className="text-[10px] font-semibold text-text-muted uppercase tracking-widest mb-1.5">Input</p>
                            <pre className="bg-overlay/[0.04] border border-overlay/[0.06] rounded-lg px-3 py-2.5 text-xs font-mono text-text-secondary whitespace-pre-wrap break-all leading-relaxed">
                                {result.input || '(none)'}
                            </pre>
                        </div>
                    )}

                    {/* Expected */}
                    {result.expected != null && (
                        <div>
                            <p className="text-[10px] font-semibold text-success/80 uppercase tracking-widest mb-1.5">Expected</p>
                            <pre className="bg-success/[0.04] border border-success/10 rounded-lg px-3 py-2.5 text-xs font-mono text-success/90 whitespace-pre-wrap break-all leading-relaxed">
                                {result.expected || '(empty)'}
                            </pre>
                        </div>
                    )}

                    {/* Actual output */}
                    <div>
                        <p className={`text-[10px] font-semibold uppercase tracking-widest mb-1.5 ${result.passed ? 'text-success/80' : 'text-error/80'}`}>
                            Your Output
                        </p>
                        <pre className={`rounded-lg px-3 py-2.5 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed border ${
                            result.passed
                                ? 'bg-success/[0.04] border-success/10 text-success/90'
                                : 'bg-error/[0.04] border-error/10 text-error/90'
                        }`}>
                            {result.stdout
                                ? result.stdout
                                : result.passed
                                    ? '(empty output — matched expected)'
                                    : '(no output)'}
                        </pre>
                    </div>

                    {/* Stderr */}
                    {result.stderr && (
                        <div>
                            <p className="text-[10px] font-semibold text-warning/80 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                <Terminal className="h-2.5 w-2.5" /> Error
                            </p>
                            <pre className="bg-warning/[0.04] border border-warning/10 rounded-lg px-3 py-2.5 text-xs font-mono text-warning/80 whitespace-pre-wrap break-all leading-relaxed">
                                {result.stderr}
                            </pre>
                        </div>
                    )}

                    {/* AI explanation */}
                    {result.explanation && (
                        <div className="flex gap-2 pt-0.5">
                            <Info className="h-3 w-3 text-text-muted shrink-0 mt-0.5" />
                            <p className="text-[11px] text-text-muted leading-relaxed italic">{result.explanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function StudentResultPage() {
    const { assignment_id } = useParams();
    const navigate = useNavigate();
    const [submission, setSubmission] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzingLoading, setAnalyzingLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) { toast.error("Not authorized"); navigate('/student', { replace: true }); return; }
        if (!assignment_id) return;
        getStudentResult(assignment_id)
            .then(r => setSubmission(r.data))
            .catch(e => toast.error(e.response?.data?.detail || "Could not load your result."))
            .finally(() => setLoading(false));
    }, [assignment_id, navigate]);

    const handleAnalyze = async () => {
        setAnalyzingLoading(true);
        try {
            const res = await getStudentAnalysis(assignment_id);
            setAnalysis(res.data);
            toast.success("AI Analysis ready!");
            setTimeout(() => document.getElementById('ai-analysis')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);
        } catch (e) {
            toast.error(e.response?.data?.detail || "Failed to generate analysis");
        } finally {
            setAnalyzingLoading(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('studentAuthToken');
        toast.success("Logged out successfully");
        navigate('/student');
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background gap-4">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            <p className="text-text-muted text-sm">Loading your results…</p>
        </div>
    );

    if (!submission) return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-text-muted gap-4">
            <AlertCircle className="h-12 w-12 opacity-50" />
            <p className="text-lg font-semibold">Could not load your submission.</p>
            <Link to="/student/dashboard"><Button variant="outline">Back to Dashboard</Button></Link>
        </div>
    );

    const passedTests = submission.test_results?.filter(r => r.passed).length || 0;
    const totalTests = submission.test_results?.length || 0;
    const passRate = totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0;
    const score = submission.final_score ?? 0;
    const scoreColor = score >= 80 ? 'text-success' : score >= 50 ? 'text-warning' : 'text-error';
    const istDate = new Date(submission.submitted_at).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric',
        hour: '2-digit', minute: '2-digit', hour12: true,
    });

    return (
        <div className="min-h-screen bg-background">
            {/* Sticky top bar */}
            <div className="sticky top-0 z-50 bg-background/80 backdrop-blur-xl border-b border-overlay/[0.06]">
                <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link to="/student/dashboard">
                            <Button variant="ghost" size="icon" className="rounded-xl h-9 w-9 bg-overlay/[0.05] hover:bg-overlay/10">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                                Assignment #{assignment_id}
                            </Badge>
                            {score >= 90 && (
                                <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 text-xs">
                                    <Star className="h-3 w-3 mr-1" /> Top Performer
                                </Badge>
                            )}
                        </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={handleLogout}
                        className="text-error/70 hover:text-error hover:bg-error/10 border border-transparent hover:border-error/20 transition-all">
                        <LogOut className="h-4 w-4 mr-2" /> Log Out
                    </Button>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-4 sm:px-6 py-7 space-y-6">

                {/* ── Hero ─────────────────────────────────────────────────── */}
                <div className="rounded-2xl border border-overlay/[0.08] bg-surface p-5 sm:p-7 flex flex-col sm:flex-row items-center gap-7">
                    <div className="relative shrink-0">
                        <ScoreRing score={score} size={120} />
                        <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className={`text-3xl font-black ${scoreColor}`}>{score.toFixed(0)}%</span>
                            <span className="text-[10px] text-text-muted uppercase tracking-widest mt-0.5">Score</span>
                        </div>
                    </div>
                    <div className="text-center sm:text-left flex-1">
                        <h1 className="text-xl font-bold text-text-primary tracking-tight">Performance Report</h1>
                        <p className="text-text-muted text-xs mt-0.5">Submitted {istDate} IST</p>
                        <div className="flex flex-wrap gap-2.5 mt-4 justify-center sm:justify-start">
                            {[
                                { label: 'Tests Passed', value: `${passedTests}/${totalTests}`, hi: passedTests === totalTests },
                                { label: 'Code Quality', value: `${submission.quality_score}/100` },
                                { label: 'Error Penalty', value: `-${submission.error_penalty}`, warn: true },
                                { label: 'Pass Rate', value: `${passRate}%`, hi: passRate === 100 },
                            ].map(({ label, value, hi, warn }) => (
                                <div key={label} className={`px-3.5 py-2 rounded-xl border text-center ${hi ? 'bg-success/5 border-success/15' : warn ? 'bg-error/5 border-error/15' : 'bg-overlay/[0.04] border-overlay/[0.08]'}`}>
                                    <p className="text-[10px] text-text-muted">{label}</p>
                                    <p className={`text-base font-bold mt-0.5 ${hi ? 'text-success' : warn ? 'text-error' : 'text-text-primary'}`}>{value}</p>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Main grid ────────────────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                    {/* Left — AI Analysis + Code */}
                    <div className="lg:col-span-3 space-y-5">

                        {/* AI Analysis */}
                        <div id="ai-analysis">
                            {analysis ? (
                                <Card className="border border-overlay/[0.08] bg-surface shadow-soft overflow-hidden animate-in zoom-in-95 duration-300">
                                    <CardHeader className="border-b border-overlay/[0.06] bg-overlay/[0.02] py-3.5 px-5">
                                        <div className="flex items-center justify-between">
                                            <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-primary" /> AI Learning Insights
                                            </CardTitle>
                                            <Badge className="bg-primary/10 text-primary border-primary/20 text-xs">Personalized</Badge>
                                        </div>
                                    </CardHeader>
                                    <CardContent className="p-5 space-y-5">
                                        {analysis.educational_note && (
                                            <div className="bg-overlay/[0.03] border border-overlay/[0.06] rounded-xl p-4 relative overflow-hidden">
                                                <div className="absolute top-3 right-3 opacity-5">
                                                    <BookOpen className="h-10 w-10" />
                                                </div>
                                                <h4 className="text-[10px] font-bold text-text-muted mb-2 flex items-center gap-1.5 uppercase tracking-widest">
                                                    <Info className="h-3 w-3 text-primary" /> Concept Overview
                                                </h4>
                                                <p className="text-sm text-text-secondary leading-relaxed italic pr-6">
                                                    "{analysis.educational_note}"
                                                </p>
                                            </div>
                                        )}

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-2.5">
                                                <h5 className="text-[10px] font-bold text-success flex items-center gap-1.5 uppercase tracking-widest">
                                                    <ThumbsUp className="h-3 w-3" /> What Went Well
                                                </h5>
                                                {analysis.strong_points?.map((p, i) => (
                                                    <div key={i} className="flex gap-2 items-start bg-success/[0.04] border border-success/[0.08] rounded-xl p-3">
                                                        <CheckCircle className="h-3.5 w-3.5 text-success mt-0.5 shrink-0" />
                                                        <span className="text-xs text-text-secondary leading-snug">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="space-y-2.5">
                                                <h5 className="text-[10px] font-bold text-warning flex items-center gap-1.5 uppercase tracking-widest">
                                                    <Lightbulb className="h-3 w-3" /> Areas to Improve
                                                </h5>
                                                {analysis.weak_points?.map((p, i) => (
                                                    <div key={i} className="flex gap-2 items-start bg-warning/[0.04] border border-warning/[0.08] rounded-xl p-3">
                                                        <AlertCircle className="h-3.5 w-3.5 text-warning mt-0.5 shrink-0" />
                                                        <span className="text-xs text-text-secondary leading-snug">{p}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        <hr className="border-overlay/[0.06]" />

                                        <div className="space-y-2.5">
                                            <h5 className="text-[10px] font-bold text-text-primary flex items-center gap-1.5 uppercase tracking-widest">
                                                <Zap className="h-3 w-3 text-secondary" /> Next Steps
                                            </h5>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                                {analysis.suggestions?.map((s, i) => (
                                                    <div key={i} className="bg-overlay/[0.03] border border-overlay/[0.06] p-3.5 rounded-xl flex items-start gap-3">
                                                        <div className="w-5 h-5 rounded-full bg-secondary/15 flex items-center justify-center text-secondary font-bold text-[10px] shrink-0 mt-0.5">
                                                            {i + 1}
                                                        </div>
                                                        <span className="text-xs text-text-muted leading-snug">{s}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>

                                        {analysis.key_concepts?.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 pt-1">
                                                {analysis.key_concepts.map((c, i) => (
                                                    <span key={i} className="px-2.5 py-1 rounded-full bg-overlay/[0.04] border border-overlay/[0.07] text-[10px] font-bold text-text-muted uppercase tracking-widest">
                                                        #{c}
                                                    </span>
                                                ))}
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ) : (
                                <Card className="border border-overlay/[0.08] bg-surface overflow-hidden">
                                    <CardContent className="py-10 flex flex-col items-center text-center space-y-4">
                                        <div className="w-16 h-16 rounded-2xl bg-primary/[0.08] border border-primary/[0.12] flex items-center justify-center text-primary">
                                            <Sparkles className="h-8 w-8" />
                                        </div>
                                        <div className="max-w-xs">
                                            <h3 className="text-base font-bold text-text-primary">Get AI Analysis</h3>
                                            <p className="text-sm text-text-muted mt-1.5 leading-relaxed">
                                                Personalized breakdown — what you did well, where to improve, and concrete next steps.
                                            </p>
                                        </div>
                                        <Button onClick={handleAnalyze} disabled={analyzingLoading} className="px-7 h-10 font-semibold">
                                            {analyzingLoading ? (
                                                <span className="flex items-center gap-2">
                                                    <div className="h-3.5 w-3.5 border-2 border-overlay/40 border-t-white rounded-full animate-spin" />
                                                    Analyzing…
                                                </span>
                                            ) : (
                                                <span className="flex items-center gap-2">
                                                    <Sparkles className="h-4 w-4" /> Generate Analysis
                                                </span>
                                            )}
                                        </Button>
                                    </CardContent>
                                </Card>
                            )}
                        </div>

                        {/* Code Snapshot */}
                        <Card className="border border-overlay/[0.08] bg-surface overflow-hidden">
                            <CardHeader className="border-b border-overlay/[0.06] flex flex-row items-center justify-between bg-overlay/[0.02] px-5 py-3">
                                <CardTitle className="text-xs font-bold text-text-primary flex items-center gap-2">
                                    <Code2 className="h-4 w-4 text-secondary" /> Your Submission
                                </CardTitle>
                                <Badge variant="ghost" className="text-[10px] text-text-muted">Python</Badge>
                            </CardHeader>
                            <CardContent className="p-0">
                                <pre className="p-5 bg-black/30 text-text-primary font-mono text-xs overflow-x-auto max-h-[380px] leading-relaxed scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                                    <code>{submission.code}</code>
                                </pre>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Right — Test Cases + Error Profile + Quality */}
                    <div className="lg:col-span-2 space-y-5">

                        {/* Test Cases */}
                        <Card className="border border-overlay/[0.08] bg-surface overflow-hidden">
                            <CardHeader className="border-b border-overlay/[0.06] bg-overlay/[0.02] px-5 py-3">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                                        <Target className="h-4 w-4 text-primary" /> Test Cases
                                    </CardTitle>
                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-lg ${passedTests === totalTests ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                                        {passedTests}/{totalTests} passed
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2">
                                {submission.test_results?.map((res, i) => (
                                    <TestCaseRow key={i} index={i} result={res} />
                                ))}
                                {(!submission.test_results || submission.test_results.length === 0) && (
                                    <p className="text-xs text-text-muted text-center py-6">No test results available.</p>
                                )}
                                <p className="text-[10px] text-text-muted text-center pt-1 pb-0.5">
                                    Tap any test case to see details
                                </p>
                            </CardContent>
                        </Card>

                        {/* Error Profile */}
                        <Card className="border border-overlay/[0.08] bg-surface overflow-hidden">
                            <CardHeader className="border-b border-overlay/[0.06] bg-overlay/[0.02] px-5 py-3">
                                <CardTitle className="text-xs font-bold flex items-center gap-2">
                                    <Shield className="h-4 w-4 text-warning" /> Error Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4">
                                {Object.keys(submission.error_counts || {}).length > 0 ? (
                                    <div className="space-y-2.5">
                                        {Object.entries(submission.error_counts).map(([errorType, count]) => (
                                            <div key={errorType} className="bg-overlay/[0.03] border border-overlay/[0.06] rounded-xl p-3.5 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-error" />
                                                        <span className="text-xs font-semibold text-text-primary">{errorType.replace(/_/g, ' ')}</span>
                                                    </div>
                                                    <Badge variant="outline" className="text-[10px] border-error/25 text-error px-2 py-0.5">×{count}</Badge>
                                                </div>
                                                <p className="text-[11px] text-text-muted leading-relaxed">
                                                    {errorType === 'wrong_output' && 'Output did not match expected — check your logic.'}
                                                    {errorType === 'runtime_error' && 'Runtime error encountered — review your code for crashes.'}
                                                    {errorType === 'compile_error' && 'Syntax or import error — fix before re-submitting.'}
                                                    {errorType === 'timeout' && 'Execution timed out — optimize your algorithm.'}
                                                    {!['wrong_output', 'runtime_error', 'compile_error', 'timeout'].includes(errorType) && `Frequent ${errorType}s detected.`}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-7 space-y-2.5">
                                        <div className="w-10 h-10 rounded-full bg-success/10 flex items-center justify-center mx-auto">
                                            <CheckCircle className="h-5 w-5 text-success" />
                                        </div>
                                        <p className="text-sm font-semibold text-success">Zero Errors</p>
                                        <p className="text-[11px] text-text-muted">Perfect execution flow!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Quality Comments */}
                        {submission.quality_comments?.length > 0 && (
                            <Card className="border border-overlay/[0.08] bg-surface overflow-hidden">
                                <CardHeader className="border-b border-overlay/[0.06] bg-overlay/[0.02] px-5 py-3">
                                    <CardTitle className="text-xs font-bold flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-secondary" /> Code Quality
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="p-4 space-y-2">
                                    {submission.quality_comments.map((comment, i) => (
                                        <div key={i} className="flex gap-2.5 items-start p-3 rounded-xl bg-overlay/[0.03] border border-overlay/[0.06]">
                                            <Info className="h-3.5 w-3.5 text-secondary mt-0.5 shrink-0" />
                                            <span className="text-xs text-text-muted leading-snug">{comment}</span>
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
