import { useEffect, useState } from 'react';
import { getAssignments, getResults, releaseResults, getCodeAnalysis, getPlagiarismReport, getAIDetection } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Select } from '../../components/ui/Select';
import { X, Eye, BarChart3, Sparkles, ThumbsUp, ThumbsDown, Lightbulb, ShieldAlert, ShieldCheck, AlertTriangle, Loader2, BotMessageSquare } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const VERDICT_STYLE = {
    likely_human: { color: 'text-success', bar: 'bg-success', label: 'Likely Human' },
    possibly_ai:  { color: 'text-warning', bar: 'bg-warning', label: 'Possibly AI-Generated' },
    likely_ai:    { color: 'text-error',   bar: 'bg-error',   label: 'Likely AI-Generated' },
    unknown:      { color: 'text-text-muted', bar: 'bg-overlay/20', label: 'Unknown' },
};

const SubmissionModal = ({ submission, onClose, analysisCache, onCacheUpdate, aiDetectCache, onAIDetectUpdate }) => {
    const cached = submission ? analysisCache[submission.id] : null;
    const [analysis, setAnalysis] = useState(cached ?? null);
    const [analyzing, setAnalyzing] = useState(false);

    const cachedAI = submission ? aiDetectCache[submission.id] : null;
    const [aiDetect, setAiDetect] = useState(cachedAI ?? null);
    const [detectingAI, setDetectingAI] = useState(false);

    const runAnalysis = async () => {
        if (!submission?.id) return;
        setAnalyzing(true);
        try {
            const res = await getCodeAnalysis(submission.id);
            setAnalysis(res.data);
            onCacheUpdate(submission.id, res.data);
        } catch (error) {
            toast.error("Failed to analyze code");
        } finally {
            setAnalyzing(false);
        }
    };

    const runAIDetect = async () => {
        if (!submission?.id) return;
        setDetectingAI(true);
        try {
            const res = await getAIDetection(submission.id);
            setAiDetect(res.data);
            onAIDetectUpdate(submission.id, res.data);
        } catch (error) {
            toast.error("Failed to run AI detection");
        } finally {
            setDetectingAI(false);
        }
    };

    if (!submission) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="max-w-3xl w-full max-h-[85vh] overflow-y-auto border-none shadow-2xl bg-surface scrollbar-thin scrollbar-thumb-overlay/20 scrollbar-track-transparent">
                <CardHeader className="border-b border-overlay/5 flex flex-row items-center justify-between">
                    <div className="flex items-center gap-3">
                        {submission.student_photo_url ? (
                            <img src={submission.student_photo_url} alt="" className="w-10 h-10 rounded-full object-cover border border-overlay/10 shrink-0" />
                        ) : (
                            <div className="w-10 h-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-sm font-bold text-primary">
                                {(submission.student_name || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <CardTitle className="text-xl text-primary">{submission.student_name || `Student #${submission.student_id}`}</CardTitle>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-overlay/10 transition-colors">
                        <X className="h-5 w-5 text-text-muted" />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Submitted Code</label>
                        <pre className="bg-background/50 border border-overlay/10 p-4 rounded-lg text-sm overflow-x-auto text-text-primary font-mono max-h-48">{submission.code}</pre>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">{submission.raw_test_score.toFixed(1)}</p>
                            <p className="text-xs text-text-muted">Test Score</p>
                        </div>
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-text-primary">{submission.quality_score}</p>
                            <p className="text-xs text-text-muted">Quality</p>
                        </div>
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-error">{submission.error_penalty}</p>
                            <p className="text-xs text-text-muted">Penalty</p>
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="border-t border-overlay/5 pt-4">
                        {!analysis ? (
                            <Button onClick={runAnalysis} disabled={analyzing} className="w-full">
                                <Sparkles className="h-4 w-4 mr-2" />
                                {analyzing ? "Analyzing..." : "Analyze with AI"}
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> AI Code Analysis
                                </h4>

                                <div className="bg-success/10 border border-success/20 rounded-lg p-3">
                                    <h5 className="text-xs font-semibold text-success flex items-center gap-1 mb-2">
                                        <ThumbsUp className="h-3 w-3" /> Strong Points
                                    </h5>
                                    <ul className="space-y-1">
                                        {analysis.strong_points?.map((point, i) => (
                                            <li key={i} className="text-xs text-text-muted">• {point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-error/10 border border-error/20 rounded-lg p-3">
                                    <h5 className="text-xs font-semibold text-error flex items-center gap-1 mb-2">
                                        <ThumbsDown className="h-3 w-3" /> Areas for Improvement
                                    </h5>
                                    <ul className="space-y-1">
                                        {analysis.weak_points?.map((point, i) => (
                                            <li key={i} className="text-xs text-text-muted">• {point}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
                                    <h5 className="text-xs font-semibold text-warning flex items-center gap-1 mb-2">
                                        <Lightbulb className="h-3 w-3" /> Suggestions
                                    </h5>
                                    <ul className="space-y-1">
                                        {analysis.suggestions?.map((suggestion, i) => (
                                            <li key={i} className="text-xs text-text-muted">• {suggestion}</li>
                                        ))}
                                    </ul>
                                </div>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={runAnalysis}
                                    disabled={analyzing}
                                    className="w-full text-text-muted hover:text-primary border border-overlay/10"
                                >
                                    <Sparkles className="h-3.5 w-3.5 mr-2" />
                                    {analyzing ? "Re-analyzing..." : "Re-analyze"}
                                </Button>
                            </div>
                        )}
                    </div>

                    {/* AI Content Detection Section */}
                    <div className="border-t border-overlay/5 pt-4">
                        {!aiDetect ? (
                            <Button onClick={runAIDetect} disabled={detectingAI} variant="outline" className="w-full border-warning/20 text-warning hover:bg-warning/10">
                                <BotMessageSquare className="h-4 w-4 mr-2" />
                                {detectingAI ? "Detecting..." : "Check AI-Generated Content"}
                            </Button>
                        ) : (() => {
                            const s = VERDICT_STYLE[aiDetect.verdict] ?? VERDICT_STYLE.unknown;
                            return (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                            <BotMessageSquare className="h-4 w-4 text-warning" /> AI Content Detection
                                        </h4>
                                        <span className={`text-xs font-bold ${s.color}`}>{s.label}</span>
                                    </div>

                                    {/* Likelihood bar */}
                                    <div>
                                        <div className="flex justify-between text-xs text-text-muted mb-1">
                                            <span>AI Likelihood</span>
                                            <span className={`font-bold ${s.color}`}>{aiDetect.ai_likelihood}%</span>
                                        </div>
                                        <div className="w-full h-2 bg-overlay/10 rounded-full overflow-hidden">
                                            <div
                                                className={`h-full rounded-full transition-all duration-500 ${s.bar}`}
                                                style={{ width: `${aiDetect.ai_likelihood}%` }}
                                            />
                                        </div>
                                    </div>

                                    <p className="text-xs text-text-muted italic">{aiDetect.explanation}</p>

                                    {aiDetect.indicators?.length > 0 && (
                                        <div className="bg-overlay/[0.03] border border-overlay/[0.07] rounded-lg p-3">
                                            <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Indicators</p>
                                            <ul className="space-y-1">
                                                {aiDetect.indicators.map((ind, i) => (
                                                    <li key={i} className="text-xs text-text-muted">• {ind}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={runAIDetect}
                                        disabled={detectingAI}
                                        className="w-full text-text-muted hover:text-warning border border-overlay/10"
                                    >
                                        <BotMessageSquare className="h-3.5 w-3.5 mr-2" />
                                        {detectingAI ? "Re-detecting..." : "Re-check"}
                                    </Button>
                                </div>
                            );
                        })()}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

const RISK_STYLE = {
    high:    { bg: 'bg-error/10 border-error/20',    text: 'text-error',   icon: ShieldAlert,  label: 'High Risk'   },
    medium:  { bg: 'bg-warning/10 border-warning/20', text: 'text-warning', icon: AlertTriangle, label: 'Medium Risk' },
    low:     { bg: 'bg-success/10 border-success/20', text: 'text-success', icon: ShieldCheck,  label: 'Low Risk'   },
    none:    { bg: 'bg-success/10 border-success/20', text: 'text-success', icon: ShieldCheck,  label: 'Clean'      },
    unknown: { bg: 'bg-overlay/5 border-overlay/10',      text: 'text-text-muted', icon: ShieldAlert, label: 'Unknown'  },
};

const PlagiarismPanel = ({ assignmentId }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);

    const runCheck = async () => {
        setLoading(true);
        try {
            const res = await getPlagiarismReport(assignmentId);
            setReport(res.data);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Plagiarism check failed.');
        } finally {
            setLoading(false);
        }
    };

    const style = report ? (RISK_STYLE[report.risk_level] ?? RISK_STYLE.unknown) : null;

    return (
        <Card className="border-none shadow-soft bg-surface">
            <CardHeader className="border-b border-overlay/5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-warning" />
                        <CardTitle className="text-text-primary">Plagiarism Check</CardTitle>
                    </div>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={runCheck}
                        disabled={loading}
                        className="gap-1.5"
                    >
                        {loading
                            ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analysing…</>
                            : <><Sparkles className="h-3.5 w-3.5" /> {report ? 'Re-run' : 'Run Check'}</>
                        }
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="pt-4">
                {!report && !loading && (
                    <p className="text-sm text-text-muted text-center py-4">
                        Click <strong>Run Check</strong> to analyse all submissions for plagiarism.
                    </p>
                )}
                {loading && (
                    <div className="flex items-center justify-center gap-3 py-6 text-text-muted">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        <span className="text-sm">Comparing submissions with AI…</span>
                    </div>
                )}
                {report && !loading && (
                    <div className="space-y-4">
                        {/* Overall verdict */}
                        <div className={`flex items-center gap-3 p-3 rounded-lg border ${style.bg}`}>
                            <style.icon className={`h-5 w-5 flex-shrink-0 ${style.text}`} />
                            <div>
                                <p className={`text-sm font-semibold ${style.text}`}>{style.label}</p>
                                <p className="text-xs text-text-muted mt-0.5">{report.summary}</p>
                            </div>
                        </div>

                        {/* Flagged pairs */}
                        {report.flagged_pairs?.length > 0 ? (
                            <div className="space-y-2">
                                <p className="text-xs text-text-muted uppercase tracking-wider font-medium">Flagged Pairs</p>
                                {report.flagged_pairs.map((pair, i) => (
                                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-error/5 border border-error/15">
                                        <AlertTriangle className="h-4 w-4 text-error flex-shrink-0 mt-0.5" />
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-sm font-semibold text-text-primary font-mono">
                                                    {pair.student_a || `#${pair.student_id_a}`} ↔ {pair.student_b || `#${pair.student_id_b}`}
                                                </span>
                                                <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                                                    pair.similarity_score >= 85 ? 'bg-error/20 text-error'
                                                    : pair.similarity_score >= 70 ? 'bg-warning/20 text-warning'
                                                    : 'bg-overlay/10 text-text-muted'
                                                }`}>
                                                    {pair.similarity_score}% similar
                                                </span>
                                            </div>
                                            <p className="text-xs text-text-muted mt-1">{pair.reason}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-success text-center py-2">No suspicious pairs detected.</p>
                        )}
                    </div>
                )}
            </CardContent>
        </Card>
    );
};

export default function ViewResults() {
    const { classroomId } = useAuth();
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);

    const [analysisCache, setAnalysisCache] = useState({});
    const [aiDetectCache, setAiDetectCache] = useState({});

    const [alpha, setAlpha] = useState(0.6);
    const [beta, setBeta] = useState(0.4);
    const [gamma, setGamma] = useState(10.0);

    const currentAssignment = assignments.find(a => a.id === parseInt(selectedAssignment, 10));

    useEffect(() => {
        getAssignments(classroomId).then(res => {
            setAssignments(res.data);
            if (res.data.length > 0) setSelectedAssignment(res.data[0].id);
        });
    }, [classroomId]);

    useEffect(() => {
        if (selectedAssignment) {
            setLoading(true);
            getResults(selectedAssignment)
                .then(res => setResults(res.data))
                .catch(() => toast.error("Failed to load results"))
                .finally(() => setLoading(false));
        }
    }, [selectedAssignment]);

    const handleReleaseResults = async () => {
        if (!currentAssignment) return;
        if (!window.confirm(`Release results with weights?\nTest: ${alpha}\nQuality: ${beta}\nPenalty: ${gamma}`)) return;

        setIsReleasing(true);
        try {
            await releaseResults(currentAssignment.id, alpha, beta, gamma);
            toast.success("Results released!");
            setAssignments(prev => prev.map(a => a.id === currentAssignment.id ? { ...a, results_released: true } : a));
            const res = await getResults(currentAssignment.id);
            setResults(res.data);
        } catch (error) {
            toast.error("Failed to release.");
        } finally {
            setIsReleasing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary">Result Manager</h1>
                    <p className="text-text-muted mt-1">Review submissions and publish grades.</p>
                </div>
                <div className="w-56 shrink-0">
                    <Select
                        value={selectedAssignment}
                        onChange={(e) => setSelectedAssignment(e.target.value)}
                    >
                        <option disabled value="">Select Assignment</option>
                        {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </Select>
                </div>
            </div>

            {currentAssignment && !currentAssignment.results_released && (
                <Card className="border-none shadow-soft bg-surface">
                    <CardHeader className="border-b border-overlay/5">
                        <div className="flex items-center gap-2">
                            <BarChart3 className="h-5 w-5 text-primary" />
                            <CardTitle className="text-text-primary">Grading Configuration</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Test Priority ({alpha})</label>
                                <input type="range" min="0" max="1" step="0.1" value={alpha} onChange={(e) => { const val = parseFloat(e.target.value); setAlpha(val); setBeta(parseFloat((1 - val).toFixed(1))); }} className="w-full accent-primary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Quality Priority ({beta})</label>
                                <input type="range" min="0" max="1" step="0.1" value={beta} disabled className="w-full opacity-50 accent-secondary" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-muted mb-2">Error Penalty ({gamma})</label>
                                <input type="range" min="0" max="50" step="5" value={gamma} onChange={(e) => setGamma(parseFloat(e.target.value))} className="w-full accent-error" />
                            </div>
                        </div>
                        <div className="mt-6 flex justify-end">
                            <Button onClick={handleReleaseResults} disabled={isReleasing} className="bg-success hover:bg-success/90">
                                {isReleasing ? "Publishing..." : "Publish Results"}
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {currentAssignment && currentAssignment.results_released && (
                <div className="bg-success/10 text-success p-4 rounded-lg text-center font-bold border border-success/20">
                    ✓ Results Published
                </div>
            )}

            <Card className="border-none shadow-soft bg-surface overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="text-left text-xs uppercase tracking-wider text-text-muted bg-surface-dark/50">
                                <th className="px-6 py-4 font-medium">Student</th>
                                <th className="px-6 py-4 font-medium">Test Score</th>
                                <th className="px-6 py-4 font-medium">Quality</th>
                                <th className="px-6 py-4 font-medium text-primary">Final</th>
                                <th className="px-6 py-4 font-medium text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr><td colSpan="5" className="text-center py-8 text-text-muted">Loading...</td></tr>
                            ) : results.length === 0 ? (
                                <tr><td colSpan="5" className="text-center py-8 text-text-muted">No submissions yet</td></tr>
                            ) : results.map(res => (
                                <tr key={res.id} className="border-t border-overlay/5 hover:bg-surface-dark/30 transition-colors">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            {res.student_photo_url ? (
                                                <img src={res.student_photo_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0 border border-overlay/10" />
                                            ) : (
                                                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 text-xs font-bold text-primary">
                                                    {(res.student_name || '?').charAt(0).toUpperCase()}
                                                </div>
                                            )}
                                            <span className="text-sm text-text-primary">{res.student_name || `Student #${res.student_id}`}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-text-muted">{res.raw_test_score.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-sm text-text-muted">{res.quality_score}</td>
                                    <td className="px-6 py-4 text-sm font-bold text-primary">{res.final_score.toFixed(1)}</td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => setSelectedSubmission(res)}
                                            className="inline-flex items-center gap-1 text-xs text-text-muted hover:text-primary transition-colors"
                                        >
                                            <Eye className="h-4 w-4" /> View
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </Card>

            {/* Plagiarism checker — teacher only, shown whenever an assignment is selected */}
            {selectedAssignment && (
                <PlagiarismPanel key={selectedAssignment} assignmentId={selectedAssignment} />
            )}

            {selectedSubmission && (
                <SubmissionModal
                    submission={selectedSubmission}
                    onClose={() => setSelectedSubmission(null)}
                    analysisCache={analysisCache}
                    onCacheUpdate={(id, data) => setAnalysisCache(prev => ({ ...prev, [id]: data }))}
                    aiDetectCache={aiDetectCache}
                    onAIDetectUpdate={(id, data) => setAiDetectCache(prev => ({ ...prev, [id]: data }))}
                />
            )}
        </div>
    );
}