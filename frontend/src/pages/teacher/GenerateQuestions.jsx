import { useState, useEffect } from 'react';
import { generateQuestions, getPackages, generateQuestionsFromText, generateQuestionsFromFile } from '../../api';
import toast from 'react-hot-toast';
import ReactMarkdown from 'react-markdown';

// --- Tab Button Component ---
const TabButton = ({ isActive, onClick, children }) => (
    <button
        onClick={onClick}
        className={`px-4 py-2 font-medium text-sm rounded-t-lg border-b-2
            ${isActive 
                ? 'text-accent border-accent' 
                : 'text-gray-400 border-transparent hover:text-gray-200 hover:border-gray-600'
            }`}
    >
        {children}
    </button>
);

// --- Form for generating from simple topic ---
const GenerateFromTopic = ({ setLoading, setAvailablePackages }) => {
    const [topic, setTopic] = useState('basic list manipulation');
    const [difficulty, setDifficulty] = useState('easy');
    const [nQuestions, setNQuestions] = useState(5);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            // This now uses the original endpoint, which we should rename for clarity,
            // but for now, let's use the text endpoint as a proxy.
            const response = await generateQuestions(topic, difficulty, nQuestions);
            setAvailablePackages(prev => [...prev, ...response.data]);
            toast.success(`Generated and saved ${response.data.length} new packages!`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to generate questions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="text-sm font-medium text-gray-300">Topic</label>
                <input type="text" value={topic} onChange={(e) => setTopic(e.target.value)} required className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Number of Questions</label>
                <input type="number" min="1" max="20" value={nQuestions} onChange={(e) => setNQuestions(parseInt(e.target.value, 10) || 1)} required className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
            <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                    Generate & Save
                </button>
            </div>
        </form>
    );
};

// --- Form for generating from long text ---
const GenerateFromText = ({ setLoading, setAvailablePackages }) => {
    const [text, setText] = useState('');
    const [difficulty, setDifficulty] = useState('easy');
    const [nQuestions, setNQuestions] = useState(5);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const response = await generateQuestionsFromText(text, difficulty, nQuestions);
            setAvailablePackages(prev => [...prev, ...response.data]);
            toast.success(`Generated and saved ${response.data.length} new packages!`);
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to generate questions.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="text-sm font-medium text-gray-300">Syllabus Text</label>
                <textarea
                    rows="8"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    required
                    className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent"
                    placeholder="Paste your syllabus, notes, or any block of text here..."
                />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Number of Questions</label>
                <input type="number" min="1" max="20" value={nQuestions} onChange={(e) => setNQuestions(parseInt(e.target.value, 10) || 1)} required className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
            <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                    Generate from Text
                </button>
            </div>
        </form>
    );
};

// --- Form for generating from file ---
const GenerateFromFile = ({ setLoading, setAvailablePackages }) => {
    const [file, setFile] = useState(null);
    const [difficulty, setDifficulty] = useState('easy');
    const [nQuestions, setNQuestions] = useState(5);

    const handleFileChange = (e) => {
        setFile(e.target.files[0]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!file) {
            toast.error("Please select a file to upload.");
            return;
        }
        setLoading(true);
        try {
            const response = await generateQuestionsFromFile(file, nQuestions, difficulty);
            setAvailablePackages(prev => [...prev, ...response.data]);
            toast.success(`Generated and saved ${response.data.length} new packages from file!`);
            setFile(null); // Clear file input
        } catch (error) {
            toast.error(error.response?.data?.detail || 'Failed to generate from file.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label className="text-sm font-medium text-gray-300">Syllabus File (PDF or Image)</label>
                <input 
                    type="file" 
                    onChange={handleFileChange} 
                    accept="application/pdf,image/*" 
                    required 
                    className="mt-1 block w-full text-sm text-gray-400
                               file:mr-4 file:py-2 file:px-4
                               file:rounded-md file:border-0
                               file:text-sm file:font-semibold
                               file:bg-gray-700 file:text-gray-200
                               hover:file:bg-gray-600"
                />
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Difficulty</label>
                <select value={difficulty} onChange={(e) => setDifficulty(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent">
                    <option value="easy">Easy</option>
                    <option value="medium">Medium</option>
                    <option value="hard">Hard</option>
                </select>
            </div>
            <div>
                <label className="text-sm font-medium text-gray-300">Number of Questions</label>
                <input type="number" min="1" max="20" value={nQuestions} onChange={(e) => setNQuestions(parseInt(e.target.value, 10) || 1)} required className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-accent focus:border-accent" />
            </div>
            <div>
                <button type="submit" className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-accent hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent disabled:opacity-50">
                    Upload & Generate
                </button>
            </div>
        </form>
    );
};


// --- Main Page Component (Updated) ---
export default function GenerateQuestions() {
    const [availablePackages, setAvailablePackages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [activeTab, setActiveTab] = useState('topic'); // 'topic', 'text', or 'file'

    const fetchExistingPackages = async () => {
        try {
            const response = await getPackages();
            setAvailablePackages(response.data);
        } catch (error) {
            toast.error("Could not load existing packages.");
        }
    };

    useEffect(() => {
        fetchExistingPackages();
    }, []);

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                
                {/* --- TAB UI --- */}
                <div className="border-b border-gray-700 mb-6">
                    <nav className="-mb-px flex space-x-4" aria-label="Tabs">
                        <TabButton isActive={activeTab === 'topic'} onClick={() => setActiveTab('topic')}>
                            Topic
                        </TabButton>
                        <TabButton isActive={activeTab === 'text'} onClick={() => setActiveTab('text')}>
                            From Text
                        </TabButton>
                        <TabButton isActive={activeTab === 'file'} onClick={() => setActiveTab('file')}>
                            From File
                        </TabButton>
                    </nav>
                </div>

                {/* --- RENDER ACTIVE TAB --- */}
                {loading && (
                    <div className="text-center p-4">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent mx-auto"></div>
                        <p className="mt-2 text-sm text-gray-400">Generating...</p>
                    </div>
                )}
                <div style={{ display: loading ? 'none' : 'block' }}>
                    {activeTab === 'topic' && (
                        <GenerateFromTopic setLoading={setLoading} setAvailablePackages={setAvailablePackages} />
                    )}
                    {activeTab === 'text' && (
                        <GenerateFromText setLoading={setLoading} setAvailablePackages={setAvailablePackages} />
                    )}
                    {activeTab === 'file' && (
                        <GenerateFromFile setLoading={setLoading} setAvailablePackages={setAvailablePackages} />
                    )}
                </div>
            </div>

            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm">
                 <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">Available Packages</h2>
                 <div className="mt-4 space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {availablePackages.length === 0 && !loading && <p className="text-gray-500 dark:text-gray-400">No packages available. Generate some new ones!</p>}
                    {availablePackages.map((pkg, index) => (
                        <details key={pkg.id || index} className="border border-gray-200 dark:border-gray-700 rounded-lg">
                            <summary className="cursor-pointer p-4 font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700">{pkg.title || '[Untitled Question]'}</summary>
                            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                                <div className="prose prose-sm md:prose-base prose-invert max-w-none text-gray-300 prose-headings:text-gray-100 prose-strong:text-gray-100 prose-code:text-amber-400">
                                    <ReactMarkdown>{pkg.prompt}</ReactMarkdown>
                                </div>
                                <h4 className="font-semibold mt-3 dark:text-gray-200">Test Cases ({pkg.testcases?.length || 0}):</h4>
                                <ul className="list-disc list-inside text-sm text-gray-500 dark:text-gray-400">
                                    {pkg.testcases?.map((tc, i) => <li key={tc.id || i}>{tc.type} - {tc.points} pts</li>)}
                                </ul>
                            </div>
                        </details>
                    ))}
                 </div>
            </div>
        </div>
    );
}