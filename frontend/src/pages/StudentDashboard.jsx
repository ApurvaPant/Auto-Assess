import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentAssignments } from '../api';
import toast from 'react-hot-toast';

// --- NEW Component for each row ---
const AssignmentRow = ({ assignment, roll }) => {
    const { 
        assignment_id, 
        assignment_name, 
        package_title, 
        has_submitted, 
        results_released, 
        final_score 
    } = assignment;

    let statusElement;
    if (has_submitted && results_released) {
        // 4. Submitted and Graded
        statusElement = (
            <div className="text-right">
                <span className="font-semibold text-gray-100">{final_score.toFixed(2)} / 100</span>
                <Link 
                    to={`/student/results/${assignment_id}`} 
                    className="ml-4 rounded-md bg-transparent px-3 py-1.5 text-sm font-semibold text-accent ring-1 ring-inset ring-accent hover:bg-accent hover:text-white"
                >
                    View Results
                </Link>
            </div>
        );
    } else if (has_submitted && !results_released) {
        // 3. Submitted and Waiting for Grade
        statusElement = (
             <Link 
                to={`/student/assignment/${assignment_id}`}
                className="rounded-md bg-gray-500 px-3 py-1.5 text-sm font-semibold text-white shadow-sm cursor-pointer"
            >
                Submitted (View)
            </Link>
        );
    } else {
        // 1. Not Submitted
        statusElement = (
            <Link 
                to={`/student/assignment/${assignment_id}`} 
                className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-hover"
            >
                Start Assignment
            </Link>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm p-4 flex justify-between items-center">
            <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{assignment_name}</p>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-200">{package_title || '[Untitled Assignment]'}</h2>
            </div>
            <div className="flex items-center space-x-4">
                {statusElement}
            </div>
        </div>
    );
};


export default function StudentDashboard() {
    const [allAssignments, setAllAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('assigned'); // 'assigned' or 'submitted'
    const { roll } = useParams();

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) {
            toast.error("Not authorized. Please log in.");
            setLoading(false);
            return;
        }

        const fetchAssignments = async () => {
            try {
                const response = await getStudentAssignments();
                setAllAssignments(response.data);
            } catch (error) {
                toast.error(error.response?.data?.detail || "Failed to fetch assignments.");
            } finally {
                setLoading(false);
            }
        };

        fetchAssignments();
    }, []);

    const filteredAssignments = allAssignments.filter(a => 
        filter === 'assigned' ? !a.has_submitted : a.has_submitted
    );

    return (
        <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
            <h1 className="text-3xl font-bold text-gray-100">Welcome, Student {roll}</h1>
            
            {/* --- NEW Filter Tabs --- */}
            <div className="mt-6 border-b border-gray-700">
                <nav className="-mb-px flex space-x-6" aria-label="Tabs">
                    <button
                        onClick={() => setFilter('assigned')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm
                            ${filter === 'assigned' 
                                ? 'border-accent text-accent' 
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            }`}
                    >
                        Assigned
                    </button>
                    <button
                        onClick={() => setFilter('submitted')}
                        className={`py-2 px-1 border-b-2 font-medium text-sm
                            ${filter === 'submitted' 
                                ? 'border-accent text-accent' 
                                : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                            }`}
                    >
                        Submitted
                    </button>
                </nav>
            </div>

            <div className="mt-8 space-y-4">
                {loading && <p className="text-gray-400">Loading assignments...</p>}
                
                {!loading && filteredAssignments.length === 0 && (
                    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center text-gray-400">
                        {filter === 'assigned' ? "You have no assignments to do." : "You have not submitted any assignments."}
                    </div>
                )}

                {filteredAssignments.map(asgn => (
                    <AssignmentRow key={asgn.assignment_id} assignment={asgn} roll={roll} />
                ))}
            </div>
             <div className="mt-6 text-center">
                 <Link to="/student/change-password" className="text-sm text-accent hover:underline">
                    Change Password (DOB)
                </Link>
            </div>
        </div>
    );
}