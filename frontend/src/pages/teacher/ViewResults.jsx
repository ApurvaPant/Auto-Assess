import { useEffect, useState } from 'react';
import { getAssignments, getResults, releaseResults } from '../../api';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// --- MODAL COMPONENT ---
const SubmissionModal = ({ submission, onClose }) => {
    if (!submission) return null;

    const chartData = {
        labels: ['Scores'],
        datasets: [
            {
                label: 'Test Score',
                data: [submission.raw_test_score],
                backgroundColor: 'rgba(75, 192, 192, 0.6)',
            },
            {
                label: 'Quality Score',
                data: [submission.quality_score],
                backgroundColor: 'rgba(54, 162, 235, 0.6)',
            },
            {
                label: 'Error Penalty',
                data: [-submission.error_penalty],
                backgroundColor: 'rgba(255, 99, 132, 0.6)',
            },
        ],
    };

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#ccc' } },
            title: { display: true, text: 'Score Composition', color: '#ccc' },
        },
        scales: { 
            y: { 
                beginAtZero: true, 
                ticks: { color: '#ccc' },
                grid: { color: 'rgba(255, 255, 255, 0.1)'} 
            },
            x: {
                ticks: { color: '#ccc' },
                grid: { color: 'rgba(255, 255, 255, 0.1)'}
            }
        }
    };

    const passedTests = submission.test_results.filter(r => r.passed).length;
    const totalTests = submission.test_results.length;

    return (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 transition-opacity z-10 flex justify-center items-center p-4">
            <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl">
                <div className="bg-white dark:bg-gray-800 px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
                    <h3 className="text-lg font-semibold leading-6 text-gray-900 dark:text-gray-100" id="modal-title">
                        Submission Details (Roll: {submission.roll}, Final Score: {submission.final_score.toFixed(2)})
                    </h3>
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[70vh] overflow-y-auto p-2">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">Submitted Code:</h4>
                                <div className="mt-2 font-mono text-sm bg-gray-900 text-white p-4 rounded-md overflow-x-auto">
                                    <pre><code>{submission.code}</code></pre>
                                </div>
                            </div>
                             <div>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">AI Quality Comments:</h4>
                                <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2">
                                    {submission.quality_comments.map((c, i) => <li key={i}>{c}</li>)}
                                </ul>
                            </div>
                        </div>
                        {/* Right Column */}
                        <div className="space-y-4">
                             <div>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">Test Case Breakdown ({passedTests}/{totalTests} Passed):</h4>
                                <div className="mt-2 space-y-2 text-sm">
                                    {submission.test_results.map((res, i) => (
                                        <p key={i} className={res.passed ? 'text-green-500' : 'text-red-500'}>
                                            Test Case {i + 1} ({res.type}): {res.passed ? 'Passed' : 'Failed'}
                                        </p>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">Error Analysis:</h4>
                                {Object.keys(submission.error_counts).length > 0 ? (
                                    <ul className="list-disc list-inside text-sm text-gray-600 dark:text-gray-400 mt-2">
                                        {Object.entries(submission.error_counts).map(([error, count]) => (
                                            <li key={error}>{error}: {count} instance(s)</li>
                                        ))}
                                    </ul>
                                ) : <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">No errors detected.</p>}
                            </div>
                            <div>
                                <h4 className="font-medium text-gray-800 dark:text-gray-200">Score Graph:</h4>
                                <Bar options={chartOptions} data={chartData} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-900 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
                    <button type="button" onClick={onClose} className="mt-3 inline-flex w-full justify-center rounded-md bg-white dark:bg-gray-700 dark:text-gray-100 px-3 py-2 text-sm font-semibold text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 dark:ring-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 sm:mt-0 sm:w-auto">
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};
// --- END MODAL COMPONENT ---


export default function ViewResults() {
    const [assignments, setAssignments] = useState([]);
    const [selectedAssignment, setSelectedAssignment] = useState('');
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [isReleasing, setIsReleasing] = useState(false);

    // Find the full assignment object from the list
    const currentAssignment = assignments.find(a => a.id === parseInt(selectedAssignment, 10));

    useEffect(() => {
        const fetchAssignments = async () => {
            try {
                // This fetches the list of assignments for the dropdown
                const response = await getAssignments();
                setAssignments(response.data);
                if (response.data.length > 0) {
                    setSelectedAssignment(response.data[0].id);
                }
            } catch (error) {
                toast.error('Failed to fetch assignments.');
            }
        };
        fetchAssignments();
    }, []);

    useEffect(() => {
        if (selectedAssignment) {
            const fetchResults = async () => {
                setLoading(true);
                setResults([]);
                try {
                    // This fetches the list of submissions for the selected assignment
                    const response = await getResults(selectedAssignment);
                    setResults(response.data);
                } catch (error) {
                     toast.error(error.response?.data?.detail || 'Failed to fetch results.');
                } finally {
                    setLoading(false);
                }
            };
            fetchResults();
        }
    }, [selectedAssignment]);

    // --- NEW FUNCTION ---
    const handleReleaseResults = async () => {
        if (!currentAssignment) return;
        
        setIsReleasing(true);
        try {
            await releaseResults(currentAssignment.id);
            toast.success("Results released successfully!");
            // Update the local state to reflect the change
            setAssignments(prev => prev.map(a => 
                a.id === currentAssignment.id ? { ...a, results_released: true } : a
            ));
        } catch (error) {
            toast.error("Failed to release results.");
        } finally {
            setIsReleasing(false);
        }
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">View Results</h2>
                        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Review submissions and scores.</p>
                    </div>
                    <div className="w-full max-w-xs">
                         <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Select Assignment</label>
                        <select
                            className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                            value={selectedAssignment}
                            onChange={(e) => setSelectedAssignment(e.target.value)}
                        >
                            <option disabled value="">- Select -</option>
                            {assignments.map(a => <option key={a.id} value={a.id}>{a.name} (ID: {a.id})</option>)}
                        </select>
                    </div>
                </div>

                {/* --- NEW BUTTON AND LOGIC --- */}
                {currentAssignment && (
                    <div className="flex justify-between items-center mb-4 border-t border-gray-700 pt-4">
                        <span className='text-sm text-gray-400'>
                            {results.length} / 72 Students Submitted
                        </span>
                        <button 
                            onClick={handleReleaseResults}
                            disabled={isReleasing || currentAssignment.results_released}
                            className="rounded-md bg-green-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-green-700 disabled:opacity-50"
                        >
                            {isReleasing ? "Releasing..." : (currentAssignment.results_released ? "Results Released" : "Release Marks for This Assignment")}
                        </button>
                    </div>
                )}
                {/* --- END NEW --- */}

                <div className="mt-6 flow-root">
                    <div className="-mx-4 -my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                        <div className="inline-block min-w-full py-2 align-middle sm:px-6 lg:px-8">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead>
                                    <tr>
                                        <th className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 dark:text-gray-100 sm:pl-0">Roll #</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Submitted At</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Final Score</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Test Score</th>
                                        <th className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900 dark:text-gray-100">Quality Score</th>
                                        <th className="relative py-3.5 pl-3 pr-4 sm:pr-0"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                    {loading && <tr><td colSpan="6" className="text-center p-4 text-gray-500 dark:text-gray-400">Loading...</td></tr>}
                                    {!loading && results.length === 0 && <tr><td colSpan="6" className="text-center p-4 text-gray-500 dark:text-gray-400">No submissions found.</td></tr>}
                                    {results.map(res => (
                                        <tr key={res.id}>
                                            <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 dark:text-gray-200 sm:pl-0">{res.roll}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(res.submitted_at).toLocaleString()}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm font-semibold dark:text-gray-200">{res.final_score.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{res.raw_test_score.toFixed(2)}</td>
                                            <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-400">{res.quality_score}</td>
                                            <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-0">
                                                <button onClick={() => setSelectedSubmission(res)} className="text-accent hover:text-accent-hover">Details</button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            
            {selectedSubmission && <SubmissionModal submission={selectedSubmission} onClose={() => setSelectedSubmission(null)} />}
        </>
    );
}