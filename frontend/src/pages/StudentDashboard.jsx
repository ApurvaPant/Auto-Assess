import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getStudentClassrooms, joinClassroom } from '../api/client';
import client from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { useTheme } from '../contexts/ThemeContext';
import { LogOut, BookOpen, Users, ArrowRight, Plus, FolderOpen, Sun, Moon } from 'lucide-react';

export default function StudentDashboard() {
    const [classrooms, setClassrooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [studentName, setStudentName] = useState('');
    const [photoUrl, setPhotoUrl] = useState(null);
    const [joinCode, setJoinCode] = useState('');
    const [joining, setJoining] = useState(false);
    const navigate = useNavigate();
    const { theme, toggleTheme } = useTheme();

    const fetchData = async () => {
        try {
            const [classroomsRes, profileRes] = await Promise.all([
                getStudentClassrooms(),
                client.get('/student/profile'),
            ]);
            setClassrooms(classroomsRes.data);
            if (profileRes.data.name) setStudentName(profileRes.data.name);
            if (profileRes.data.photo_url) setPhotoUrl(profileRes.data.photo_url);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to load data.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) {
            toast.error('Not authorized. Please log in.');
            navigate('/student', { replace: true });
            return;
        }

        try {
            JSON.parse(atob(token.split('.')[1])).sub;
        } catch {
            localStorage.removeItem('studentAuthToken');
            toast.error('Invalid session. Please log in again.');
            navigate('/student', { replace: true });
            return;
        }

        fetchData();
    }, [navigate]);

    const handleJoinClassroom = async (e) => {
        e.preventDefault();
        if (!joinCode.trim()) return;
        setJoining(true);
        try {
            await joinClassroom(joinCode.trim());
            toast.success('Joined classroom successfully!');
            setJoinCode('');
            // Refetch classrooms
            const res = await getStudentClassrooms();
            setClassrooms(res.data);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to join classroom.');
        } finally {
            setJoining(false);
        }
    };

    const handleLogout = () => {
        localStorage.removeItem('studentAuthToken');
        toast.success('Logged out successfully');
        navigate('/student');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <p className="text-text-muted">Loading...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            {/* Global Background Effects */}
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-overlay/5 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-overlay/5 blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">
                <div className="space-y-8 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div className="flex items-center gap-4">
                            {photoUrl ? (
                                <img src={photoUrl} alt="" className="w-14 h-14 rounded-full object-cover border-2 border-primary/20 shrink-0" />
                            ) : (
                                <div className="w-14 h-14 rounded-full bg-primary/10 border-2 border-primary/20 flex items-center justify-center shrink-0 text-xl font-bold text-primary">
                                    {(studentName || 'S').charAt(0).toUpperCase()}
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-text-primary">
                                    Welcome, {studentName || 'Student'}
                                </h1>
                                <p className="text-text-muted mt-1">Your classrooms and assignments</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={toggleTheme}
                                className="h-9 w-9 text-text-muted hover:text-text-primary"
                                aria-label="Toggle theme"
                            >
                                {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                            </Button>
                            <Link to="/student/profile">
                                <Button variant="ghost" size="sm" className="text-text-muted hover:text-primary">
                                    Manage Account
                                </Button>
                            </Link>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={handleLogout}
                                className="border-error/20 text-error hover:bg-error/10"
                            >
                                <LogOut className="mr-2 h-4 w-4" />
                                Logout
                            </Button>
                        </div>
                    </div>

                    {/* Join Classroom Section */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardContent className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                                    <Plus className="h-5 w-5 text-primary" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-text-primary">Join a Classroom</h2>
                                    <p className="text-sm text-text-muted">Enter the 6-character code from your teacher</p>
                                </div>
                            </div>
                            <form onSubmit={handleJoinClassroom} className="flex gap-3 items-end">
                                <div className="flex-1 max-w-xs">
                                    <Input
                                        type="text"
                                        value={joinCode}
                                        onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. ABC123"
                                        maxLength={6}
                                    />
                                </div>
                                <Button type="submit" size="md" variant="secondary" isLoading={joining} className="gap-1.5 shrink-0">
                                    Join <ArrowRight className="h-4 w-4" />
                                </Button>
                            </form>
                        </CardContent>
                    </Card>

                    {/* Classrooms Grid */}
                    <div>
                        <div className="flex items-center gap-2 mb-4">
                            <FolderOpen className="h-5 w-5 text-text-muted" />
                            <h2 className="text-lg font-semibold text-text-primary">Your Classrooms</h2>
                            <span className="text-sm text-text-muted">({classrooms.length})</span>
                        </div>

                        {classrooms.length === 0 ? (
                            <div className="rounded-xl border-2 border-dashed border-overlay/[0.07] p-12 text-center">
                                <BookOpen className="h-10 w-10 text-text-muted opacity-40 mx-auto mb-3" />
                                <h3 className="text-lg font-semibold text-text-primary mb-1">No classrooms yet</h3>
                                <p className="text-sm text-text-muted max-w-md mx-auto">
                                    Join your first classroom using a code from your teacher
                                </p>
                            </div>
                        ) : (
                            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                {classrooms.map((classroom) => (
                                    <Card key={classroom.id} className="border-none shadow-soft bg-surface hover:bg-surface-dark/50 transition-colors">
                                        <CardContent className="p-5 flex flex-col gap-4">
                                            <div>
                                                <h3 className="text-lg font-bold text-text-primary">{classroom.name}</h3>
                                                <p className="text-sm text-text-muted mt-1">
                                                    <Users className="inline h-3.5 w-3.5 mr-1 relative -top-px" />
                                                    {classroom.teacher_name || 'Teacher'}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs text-text-muted">
                                                    {classroom.assignment_count ?? 0} assignment{(classroom.assignment_count ?? 0) !== 1 ? 's' : ''}
                                                </span>
                                                <Link to={`/student/classroom/${classroom.id}`}>
                                                    <Button size="sm" className="rounded-[8px] shadow-none group">
                                                        View Assignments <ArrowRight className="ml-1.5 h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                                                    </Button>
                                                </Link>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
