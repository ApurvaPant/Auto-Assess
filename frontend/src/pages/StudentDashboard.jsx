import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getStudentAssignments } from '../api/client';
import client from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { StudentPerformanceChart } from '../components/ui/StudentPerformanceChart';
import { CheckCircle, Clock, Award, BookOpen, ArrowRight } from 'lucide-react';

const StatCard = ({ title, value, subtext, icon: Icon, colorClass = "text-primary" }) => (
    <Card className="border-none shadow-soft hover:shadow-lg transition-all duration-200 bg-surface">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-text-muted">{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
                    </div>
                    <p className="text-xs text-text-muted mt-1">{subtext}</p>
                </div>
                <div className={`h-12 w-12 rounded-full bg-surface-dark flex items-center justify-center ${colorClass}`}>
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </CardContent>
    </Card>
);

const AssignmentCard = ({ assignment }) => {
    const {
        assignment_id,
        assignment_name,
        package_title,
        has_submitted,
        results_released,
        final_score
    } = assignment;

    return (
        <Card className="mb-4 border-none shadow-soft bg-surface hover:bg-surface-dark/50 transition-colors">
            <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2 mb-1">
                        <span className={`h-2 w-2 rounded-full ${has_submitted ? 'bg-success' : 'bg-warning'}`}></span>
                        <p className="text-sm font-medium text-text-muted uppercase tracking-wider">{assignment_name}</p>
                    </div>
                    <h3 className="text-lg font-bold text-text-primary">{package_title || 'Untitled Assessment'}</h3>
                    <p className="text-xs text-text-muted mt-1">
                        {has_submitted ? (results_released ? "Graded" : "Submitted - Pending Review") : "Not Started"}
                    </p>
                </div>

                <div className="flex items-center gap-4">
                    {has_submitted && results_released && (
                        <div className="text-right mr-2">
                            <span className="block text-2xl font-bold text-primary">{final_score.toFixed(0)}%</span>
                            <span className="text-xs text-text-muted">Score</span>
                        </div>
                    )}

                    {has_submitted && results_released ? (
                        <Link to={`/student/results/${assignment_id}`}>
                            <Button variant="outline" size="sm" className="border-primary/20 hover:bg-primary/5 text-primary">
                                View Results
                            </Button>
                        </Link>
                    ) : has_submitted ? (
                        <Link to={`/student/assignment/${assignment_id}`}>
                            <Button variant="secondary" size="sm" className="opacity-80">
                                View Submission
                            </Button>
                        </Link>
                    ) : (
                        <Link to={`/student/assignment/${assignment_id}`}>
                            <Button size="sm" className="shadow-lg shadow-primary/20 group">
                                Start Now <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                            </Button>
                        </Link>
                    )}
                </div>
            </CardContent>
        </Card>
    );
};

export default function StudentDashboard() {
    const [allAssignments, setAllAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState(''); // Added state for name
    const [filter, setFilter] = useState('assigned'); // 'assigned' or 'submitted'
    const { roll } = useParams();

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) {
            toast.error("Not authorized. Please log in.");
            setLoading(false);
            return;
        }

        const fetchData = async () => {
            try {
                // Fetch Assignments
                const assignmentsRes = await getStudentAssignments();
                setAllAssignments(assignmentsRes.data);

                // Fetch Profile
                const profileRes = await client.get('/student/profile'); // Use direct client or import
                if (profileRes.data.name) {
                    setStudentName(profileRes.data.name);
                }
            } catch (error) {
                console.error("Failed to fetch data", error);
                // toast.error(error.response?.data?.detail || "Failed to fetch data.");
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    // ... (Stats Logic remains same)
    const totalAssignments = allAssignments.length;
    const submittedCount = allAssignments.filter(a => a.has_submitted).length;
    const gradedAssignments = allAssignments.filter(a => a.results_released);
    const avgScore = gradedAssignments.length > 0
        ? (gradedAssignments.reduce((acc, curr) => acc + curr.final_score, 0) / gradedAssignments.length).toFixed(1)
        : 0;

    const filteredAssignments = allAssignments.filter(a =>
        filter === 'assigned' ? !a.has_submitted : a.has_submitted
    );

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Global Background Effects */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-primary/5 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/5 blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                <div className="space-y-8 animate-in fade-in duration-500">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                                Welcome Back, {studentName || roll}
                            </h1>
                            <p className="text-text-muted mt-1">Here is an overview of your progress.</p>
                        </div>
                        <Link to="/student/profile">
                            <Button variant="ghost" size="sm" className="text-text-muted hover:text-primary">
                                Manage Account
                            </Button>
                        </Link>
                    </div>

                    {/* Stats Overview */}
                    <div className="grid gap-6 md:grid-cols-3 lg:grid-cols-3">
                        <StatCard
                            title="Assignments Due"
                            value={totalAssignments - submittedCount}
                            subtext="Keep it up!"
                            icon={Clock}
                            colorClass="text-warning"
                        />
                        <StatCard
                            title="Completed"
                            value={submittedCount}
                            subtext={`${totalAssignments} total assigned`}
                            icon={CheckCircle}
                            colorClass="text-success"
                        />
                        <StatCard
                            title="Average Score"
                            value={`${avgScore}%`}
                            subtext="Across graded tasks"
                            icon={Award}
                            colorClass="text-primary"
                        />
                    </div>

                    <div className="grid gap-8 lg:grid-cols-3">
                        {/* Main Content: Assignments List */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="flex items-center gap-4 border-b border-surface-dark pb-1">
                                <button
                                    onClick={() => setFilter('assigned')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${filter === 'assigned' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                                        }`}
                                >
                                    Assigned
                                    {filter === 'assigned' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                                </button>
                                <button
                                    onClick={() => setFilter('submitted')}
                                    className={`pb-3 text-sm font-medium transition-colors relative ${filter === 'submitted' ? 'text-primary' : 'text-text-muted hover:text-text-primary'
                                        }`}
                                >
                                    Completed
                                    {filter === 'submitted' && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-t-full"></span>}
                                </button>
                            </div>

                            <div className="space-y-4">
                                {loading && <p className="text-text-muted text-center py-8">Loading assignments...</p>}

                                {!loading && filteredAssignments.length === 0 && (
                                    <div className="bg-surface border border-surface-dark rounded-xl p-12 text-center">
                                        <div className="mx-auto h-12 w-12 text-text-muted mb-3 opacity-50">
                                            <BookOpen className="h-full w-full" />
                                        </div>
                                        <h3 className="text-lg font-medium text-text-primary">No assignments found</h3>
                                        <p className="text-text-muted mt-1">
                                            {filter === 'assigned' ? "You're all caught up!" : "You haven't submitted anything yet."}
                                        </p>
                                    </div>
                                )}

                                {filteredAssignments.map(asgn => (
                                    <AssignmentCard key={asgn.assignment_id} assignment={asgn} />
                                ))}
                            </div>
                        </div>

                        {/* Sidebar: Performance Chart */}
                        <div className="lg:col-span-1 space-y-6">
                            <StudentPerformanceChart
                                type="student"
                                data={gradedAssignments.map(a => ({
                                    name: a.assignment_name.substring(0, 8),
                                    score: Math.round(a.final_score || 0)
                                }))}
                            />

                            {/* Optional: Tips or Announcements could go here */}
                            <Card className="border-none shadow-soft bg-gradient-to-br from-primary/10 to-transparent">
                                <CardContent className="p-6">
                                    <h4 className="font-bold text-primary mb-2">Pro Tip</h4>
                                    <p className="text-sm text-text-muted">
                                        Consistent practice improves performance. Try to complete assignments
                                        as soon as they are released to keep your streak!
                                    </p>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}