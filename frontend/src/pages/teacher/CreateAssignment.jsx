import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getPackages, createAssignment, getAssignments, deleteAssignment } from '../../api/client';
import toast from 'react-hot-toast';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { CheckCircle, Trash2, ClipboardList, CheckCircle2, Clock, ArrowUpRight, CalendarClock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const getDifficultyColor = (difficulty) => ({
    easy:   'bg-success/15 text-success border-success/25',
    medium: 'bg-warning/15 text-warning border-warning/25',
    hard:   'bg-error/15 text-error border-error/25',
}[difficulty] || 'bg-overlay/10 text-text-muted border-overlay/10');

export default function CreateAssignment() {
    const { classroomId } = useAuth();
    const [packages, setPackages] = useState([]);
    const [selectedPackages, setSelectedPackages] = useState(new Set());
    const [assignmentName, setAssignmentName] = useState('');
    const [deadlineDate, setDeadlineDate] = useState('');
    const [deadlineTime, setDeadlineTime] = useState('');
    const [creating, setCreating] = useState(false);

    const [assignments, setAssignments] = useState([]);
    const [deletingId, setDeletingId] = useState(null);

    const fetchAll = async () => {
        try {
            const [pkgRes, asgRes] = await Promise.all([getPackages(classroomId), getAssignments(classroomId)]);
            setPackages(pkgRes.data);
            setAssignments(asgRes.data.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
        } catch {
            toast.error('Failed to load data.');
        }
    };

    useEffect(() => { fetchAll(); }, []);

    const handleSelectPackage = (id) => {
        const next = new Set(selectedPackages);
        next.has(id) ? next.delete(id) : next.add(id);
        setSelectedPackages(next);
    };

    const handleCreate = async (e) => {
        e.preventDefault();
        if (selectedPackages.size === 0 || !assignmentName.trim()) {
            toast.error('Please name the assignment and select at least one package.');
            return;
        }
        setCreating(true);
        try {
            const deadlineISO = deadlineDate ? new Date(`${deadlineDate}T${deadlineTime || '23:59'}:00+05:30`).toISOString() : null;
            await createAssignment(assignmentName.trim(), Array.from(selectedPackages), classroomId, deadlineISO);
            toast.success(`Assignment "${assignmentName}" created!`);
            setAssignmentName('');
            setDeadlineDate('');
            setDeadlineTime('');
            setSelectedPackages(new Set());
            fetchAll();
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to create assignment.');
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (id, name) => {
        if (!window.confirm(`Delete assignment "${name}"?\n\nThis will remove all student submission records for this assignment. This cannot be undone.`)) return;
        setDeletingId(id);
        try {
            await deleteAssignment(id);
            toast.success(`Assignment "${name}" deleted.`);
            setAssignments(prev => prev.filter(a => a.id !== id));
        } catch (err) {
            toast.error(err.response?.data?.detail || 'Failed to delete assignment.');
        } finally {
            setDeletingId(null);
        }
    };

    return (
        <div className="space-y-6">
            {/* Create new */}
            <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/[0.05]">
                    <CardTitle className="text-text-primary">Create New Assignment</CardTitle>
                    <p className="text-sm text-text-muted mt-0.5">Select packages to include. The system will auto-distribute them to all students.</p>
                </CardHeader>
                <CardContent className="pt-5">
                    <form onSubmit={handleCreate} className="space-y-5">
                        <div className="flex flex-col sm:flex-row gap-4 items-end">
                            <Input
                                label="Assignment Name"
                                type="text"
                                placeholder="e.g., Midterm Practice 1"
                                className="max-w-md"
                                value={assignmentName}
                                onChange={(e) => setAssignmentName(e.target.value)}
                            />
                            <div className="w-full max-w-xs">
                                <label className="block text-sm font-medium text-text-muted mb-2 flex items-center gap-1.5">
                                    <CalendarClock className="h-4 w-4" /> Deadline <span className="text-text-muted opacity-60">(optional, IST)</span>
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        value={deadlineDate}
                                        onChange={(e) => setDeadlineDate(e.target.value)}
                                        className="flex-1 h-10 rounded-lg border border-overlay/[0.1] bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-overlay/20 hover:border-overlay/20 transition-colors [color-scheme:dark] min-w-0"
                                    />
                                    <input
                                        type="time"
                                        value={deadlineTime}
                                        onChange={(e) => setDeadlineTime(e.target.value)}
                                        className="w-28 h-10 rounded-lg border border-overlay/[0.1] bg-surface px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-overlay/20 hover:border-overlay/20 transition-colors [color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center gap-2 mb-3">
                                <h3 className="text-sm font-semibold text-text-primary">Available Packages</h3>
                                <span className="text-xs text-text-muted">({packages.length})</span>
                                {selectedPackages.size > 0 && (
                                    <span className="ml-auto text-xs font-medium text-primary">{selectedPackages.size} selected</span>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 max-h-[380px] overflow-y-auto p-1">
                                {packages.length === 0 && (
                                    <p className="text-text-muted text-sm col-span-full text-center py-10">
                                        No packages yet. Generate some on the Generate page.
                                    </p>
                                )}
                                {packages.map((pkg) => {
                                    const selected = selectedPackages.has(pkg.id);
                                    return (
                                        <div
                                            key={pkg.id}
                                            onClick={() => handleSelectPackage(pkg.id)}
                                            className={`p-3.5 rounded-xl cursor-pointer transition-all border ${
                                                selected
                                                    ? 'border-overlay/30 bg-overlay/[0.06] ring-1 ring-overlay/20'
                                                    : 'border-overlay/[0.06] bg-background/40 hover:border-overlay/[0.14] hover:bg-overlay/[0.03]'
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-text-primary truncate">{pkg.title || '[Untitled]'}</p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded border ${getDifficultyColor(pkg.difficulty)}`}>
                                                            {pkg.difficulty}
                                                        </span>
                                                        <span className="text-xs text-text-muted">{pkg.testcases?.length || 0} tests</span>
                                                    </div>
                                                </div>
                                                {selected && <CheckCircle className="h-4 w-4 text-text-primary flex-shrink-0 mt-0.5" />}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="flex justify-end pt-2">
                            <Button type="submit" isLoading={creating} className="shadow-none">
                                Create Assignment ({selectedPackages.size} selected)
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Existing assignments */}
            <Card className="border-none shadow-soft bg-surface">
                <CardHeader className="border-b border-overlay/[0.05]">
                    <div className="flex items-center gap-2">
                        <ClipboardList className="h-4 w-4 text-text-muted" />
                        <CardTitle className="text-text-primary">Existing Assignments</CardTitle>
                        <span className="text-xs text-text-muted ml-1">({assignments.length})</span>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {assignments.length === 0 ? (
                        <p className="text-sm text-text-muted text-center py-10">No assignments created yet.</p>
                    ) : (
                        <div className="divide-y divide-overlay/[0.04]">
                            {assignments.map((a) => (
                                <div key={a.id} className="flex items-center justify-between px-5 py-3.5 hover:bg-overlay/[0.02] transition-colors">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className={`h-2 w-2 rounded-full flex-shrink-0 ${a.results_released ? 'bg-success' : 'bg-warning'}`} />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-text-primary truncate">{a.name}</p>
                                            <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                                                {a.results_released ? (
                                                    <span className="text-xs text-success flex items-center gap-1">
                                                        <CheckCircle2 className="h-3 w-3" /> Results published
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-text-muted flex items-center gap-1">
                                                        <Clock className="h-3 w-3" /> Pending
                                                    </span>
                                                )}
                                                {a.deadline && (() => {
                                                    const isPast = new Date(a.deadline) < new Date();
                                                    const ist = new Date(a.deadline).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
                                                    return (
                                                        <span className={`text-xs flex items-center gap-1 ${isPast ? 'text-error' : 'text-warning'}`}>
                                                            <CalendarClock className="h-3 w-3" />
                                                            {isPast ? 'Was due' : 'Due'}: {ist} IST
                                                        </span>
                                                    );
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1 shrink-0 ml-4">
                                        <Link to={`/teacher/assign/${a.id}`}>
                                            <button
                                                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-text-muted border border-overlay/[0.07] hover:text-text-primary hover:border-overlay/[0.14] hover:bg-overlay/[0.04] transition-colors"
                                                title="View details"
                                            >
                                                View <ArrowUpRight className="h-3 w-3" />
                                            </button>
                                        </Link>
                                        <button
                                            onClick={() => handleDelete(a.id, a.name)}
                                            disabled={deletingId === a.id}
                                            className="p-1.5 rounded-lg text-text-muted hover:text-error hover:bg-error/10 transition-colors disabled:opacity-40"
                                            title="Delete assignment"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
