import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentAssignment, submitSolution, runCode } from '../api';
import toast from 'react-hot-toast';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';

// --- (TestCaseResult component is unchanged) ---
const TestCaseResult = ({ result, testCase, index, isSubmit = false }) => {
    const isPassed = result.passed;
    if (isSubmit && testCase?.type === 'hidden' && isPassed) { return ( <div className="p-3 rounded-md bg-green-500/10 text-green-400 font-mono text-sm"><p className="font-semibold">Hidden Case {index + 1}: Passed</p></div> ); }
    return (
        <div className={`p-4 rounded-lg ${isPassed ? 'bg-green-500/10' : 'bg-red-500/10'}`}>
            <p className={`font-semibold font-sans ${isPassed ? 'text-green-400' : 'text-red-400'}`}>Case {index + 1} ({result.testcase_type || testCase?.type}): {isPassed ? 'Accepted' : 'Wrong Answer'}</p>
            {!isPassed && (
                <div className="mt-3 font-mono text-xs space-y-2 text-gray-400 border-t border-gray-700 pt-3">
                    {testCase?.input !== 'Hidden' && ( <div><p className="font-semibold text-gray-300">Input:</p><pre className="p-2 mt-1 bg-gray-900/50 rounded"><code>{testCase.input}</code></pre></div> )}
                    {testCase?.expected !== 'Hidden' && ( <div><p className="font-semibold text-gray-300">Expected:</p><pre className="p-2 mt-1 bg-gray-900/50 rounded"><code>{testCase.expected}</code></pre></div> )}
                    <div><p className="font-semibold text-gray-300">Your Output:</p><pre className="p-2 mt-1 bg-gray-900/50 rounded"><code>{result.stdout}</code></pre></div>
                     {result.stderr && ( <div><p className="font-semibold text-gray-300">Error (stderr):</p><pre className="p-2 mt-1 bg-gray-900/50 rounded text-red-400"><code>{result.stderr}</code></pre></div> )}
                </div>
            )}
        </div>
    );
};
// --- End of TestCaseResult Component ---


export default function StudentAssignmentPage() {
    const { assignment_id } = useParams();
    const [assignmentData, setAssignmentData] = useState(null);
    const [code, setCode] = useState('# Enter your Python code here\n# Use sys.stdin.readline() to read input');
    
    // --- UPDATED STATES ---
    const [hasSubmitted, setHasSubmitted] = useState(false);
    const [resultsReleased, setResultsReleased] = useState(false);
    
    const [runResult, setRunResult] = useState(null);
    const [submitResult, setSubmitResult] = useState(null);
    const [isRunLoading, setIsRunLoading] = useState(false);
    const [isSubmitLoading, setIsSubmitLoading] = useState(false);
    
    const getRollFromToken = () => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) return null;
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            return payload.sub;
        } catch (e) { return null; }
    };
    
    const studentRoll = getRollFromToken();

    useEffect(() => {
        if (!assignment_id || !studentRoll) return;
        const fetchAssignment = async () => {
            try {
                const response = await getStudentAssignment(assignment_id, studentRoll);
                setAssignmentData(response.data);
                // --- UPDATE STATES ---
                setHasSubmitted(response.data.has_submitted);
                setResultsReleased(response.data.results_released);
            } catch (error) {
                toast.error(error.response?.data?.detail || 'Failed to fetch assignment.');
            }
        };
        fetchAssignment();
    }, [assignment_id, studentRoll]);

    const handleRun = async () => {
        setIsRunLoading(true);
        setRunResult(null);
        setSubmitResult(null);
        try {
            toast.loading("Running against sample cases...");
            const response = await runCode(studentRoll, assignment_id, code);
            setRunResult(response.data);
            toast.dismiss();
            toast.success("Run complete!");
        } catch (error) {
            toast.dismiss();
            toast.error(error.response?.data?.detail || "Run failed.");
        } finally {
            setIsRunLoading(false);
        }
    };

    const handleSubmit = async () => {
        setIsSubmitLoading(true);
        setRunResult(null);
        setSubmitResult(null);
        try {
            const response = await submitSolution(studentRoll, assignment_id, code);
            setSubmitResult(response.data);
            setHasSubmitted(true); // Mark as submitted
            toast.success('Submission successful! You can resubmit until results are released.');
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Submission failed.');
        } finally {
            setIsSubmitLoading(false);
        }
    };

    if (!assignmentData) {
        return <div className="text-center p-8">Loading Assignment...</div>;
    }

    const isLocked = resultsReleased; // Lock if results are released

    return (
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                        <Link to={`/student/dashboard/${studentRoll}`} className="text-sm text-accent hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">{assignmentData.package_title}</h1>
                        
                        <div className="prose prose-sm md:prose-base prose-invert max-w-none text-gray-300 prose-headings:text-gray-100 prose-strong:text-gray-100 prose-code:text-amber-400">
                            <ReactMarkdown>{assignmentData.package_prompt}</ReactMarkdown>
                        </div>
                    </div>
                </div>

                <div className="space-y-6">
                    {isLocked && (
                        <div className="p-4 mb-4 text-sm text-yellow-200 rounded-lg bg-yellow-900/50 border border-yellow-800" role="alert">
                            Results for this assignment have been released. This page is now read-only.
                        </div>
                    )}
                    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden shadow-sm">
                         <Editor
                            height="500px" 
                            defaultLanguage="python"
                            defaultValue={code}
                            onChange={(value) => setCode(value || '')}
                            theme="vs-dark"
                            options={{
                                padding: { top: 10, bottom: 10 },
                                minimap: { enabled: false },
                                readOnly: isLocked // Lock editor if results are released
                            }}
                        />
                    </div>
                    
                     <div className="flex items-center justify-end space-x-4">
                        <button 
                            onClick={handleRun} 
                            className="rounded-md bg-gray-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-gray-600 disabled:opacity-50" 
                            disabled={isRunLoading || isSubmitLoading || isLocked}
                        >
                            {isRunLoading ? 'Running...' : 'Run'}
                        </button>
                        <button 
                            onClick={handleSubmit} 
                            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover disabled:opacity-50" 
                            disabled={isRunLoading || isSubmitLoading || isLocked}
                        >
                             {isLocked ? "Results Released" : (isSubmitLoading ? 'Submitting...' : 'Submit')}
                        </button>
                    </div>

                    {runResult && (
                         <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg space-y-4">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Run Results (Sample Cases)</h2>
                            <div className="space-y-2">
                                {runResult.results.map((res, i) => <TestCaseResult key={i} result={res} testCase={assignmentData.sample_testcases[i]} index={i} />)}
                            </div>
                        </div>
                    )}
                    
                    {submitResult && (
                         <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg">
                            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Final Submission Result</h2>
                             <div className="mt-4 grid grid-cols-3 gap-4 text-center">
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Final Score</p>
                                    <p className={`text-3xl font-bold ${submitResult.final_score > 60 ? 'text-green-600' : 'text-red-600'}`}>{submitResult.final_score.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Test Score</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">{submitResult.raw_test_score.toFixed(2)}</p>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Quality Score</p>
                                    <p className="text-3xl font-bold text-gray-800 dark:text-gray-200">{submitResult.quality_score}</p>
                                </div>
                             </div>
                            <div className="mt-6">
                                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Test Cases:</h3>
                                <div className="mt-2 space-y-2">
                                   {submitResult.test_results.map((res, i) => {
                                        const originalTestCase = (assignmentData.sample_testcases.find(tc => tc.id === res.testcase_id)) || { type: res.type, input: 'Hidden', expected: 'Hidden', id: res.testcase_id };
                                        return <TestCaseResult key={i} result={res} testCase={originalTestCase} index={i} isSubmit={true} />
                                   })}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}