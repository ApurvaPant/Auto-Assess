import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudentAssignment, submitSolution, runCode } from '../api/client';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Send, ArrowLeft, Terminal, CheckCircle, XCircle, AlertCircle, Lock, CalendarClock } from 'lucide-react';

// LeetCode-style Test Case Result - shows details for first 2 failed sample tests
const TestCaseResult = ({ result, testCase, index, isSubmit = false, showDetails = false }) => {
    const isPassed = result.passed;
    const testType = result.testcase_type || (isSubmit && result.type) || testCase?.type;
    const isHidden = testType === 'hidden';

    const shouldShowDetails = showDetails && !isPassed && !isHidden && testCase;

    return (
        <div className={`rounded-lg border overflow-hidden ${isPassed ? 'bg-success/5 border-success/20' : 'bg-error/5 border-error/20'}`}>
            <div className="p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    {isPassed ? <CheckCircle className="h-5 w-5 text-success" /> : <XCircle className="h-5 w-5 text-error" />}
                    <div>
                        <p className={`font-semibold text-sm ${isPassed ? 'text-success' : 'text-error'}`}>
                            Test Case {index + 1}
                        </p>
                        <p className="text-xs text-text-muted">
                            {isHidden ? 'Hidden' : 'Sample'} • {isPassed ? 'Passed' : 'Failed'}
                        </p>
                    </div>
                </div>
                {!isPassed && result.stderr && (
                    <div className="flex items-center gap-2 text-xs text-error">
                        <AlertCircle className="h-4 w-4" />
                        <span>Runtime Error</span>
                    </div>
                )}
                {!isPassed && result.timed_out && (
                    <div className="flex items-center gap-2 text-xs text-warning">
                        <AlertCircle className="h-4 w-4" />
                        <span>Timeout</span>
                    </div>
                )}
            </div>

            {shouldShowDetails && (
                <div className="border-t border-overlay/5 bg-background/30 p-3 space-y-3 font-mono text-xs">
                    <div>
                        <p className="text-text-muted mb-1 font-sans font-medium">Input:</p>
                        <pre className="p-2 bg-surface-dark rounded border border-overlay/5 overflow-x-auto text-text-primary whitespace-pre-wrap">
                            {testCase.input || "(empty)"}
                        </pre>
                    </div>
                    <div>
                        <p className="text-text-muted mb-1 font-sans font-medium">Expected Output:</p>
                        <pre className="p-2 bg-success/10 rounded border border-success/20 overflow-x-auto text-success whitespace-pre-wrap">
                            {testCase.expected || "(empty)"}
                        </pre>
                    </div>
                    <div>
                        <p className="text-text-muted mb-1 font-sans font-medium">Your Output:</p>
                        <pre className="p-2 bg-error/10 rounded border border-error/20 overflow-x-auto text-error whitespace-pre-wrap">
                            {result.stdout || "(no output)"}
                        </pre>
                    </div>
                    {result.stderr && (
                        <div>
                            <p className="text-error mb-1 font-sans font-medium">Error:</p>
                            <pre className="p-2 bg-error/10 rounded border border-error/20 overflow-x-auto text-error whitespace-pre-wrap">
                                {result.stderr}
                            </pre>
                        </div>
                    )}
                    {result.explanation && (
                        <div className="pt-1">
                            <p className="text-text-muted font-sans text-[11px] italic opacity-70">
                                AI: {result.explanation}
                            </p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default function StudentAssignmentPage() {
    const { assignment_id } = useParams();
    const navigate = useNavigate();
    const [assignmentData, setAssignmentData] = useState(null);
    const [code, setCode] = useState('import sys\n\n# Read input\ndata = sys.stdin.readline().strip()\n\n# Write your solution here\n');

    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [resultsReleased, setResultsReleased] = useState(false);
    const [runResult, setRunResult] = useState(null);
    const [submitResult, setSubmitResult] = useState(null);
    const [isRunLoading, setIsRunLoading] = useState(false);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) {
            toast.error('Not authorized. Please log in.');
            navigate('/student', { replace: true });
            return;
        }
        if (!assignment_id) return;

        const fetchAssignment = async () => {
            try {
                const response = await getStudentAssignment(assignment_id);
                setAssignmentData(response.data);
                setHasSubmitted(response.data.has_submitted);
                setResultsReleased(response.data.results_released);
            } catch (error) {
                toast.error(error.response?.data?.detail || 'Failed to fetch assignment.');
            }
        };
        fetchAssignment();
    }, [assignment_id, navigate]);

    const handleRun = async () => {
        setIsRunLoading(true);
        setRunResult(null);
        setSubmitResult(null);
        try {
            const response = await runCode(assignment_id, code);
            setRunResult(response.data);
            toast.success("Run complete!");
        } catch (error) {
            toast.error(error.response?.data?.detail || "Run failed.");
        } finally {
            setIsRunLoading(false);
        }
    };

    const doSubmit = async () => {
        setIsSubmitLoading(true);
        setRunResult(null);
        setSubmitResult(null);
        try {
            const response = await submitSolution(assignment_id, code);
            setSubmitResult(response.data);
            setHasSubmitted(true);
            toast.success('Submission successful!');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Submission failed.');
        } finally {
            setIsSubmitLoading(false);
        }
    };

    if (!assignmentData) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    const deadline = assignmentData.deadline ? new Date(assignmentData.deadline) : null;
    const isPastDeadline = deadline && new Date() > deadline;
    const isLocked = resultsReleased || isPastDeadline;

    return (
        <div className="h-screen flex flex-col overflow-hidden bg-background animate-in fade-in duration-500">
            <header className="flex-none flex items-center justify-between px-4 lg:px-6 py-3 border-b border-overlay/[0.06] bg-background/80 backdrop-blur-sm">
                <div className="flex items-center gap-3">
                    <Link to="/student/dashboard">
                        <Button variant="ghost" size="icon" className="rounded-full h-9 w-9">
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                    </Link>
                    <div>
                        <h1 className="text-lg font-bold text-text-primary tracking-tight leading-tight">{assignmentData.package_title}</h1>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            {isPastDeadline && <span className="text-xs font-medium bg-error/20 text-error px-2 py-0.5 rounded flex items-center gap-1"><Lock className="h-3 w-3" /> Deadline Passed</span>}
                            {resultsReleased && !isPastDeadline && <span className="text-xs font-medium bg-warning/20 text-warning px-2 py-0.5 rounded flex items-center gap-1"><Lock className="h-3 w-3" /> Practice Mode</span>}
                            {hasSubmitted && !isLocked && <span className="text-xs font-medium bg-success/20 text-success px-2 py-0.5 rounded flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Submitted</span>}
                            {deadline && !isPastDeadline && (
                                <span className="text-xs font-medium text-text-muted flex items-center gap-1">
                                    <CalendarClock className="h-3 w-3" /> Due {deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button
                        variant="secondary"
                        onClick={handleRun}
                        disabled={isRunLoading || isSubmitLoading || isLocked || hasSubmitted}
                        className="min-w-[90px]"
                    >
                        {isRunLoading ? <div className="animate-spin mr-1.5 h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Play className="mr-1.5 h-4 w-4" />}
                        Run
                    </Button>
                    {hasSubmitted ? (
                        <Button disabled className="min-w-[120px] opacity-60 cursor-not-allowed">
                            <CheckCircle className="mr-1.5 h-4 w-4" />
                            Already Submitted
                        </Button>
                    ) : (
                        <Button
                            onClick={() => setShowConfirm(true)}
                            disabled={isRunLoading || isSubmitLoading || isLocked}
                            className="min-w-[90px]"
                        >
                            {isSubmitLoading ? <div className="animate-spin mr-1.5 h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Send className="mr-1.5 h-4 w-4" />}
                            Submit
                        </Button>
                    )}
                </div>
            </header>

            <div className="flex-1 min-h-0 p-4 lg:p-5">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-full">
                <Card className="border-none shadow-soft bg-surface flex flex-col h-full overflow-hidden">
                    <CardHeader className="bg-surface-dark/50 border-b border-overlay/5 py-3">
                        <CardTitle className="text-base font-medium flex items-center gap-2">
                            <Terminal className="h-4 w-4 text-primary" />
                            Problem Description
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="flex-1 overflow-y-auto p-6 scrollbar-thin scrollbar-thumb-surface-dark scrollbar-track-transparent">
                        <div className="prose prose-invert prose-p:text-text-secondary prose-headings:text-text-primary prose-strong:text-text-primary prose-code:text-accent prose-code:bg-primary/10 prose-code:px-1 prose-code:rounded max-w-none">
                            <ReactMarkdown>{assignmentData.package_prompt}</ReactMarkdown>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex flex-col h-full gap-3 min-h-0">
                    <div className="h-[60%] min-h-0 rounded-xl overflow-hidden border border-surface-dark shadow-soft bg-[#1e1e1e] shrink-0">
                        <Editor
                            height="100%"
                            defaultLanguage="python"
                            value={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                            options={{
                                fontSize: 14,
                                fontFamily: "'JetBrains Mono', monospace",
                                padding: { top: 16, bottom: 16 },
                                minimap: { enabled: false },
                                scrollBeyondLastLine: false,
                                readOnly: isLocked,
                                automaticLayout: true,
                            }}
                        />
                    </div>

                    <Card className="h-[40%] min-h-0 border-none shadow-soft bg-surface flex flex-col overflow-hidden shrink-0">
                        <CardHeader className="bg-surface-dark/50 border-b border-overlay/5 py-2 flex flex-row items-center justify-between shrink-0">
                            <CardTitle className="text-sm font-medium">
                                {submitResult ? 'Submission Results' : runResult ? 'Execution Results' : 'Test Results'}
                            </CardTitle>
                            <div className="flex items-center gap-3">
                                {(runResult || submitResult) && (
                                    <span className="text-xs text-text-muted">
                                        {(runResult?.results || submitResult?.test_results || []).filter(r => r.passed).length}/
                                        {(runResult?.results || submitResult?.test_results || []).length} passed
                                    </span>
                                )}
                                {submitResult && (
                                    <span className={`text-sm font-bold ${submitResult.final_score >= 80 ? 'text-success' : 'text-warning'}`}>
                                        {submitResult.final_score.toFixed(1)}%
                                    </span>
                                )}
                            </div>
                        </CardHeader>
                        <CardContent className="flex-1 overflow-y-auto p-3 scrollbar-thin">
                            {!runResult && !submitResult ? (
                                <div className="flex items-center justify-center h-full text-text-muted text-sm">
                                    <p>Run your code to see test results here</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {runResult?.results.map((res, i) => {
                                        const failedSampleCount = runResult.results
                                            .slice(0, i)
                                            .filter(r => !r.passed && r.testcase_type !== 'hidden').length;
                                        const showDetails = failedSampleCount < 1 && !res.passed && res.testcase_type !== 'hidden';

                                        return (
                                            <TestCaseResult
                                                key={i}
                                                result={res}
                                                testCase={assignmentData.sample_testcases?.[i]}
                                                index={i}
                                                showDetails={showDetails}
                                            />
                                        );
                                    })}

                                    {submitResult?.test_results.map((res, i) => {
                                        const failedSampleCount = submitResult.test_results
                                            .slice(0, i)
                                            .filter(r => !r.passed && r.type !== 'hidden').length;
                                        const showDetails = failedSampleCount < 1 && !res.passed && res.type !== 'hidden';

                                        const testCase = assignmentData.sample_testcases?.find(tc => tc.id === res.testcase_id)
                                            || (res.type !== 'hidden' ? assignmentData.sample_testcases?.[i] : null);

                                        return (
                                            <TestCaseResult
                                                key={i}
                                                result={res}
                                                testCase={testCase}
                                                index={i}
                                                isSubmit={true}
                                                showDetails={showDetails}
                                            />
                                        );
                                    })}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
            </div>

            {/* Submission Confirmation Modal */}
            {showConfirm && (
                <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-surface border border-overlay/10 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-warning/10 flex items-center justify-center shrink-0">
                                <AlertCircle className="h-5 w-5 text-warning" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-text-primary">Confirm Submission</h3>
                                <p className="text-xs text-text-muted mt-0.5">This action cannot be undone.</p>
                            </div>
                        </div>
                        <p className="text-sm text-text-secondary leading-relaxed">
                            Once submitted, you <span className="font-semibold text-text-primary">cannot re-submit</span> or make further changes. Make sure your solution is complete.
                        </p>
                        <div className="flex gap-3 justify-end pt-1">
                            <Button variant="outline" onClick={() => setShowConfirm(false)} disabled={isSubmitLoading}>
                                Cancel
                            </Button>
                            <Button
                                onClick={() => { setShowConfirm(false); doSubmit(); }}
                                disabled={isSubmitLoading}
                            >
                                {isSubmitLoading ? <div className="animate-spin mr-1.5 h-4 w-4 border-2 border-current border-t-transparent rounded-full" /> : <Send className="mr-1.5 h-4 w-4" />}
                                Yes, Submit
                            </Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
