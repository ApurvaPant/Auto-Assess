import { useEffect, useState } from 'react';
import { getAssignments, getResults, releaseResults, getCodeAnalysis } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { X, Eye, BarChart3, Sparkles, ThumbsUp, ThumbsDown, Lightbulb } from 'lucide-react';

const SubmissionModal = ({ submission, onClose }) => {
    const [analysis, setAnalysis] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);

    const handleAnalyze = async () => {
        if (!submission?.id) return;
        setAnalyzing(true);
        try {
            const res = await getCodeAnalysis(submission.id);
            setAnalysis(res.data);
        } catch (error) {
            toast.error("Failed to analyze code");
        } finally {
            setAnalyzing(false);
        }
    };

    if (!submission) return null;
    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-center items-center p-4">
            <Card className="max-w-3xl w-full max-h-[85vh] overflow-y-auto border-none shadow-2xl bg-surface">
                <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                    <CardTitle className="text-xl text-primary">Roll {submission.roll}</CardTitle>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-white/10 transition-colors">
                        <X className="h-5 w-5 text-text-muted" />
                    </button>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <label className="text-xs text-text-muted uppercase tracking-wider mb-2 block">Submitted Code</label>
                        <pre className="bg-background/50 border border-white/10 p-4 rounded-lg text-sm overflow-x-auto text-text-primary font-mono max-h-48">{submission.code}</pre>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-primary">{submission.raw_test_score.toFixed(1)}</p>
                            <p className="text-xs text-text-muted">Test Score</p>
                        </div>
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-secondary">{submission.quality_score}</p>
                            <p className="text-xs text-text-muted">Quality</p>
                        </div>
                        <div className="bg-surface-dark/50 p-4 rounded-lg text-center">
                            <p className="text-2xl font-bold text-error">{submission.error_penalty}</p>
                            <p className="text-xs text-text-muted">Penalty</p>
                        </div>
                    </div>

                    {/* AI Analysis Section */}
                    <div className="border-t border-white/5 pt-4">
                        {!analysis ? (
                            <Button
                                onClick={handleAnalyze}
                                disabled={analyzing}
                                className="w-full bg-gradient-to-r from-primary to-secondary"
                            >
                                <Sparkles className="h-4 w-4 mr-2" />
                                {analyzing ? "Analyzing..." : "Analyze with AI"}
                            </Button>
                        ) : (
                            <div className="space-y-4">
                                <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                                    <Sparkles className="h-4 w-4 text-primary" /> AI Code Analysis
                                </h4>

                                {/* Strong Points */}
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

                                {/* Weak Points */}
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

                                {/* Suggestions */}
                                <div className="bg-secondary/10 border border-secondary/20 rounded-lg p-3">
                                    <h5 className="text-xs font-semibold text-secondary flex items-center gap-1 mb-2">
                                        <Lightbulb className="h-3 w-3" /> Suggestions
                                    </h5>
                                    <ul className="space-y-1">
                                        {analysis.suggestions?.map((suggestion, i) => (
                                            <li key={i} className="text-xs text-text-muted">• {suggestion}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default function ViewResults() {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);

    const [alpha, setAlpha] = useState(0.6);
    const [beta, setBeta] = useState(0.4);
    const [gamma, setGamma] = useState(10.0);

    const currentAssignment = assignments.find(a => a.id === parseInt(selectedAssignment, 10));

    useEffect(() => {
        getAssignments().then(res => {
            setAssignments(res.data);
            if (res.data.length > 0) setSelectedAssignment(res.data[0].id);
        });
    }, []);

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
                <select
                    className="bg-surface border border-white/10 px-4 py-2 rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/50"
                    value={selectedAssignment}
                    onChange={(e) => setSelectedAssignment(e.target.value)}
                >
                    <option disabled value="">Select Assignment</option>
                    {assignments.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
            </div>

            {currentAssignment && !currentAssignment.results_released && (
                <Card className="border-none shadow-soft bg-surface">
                    <CardHeader className="border-b border-white/5">
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
                                <th className="px-6 py-4 font-medium">Roll</th>
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
                                <tr key={res.id} className="border-t border-white/5 hover:bg-surface-dark/30 transition-colors">
                                    <td className="px-6 py-4 text-sm text-text-primary font-mono">{res.roll}</td>
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

            {selectedSubmission && <SubmissionModal submission={selectedSubmission} onClose={() => setSelectedSubmission(null)} />}
        </div>
    );
}