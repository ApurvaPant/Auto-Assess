import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentResult } from '../api';
import toast from 'react-hot-toast';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import ReactMarkdown from 'react-markdown';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

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
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!assignment_id || !studentRoll) {
            toast.error("Not authorized");
            return;
        }
        
        const fetchResult = async () => {
            try {
                // Use the new getStudentResult function
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

    if (loading) {
        return <div className="text-center p-8">Loading Your Result...</div>;
    }

    if (!submission) {
        return <div className="text-center p-8">Could not find your submission.</div>;
    }

    const chartData = {
        labels: ['Scores'],
        datasets: [
            { label: 'Test Score', data: [submission.raw_test_score], backgroundColor: 'rgba(75, 192, 192, 0.6)'},
            { label: 'Quality Score', data: [submission.quality_score], backgroundColor: 'rgba(54, 162, 235, 0.6)'},
            { label: 'Error Penalty', data: [-submission.error_penalty], backgroundColor: 'rgba(255, 99, 132, 0.6)'},
        ],
    };
    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top', labels: { color: '#ccc' } },
            title: { display: true, text: 'Your Score Composition', color: '#ccc' },
        },
        scales: { 
            y: { beginAtZero: true, ticks: { color: '#ccc' }, grid: { color: 'rgba(255, 255, 255, 0.1)'} },
            x: { ticks: { color: '#ccc' }, grid: { color: 'rgba(255, 255, 255, 0.1)'}}
        }
    };
    const passedTests = submission.test_results.filter(r => r.passed).length;
    const totalTests = submission.test_results.length;

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <Link to={`/student/dashboard/${studentRoll}`} className="text-sm text-accent hover:underline mb-4 inline-block">&larr; Back to Dashboard</Link>
            <div className="bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Your Result</h2>
                    <div className="text-right">
                        <p className="text-sm text-gray-400">Final Score</p>
                        <p className={`text-4xl font-bold ${submission.final_score > 60 ? 'text-green-500' : 'text-red-500'}`}>{submission.final_score.toFixed(2)}</p>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <h4 className="font-medium text-gray-800 dark:text-gray-200">Your Submitted Code:</h4>
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
        </div>
    );
}