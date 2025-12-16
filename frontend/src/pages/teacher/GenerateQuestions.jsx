import { useState, useEffect } from 'react';
import { generateQuestions, getPackages, generateQuestionsFromText, generateQuestionsFromFile } from '../../api/client';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Loader2, Upload, FileText, Type, ChevronRight, ChevronDown } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function GenerateQuestions() {
    const [availablePackages, setAvailablePackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('topic'); // 'topic', 'text', 'file'

    // Form States
    const [topic, setTopic] = useState('basic list manipulation');
    const [text, setText] = useState('');
    const [file, setFile] = useState(null);
    const [difficulty, setDifficulty] = useState('easy');
    const [nQuestions, setNQuestions] = useState(5);

    useEffect(() => {
        fetchExistingPackages();
    }, []);

    const fetchExistingPackages = async () => {
        try {
            const response = await getPackages();
            setAvailablePackages(response.data);
        } catch (error) {
            toast.error("Could not load existing packages.");
        }
    };

    const handleGenerate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let response;
            if (activeTab === 'topic') {
                response = await generateQuestions(topic, difficulty, nQuestions);
            } else if (activeTab === 'text') {
                response = await generateQuestionsFromText(text, difficulty, nQuestions);
            } else if (activeTab === 'file') {
                if (!file) throw new Error("Please upload a file.");
                response = await generateQuestionsFromFile(file, nQuestions, difficulty);
            }

            setAvailablePackages(prev => [...response.data, ...prev]); // Prepend new
            toast.success(`Generated ${response.data.length} questions!`);
            // Reset fields
            if (activeTab === 'file') setFile(null);
            if (activeTab === 'text') setText('');
        } catch (error) {
            toast.error(error.response?.data?.detail || error.message || 'Generation failed.');
        } finally {
            setLoading(false);
        }
    };

    const TabButton = ({ id, label, icon: Icon }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={cn(
                "flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-md flex-1",
                activeTab === id
                    ? "bg-primary text-white shadow-md shadow-primary/20"
                    : "text-text-muted hover:bg-surface hover:text-text-primary"
            )}
        >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
        </button>
    );

    return (
        <div className="space-y-8">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-bold tracking-tight text-white">Question Generator</h1>
                <p className="text-text-muted">Create new coding problems using AI.</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                {/* --- Left Column: Generator Controls --- */}
                <div className="lg:col-span-4 space-y-6">
                    <Card>
                        <CardHeader>
                            <div className="flex space-x-2 bg-background/50 p-1 rounded-lg border border-gray-800">
                                <TabButton id="topic" label="Topic" icon={Type} />
                                <TabButton id="text" label="Text" icon={FileText} />
                                <TabButton id="file" label="File" icon={Upload} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <form onSubmit={handleGenerate} className="space-y-4">

                                {activeTab === 'topic' && (
                                    <Input
                                        label="Topic"
                                        value={topic}
                                        onChange={(e) => setTopic(e.target.value)}
                                        placeholder="e.g. Recursion"
                                        required
                                    />
                                )}

                                {activeTab === 'text' && (
                                    <div className="w-full">
                                        <label className="mb-2 block text-sm font-medium text-text-muted">Syllabus Text</label>
                                        <textarea
                                            value={text}
                                            onChange={(e) => setText(e.target.value)}
                                            rows={6}
                                            required
                                            className="flex w-full rounded-lg border border-gray-700 bg-surface px-3 py-2 text-sm text-text-primary placeholder:text-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                                            placeholder="Paste text here..."
                                        />
                                    </div>
                                )}

                                {activeTab === 'file' && (
                                    <div className="w-full">
                                        <label className="mb-2 block text-sm font-medium text-text-muted">Upload (PDF/Image)</label>
                                        <Input
                                            type="file"
                                            accept=".pdf,image/*"
                                            onChange={(e) => setFile(e.target.files[0])}
                                            required
                                            className="cursor-pointer file:cursor-pointer"
                                        />
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="w-full">
                                        <label className="mb-2 block text-sm font-medium text-text-muted">Difficulty</label>
                                        <select
                                            value={difficulty}
                                            onChange={(e) => setDifficulty(e.target.value)}
                                            className="flex h-10 w-full rounded-lg border border-gray-700 bg-surface px-3 pr-8 py-2 text-sm text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%239CA3AF%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-[length:16px] bg-[right_8px_center] bg-no-repeat"
                                        >
                                            <option value="easy" className="bg-surface rounded-lg">Easy</option>
                                            <option value="medium" className="bg-surface rounded-lg">Medium</option>
                                            <option value="hard" className="bg-surface rounded-lg">Hard</option>
                                        </select>
                                    </div>
                                    <Input
                                        label="Count"
                                        type="number"
                                        min="1" max="20"
                                        value={nQuestions}
                                        onChange={(e) => setNQuestions(parseInt(e.target.value) || 1)}
                                        required
                                    />
                                </div>

                                <Button type="submit" className="w-full" isLoading={loading}>
                                    Generate
                                </Button>
                            </form>
                        </CardContent>
                    </Card>
                </div>

                {/* --- Right Column: Available Packages --- */}
                <div className="lg:col-span-8 space-y-6">
                    <Card className="min-h-[500px] border-none bg-transparent shadow-none">
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-xl font-semibold text-white">Generated Packages</h2>
                            <Badge variant="outline" className="text-text-muted border-gray-700">
                                {availablePackages.length} Total
                            </Badge>
                        </div>

                        <div className="space-y-4">
                            {availablePackages.length === 0 && !loading && (
                                <div className="text-center py-20 border-2 border-dashed border-gray-800 rounded-xl">
                                    <p className="text-text-muted">No packages yet. Generate some!</p>
                                </div>
                            )}

                            {availablePackages.map((pkg, index) => (
                                <PackageItem key={pkg.id || index} pkg={pkg} />
                            ))}
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
}

const PackageItem = ({ pkg }) => {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <div className="rounded-lg border border-gray-800 bg-surface overflow-hidden transition-all duration-200 hover:border-gray-700">
            <div
                className="flex items-center justify-between p-4 cursor-pointer bg-surface hover:bg-gray-800/50"
                onClick={() => setIsOpen(!isOpen)}
            >
                <div className="flex items-center space-x-4">
                    <div className={cn("p-2 rounded-full bg-primary/10 text-primary transition-transform duration-200", isOpen && "rotate-90")}>
                        <ChevronRight className="h-4 w-4" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold text-white">{pkg.title || 'Untitled Question'}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                            <Badge variant={pkg.difficulty === 'hard' ? 'error' : pkg.difficulty === 'medium' ? 'warning' : 'success'}>
                                {pkg.difficulty}
                            </Badge>
                            <span className="text-xs text-text-muted">{pkg.testcases?.length || 0} Test Cases</span>
                        </div>
                    </div>
                </div>
            </div>

            {isOpen && (
                <div className="p-4 pt-0 border-t border-gray-800/50 bg-gray-900/30">
                    <div className="prose prose-invert prose-sm max-w-none mt-4 text-gray-300">
                        <ReactMarkdown>{pkg.prompt}</ReactMarkdown>
                    </div>
                </div>
            )}
        </div>
    );
};