import { useState, useEffect } from 'react';
import { getClassroomDoubts, replyToDoubt } from '../../api/client';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { MessageCircle, Send, CheckCircle, Clock } from 'lucide-react';

export default function TeacherDoubts() {
    const { classroomId } = useAuth();
    const [doubts, setDoubts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [replyText, setReplyText] = useState({});
    const [replying, setReplying] = useState(null);

    const fetchDoubts = async () => {
        if (!classroomId) return;
        try {
            const res = await getClassroomDoubts(classroomId);
            setDoubts(res.data);
        } catch (e) {
            toast.error('Failed to load doubts');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchDoubts();
        const interval = setInterval(fetchDoubts, 30000);
        return () => clearInterval(interval);
    }, [classroomId]);

    const handleReply = async (doubtId) => {
        const text = replyText[doubtId]?.trim();
        if (!text) return;
        setReplying(doubtId);
        try {
            await replyToDoubt(doubtId, text);
            toast.success('Reply sent');
            setReplyText(prev => ({ ...prev, [doubtId]: '' }));
            fetchDoubts();
        } catch (e) {
            toast.error('Failed to send reply');
        } finally {
            setReplying(null);
        }
    };

    const unanswered = doubts.filter(d => !d.reply);
    const answered = doubts.filter(d => d.reply);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Student Doubts</h1>
                <p className="text-text-muted mt-1">
                    {unanswered.length} unanswered · {answered.length} answered
                </p>
            </div>

            {loading ? (
                <p className="text-text-muted text-sm">Loading...</p>
            ) : doubts.length === 0 ? (
                <Card className="border-none shadow-soft bg-surface">
                    <CardContent className="py-12 text-center">
                        <MessageCircle className="h-10 w-10 text-text-muted mx-auto mb-3 opacity-40" />
                        <p className="text-text-muted text-sm">No doubts yet from students</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-4">
                    {doubts.map(d => (
                        <Card key={d.id} className="border-none shadow-soft bg-surface">
                            <CardContent className="p-5 space-y-3">
                                {/* Header */}
                                <div className="flex items-start justify-between gap-3">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {d.student_photo_url ? (
                                                <img src={d.student_photo_url} alt="" className="h-7 w-7 rounded-full object-cover border border-overlay/[0.1] shrink-0" />
                                            ) : (
                                                <div className="h-7 w-7 rounded-full bg-overlay/[0.07] border border-overlay/[0.08] flex items-center justify-center text-[11px] font-semibold text-text-muted shrink-0">
                                                    {d.student_name?.charAt(0)?.toUpperCase() || 'S'}
                                                </div>
                                            )}
                                            <span className="text-sm font-semibold text-text-primary">{d.student_name}</span>
                                            {d.assignment_name && (
                                                <span className="text-xs bg-overlay/[0.06] border border-overlay/[0.08] text-text-muted rounded px-2 py-0.5">
                                                    Re: {d.assignment_name}
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-text-secondary mt-2">{d.question}</p>
                                        <p className="text-[11px] text-text-muted mt-1">{new Date(d.created_at).toLocaleString()}</p>
                                    </div>
                                    {d.reply
                                        ? <span className="flex items-center gap-1 text-xs text-success shrink-0"><CheckCircle className="h-3.5 w-3.5" /> Answered</span>
                                        : <span className="flex items-center gap-1 text-xs text-warning shrink-0"><Clock className="h-3.5 w-3.5" /> Pending</span>
                                    }
                                </div>

                                {/* Existing reply */}
                                {d.reply && (
                                    <div className="bg-surface-dark/50 border border-overlay/[0.06] rounded-lg p-3">
                                        <p className="text-[11px] text-text-muted mb-1">Your reply</p>
                                        <p className="text-sm text-text-primary">{d.reply}</p>
                                    </div>
                                )}

                                {/* Reply form */}
                                <div className="flex gap-2 pt-1">
                                    <input
                                        type="text"
                                        value={replyText[d.id] || ''}
                                        onChange={e => setReplyText(prev => ({ ...prev, [d.id]: e.target.value }))}
                                        onKeyDown={e => e.key === 'Enter' && handleReply(d.id)}
                                        placeholder={d.reply ? "Update reply..." : "Write a reply..."}
                                        className="flex-1 h-9 px-3 rounded-lg text-sm bg-background border border-overlay/[0.1] text-text-primary placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-overlay/20"
                                    />
                                    <Button
                                        size="sm"
                                        onClick={() => handleReply(d.id)}
                                        disabled={replying === d.id || !replyText[d.id]?.trim()}
                                        className="shrink-0 gap-1.5"
                                    >
                                        <Send className="h-3.5 w-3.5" />
                                        {d.reply ? 'Update' : 'Reply'}
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
