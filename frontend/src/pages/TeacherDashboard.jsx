import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { PlusCircle, List, Users, TrendingUp, BookOpen, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { StudentPerformanceChart } from '../components/ui/StudentPerformanceChart';
import client from '../api/client';

const StatCard = ({ title, value, subtext, icon: Icon, trend }) => (
    <Card className="border-none shadow-soft hover:shadow-lg transition-all duration-200 bg-surface">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-text-muted">{title}</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <h3 className="text-2xl font-bold text-text-primary">{value}</h3>
                        {trend && <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">{trend}</span>}
                    </div>
                    <p className="text-xs text-text-muted mt-1">{subtext}</p>
                </div>
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    <Icon className="h-6 w-6" />
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function TeacherDashboard() {
    const [stats, setStats] = useState({
        total_students: 0,
        total_questions: 0,
        active_assignments: 0,
        avg_score: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const response = await client.get('/teacher/stats');
                setStats(response.data);
            } catch (error) {
                console.error("Failed to fetch stats:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchStats();
    }, []);

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-text-primary">Dashboard Overview</h1>
                    <p className="text-text-muted mt-1">Track student performance and manage assessments.</p>
                </div>
                <Link to="/teacher/generate">
                    <Button size="lg" className="shadow-lg shadow-primary/20">
                        <PlusCircle className="mr-2 h-5 w-5" />
                        Generate New Question
                    </Button>
                </Link>
            </div>

            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <StatCard
                    title="Total Students"
                    value={stats.total_students}
                    subtext="Enrolled students"
                    icon={Users}
                />
                <StatCard
                    title="Questions Generated"
                    value={stats.total_questions}
                    subtext="AI-generated packages"
                    icon={BookOpen}
                />
                <StatCard
                    title="Active Assignments"
                    value={stats.active_assignments}
                    subtext="Created assignments"
                    icon={List}
                />
                <StatCard
                    title="Avg. Class Score"
                    value={stats.avg_score > 0 ? `${stats.avg_score}%` : 'N/A'}
                    subtext="Across graded submissions"
                    icon={Activity}
                />
            </div>

            {/* Only show performance chart if there's submission data */}
            {stats.recent_activity?.length > 0 && (
                <div className="grid gap-6 md:grid-cols-7">
                    <div className="col-span-4 transition-all hover:scale-[1.005] duration-300">
                        <StudentPerformanceChart type="class" data={stats.chart_data} />
                    </div>
                    <div className="col-span-3 transition-all hover:scale-[1.005] duration-300">
                        <Card className="h-full border-none shadow-soft bg-surface">
                            <CardHeader>
                                <CardTitle className="text-text-primary">Recent Activity</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-6">
                                    {stats.recent_activity.map((item, i) => (
                                        <div key={i} className="flex items-center justify-between border-b border-white/5 last:border-0 pb-4 last:pb-0">
                                            <div className="flex items-center gap-4">
                                                <div className="h-9 w-9 rounded-full bg-secondary/10 text-secondary flex items-center justify-center font-bold text-sm">
                                                    {item.user.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="text-sm font-medium text-text-primary">{item.user}</p>
                                                    <p className="text-xs text-text-muted">{item.action}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                {item.score && <span className={`text-sm font-bold ${item.score === 'Pending' ? 'text-warning' : 'text-primary'}`}>{item.score}</span>}
                                                <p className="text-xs text-text-muted">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}

            {/* Show empty state when no activity */}
            {(!stats.recent_activity || stats.recent_activity.length === 0) && !loading && (
                <Card className="border-none shadow-soft bg-surface">
                    <CardContent className="py-12 text-center">
                        <Activity className="h-12 w-12 mx-auto text-text-muted opacity-50 mb-4" />
                        <h3 className="text-lg font-medium text-text-primary">No Activity Yet</h3>
                        <p className="text-text-muted mt-1">Charts and activity will appear once students start submitting assignments.</p>
                    </CardContent>
                </Card>
            )}
        </div>
    );
}