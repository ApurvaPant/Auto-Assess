import { useState, useEffect } from 'react';
import { generateQuestions, getPackages, generateQuestionsFromText, generateQuestionsFromFile, deletePackages, deleteAllPackages } from '../../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Upload, FileText, Type, ChevronRight, Trash2, CheckSquare, Square, X } from 'lucide-react';
import { Select } from '../../components/ui/Select';
import { cn } from '../../lib/utils';
import { useAuth } from '../../contexts/AuthContext';

export default function GenerateQuestions() {
    const { classroomId } = useAuth();
    const [availablePackages, setAvailablePackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('topic');
    const [selectedIds, setSelectedIds] = useState(new Set());
    const [selectMode, setSelectMode] = useState(false);
    const [deleting, setDeleting] = useState(false);

    // Form States
    const [topic, setTopic] = useState('basic list manipulation');
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [difficulty, setDifficulty] = useState('easy');
    const [nQuestions, setNQuestions] = useState(5);

    useEffect(() => { fetchExistingPackages(); }, []);

    const fetchExistingPackages = async () => {
        try {
            const response = await getPackages(classroomId);
            setAvailablePackages(response.data);
        } catch {
            toast.error("Could not load existing packages.");
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (activeTab === 'topic') response = await generateQuestions(topic, difficulty, nQuestions, classroomId);
            else if (activeTab === 'text') response = await generateQuestionsFromText(text, difficulty, nQuestions, classroomId);
            else if (activeTab === 'file') {
                if (!file) throw new Error("Please upload a file.");
                response = await generateQuestionsFromFile(file, nQuestions, difficulty, classroomId);
            }
            setAvailablePackages(prev => [...response.data, ...prev]);
            toast.success(`Generated ${response.data.length} package${response.data.length !== 1 ? 's' : ''}!`);
            if (activeTab === 'file') setFile(null);
            if (activeTab === 'text') setText('');
        } catch (error) {
            toast.error(error.response?.data?.detail || error.message || 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === availablePackages.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(availablePackages.map(p => p.id)));
        }
    };

    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;
        if (!window.confirm(`Delete ${selectedIds.size} selected package${selectedIds.size !== 1 ? 's' : ''}? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deletePackages(Array.from(selectedIds));
            setAvailablePackages(prev => prev.filter(p => !selectedIds.has(p.id)));
            setSelectedIds(new Set());
            setSelectMode(false);
            toast.success(`Deleted ${selectedIds.size} package${selectedIds.size !== 1 ? 's' : ''}.`);
        } catch {
            toast.error("Failed to delete packages.");
        } finally {
            setDeleting(false);
        }
    };

    const handleClearAll = async () => {
        if (availablePackages.length === 0) return;
        if (!window.confirm(`Delete ALL ${availablePackages.length} packages? This cannot be undone.`)) return;
        setDeleting(true);
        try {
            await deleteAllPackages(classroomId);
            setAvailablePackages([]);
            setSelectedIds(new Set());
            setSelectMode(false);
            toast.success("All packages deleted.");
        } catch {
            toast.error("Failed to clear packages.");
        } finally {
            setDeleting(false);
        }
    };

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelectedIds(new Set());
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md flex-1",
                activeTab === id
                    ? "bg-primary text-primary-foreground shadow-md shadow-black/20 font-semibold"
                    : "text-text-muted hover:bg-surface hover:text-text-primary"
            )}
        >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </button>
    );

    const allSelected = availablePackages.length > 0 && selectedIds.size === availablePackages.length;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-text-primary">Question Generator</h1>
                <p className="text-text-muted mt-1">Create new coding problems using AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* Left: Generator Controls */}
                <div className="lg:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex space-x-2 bg-background/50 p-1 rounded-lg border border-overlay/5">
                                <TabButton id="topic" label="Topic" icon={Type} />
                                <TabButton id="text" label="Text" icon={FileText} />
                                <TabButton id="file" label="File" icon={Upload} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleGenerate} className="space-y-4">
                                {activeTab === 'topic' && (
                                    <Input label="Topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Recursion" required />
                                )}
                                {activeTab === 'text' && (
                                    <div className="w-full">
                                        <label className="mb-2 block text-sm font-semibold text-text-secondary">Syllabus Text</label>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            rows={6}
                                            required
                                            className="flex w-full rounded-xl border border-overlay/15 bg-overlay/[0.04] px-4 py-3 text-sm text-text-primary placeholder:text-text-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-overlay/20 disabled:opacity-50 resize-none"
                                            placeholder="Paste text here..."
                                        />
                                    </div>
                                )}
                                {activeTab === 'file' && (
                                    <div className="w-full">
                                        <label className="mb-2 block text-sm font-semibold text-text-secondary">Upload (PDF/Image)</label>
                                        <Input type="file" accept=".pdf,image/*" onChange={(e) => setFile(e.target.files[0])} required className="cursor-pointer file:cursor-pointer" />
                                    </div>
                                )}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="w-full">
                                        <Select
                                            label="Difficulty"
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </Select>
                                    </div>
                                    <Input label="Count" type="number" min="1" max="20" value={nQuestions} onChange={(e) => setNQuestions(parseInt(e.target.value) || 1)} required />
                                </div>
                                <Button type="submit" className="w-full" isLoading={loading}>Generate</Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* Right: Packages List */}
                <div className="lg:col-span-8 space-y-4">
                    {/* Header row */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-bold text-text-primary">Generated Packages</h2>
                            <Badge variant="secondary">{availablePackages.length}</Badge>
                        </div>

                        <div className="flex items-center gap-2">
                            {selectMode ? (
                                <>
                                    {/* Select all */}
                                    <button
                                        onClick={toggleSelectAll}
                                        className="flex items-center gap-1.5 text-xs text-text-muted hover:text-text-primary transition-colors px-2 py-1.5"
                                    >
                                        {allSelected
                                            ? <CheckSquare className="h-4 w-4 text-primary" />
                                            : <Square className="h-4 w-4" />
                                        }
                                        {allSelected ? 'Deselect All' : 'Select All'}
                                    </button>

                                    {selectedIds.size > 0 && (
                                        <Button
                                            variant="danger"
                                            size="sm"
                                            onClick={handleDeleteSelected}
                                            isLoading={deleting}
                                            className="gap-1.5"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                            Delete ({selectedIds.size})
                                        </Button>
                                    )}

                                    <Button variant="ghost" size="sm" onClick={exitSelectMode} className="gap-1">
                                        <X className="h-3.5 w-3.5" /> Cancel
                                    </Button>
                                </>
                            ) : (
                                <>
                                    {availablePackages.length > 0 && (
                                        <>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => setSelectMode(true)}
                                                className="gap-1.5"
                                            >
                                                <CheckSquare className="h-3.5 w-3.5" /> Select
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={handleClearAll}
                                                isLoading={deleting}
                                                className="gap-1.5 border-error/30 text-error hover:bg-error/10 hover:border-error/50"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" /> Clear All
                                            </Button>
                                        </>
                                    )}
                                </>
                            )}
                        </div>
                    </div>

                    {/* Selection count indicator */}
                    {selectMode && (
                        <p className="text-xs text-text-muted">
                            {selectedIds.size === 0
                                ? 'Click packages to select them'
                                : `${selectedIds.size} of ${availablePackages.length} selected`}
                        </p>
                    )}

                    {/* Package list */}
                    <div className="space-y-3">
                        {availablePackages.length === 0 && !loading && (
                            <div className="text-center py-20 border-2 border-dashed border-overlay/[0.07] rounded-2xl">
                                <p className="text-text-muted text-sm">No packages yet. Generate some!</p>
                            </div>
                        )}
                        {availablePackages.map((pkg) => (
                            <PackageItem
                                key={pkg.id}
                                pkg={pkg}
                                selectMode={selectMode}
                                isSelected={selectedIds.has(pkg.id)}
                                onToggle={() => toggleSelect(pkg.id)}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

const PackageItem = ({ pkg, selectMode, isSelected, onToggle }) => {
    const [isOpen, setIsOpen] = useState(false);

    const handleClick = () => {
        if (selectMode) {
            onToggle();
        } else {
            setIsOpen(!isOpen);
        }
    };

    return (
        <div
            className={cn(
                "rounded-2xl border bg-surface overflow-hidden transition-all duration-150",
                isSelected
                    ? "border-primary/50 bg-primary/5"
                    : "border-overlay/[0.07] hover:border-overlay/15"
            )}
        >
            <div
                className="flex items-center justify-between p-4 cursor-pointer"
                onClick={handleClick}
            >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    {/* Checkbox or expand indicator */}
                    {selectMode ? (
                        <div className={cn(
                            "flex-shrink-0 w-5 h-5 rounded border flex items-center justify-center transition-all",
                            isSelected ? "bg-primary border-primary" : "border-overlay/20 bg-transparent"
                        )}>
                            {isSelected && (
                                <svg className="w-3 h-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    ) : (
                        <div className={cn("flex-shrink-0 p-1.5 rounded-lg bg-overlay/5 text-text-muted transition-transform duration-200", isOpen && "rotate-90")}>
                            <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                    )}

                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-text-primary truncate">{pkg.title || 'Untitled Question'}</p>
                        <div className="flex items-center gap-2 mt-1">
                            <Badge variant={pkg.difficulty === 'hard' ? 'error' : pkg.difficulty === 'medium' ? 'warning' : 'success'}>
                                {pkg.difficulty}
                            </Badge>
                            <span className="text-xs text-text-muted">{pkg.testcases?.length || 0} test cases</span>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && !selectMode && (
                <div className="px-4 pb-4 border-t border-overlay/[0.06] pt-3">
                    <div className="prose prose-invert prose-sm max-w-none text-text-muted">
                        <ReactMarkdown>{pkg.prompt}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};
