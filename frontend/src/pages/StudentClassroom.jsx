import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getStudentAssignments, askDoubt, getStudentDoubts } from '../api/client';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    ArrowLeft, BookOpen, CheckCircle, Clock, ArrowRight, Eye,
    MessageCircle, Send, ChevronDown, ChevronUp, Trophy, ListChecks, CalendarClock,
} from 'lucide-react';

const StatPill = ({ label, value, color }) => (
    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-surface border border-overlay/[0.07] min-w-[90px]">
        <span className={`text-2xl font-bold ${color}`}>{value}</span>
        <span className="text-xs text-text-muted mt-1 text-center">{label}</span>
    </div>
);

const AssignmentCard = ({ assignment }) => {
    const deadline = assignment.deadline ? new Date(assignment.deadline) : null;
    const isPastDeadline = deadline && new Date() > deadline;
    const submitted = assignment.has_submitted;
    const released = assignment.results_released;

    return (
        <div className="flex items-center justify-between gap-4 p-4 rounded-xl bg-surface border border-overlay/[0.07] hover:border-overlay/[0.14] transition-all">
            <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-text-primary truncate">{assignment.assignment_name}</p>
                <p className="text-xs text-text-muted mt-0.5 truncate">{assignment.package_title}</p>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {released && assignment.final_score !== null && assignment.final_score !== undefined && (
                        <span className={`text-xs font-semibold ${assignment.final_score >= 80 ? 'text-success' : assignment.final_score >= 50 ? 'text-warning' : 'text-error'}`}>
                            {assignment.final_score.toFixed(1)}%
                        </span>
                    )}
                    {deadline && (
                        <span className={`text-xs flex items-center gap-1 ${isPastDeadline ? 'text-error' : 'text-warning'}`}>
                            <CalendarClock className="h-3 w-3" />
                            {isPastDeadline ? 'Was due' : 'Due'}: {deadline.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true })} IST
                        </span>
                    )}
                </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
                {!submitted ? (
                    <Link to={`/student/assignment/${assignment.assignment_id}`}>
                        <Button size="sm" className="gap-1">
                            Start <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </Link>
                ) : released ? (
                    <Link to={`/student/results/${assignment.assignment_id}`}>
                        <Button size="sm" className="gap-1.5">
                            <Eye className="h-3.5 w-3.5" /> Full Review
                        </Button>
                    </Link>
                ) : (
                    <Button
                        size="sm"
                        variant="outline"
                        disabled
                        className="gap-1.5 opacity-50 cursor-not-allowed select-none"
                        title="Results have not been released yet"
                    >
                        <Clock className="h-3.5 w-3.5" /> Awaiting Results
                    </Button>
                )}
            </div>
        </div>
    );
};

export default function StudentClassroom() {
    const { classroomId } = useParams();
    const navigate = useNavigate();
    const [assignments, setAssignments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [doubts, setDoubts] = useState([]);
    const [question, setQuestion] = useState('');
    const [linkedAssignment, setLinkedAssignment] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [doubtsOpen, setDoubtsOpen] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('studentAuthToken');
        if (!token) {
            toast.error('Not authorized. Please log in.');
            navigate('/student', { replace: true });
            return;
        }
        const loadAll = async () => {
            try {
                const aRes = await getStudentAssignments(classroomId);
                setAssignments(aRes.data);
            } catch (e) {
                toast.error(e.response?.data?.detail || 'Failed to load assignments.');
            } finally {
                setLoading(false);
            }
            // Doubts load independently — failure never blocks the assignment list
            try {
                const dRes = await getStudentDoubts(classroomId);
                setDoubts(dRes.data);
            } catch {
                // silently ignore — doubts are non-critical
            }
        };
        loadAll();
    }, [classroomId, navigate]);

    const pending = assignments.filter(a => !a.has_submitted);
    const submitted = assignments.filter(a => a.has_submitted);
    const withResults = submitted.filter(a => a.results_released);
    const completion = assignments.length > 0 ? Math.round((submitted.length / assignments.length) * 100) : 0;

    const handleAskDoubt = async (e) => {
        e.preventDefault();
        if (!question.trim()) return;
        setSubmitting(true);
        try {
            await askDoubt(classroomId, question.trim(), linkedAssignment ? parseInt(linkedAssignment) : null);
            toast.success('Doubt submitted!');
            setQuestion('');
            setLinkedAssignment('');
            const res = await getStudentDoubts(classroomId);
            setDoubts(res.data);
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to submit doubt.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background relative overflow-hidden">
            <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-overlay/5 blur-[120px] pointer-events-none" />
            <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-overlay/5 blur-[120px] pointer-events-none" />

            <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-5xl">
                <div className="space-y-6 animate-in fade-in duration-500">
                    {/* Header */}
                    <div className="flex items-center gap-3">
                        <Link to="/student/dashboard">
                            <Button variant="ghost" size="icon" className="h-9 w-9">
                                <ArrowLeft className="h-4 w-4" />
                            </Button>
                        </Link>
                        <div>
                            <h1 className="text-2xl font-bold tracking-tight text-text-primary">Assignments</h1>
                            <p className="text-text-muted text-sm">{assignments.length} total assignment{assignments.length !== 1 ? 's' : ''}</p>
                        </div>
                    </div>

                    {/* Stats Row */}
                    {assignments.length > 0 && (
                        <div className="flex gap-3 flex-wrap">
                            <StatPill label="Total" value={assignments.length} color="text-text-primary" />
                            <StatPill label="Pending" value={pending.length} color="text-warning" />
                            <StatPill label="Submitted" value={submitted.length} color="text-success" />
                            <StatPill label="Results Out" value={withResults.length} color="text-primary" />
                            {/* Progress */}
                            <div className="flex-1 min-w-[180px] p-4 rounded-xl bg-surface border border-overlay/[0.07] flex flex-col justify-center gap-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-text-muted font-medium">Completion</span>
                                    <span className="font-bold text-text-primary">{completion}%</span>
                                </div>
                                <div className="h-2 bg-overlay/[0.07] rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{ width: `${completion}%`, background: completion === 100 ? '#10b981' : completion >= 50 ? '#f59e0b' : 'rgb(var(--color-primary))' }}
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {assignments.length === 0 ? (
                        <div className="rounded-xl border-2 border-dashed border-overlay/[0.07] p-12 text-center">
                            <BookOpen className="h-10 w-10 text-text-muted opacity-40 mx-auto mb-3" />
                            <h3 className="text-lg font-semibold text-text-primary mb-1">No assignments yet</h3>
                            <p className="text-sm text-text-muted">Your teacher hasn't created any assignments yet.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4 lg:grid-cols-2">
                            {/* Pending / Active */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <Clock className="h-4 w-4 text-warning" />
                                    Active ({pending.length})
                                </div>
                                {pending.length === 0 ? (
                                    <div className="p-6 rounded-xl border border-dashed border-overlay/[0.07] text-center">
                                        <CheckCircle className="h-8 w-8 text-success mx-auto mb-2 opacity-60" />
                                        <p className="text-sm text-text-muted">All caught up!</p>
                                    </div>
                                ) : (
                                    pending.map(a => <AssignmentCard key={a.assignment_id} assignment={a} />)
                                )}
                            </div>

                            {/* Submitted */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
                                    <ListChecks className="h-4 w-4 text-success" />
                                    Submitted ({submitted.length})
                                </div>
                                {submitted.length === 0 ? (
                                    <div className="p-6 rounded-xl border border-dashed border-overlay/[0.07] text-center">
                                        <p className="text-sm text-text-muted">No submissions yet</p>
                                    </div>
                                ) : (
                                    submitted.map(a => <AssignmentCard key={a.assignment_id} assignment={a} />)
                                )}
                            </div>
                        </div>
                    )}

                    {/* Scores Summary (if any results released) */}
                    {withResults.length > 0 && (
                        <Card className="border-none shadow-soft bg-surface">
                            <CardHeader className="pb-3 border-b border-overlay/[0.06]">
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <Trophy className="h-4 w-4 text-warning" /> Your Scores
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-4">
                                <div className="space-y-3">
                                    {withResults.map(a => (
                                        <div key={a.assignment_id}>
                                            <div className="flex justify-between text-xs mb-1">
                                                <span className="text-text-primary font-medium truncate max-w-[200px]">{a.assignment_name}</span>
                                                <span className={`font-bold shrink-0 ml-2 ${a.final_score >= 80 ? 'text-success' : a.final_score >= 50 ? 'text-warning' : 'text-error'}`}>
                                                    {a.final_score?.toFixed(1)}%
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-overlay/[0.07] rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all duration-700"
                                                    style={{
                                                        width: `${a.final_score}%`,
                                                        background: a.final_score >= 80 ? '#10b981' : a.final_score >= 50 ? '#f59e0b' : '#ef4444',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Doubts / Q&A Section */}
                    <Card className="border-none shadow-soft bg-surface">
                        <CardHeader className="border-b border-overlay/[0.06]">
                            <button
                                onClick={() => setDoubtsOpen(o => !o)}
                                className="w-full flex items-center justify-between text-left"
                            >
                                <CardTitle className="text-sm flex items-center gap-2">
                                    <MessageCircle className="h-4 w-4 text-primary" />
                                    Ask a Doubt
                                    {doubts.length > 0 && (
                                        <span className="text-xs bg-overlay/[0.07] border border-overlay/[0.08] rounded-full px-2 py-0.5 text-text-muted">
                                            {doubts.length}
                                        </span>
                                    )}
                                </CardTitle>
                                {doubtsOpen ? <ChevronUp className="h-4 w-4 text-text-muted" /> : <ChevronDown className="h-4 w-4 text-text-muted" />}
                            </button>
                        </CardHeader>

                        {doubtsOpen && (
                            <CardContent className="pt-4 space-y-4">
                                {/* Ask form */}
                                <form onSubmit={handleAskDoubt} className="space-y-3">
                                    {assignments.length > 0 && (
                                        <select
                                            value={linkedAssignment}
                                            onChange={e => setLinkedAssignment(e.target.value)}
                                            className="w-full appearance-none h-9 pl-3 pr-8 rounded-lg text-sm bg-surface border border-overlay/[0.1] text-text-primary focus:outline-none focus:ring-2 focus:ring-overlay/20"
                                        >
                                            <option value="">Optional: Link to an assignment</option>
                                            {assignments.map(a => (
                                                <option key={a.assignment_id} value={a.assignment_id}>{a.assignment_name}</option>
                                            ))}
                                        </select>
                                    )}
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={question}
                                            onChange={e => setQuestion(e.target.value)}
                                            placeholder="Ask your teacher a question..."
                                            className="flex-1 h-10 px-3 rounded-lg text-sm bg-surface border border-overlay/[0.1] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-overlay/20"
                                        />
                                        <Button type="submit" size="sm" disabled={submitting || !question.trim()} className="shrink-0 gap-1.5">
                                            <Send className="h-3.5 w-3.5" /> Send
                                        </Button>
                                    </div>
                                </form>

                                {/* Doubts thread */}
                                {doubts.length > 0 && (
                                    <div className="space-y-3 max-h-80 overflow-y-auto scrollbar-thin pr-1">
                                        {doubts.map(d => (
                                            <div key={d.id} className="space-y-2">
                                                {/* Student's question */}
                                                <div className="flex justify-end">
                                                    <div className="max-w-[80%] rounded-xl rounded-br-sm bg-primary text-primary-foreground px-3.5 py-2.5">
                                                        {d.assignment_name && (
                                                            <p className="text-[10px] opacity-70 mb-1">Re: {d.assignment_name}</p>
                                                        )}
                                                        <p className="text-sm">{d.question}</p>
                                                        <p className="text-[10px] opacity-60 mt-1 text-right">
                                                            {new Date(d.created_at).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                {/* Teacher's reply */}
                                                {d.reply ? (
                                                    <div className="flex justify-start">
                                                        <div className="max-w-[80%] rounded-xl rounded-bl-sm bg-surface-dark border border-overlay/[0.08] px-3.5 py-2.5">
                                                            <p className="text-[10px] text-text-muted mb-1">Teacher</p>
                                                            <p className="text-sm text-text-primary">{d.reply}</p>
                                                            {d.replied_at && (
                                                                <p className="text-[10px] text-text-muted mt-1">
                                                                    {new Date(d.replied_at).toLocaleDateString()}
                                                                </p>
                                                            )}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <div className="flex justify-start">
                                                        <span className="text-xs text-text-muted italic ml-2">Awaiting reply...</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {doubts.length === 0 && (
                                    <p className="text-xs text-text-muted text-center py-2">No doubts yet. Ask your first question above.</p>
                                )}
                            </CardContent>
                        )}
                    </Card>
                </div>
            </div>
        </div>
    );
}
