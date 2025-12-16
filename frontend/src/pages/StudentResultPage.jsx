import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentResult, getStudentAnalysis } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { ArrowLeft, CheckCircle, XCircle, Sparkles, ThumbsUp, ThumbsDown, Lightbulb, Trophy, Target, AlertCircle } from 'lucide-react';

// Helper function to get roll from token
const getRollFromToken = () => {
    const token = localStorage.getItem('studentAuthToken');
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.sub;
    } catch (e) { return null; }
};

export default function StudentResultPage() {
    const { assignment_id } = useParams();
    const studentRoll = getRollFromToken();
    const [submission, setSubmission] = useState(null);
    const [analysis, setAnalysis] = useState(null);
    const [analyzingLoading, setAnalyzingLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assignment_id || !studentRoll) {
            toast.error("Not authorized");
            return;
        }

        const fetchResult = async () => {
            try {
                const response = await getStudentResult(assignment_id, studentRoll);
                setSubmission(response.data);
            } catch (error) {
                toast.error("Could not load your result.");
            } finally {
                setLoading(false);
            }
        };
        fetchResult();
    }, [assignment_id, studentRoll]);

    const handleAnalyze = async () => {
        setAnalyzingLoading(true);
        try {
            const res = await getStudentAnalysis(assignment_id, studentRoll);
            setAnalysis(res.data);
        } catch (error) {
            toast.error(error.response?.data?.detail || "Failed to analyze code");
        } finally {
            setAnalyzingLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    if (!submission) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-text-muted">
                <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                <p>Could not find your submission.</p>
            </div>
        );
    }

    const passedTests = submission.test_results?.filter(r => r.passed).length || 0;
    const totalTests = submission.test_results?.length || 0;
    const scoreColor = submission.final_score >= 80 ? 'text-success' : submission.final_score >= 50 ? 'text-warning' : 'text-error';

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link to={`/student/dashboard/${studentRoll}`}>
                    <Button variant="ghost" size="icon" className="rounded-full">
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-text-primary">Your Result</h1>
                    <p className="text-text-muted text-sm">Assignment #{assignment_id}</p>
                </div>
            </div>

            {/* Score Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="border-none shadow-soft bg-surface text-center p-4">
                    <Trophy className={`h-8 w-8 mx-auto mb-2 ${scoreColor}`} />
                    <p className={`text-3xl font-bold ${scoreColor}`}>{submission.final_score?.toFixed(1)}</p>
                    <p className="text-xs text-text-muted">Final Score</p>
                </Card>
                <Card className="border-none shadow-soft bg-surface text-center p-4">
                    <Target className="h-8 w-8 mx-auto mb-2 text-primary" />
                    <p className="text-3xl font-bold text-primary">{submission.raw_test_score?.toFixed(1)}</p>
                    <p className="text-xs text-text-muted">Test Score</p>
                </Card>
                <Card className="border-none shadow-soft bg-surface text-center p-4">
                    <Sparkles className="h-8 w-8 mx-auto mb-2 text-secondary" />
                    <p className="text-3xl font-bold text-secondary">{submission.quality_score}</p>
                    <p className="text-xs text-text-muted">Quality</p>
                </Card>
                <Card className="border-none shadow-soft bg-surface text-center p-4">
                    <AlertCircle className="h-8 w-8 mx-auto mb-2 text-error" />
                    <p className="text-3xl font-bold text-error">-{submission.error_penalty}</p>
                    <p className="text-xs text-text-muted">Penalty</p>
                </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left: Code & Test Results */}
                <div className="space-y-6">
                    {/* Submitted Code */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-text-primary">Your Submitted Code</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0">
                            <pre className="p-4 bg-background/50 text-text-primary font-mono text-sm overflow-x-auto max-h-64"><code>{submission.code}</code></pre>
                        </CardContent>
                    </Card>

                    {/* Test Results */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardHeader className="border-b border-white/5 flex flex-row items-center justify-between">
                            <CardTitle className="text-text-primary">Test Results</CardTitle>
                            <span className={`text-sm font-semibold ${passedTests === totalTests ? 'text-success' : 'text-warning'}`}>
                                {passedTests}/{totalTests} Passed
                            </span>
                        </CardHeader>
                        <CardContent className="space-y-2">
                            {submission.test_results?.map((res, i) => (
                                <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${res.passed ? 'bg-success/5 border border-success/20' : 'bg-error/5 border border-error/20'}`}>
                                    <div className="flex items-center gap-2">
                                        {res.passed ? <CheckCircle className="h-4 w-4 text-success" /> : <XCircle className="h-4 w-4 text-error" />}
                                        <span className="text-sm text-text-primary">Test Case {i + 1}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded ${res.type === 'hidden' ? 'bg-surface-dark text-text-muted' : 'bg-primary/10 text-primary'}`}>
                                            {res.type === 'hidden' ? 'Hidden' : 'Sample'}
                                        </span>
                                    </div>
                                    <span className={`text-xs font-semibold ${res.passed ? 'text-success' : 'text-error'}`}>
                                        {res.passed ? 'Passed' : 'Failed'}
                                    </span>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                </div>

                {/* Right: AI Feedback */}
                <div className="space-y-6">
                    {/* Quality Comments */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-text-primary">Quality Feedback</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <ul className="space-y-2">
                                {submission.quality_comments?.map((c, i) => (
                                    <li key={i} className="text-sm text-text-muted flex items-start gap-2">
                                        <span className="text-secondary">•</span> {c}
                                    </li>
                                ))}
                            </ul>
                        </CardContent>
                    </Card>

                    {/* AI Analysis */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardHeader className="border-b border-white/5">
                            <CardTitle className="text-text-primary flex items-center gap-2">
                                <Sparkles className="h-5 w-5 text-primary" /> AI Code Analysis
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!analysis ? (
                                <Button
                                    onClick={handleAnalyze}
                                    disabled={analyzingLoading}
                                    className="w-full bg-gradient-to-r from-primary to-secondary"
                                >
                                    <Sparkles className="h-4 w-4 mr-2" />
                                    {analyzingLoading ? "Analyzing..." : "Get AI Feedback"}
                                </Button>
                            ) : (
                                <div className="space-y-4">
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
                        </CardContent>
                    </Card>

                    {/* Error Analysis */}
                    {Object.keys(submission.error_counts || {}).length > 0 && (
                        <Card className="border-none shadow-soft bg-surface">
                            <CardHeader className="border-b border-white/5">
                                <CardTitle className="text-text-primary">Error Analysis</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <ul className="space-y-2">
                                    {Object.entries(submission.error_counts).map(([error, count]) => (
                                        <li key={error} className="text-sm text-error flex items-center gap-2">
                                            <XCircle className="h-4 w-4" /> {error}: {count} instance(s)
                                        </li>
                                    ))}
                                </ul>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}